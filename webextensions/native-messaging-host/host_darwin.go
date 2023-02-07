/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

//go:build darwin
// +build darwin

package main

import (
	"encoding/json"
	"github.com/lhside/chrome-go"
	"github.com/ncruces/zenity"
	"log"
	"os"
)


func ChooseFile(params RequestParams) (path string, errorMessage string) {
	filename, err := zenity.SelectFile(
		zenity.Title(params.Title),
		zenity.Filename(params.FileName),
		zenity.FileFilters{
			{params.DisplayName, []string{params.Pattern}, true},
		})
	if err == zenity.ErrCanceled {
		return filename, ""
	} else if err != nil {
		log.Fatal(err)
		return "", err.Error()
	}
	return filename, ""
}


func FetchOutlookGPOConfigsAndResponse() {
	response := OutlookGPOConfigsResponse{}

	// NOT IMPLEMENTED YET

	body, err := json.Marshal(response)
	if err != nil {
		log.Fatal(err)
	}
	err = chrome.Post(body, os.Stdout)
	if err != nil {
		log.Fatal(err)
	}
}
