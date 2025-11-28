//go:build windows

/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

package main

import (
	"encoding/json"
	"fmt"
	"github.com/lhside/chrome-go"
	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/registry"
	"io"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"unsafe"
)

var (
	comdlg32              = syscall.NewLazyDLL("comdlg32.dll")
	ProcGetOpenFileNameW  = comdlg32.NewProc("GetOpenFileNameW")
)

type OpenFileNameW struct {
	lStructSize       uint32
	hwndOwner         uintptr
	hInstance         uintptr
	lpstrFilter       *uint16
	lpstrCustomFilter *uint16
	nMaxCustFilter    uint32
	nFilterIndex      uint32
	lpstrFile         *uint16
	nMaxFile          uint32
	lpstrFileTitle    *uint16
	nMaxFileTitle     uint32
	lpstrInitialDir   *uint16
	lpstrTitle        *uint16
	flags             uint32
	nFileOffset       uint16
	nFileExtension    uint16
	lpstrDefExt       *uint16
	lCustData         uintptr
	lpfnHook          uintptr
	lpTemplateName    *uint16
	pvReserved        unsafe.Pointer
	dwReserved        uint32
	flagsEx           uint32
}

const (
	OFN_EXPLORER         = 0x00080000
	OFN_FILEMUSTEXIST    = 0x00001000
	OFN_PATHMUSTEXIST    = 0x00000800
)

func Utf16Ptr(s string) *uint16 {
	if s == "" {
		return nil
	}
	ptr, _ := syscall.UTF16PtrFromString(s)
	return ptr
}

func BuildFilter(displayName, pattern string) *uint16 {
	if displayName == "" || pattern == "" {
		return nil
	}

	filter := fmt.Sprintf("%s (%s)\x00%s\x00\x00", displayName, pattern, pattern)
	ptr, _ := syscall.UTF16PtrFromString(filter)
	return ptr
}

func ChooseFile(params RequestParams) (path string, errorMessage string) {
	buf := make([]uint16, syscall.MAX_PATH)

	if params.FileName != "" {
		copy(buf, syscall.StringToUTF16(params.FileName))
	}

	ofn := OpenFileNameW{
		lStructSize:     uint32(unsafe.Sizeof(OpenFileNameW{})),
		lpstrTitle:      Utf16Ptr(params.Title),
		lpstrInitialDir: Utf16Ptr(params.Path),
		lpstrDefExt:     Utf16Ptr(params.DefaultExtension),
		lpstrFilter:     BuildFilter(params.DisplayName, params.Pattern),
		lpstrFile:       &buf[0],
		nMaxFile:        uint32(len(buf)),
		flags:           OFN_EXPLORER | OFN_FILEMUSTEXIST | OFN_PATHMUSTEXIST,
	}

	ret, _, err := ProcGetOpenFileNameW.Call(uintptr(unsafe.Pointer(&ofn)))
	if ret == 0 {
		return "", err.Error()
	}

	return syscall.UTF16ToString(buf), ""
}

func ReadIntegerRegValue(key registry.Key, valueName string) (data uint64, errorMessage string) {
	data, _, err := key.GetIntegerValue(valueName)
	if err != nil {
		LogForDebug("Failed to get data of the value " + valueName)
		return 0, err.Error()
	}
	LogForDebug("Successfully got data of the value " + valueName + ": " + strconv.FormatUint(data, 10))
	return data, ""
}

func ReadStringsRegValue(key registry.Key, valueName string) (data []string, errorMessage string) {
	data, _, err := key.GetStringsValue(valueName)
	if err != nil {
		LogForDebug("Failed to get data of the value " + valueName)
		return data, err.Error()
	}
	LogForDebug("Successfully got data of the value " + valueName + ": " + strings.Join(data, " "))
	return data, ""
}

func ReadAndApplyOutlookGPOConfigs(base registry.Key, keyPath string, configs *TbStyleConfigs) error {
	key, err := registry.OpenKey(base,
		keyPath,
		registry.QUERY_VALUE)
	if err != nil {
		LogForDebug("Failed to open key " + keyPath)
		return err
	}
	defer key.Close()

	countAllowSkip, errMsg := ReadIntegerRegValue(key, "CountAllowSkip")
	if errMsg == "" {
		configs.CountdownAllowSkip = countAllowSkip == 1
		configs.HasCountdownAllowSkip = true
	}
	countEnabled, errMsg := ReadIntegerRegValue(key, "CountEnabled")
	if errMsg == "" {
		configs.ShowCountdown = countEnabled == 1
		configs.HasShowCountdown = true
	}
	countSeconds, errMsg := ReadIntegerRegValue(key, "CountSeconds")
	if errMsg == "" {
		configs.CountdownSeconds = countSeconds
		configs.HasCountdownSeconds = true
	}
	mainSkipIfNoExt, errMsg := ReadIntegerRegValue(key, "MainSkipIfNoExt")
	if errMsg == "" {
		configs.SkipConfirmationForInternalMail = mainSkipIfNoExt == 1
		configs.HasSkipConfirmationForInternalMail = true
	}
	safeBccEnabled, errMsg := ReadIntegerRegValue(key, "SafeBccEnabled")
	if errMsg == "" {
		configs.ConfirmMultipleRecipientDomains = safeBccEnabled == 1
		configs.HasConfirmMultipleRecipientDomains = true
	}
	safeBccThreshold, errMsg := ReadIntegerRegValue(key, "SafeBccThreshold")
	if errMsg == "" {
		configs.MinConfirmMultipleRecipientDomainsCount = safeBccThreshold
		configs.HasMinConfirmMultipleRecipientDomainsCount = true
	}
	trustedDomains, errMsg := ReadStringsRegValue(key, "TrustedDomains")
	if errMsg == "" {
		configs.FixedInternalDomains = trustedDomains
		configs.HasFixedInternalDomains = true
	}
	unsafeDomains, errMsg := ReadStringsRegValue(key, "UnsafeDomains")
	if errMsg == "" {
		configs.BuiltInAttentionDomainsItems = unsafeDomains
		configs.HasBuiltInAttentionDomainsItems = true
	}
	unsafeFiles, errMsg := ReadStringsRegValue(key, "UnsafeFiles")
	if errMsg == "" {
		configs.BuiltInAttentionTermsItems = unsafeFiles
		configs.HasBuiltInAttentionTermsItems = true
	}
	return nil
}

func FetchOutlookGPOConfigsAndResponse(output io.Writer) error {
	response := OutlookGPOConfigsResponse{}

	defaultKeyPath := `SOFTWARE\Policies\FlexConfirmMail\Default`
	LogForDebug(`Read GPO configs from HKLM\` + defaultKeyPath)
	ReadAndApplyOutlookGPOConfigs(registry.LOCAL_MACHINE, defaultKeyPath, &response.Default)
	LogForDebug(`Read GPO configs from HKCU\` + defaultKeyPath)
	ReadAndApplyOutlookGPOConfigs(registry.CURRENT_USER, defaultKeyPath, &response.Default)

	/*
		lockedKeyPath := `SOFTWARE\Policies\FlexConfirmMail\Locked`
		LogForDebug(`Read GPO configs from HKLM\` + lockedKeyPath)
		ReadAndApplyOutlookGPOConfigs(registry.LOCAL_MACHINE, lockedKeyPath, &response.Locked)
		LogForDebug(`Read GPO configs from HKCU\` + lockedKeyPath)
		ReadAndApplyOutlookGPOConfigs(registry.CURRENT_USER, lockedKeyPath, &response.Locked)
	*/

	body, err := json.Marshal(response)
	if err != nil {
		return err
	}
	err = chrome.Post(body, output)
	if err != nil {
		return err
	}
	return nil
}

func GetParentProcessExePath() (string, error) {
	snapshot, err := windows.CreateToolhelp32Snapshot(windows.TH32CS_SNAPPROCESS, 0)
	if err != nil {
		return "", err
	}
	defer windows.CloseHandle(snapshot)

	var pe windows.ProcessEntry32
	pe.Size = uint32(unsafe.Sizeof(pe))

	currentPID := windows.GetCurrentProcessId()

	err = windows.Process32First(snapshot, &pe)
	if err != nil {
		return "", err
	}

	var parentPID uint32

	for {
		if pe.ProcessID == currentPID {
			parentPID = pe.ParentProcessID
			break
		}
		err = windows.Process32Next(snapshot, &pe)
		if err != nil {
			return "", err
		}
	}

	h, err := windows.OpenProcess(
		windows.PROCESS_QUERY_LIMITED_INFORMATION,
		false,
		parentPID,
	)
	if err != nil {
		return "", err
	}
	defer windows.CloseHandle(h)

	buf := make([]uint16, windows.MAX_PATH)
	size := uint32(len(buf))

	err = windows.QueryFullProcessImageName(h, 0, &buf[0], &size)
	if err != nil {
		return "", err
	}

	return windows.UTF16ToString(buf[:size]), nil
}

func GetParentProcessDir() (string, error) {
	exePath, err := GetParentProcessExePath()
	if err != nil {
		return "", err
	}

	dir := filepath.Dir(exePath)
	return dir, nil
}

