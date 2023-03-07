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
	rotatelogs "github.com/lestrrat/go-file-rotatelogs"
	"github.com/lhside/chrome-go"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"time"
)

const VERSION = "4.1.5";


var RunInCLI bool
var DebugLogs []string
var Logging bool
var Debug bool

func LogForInfo(message string) {
	DebugLogs = append(DebugLogs, message)
	if Logging {
		if !RunInCLI {
			fmt.Fprintf(os.Stderr, "[info] "+message+"\n")
		}
		log.Print(message + "\r\n")
	}
}

func LogForDebug(message string) {
	DebugLogs = append(DebugLogs, message)
	if Logging && Debug {
		if !RunInCLI {
			fmt.Fprintf(os.Stderr, "[debug] "+message+"\n")
		}
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
	commandLineCommandParams := flag.String("p", "", "parameters for the command (JSON string)")
	commandLineDebug := flag.Bool("d", false, "debug mode")
	flag.Parse()

	log.SetOutput(os.Stderr)

	if *shouldReportVersion == true {
		fmt.Println(VERSION)
		return
	}
	if *commandLineCommand != "" {
		RunInCLI = true
		if *commandLineDebug == true {
			Logging = true
			Debug = true
		}
		switch *commandLineCommand {
		case "fetch":
			if *commandLineCommandParams == "" {
				fmt.Println(`missing required params via -p option, like: -p "{\"path":\"c:\\path\\to\\file\"}"`)
				return
			}
			var params RequestParams
			err := json.Unmarshal([]byte(*commandLineCommandParams), &params)
			if err != nil {
				log.Fatal(err)
			}
			FetchAndRespond(params.Path)
		case "choose-file":
			if *commandLineCommandParams == "" {
				fmt.Println(`missing required params via -p option, like: -p "{\"title\":\"dialog title\",\"role\":\"role\",\"fileName\":\"txt\",\"displayName\":\"name of the filter\",\"pattern\":\"matching file pattern\"}" (or simply: -p \"{}\")`)
				return
			}
			var params RequestParams
			err := json.Unmarshal([]byte(*commandLineCommandParams), &params)
			if err != nil {
				log.Fatal(err)
			}
			ChooseFileAndRespond(params)
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

type OutlookGPOConfigsResponse struct {
	Default TbStyleConfigs `json:default`
	Locked  TbStyleConfigs `json:locked`
}
