/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"github.com/harry1453/go-common-file-dialog/cfd"
	"github.com/harry1453/go-common-file-dialog/cfdutil"
	rotatelogs "github.com/lestrrat/go-file-rotatelogs"
	"github.com/lhside/chrome-go"
	"golang.org/x/sys/windows/registry"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"time"
)

const VERSION = "4.0.8";


var DebugLogs []string
var Logging bool
var Debug bool

func LogForInfo(message string) {
	DebugLogs = append(DebugLogs, message)
	if Logging {
		fmt.Fprintf(os.Stderr, "[info] "+message+"\n")
		log.Print(message + "\r\n")
	}
}

func LogForDebug(message string) {
	DebugLogs = append(DebugLogs, message)
	if Logging && Debug {
		fmt.Fprintf(os.Stderr, "[debug] "+message+"\n")
		log.Print(message + "\r\n")
	}
}


type RequestParams struct {
	Path             string `json:path`
	Title            string `json:title`
	Role             string `json:role`
	FileName         string `json:fileName`
	DefaultExtension string `json:defaultExtension`
	DisplayName      string `json:displayName`
	Pattern          string `json:pattern`
}
type Request struct {
	Logging          bool          `json:"logging"`
	Debug            bool          `json:"debug"`
	LogRotationCount int           `json:"logRotationCount"`
	LogRotationTime  int           `json:"logRotationTime"`
	Command          string        `json:"command"`
	Params           RequestParams `json:"params"`
}

func main() {
	shouldReportVersion := flag.Bool("v", false, "v")
	flag.Parse()
	if *shouldReportVersion == true {
		fmt.Println(VERSION)
		return
	}

	log.SetOutput(os.Stderr)

	rawRequest, err := chrome.Receive(os.Stdin)
	if err != nil {
		log.Fatal(err)
	}
	request := &Request{
		Logging: false,
		Debug: false,
		LogRotationCount: 7,
		LogRotationTime: 24,
	}
	if err := json.Unmarshal(rawRequest, request); err != nil {
		log.Fatal(err)
	}

	Logging = request.Logging
	Debug = request.Debug
	if Logging {
		logfileDir := os.ExpandEnv(`${temp}`)
		logRotationTime := time.Duration(request.LogRotationTime) * time.Hour
		logRotationCount := request.LogRotationCount
		maxAge := time.Duration(-1)
		// for debugging
		//logRotationTime = time.Duration(request.LogRotationTime) * time.Minute
		rotateLog, err := rotatelogs.New(filepath.Join(logfileDir, "com.clear_code.flexible_confirm_mail_we_host.log.%Y%m%d%H%M.txt"),
			rotatelogs.WithMaxAge(maxAge),
			rotatelogs.WithRotationTime(logRotationTime),
			rotatelogs.WithRotationCount(logRotationCount),
		)
		if err != nil {
			log.Fatal(err)
		}
		defer rotateLog.Close()

		log.SetOutput(rotateLog)
		log.SetFlags(log.Ldate | log.Ltime)
		LogForDebug("logRotationCount:" + fmt.Sprint(logRotationCount))
		LogForDebug("logRotationTime:" + fmt.Sprint(logRotationTime))
	}

	LogForInfo("Command:" + request.Command)

	switch command := request.Command; command {
	case "fetch":
		FetchAndRespond(request.Params.Path)
	case "choose-file":
		ChooseFileAndRespond(request.Params)
	case "outlook-gpo-configs":
		FetchOutlookGPOConfigsAndResponse()
	default: // just echo
		err = chrome.Post(rawRequest, os.Stdout)
		if err != nil {
			log.Fatal(err)
		}
	}
}

type FetchResponse struct {
	Contents string `json:"contents"`
	Error    string `json:"error"`
}

func FetchAndRespond(path string) {
	contents, errorMessage := Fetch(path)
	response := &FetchResponse{contents, errorMessage}
	body, err := json.Marshal(response)
	if err != nil {
		log.Fatal(err)
	}
	err = chrome.Post(body, os.Stdout)
	if err != nil {
		log.Fatal(err)
	}
}

func Fetch(path string) (contents string, errorMessage string) {
	buffer, err := ioutil.ReadFile(path)
	if err != nil {
		return "", path + ": " + err.Error()
	}
	return string(buffer), ""
}

type ChooseFileResponse struct {
	Path  string `json:"path"`
	Error string `json:"error"`
}

func ChooseFileAndRespond(params RequestParams) {
	path, errorMessage := ChooseFile(params)
	response := &ChooseFileResponse{path, errorMessage}
	body, err := json.Marshal(response)
	if err != nil {
		log.Fatal(err)
	}
	err = chrome.Post(body, os.Stdout)
	if err != nil {
		log.Fatal(err)
	}
}

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
		log.Fatal(err)
		return "", err.Error()
	}
	return result, ""
}


func ReadIntegerRegValue(base registry.Key, keyPath string, valueName string) (data uint64, errorMessage string) {
	key, err := registry.OpenKey(base,
		keyPath,
		registry.QUERY_VALUE)
	if err != nil {
		LogForDebug("Failed to open key " + keyPath)
		log.Fatal(err)
		return 0, err.Error()
	}
	defer key.Close()

	data, _, err = key.GetIntegerValue(valueName)
	if err != nil {
		LogForDebug("Failed to get data of the value " + valueName + " from key " + keyPath)
		log.Fatal(err)
		return 0, err.Error()
	}
	return data, ""
}

func ReadStringsRegValue(base registry.Key, keyPath string, valueName string) (data []string, errorMessage string) {
	key, err := registry.OpenKey(base,
		keyPath,
		registry.QUERY_VALUE)
	if err != nil {
		LogForDebug("Failed to open key " + keyPath)
		log.Fatal(err)
		return nil, err.Error()
	}
	defer key.Close()

	data, _, err = key.GetStringsValue(valueName)
	if err != nil {
		LogForDebug("Failed to get data of the value " + valueName + " from key " + keyPath)
		log.Fatal(err)
		return nil, err.Error()
	}
	return data, ""
}

type TbStyleConfigs struct {
	CountdownAllowSkip                      bool     `json:countdownAllowSkip`
	ShowCountdown                           bool     `json:showCountdown`
	CountdownSeconds                        uint64   `json:countdownSeconds`
	SkipConfirmationForInternalMail         bool     `json:skipConfirmationForInternalMail`
	ConfirmMultipleRecipientDomains         bool     `json:confirmMultipleRecipientDomains`
	MinConfirmMultipleRecipientDomainsCount uint64   `json:minConfirmMultipleRecipientDomainsCount`
	FixedInternalDomains                    []string `json:fixedInternalDomains`
	BuiltInAttentionDomainsItems            []string `json:builtInAttentionDomainsItems`
	BuiltInAttentionTermsItems              []string `json:builtInAttentionTermsItems`
}

func ReadAndApplyOutlookGPOConfigs(base registry.Key, keyPath string, configs *TbStyleConfigs) {
	countAllowSkip, err := ReadIntegerRegValue(base, keyPath, "CountAllowSkip")
	if err != "" {
		configs.CountdownAllowSkip = countAllowSkip == 1
	}
	countEnabled, err := ReadIntegerRegValue(base, keyPath, "CountEnabled")
	if err != "" {
		configs.ShowCountdown = countEnabled == 1
	}
	countSeconds, err := ReadIntegerRegValue(base, keyPath, "CountSeconds")
	if err != "" {
		configs.CountdownSeconds = countSeconds
	}
	mainSkipIfNoExt, err := ReadIntegerRegValue(base, keyPath, "MainSkipIfNoExt")
	if err != "" {
		configs.SkipConfirmationForInternalMail = mainSkipIfNoExt == 1
	}
	safeBccEnabled, err := ReadIntegerRegValue(base, keyPath, "SafeBccEnabled")
	if err != "" {
		configs.ConfirmMultipleRecipientDomains = safeBccEnabled == 1
	}
	safeBccThreshold, err := ReadIntegerRegValue(base, keyPath, "SafeBccThreshold")
	if err != "" {
		configs.MinConfirmMultipleRecipientDomainsCount = safeBccThreshold
	}
	trustedDomains, err := ReadStringsRegValue(base, keyPath, "TrustedDomains")
	if err != "" {
		configs.FixedInternalDomains = trustedDomains
	}
	unsafeDomains, err := ReadStringsRegValue(base, keyPath, "UnsafeDomains")
	if err != "" {
		configs.BuiltInAttentionDomainsItems = unsafeDomains
	}
	unsafeFiles, err := ReadStringsRegValue(base, keyPath, "UnsafeFiles")
	if err != "" {
		configs.BuiltInAttentionTermsItems = unsafeFiles
	}
}

func FetchOutlookGPOConfigsAndResponse() {
	response := TbStyleConfigs{}

	defaultKeyPath := `SOFTWARE\Policies\FlexConfirmMail\Default`
	ReadAndApplyOutlookGPOConfigs(registry.LOCAL_MACHINE, defaultKeyPath, &response)
	ReadAndApplyOutlookGPOConfigs(registry.CURRENT_USER, defaultKeyPath, &response)

	body, err := json.Marshal(response)
	if err != nil {
		log.Fatal(err)
	}
	err = chrome.Post(body, os.Stdout)
	if err != nil {
		log.Fatal(err)
	}
}
