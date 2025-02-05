/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

package main

import (
	"bytes"
	"encoding/binary"
	"github.com/stretchr/testify/assert"
	"io"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// Utilities
func CreateInput(input string) io.Reader {
	buffer := new(bytes.Buffer)
	err := binary.Write(buffer, binary.LittleEndian, []byte(input))
	if err != nil {
		return nil
	}

	header := make([]byte, 4)
	binary.LittleEndian.PutUint32(header, uint32(buffer.Len()))
	message := append(header, buffer.Bytes()...)
	reader := bytes.NewReader(message)
	return reader
}

func ReadOutput(reader io.Reader) string {
	var length uint32
	if err := binary.Read(reader, binary.LittleEndian, &length); err != nil {
		return ""
	}

	if length == 0 {
		return ""
	}

	message := make([]byte, length)
	if n, err := reader.Read(message); err != nil || n != len(message) {
		return ""
	}
	return string(message)
}

// CLI
func TestCLIOptions_ReportVersion(t *testing.T) {
	var output bytes.Buffer
	var errorOut bytes.Buffer
	context := &Context{
		ReportVersion: true,
		Output:        &output,
		ErrorOut:      &errorOut,
	}

	err := ProcessRequest(context)
	assert.NoError(t, err)

	assert.Equal(t, "", errorOut.String())
	assert.Equal(t, VERSION+"\n", output.String())
}

func TestCLIOptions_Command_Fetch_Success(t *testing.T) {
	wd, _ := os.Getwd()
	path := filepath.Join(wd, "..", "manifest.json")
	var output bytes.Buffer
	var errorOut bytes.Buffer
	context := &Context{
		Command:       "fetch",
		CommandParams: `{"Path":"` + path + `"}`,
		Output:        &output,
		ErrorOut:      &errorOut,
	}

	err := ProcessRequest(context)
	assert.NoError(t, err)
	assert.Equal(t, "", errorOut.String())

	fileContents, err := ioutil.ReadFile(path)
	assert.NoError(t, err)
	assert.Equal(t, string(fileContents) + "\n", output.String())
}

// Native messaging host
func TestFetch_Missing(t *testing.T) {
	wd, _ := os.Getwd()
	path := filepath.Join(wd, "missing.txt")
	inputMessage := `{` +
		`"command":"fetch",` +
		`"params":{` +
		`  "Path":"` + path + `"` +
		`}` +
		`}`
	input := CreateInput(inputMessage)
	var output bytes.Buffer
	var errorOut bytes.Buffer
	context := &Context{
		Input:    input,
		Output:   &output,
		ErrorOut: &errorOut,
	}

	err := ProcessRequest(context)
	assert.NoError(t, err)
	assert.Equal(t, "", errorOut.String())

	assert.Equal(t, `{"contents":"","error":"`+path+`: open `+path+`: no such file or directory"}`, ReadOutput(&output))
}

func TestFetch_Success(t *testing.T) {
	wd, _ := os.Getwd()
	path := filepath.Join(wd, "..", "manifest.json")
	inputMessage := `{` +
		`"command":"fetch",` +
		`"params":{` +
		`  "Path":"` + path + `"` +
		`}` +
		`}`
	input := CreateInput(inputMessage)
	var output bytes.Buffer
	var errorOut bytes.Buffer
	context := &Context{
		Input:    input,
		Output:   &output,
		ErrorOut: &errorOut,
	}

	err := ProcessRequest(context)
	assert.NoError(t, err)
	assert.Equal(t, "", errorOut.String())

	fileContents, err := ioutil.ReadFile(path)
	assert.NoError(t, err)
	escapedContents := strings.ReplaceAll(
		strings.ReplaceAll(string(fileContents), `"`, `\"`),
		"\n", `\n`)
	assert.Equal(t, `{"contents":"`+escapedContents+`","error":""}`, ReadOutput(&output))
}
