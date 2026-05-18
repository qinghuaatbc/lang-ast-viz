package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

type runRequest struct {
	Code     string `json:"code"`
	Language string `json:"language"`
}

type runResponse struct {
	Output []string `json:"output"`
	Stderr string   `json:"stderr,omitempty"`
	Error  string   `json:"error,omitempty"`
}

func (h *Handler) handleRun(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json")

	body := make([]byte, 0, 4096)
	buf := make([]byte, 4096)
	for {
		n, err := r.Body.Read(buf)
		if n > 0 {
			body = append(body, buf[:n]...)
		}
		if err != nil || len(body) > 128*1024 {
			break
		}
	}

	var req runRequest
	if err := json.Unmarshal(body, &req); err != nil {
		json.NewEncoder(w).Encode(runResponse{Error: "invalid JSON: " + err.Error()})
		return
	}

	resp := compileAndRun(req.Code, req.Language)
	json.NewEncoder(w).Encode(resp)
}

func compileAndRun(code, lang string) runResponse {
	dir, err := os.MkdirTemp("", "tlpi-run-*")
	if err != nil {
		return runResponse{Error: "tempdir: " + err.Error()}
	}
	defer os.RemoveAll(dir)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	switch lang {
	case "c":
		return runC(ctx, dir, code)
	default:
		return runResponse{Error: fmt.Sprintf("unsupported language: %q (only 'c' supported)", lang)}
	}
}

func runC(ctx context.Context, dir, code string) runResponse {
	src := filepath.Join(dir, "main.c")
	bin := filepath.Join(dir, "main")

	if err := os.WriteFile(src, []byte(code), 0600); err != nil {
		return runResponse{Error: "write source: " + err.Error()}
	}

	// compile
	var compileStderr bytes.Buffer
	cc := exec.CommandContext(ctx, "gcc",
		"-O0", "-o", bin, src,
		"-lpthread", "-lrt", "-lm",
		"-Wall", "-Wno-unused-result",
	)
	cc.Stderr = &compileStderr
	if err := cc.Run(); err != nil {
		return runResponse{Error: "compile error", Stderr: compileStderr.String()}
	}

	// run
	var stdout, stderr bytes.Buffer
	run := exec.CommandContext(ctx, bin)
	run.Stdout = &stdout
	run.Stderr = &stderr
	run.Dir = dir

	_ = run.Run() // ignore exit code; capture output either way

	out := splitLines(stdout.String())
	if len(out) == 0 {
		out = []string{}
	}
	return runResponse{Output: out, Stderr: stderr.String()}
}

func splitLines(s string) []string {
	if s == "" {
		return nil
	}
	var lines []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == '\n' {
			lines = append(lines, s[start:i])
			start = i + 1
		}
	}
	if start < len(s) {
		lines = append(lines, s[start:])
	}
	return lines
}
