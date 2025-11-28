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
	"io"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

const VERSION = "4.2.9"

var RunInCLI bool
var DebugLogs []string
var Logging bool
var Debug bool
var ErrorOut io.Writer

func LogForInfo(message string) {
	DebugLogs = append(DebugLogs, message)
	if Logging {
		if !RunInCLI {
			fmt.Fprintf(ErrorOut, "[info] "+message+"\n")
		}
		log.Print(message + "\r\n")
	}
}

func LogForDebug(message string) {
	DebugLogs = append(DebugLogs, message)
	if Logging && Debug {
		if !RunInCLI {
			fmt.Fprintf(ErrorOut, "[debug] "+message+"\n")
		}
		log.Print(message + "\r\n")
	}
}

type RequestParams struct {
	Path             string `json:"path"`
	Title            string `json:"title"`
	Role             string `json:"role"`
	FileName         string `json:"fileName"`
	DefaultExtension string `json:"defaultExtension"`
	DisplayName      string `json:"displayName"`
	Pattern          string `json:"pattern"`
}
type Request struct {
	Logging          bool          `json:"logging"`
	Debug            bool          `json:"debug"`
	LogRotationCount int           `json:"logRotationCount"`
	LogRotationTime  int           `json:"logRotationTime"`
	Command          string        `json:"command"`
	Params           RequestParams `json:"params"`
}

type Context struct {
	ReportVersion bool
	Command       string
	CommandParams string
	Debug         bool
	Input         io.Reader
	Output        io.Writer
	ErrorOut      io.Writer
}

func main() {
	context, err := CreateCommandLineContext(os.Args[1:])
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		return
	}

	ErrorOut = context.ErrorOut

	if err := ProcessRequest(context); err != nil {
		log.Fatal(err)
	}
}

func CreateCommandLineContext(args []string) (context *Context, error error) {
	flags := flag.NewFlagSet("app", flag.ContinueOnError)

	reportVersion := flags.Bool("v", false, "version information")
	command := flags.String("c", "", "command to run")
	commandParams := flags.String("p", "", "parameters for the command (JSON string)")
	debug := flags.Bool("d", false, "debug mode")

	if err := flags.Parse(args); err != nil {
		return nil, err
	}

	return &Context{
		ReportVersion: *reportVersion,
		Command:       *command,
		CommandParams: *commandParams,
		Debug:         *debug,
		Input:         os.Stdin,
		Output:        os.Stdout,
		ErrorOut:      os.Stderr,
	}, nil
}

func ProcessRequest(context *Context) error {
	log.SetOutput(context.ErrorOut)

	if context.ReportVersion {
		fmt.Fprintln(context.Output, VERSION)
		return nil
	}
	if context.Command != "" {
		RunInCLI = true
		if context.Debug {
			Logging = true
			Debug = true
		}
		var err error
		switch context.Command {
		case "fetch":
			if context.CommandParams == "" {
				fmt.Fprintln(context.ErrorOut, `missing required params via -p option, like: -p "{\"path":\"c:\\path\\to\\file\"}"`)
				return fmt.Errorf("missing params")
			}
			var params RequestParams
			err := json.Unmarshal([]byte(context.CommandParams), &params)
			if err != nil {
				fmt.Fprintln(context.ErrorOut, "invalid params: "+fmt.Sprint(err))
				return err
			}
			contents, errorMessage := Fetch(params.Path)
			if errorMessage != "" {
				return fmt.Errorf("failed to fetch: " + errorMessage)
			}
			fmt.Fprintln(context.Output, contents)
		case "choose-file":
			if context.CommandParams == "" {
				fmt.Fprintln(context.ErrorOut, `missing required params via -p option, like: -p "{\"title\":\"dialog title\",\"role\":\"role\",\"fileName\":\"txt\",\"displayName\":\"name of the filter\",\"pattern\":\"matching file pattern\"}" (or simply: -p \"{}\")`)
				return fmt.Errorf("missing params")
			}
			var params RequestParams
			err := json.Unmarshal([]byte(context.CommandParams), &params)
			if err != nil {
				fmt.Fprintln(context.ErrorOut, "invalid params: "+fmt.Sprint(err))
				return err
			}
			path, errorMessage := ChooseFile(params)
			if errorMessage != "" {
				return fmt.Errorf("failed to open file chooser: " + errorMessage)
			}
			fmt.Fprintln(context.Output, path)
		case "outlook-gpo-configs":
			FetchOutlookGPOConfigsAndResponse(context.Output)
		default:
			fmt.Fprintln(context.ErrorOut, "unknown command: "+context.Command)
		}
		return err
	}

	rawRequest, err := chrome.Receive(context.Input)
	if err != nil {
		return err
	}
	request := &Request{
		Logging:          false,
		Debug:            false,
		LogRotationCount: 7,
		LogRotationTime:  24,
	}
	if err := json.Unmarshal(rawRequest, request); err != nil {
		return err
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
			return err
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
		err = FetchAndRespond(request.Params.Path, context.Output)
	case "choose-file":
		err = ChooseFileAndRespond(request.Params, context.Output)
	case "outlook-gpo-configs":
		err = FetchOutlookGPOConfigsAndResponse(context.Output)
	default: // just echo
		err = chrome.Post(rawRequest, context.Output)
	}

	return err
}

type FetchResponse struct {
	Contents string `json:"contents"`
	Error    string `json:"error"`
}

func FetchAndRespond(path string, output io.Writer) error {
	contents, errorMessage := Fetch(path)
	response := &FetchResponse{contents, errorMessage}
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

func IsParentProcessDirKey(key string) bool {
	return strings.EqualFold(key, "ParentProcessDir")
}

func ExpandParentProcessDir(path string) (string, error) {
	if !strings.Contains(strings.ToLower(path), "parentprocessdir") {
		return path, nil
	}

	dir, err := GetParentProcessDir()
	if err != nil {
		return "", err
	}

	patterns := []string{
		`%ParentProcessDir%`,
		`$ParentProcessDir`,
		`${ParentProcessDir}`,
	}

	result := path

	for _, p := range patterns {
		re := regexp.MustCompile(`(?i)` + regexp.QuoteMeta(p))
		result = re.ReplaceAllString(result, dir)
	}

	return result, nil
}

func GetEnvVarValue(name string) string {
	val := os.Getenv(name)
	if val == "" {
		val = os.Getenv(strings.ToUpper(name))
	}
	if val == "" {
		val = os.Getenv(strings.ToLower(name))
	}
	return val
}

func ExpandAllEnvVars(path string) string {
	// %VAR% format (for Windows, allowed only at the beginning of the input string)
	rePercent := regexp.MustCompile(`^%([^%]+)%`)
	path = rePercent.ReplaceAllStringFunc(path, func(m string) string {
		key := strings.Trim(m, "%")
		if IsParentProcessDirKey(key) {
			return m
		}
		val := GetEnvVarValue(key)
		if val == "" {
			return m
		}
		return val
	})

	// ${VAR} format (for Linux, macOS)
	reBrace := regexp.MustCompile(`\$\{([^}]+)\}`)
	path = reBrace.ReplaceAllStringFunc(path, func(m string) string {
		key := m[2 : len(m)-1]
		if IsParentProcessDirKey(key) {
			return m
		}
		val := GetEnvVarValue(key)
		if val == "" {
			return m
		}
		return val
	})

	return path
}

func Fetch(path string) (contents string, errorMessage string) {
	pathWithExpandedParentProcessDir, err := ExpandParentProcessDir(path)
	if err != nil {
		return "", path + ": Failed to resolve parent process dir: " + err.Error()
	}

	pathWithExpandedEnvVars := ExpandAllEnvVars(pathWithExpandedParentProcessDir)

	buffer, err := ioutil.ReadFile(pathWithExpandedEnvVars)
	if err != nil {
		return "", path + ": " + err.Error()
	}
	return string(buffer), ""
}

type ChooseFileResponse struct {
	Path  string `json:"path"`
	Error string `json:"error"`
}

func ChooseFileAndRespond(params RequestParams, output io.Writer) error {
	path, errorMessage := ChooseFile(params)
	response := &ChooseFileResponse{path, errorMessage}
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

type TbStyleConfigs struct {
	CountdownAllowSkip                      bool     `json:"CountdownAllowSkip"`
	ShowCountdown                           bool     `json:"ShowCountdown"`
	CountdownSeconds                        uint64   `json:"CountdownSeconds"`
	SkipConfirmationForInternalMail         bool     `json:"SkipConfirmationForInternalMail"`
	ConfirmMultipleRecipientDomains         bool     `json:"ConfirmMultipleRecipientDomains"`
	MinConfirmMultipleRecipientDomainsCount uint64   `json:"MinConfirmMultipleRecipientDomainsCount"`
	FixedInternalDomains                    []string `json:"FixedInternalDomains"`
	BuiltInAttentionDomainsItems            []string `json:"BuiltInAttentionDomainsItems"`
	BuiltInAttentionTermsItems              []string `json:"BuiltInAttentionTermsItems"`

	HasCountdownAllowSkip                      bool `json:"HasCountdownAllowSkip"`
	HasShowCountdown                           bool `json:"HasShowCountdown"`
	HasCountdownSeconds                        bool `json:"HasCountdownSeconds"`
	HasSkipConfirmationForInternalMail         bool `json:"HasSkipConfirmationForInternalMail"`
	HasConfirmMultipleRecipientDomains         bool `json:"HasConfirmMultipleRecipientDomains"`
	HasMinConfirmMultipleRecipientDomainsCount bool `json:"HasMinConfirmMultipleRecipientDomainsCount"`
	HasFixedInternalDomains                    bool `json:"HasFixedInternalDomains"`
	HasBuiltInAttentionDomainsItems            bool `json:"HasBuiltInAttentionDomainsItems"`
	HasBuiltInAttentionTermsItems              bool `json:"HasBuiltInAttentionTermsItems"`
}

type OutlookGPOConfigsResponse struct {
	Default TbStyleConfigs `json:"Default"`
	Locked  TbStyleConfigs `json:"Locked"`
}
