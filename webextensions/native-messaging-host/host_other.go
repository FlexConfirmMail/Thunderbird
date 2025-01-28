//go:build !windows && !darwin

/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

package main

import (
	"io"
)

func ChooseFile(params RequestParams) (path string, errorMessage string) {
	return "", ""
}

func FetchOutlookGPOConfigsAndResponse(output io.Writer) error {
	return nil
}
