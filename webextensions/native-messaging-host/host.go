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
	shouldReportVersion := flag.Bool("v", false, "version information")
	commandLineCommand := flag.String("c", "", "command to run")
	flag.Parse()

	log.SetOutput(os.Stderr)

	if *shouldReportVersion == true {
		fmt.Println(VERSION)
		return
	}
	if *commandLineCommand != "" {
		switch *commandLineCommand {
		//case "fetch":
		//	FetchAndRespond(request.Params.Path)
		//case "choose-file":
		//	ChooseFileAndRespond(request.Params)
		case "outlook-gpo-configs":
			FetchOutlookGPOConfigsAndResponse()
		default:
			fmt.Println("unknown command: " + *commandLineCommand)
		}
		return
	}

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


func ReadIntegerRegValue(key registry.Key, valueName string) (data uint64, errorMessage string) {
	data, _, err := key.GetIntegerValue(valueName)
	if err != nil {
		LogForDebug("Failed to get data of the value " + valueName)
		//log.Fatal(err)
		return 0, err.Error()
	}
	return data, ""
}

func ReadStringsRegValue(key registry.Key, valueName string) (data []string, errorMessage string) {
	data, _, err := key.GetStringsValue(valueName)
	if err != nil {
		LogForDebug("Failed to get data of the value " + valueName)
		//log.Fatal(err)
		return data, err.Error()
	}
	return data, ""
}

type TbStyleConfigs struct {
	CountdownAllowSkip                         bool     `json:countdownAllowSkip`
	ShowCountdown                              bool     `json:showCountdown`
	CountdownSeconds                           uint64   `json:countdownSeconds`
	SkipConfirmationForInternalMail            bool     `json:skipConfirmationForInternalMail`
	ConfirmMultipleRecipientDomains            bool     `json:confirmMultipleRecipientDomains`
	MinConfirmMultipleRecipientDomainsCount    uint64   `json:minConfirmMultipleRecipientDomainsCount`
	FixedInternalDomains                       []string `json:fixedInternalDomains`
	BuiltInAttentionDomainsItems               []string `json:builtInAttentionDomainsItems`
	BuiltInAttentionTermsItems                 []string `json:builtInAttentionTermsItems`

	HasCountdownAllowSkip                      bool     `json:hasCountdownAllowSkip`
	HasShowCountdown                           bool     `json:hasShowCountdown`
	HasCountdownSeconds                        bool     `json:hasCountdownSeconds`
	HasSkipConfirmationForInternalMail         bool     `json:hasSkipConfirmationForInternalMail`
	HasConfirmMultipleRecipientDomains         bool     `json:hasConfirmMultipleRecipientDomains`
	HasMinConfirmMultipleRecipientDomainsCount bool     `json:hasMinConfirmMultipleRecipientDomainsCount`
	HasFixedInternalDomains                    bool     `json:hasFixedInternalDomains`
	HasBuiltInAttentionDomainsItems            bool     `json:hasBuiltInAttentionDomainsItems`
	HasBuiltInAttentionTermsItems              bool     `json:hasBuiltInAttentionTermsItems`
}

func ReadAndApplyOutlookGPOConfigs(base registry.Key, keyPath string, configs *TbStyleConfigs) {
	key, err := registry.OpenKey(base,
		keyPath,
		registry.QUERY_VALUE)
	if err != nil {
		LogForDebug("Failed to open key " + keyPath)
		//log.Fatal(err)
		return
	}
	defer key.Close()

	countAllowSkip, errMsg := ReadIntegerRegValue(key, "CountAllowSkip")
	if errMsg != "" {
		configs.CountdownAllowSkip = countAllowSkip == 1
		configs.HasCountdownAllowSkip = true
	}
	countEnabled, errMsg := ReadIntegerRegValue(key, "CountEnabled")
	if errMsg != "" {
		configs.ShowCountdown = countEnabled == 1
		configs.HasCountdownAllowSkip = true
	}
	countSeconds, errMsg := ReadIntegerRegValue(key, "CountSeconds")
	if errMsg != "" {
		configs.CountdownSeconds = countSeconds
		configs.HasCountdownAllowSkip = true
	}
	mainSkipIfNoExt, errMsg := ReadIntegerRegValue(key, "MainSkipIfNoExt")
	if errMsg != "" {
		configs.SkipConfirmationForInternalMail = mainSkipIfNoExt == 1
		configs.HasSkipConfirmationForInternalMail = true
	}
	safeBccEnabled, errMsg := ReadIntegerRegValue(key, "SafeBccEnabled")
	if errMsg != "" {
		configs.ConfirmMultipleRecipientDomains = safeBccEnabled == 1
		configs.HasConfirmMultipleRecipientDomains = true
	}
	safeBccThreshold, errMsg := ReadIntegerRegValue(key, "SafeBccThreshold")
	if errMsg != "" {
		configs.MinConfirmMultipleRecipientDomainsCount = safeBccThreshold
		configs.HasMinConfirmMultipleRecipientDomainsCount = true
	}
	trustedDomains, errMsg := ReadStringsRegValue(key, "TrustedDomains")
	if errMsg != "" {
		configs.FixedInternalDomains = trustedDomains
		configs.HasFixedInternalDomains = true
	}
	unsafeDomains, errMsg := ReadStringsRegValue(key, "UnsafeDomains")
	if errMsg != "" {
		configs.BuiltInAttentionDomainsItems = unsafeDomains
		configs.HasBuiltInAttentionDomainsItems = true
	}
	unsafeFiles, errMsg := ReadStringsRegValue(key, "UnsafeFiles")
	if errMsg != "" {
		configs.BuiltInAttentionTermsItems = unsafeFiles
		configs.HasBuiltInAttentionTermsItems = true
	}
}

func FetchOutlookGPOConfigsAndResponse() {
	response := TbStyleConfigs{}

	defaultKeyPath := `SOFTWARE\Policies\FlexConfirmMail\Default`
	LogForDebug(`Read GPO configs from HKLM\` + defaultKeyPath)
	ReadAndApplyOutlookGPOConfigs(registry.LOCAL_MACHINE, defaultKeyPath, &response)
	LogForDebug(`Read GPO configs from HKCU\` + defaultKeyPath)
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
