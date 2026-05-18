package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

var safeIdent = regexp.MustCompile(`^[A-Za-z0-9_.:+-]{1,64}$`)

func (h *Handler) handleMan(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	name := r.URL.Query().Get("name")
	section := r.URL.Query().Get("section") // optional: "2", "3", etc.

	if name == "" || !safeIdent.MatchString(name) {
		jsonError(w, "invalid name", http.StatusBadRequest)
		return
	}
	if section != "" && !safeIdent.MatchString(section) {
		jsonError(w, "invalid section", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	text, err := fetchManPage(ctx, name, section)
	if err != nil {
		jsonError(w, fmt.Sprintf("man page not found: %s", name), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"name":    name,
		"content": text,
	})
}

// fetchManPage tries mandoc first, then falls back to reading .gz files.
func fetchManPage(ctx context.Context, name, section string) (string, error) {
	// Sections to try in order
	sections := []string{"2", "3", "1", "4", "5", "7", "8"}
	if section != "" {
		sections = []string{section}
	}

	for _, sec := range sections {
		pattern := fmt.Sprintf("/usr/share/man/man%s/%s.%s*", sec, name, sec)
		matches, _ := filepath.Glob(pattern)
		if len(matches) == 0 {
			// try lowercase
			pattern = fmt.Sprintf("/usr/share/man/man%s/%s.%s*", sec, strings.ToLower(name), sec)
			matches, _ = filepath.Glob(pattern)
		}
		if len(matches) == 0 {
			continue
		}

		var buf bytes.Buffer
		cmd := exec.CommandContext(ctx, "mandoc", "-T", "ascii", matches[0])
		cmd.Stdout = &buf
		if err := cmd.Run(); err != nil {
			continue
		}
		text := cleanManText(buf.String())
		if text != "" {
			return text, nil
		}
	}
	return "", fmt.Errorf("not found")
}

// cleanManText removes overstrike formatting (char BS char) from mandoc -T ascii output.
func cleanManText(s string) string {
	var b strings.Builder
	b.Grow(len(s))
	runes := []rune(s)
	for i := 0; i < len(runes); i++ {
		if i+2 < len(runes) && runes[i+1] == '\b' {
			// bold/underline: char + BS + char — keep the second char
			b.WriteRune(runes[i+2])
			i += 2
			continue
		}
		if runes[i] == '\b' {
			continue
		}
		b.WriteRune(runes[i])
	}
	return b.String()
}
