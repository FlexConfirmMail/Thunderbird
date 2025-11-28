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

func CreateTempFileToFetch(t *testing.T, dir, name, content string) string {
	t.Helper()

	err := os.MkdirAll(dir, 0755)
	if err != nil {
		t.Fatalf("mkdir failed: %v", err)
	}

	path := filepath.Join(dir, name)
	err = os.WriteFile(path, []byte(content), 0644)
	if err != nil {
		t.Fatalf("write failed: %v", err)
	}

	return path
}

func TestFetch_EnvironmentVariableExpansion(t *testing.T) {
	tmpDir := t.TempDir()

	os.Setenv("TEST_FETCH_DIR", tmpDir)
	defer os.Unsetenv("TEST_FETCH_DIR")

	expected := "hello from env test"
	CreateTempFileToFetch(t, tmpDir, "test.txt", expected)

	cases := []struct {
		name string
		path string
	}{
		{
			name: "percent style",
			path: "%TEST_FETCH_DIR%/test.txt",
		},
		{
			name: "percent style lowercase env name",
			path: "%test_fetch_dir%/test.txt",
		},
		{
			name: "brace style",
			path: "${TEST_FETCH_DIR}/test.txt",
		},
		{
			name: "brace style lowercase env name",
			path: "${test_fetch_dir}/test.txt",
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			contents, errMsg := Fetch(c.path)

			if errMsg != "" {
				t.Fatalf("unexpected error: %s", errMsg)
			}

			if contents != expected {
				t.Fatalf("unexpected contents: got %q, want %q", contents, expected)
			}
		})
	}
}