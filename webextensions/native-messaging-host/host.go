package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"github.com/harry1453/go-common-file-dialog/cfd"
	"github.com/lhside/chrome-go"
	"io/ioutil"
	"log"
	"os"
)

const VERSION = "3.0.7";

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
	Command string        `json:"command"`
	Params  RequestParams `json:"params"`
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
	request := &Request{}
	if err := json.Unmarshal(rawRequest, request); err != nil {
		log.Fatal(err)
	}

	switch command := request.Command; command {
	case "fetch":
		FetchAndRespond(request.Params.Path)
	case "choose-file":
		ChooseFileAndRespond(request.Params)
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
	openDialog, err := cfd.NewOpenFileDialog(cfd.DialogConfig{
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
	if err != nil {
		log.Fatal(err)
		return "", err.Error()
	}
	if err := openDialog.Show(); err != nil {
		log.Fatal(err)
		return "", err.Error()
	}
	result, err := openDialog.GetResult()
	if err != nil {
		log.Fatal(err)
		return "", err.Error()
	}
	return result, ""
}
