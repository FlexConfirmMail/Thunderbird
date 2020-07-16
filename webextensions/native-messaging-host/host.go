package main

import (
	"encoding/json"
	"github.com/lhside/chrome-go"
	"io/ioutil"
	"log"
	"os"
)

type RequestParams struct {
	Path string `json:path`
}
type Request struct {
	Command string        `json:"command"`
	Params  RequestParams `json:"params"`
}

func main() {
	log.SetOutput(ioutil.Discard)

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
	default: // just echo
		err = chrome.Post(rawRequest, os.Stdout)
		if err != nil {
			log.Fatal(err)
		}
	}
}

type FetchResponse struct {
	Contents string `json:"contents"`
}

func FetchAndRespond(path string) {
	contents := Fetch(path)
	response := &FetchResponse{contents}
	body, err := json.Marshal(response)
	if err != nil {
		log.Fatal(err)
	}
	err = chrome.Post(body, os.Stdout)
	if err != nil {
		log.Fatal(err)
	}
}

func Fetch(path string) (contents string) {
	buffer, err := ioutil.ReadFile(path)
	if err != nil {
		return ""
	} else {
		return string(buffer)
	}
}
