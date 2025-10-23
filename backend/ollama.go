package main

import (
	"bytes"
	"fmt"
	"os/exec"
	"strings"
)

func RunOllama(prompt string) (string, error) {
	cmd := exec.Command("ollama", "run", "mistral")
	cmd.Stdin = bytes.NewBufferString(prompt)

	var out bytes.Buffer
	cmd.Stdout = &out

	err := cmd.Run()
	if err != nil {
		return "", fmt.Errorf("Ollama error: %v", err)
	}

	resp := strings.TrimSpace(out.String())
	if resp == "" {
		return "", fmt.Errorf("Empty Ollama response")
	}
	return resp, nil
}
