//go:build darwin

/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

package main

import (
	"encoding/json"
	"github.com/lhside/chrome-go"
	"github.com/ncruces/zenity"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
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
		return "", err.Error()
	}
	return filename, ""
}

func FetchOutlookGPOConfigsAndResponse(output io.Writer) error {
	response := OutlookGPOConfigsResponse{}

	// NOT IMPLEMENTED YET

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

func GetParentProcessBinPath() (string, error) {
	ppid := os.Getppid()

	out, err := exec.Command("ps", "-p", strconv.Itoa(ppid), "-o", "comm=").Output()
	if err != nil {
		return "", err
	}

	binPath := strings.TrimSpace(string(out))
	return binPath, nil
}

func GetParentProcessDir() (string, error) {
	binPath, err := GetParentProcessBinPath()
	if err != nil {
		return "", err
	}

	if !filepath.IsAbs(binPath) {
		full, err := exec.LookPath(binPath)
		if err == nil {
			binPath = full
		}
	}

	dir := filepath.Dir(binPath)
	return dir, nil
}
