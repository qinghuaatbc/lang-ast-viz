package handler

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

var headerSearchPaths = []string{
	"/usr/include/",
	"/usr/local/include/",
}

func (h *Handler) handleHeader(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	name := r.URL.Query().Get("name")
	if name == "" {
		jsonError(w, "name required", http.StatusBadRequest)
		return
	}
	if strings.Contains(name, "..") || strings.HasPrefix(name, "/") || strings.ContainsRune(name, 0) {
		jsonError(w, "invalid name", http.StatusBadRequest)
		return
	}
	clean := filepath.Clean(name)
	if strings.HasPrefix(clean, "..") || filepath.IsAbs(clean) {
		jsonError(w, "invalid name", http.StatusBadRequest)
		return
	}

	var content []byte
	var foundPath string
	for _, base := range headerSearchPaths {
		p := filepath.Join(base, clean)
		// Ensure the resolved path is still inside base
		if !strings.HasPrefix(p, base) {
			continue
		}
		b, err := os.ReadFile(p)
		if err == nil {
			content = b
			foundPath = p
			break
		}
	}
	if content == nil {
		jsonError(w, "header not found: "+name, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = foundPath
	json.NewEncoder(w).Encode(map[string]string{
		"name":    name,
		"content": string(content),
	})
}
