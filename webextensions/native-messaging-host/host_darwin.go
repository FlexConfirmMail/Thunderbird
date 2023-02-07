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
	"log"
	"os"
)

func FetchOutlookGPOConfigsAndResponse() {
	response := OutlookGPOConfigsResponse{}

	body, err := json.Marshal(response)
	if err != nil {
		log.Fatal(err)
	}
	err = chrome.Post(body, os.Stdout)
	if err != nil {
		log.Fatal(err)
	}
}
