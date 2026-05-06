package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	"lang-ast-viz/compiler/lang"
	"lang-ast-viz/db"
	"lang-ast-viz/pipeline"
)

const (
	rateWindow   = time.Minute
	rateMaxHits  = 30
)

type rateLimiter struct {
	mu   sync.Mutex
	hits map[string][]time.Time
}

func newRateLimiter() *rateLimiter {
	return &rateLimiter{hits: make(map[string][]time.Time)}
}

func (rl *rateLimiter) allow(ip string) bool {
	now := time.Now()
	cutoff := now.Add(-rateWindow)
	rl.mu.Lock()
	defer rl.mu.Unlock()
	times := rl.hits[ip]
	// evict old entries
	i := 0
	for i < len(times) && times[i].Before(cutoff) {
		i++
	}
	times = times[i:]
	if len(times) >= rateMaxHits {
		rl.hits[ip] = times
		return false
	}
	rl.hits[ip] = append(times, now)
	return true
}

type Handler struct {
	db   *db.DB
	rl   *rateLimiter
}

func New(database *db.DB) *Handler {
	return &Handler{db: database, rl: newRateLimiter()}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("/api/compile", h.handleCompile)
	mux.HandleFunc("/api/history", h.handleHistory)
	mux.HandleFunc("/api/history/", h.handleHistoryByID)
	mux.HandleFunc("/api/languages", h.handleLanguages)
}

type compileRequest struct {
	Source   string `json:"source"`
	Language string `json:"language"`
}

func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return xff
	}
	return r.RemoteAddr
}

func (h *Handler) handleCompile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if !h.rl.allow(clientIP(r)) {
		http.Error(w, "rate limit exceeded — max 30 requests/minute", http.StatusTooManyRequests)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "request too large or bad request", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var req compileRequest
	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	validLangs := map[string]bool{"rust": true, "go": true, "python": true, "typescript": true, "c": true}
	if !validLangs[req.Language] {
		req.Language = "rust"
	}

	cfg := lang.GetConfig(lang.Parse(req.Language))
	res := pipeline.CompileWithLang(req.Source, cfg)

	if h.db != nil {
		go func() {
			if _, err := h.db.Save(req.Source, res); err != nil {
				log.Printf("db save error: %v", err)
			}
		}()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

func (h *Handler) handleLanguages(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	langs := []map[string]string{
		{"id": "rust", "name": "Rust-style", "desc": "let x = 10; print x;"},
		{"id": "go", "name": "Go-style", "desc": "var x = 10; print x;"},
		{"id": "python", "name": "Python-style", "desc": "x = 10\nprint(x)"},
		{"id": "typescript", "name": "TypeScript-style", "desc": "let x = 10; print x;"},
		{"id": "c", "name": "C-style", "desc": "int x = 10; printf x;"},
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(langs)
}

func (h *Handler) handleHistory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if h.db == nil {
		json.NewEncoder(w).Encode([]db.HistoryEntry{})
		return
	}
	entries, err := h.db.List(20)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(entries)
}

func (h *Handler) handleHistoryByID(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	// path: /api/history/{id}
	idStr := r.URL.Path[len("/api/history/"):]
	if idStr == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	// parse id
	var id int
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	if h.db == nil {
		http.Error(w, "db not available", http.StatusServiceUnavailable)
		return
	}
	entry, err := h.db.Get(id)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(entry)
}

func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}
