//go:build windows

/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

package main

import (
	"encoding/json"
	"github.com/harry1453/go-common-file-dialog/cfd"
	"github.com/harry1453/go-common-file-dialog/cfdutil"
	"github.com/lhside/chrome-go"
	"golang.org/x/sys/windows/registry"
	"io"
	"strconv"
	"strings"
)

func ChooseFile(params RequestParams) (path string, errorMessage string) {
	result, err := cfdutil.ShowOpenFileDialog(cfd.DialogConfig{
		Title: params.Title,
		Role:  params.Role,
		FileFilters: []cfd.FileFilter{
			{
				DisplayName: params.DisplayName,
				Pattern:     params.Pattern,
			},
		},
		SelectedFileFilterIndex: 0,
		FileName:                params.FileName,
		DefaultExtension:        params.DefaultExtension,
	})
	if err == cfd.ErrorCancelled {
		return result, ""
	} else if err != nil {
		return "", err.Error()
	}
	return result, ""
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
