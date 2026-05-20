package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	"deepcode/compiler/lang"
	"deepcode/db"
	"deepcode/pipeline"
)

const maxBodySize = 1 << 16 // 64KB max request body

const (
	rateWindow   = time.Minute
	rateMaxHits  = 30
	rateCleanInt = 5 * time.Minute
)

type rateLimiter struct {
	mu     sync.Mutex
	hits   map[string][]time.Time
	done   chan struct{}
	ctx    context.Context
	cancel context.CancelFunc
}

func newRateLimiter() *rateLimiter {
	ctx, cancel := context.WithCancel(context.Background())
	rl := &rateLimiter{hits: make(map[string][]time.Time), done: make(chan struct{}), ctx: ctx, cancel: cancel}
	go rl.cleanupLoop()
	return rl
}

func (rl *rateLimiter) Stop() {
	rl.cancel()
}

func (rl *rateLimiter) cleanupLoop() {
	ticker := time.NewTicker(rateCleanInt)
	defer ticker.Stop()
	defer close(rl.done)
	for {
		select {
		case <-rl.ctx.Done():
			return
		case <-ticker.C:
			now := time.Now()
			cutoff := now.Add(-rateWindow)
			rl.mu.Lock()
			for ip, times := range rl.hits {
				i := 0
				for i < len(times) && times[i].Before(cutoff) {
					i++
				}
				if i >= len(times) {
					delete(rl.hits, ip)
				} else {
					rl.hits[ip] = times[i:]
				}
			}
			rl.mu.Unlock()
		}
	}
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

func (h *Handler) Stop() {
	h.rl.Stop()
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("/api/compile", h.handleCompile)
	mux.HandleFunc("/api/history", h.handleHistory)
	mux.HandleFunc("/api/history/", h.handleHistoryByID)
	mux.HandleFunc("/api/languages", h.handleLanguages)
	mux.HandleFunc("/api/run", h.handleRun)
	mux.HandleFunc("/api/header", h.handleHeader)
	mux.HandleFunc("/api/man", h.handleMan)
	// Versioned API
	mux.HandleFunc("/api/v1/compile", h.handleCompile)
	mux.HandleFunc("/api/v1/history", h.handleHistory)
	mux.HandleFunc("/api/v1/history/", h.handleHistoryByID)
	mux.HandleFunc("/api/v1/languages", h.handleLanguages)
	mux.HandleFunc("/api/v1/run", h.handleRun)
	mux.HandleFunc("/api/v1/header", h.handleHeader)
	mux.HandleFunc("/api/codechip/parse", h.handleCodeChipParse)
}

type compileRequest struct {
	Source   string `json:"source"`
	Language string `json:"language"`
}

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return xff
	}
	return r.RemoteAddr
}

func (h *Handler) handleCompile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if !h.rl.allow(clientIP(r)) {
		jsonError(w, "rate limit exceeded — max 30 req/min", http.StatusTooManyRequests)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxBodySize)
	body, err := io.ReadAll(r.Body)
	if err != nil {
		jsonError(w, "request too large", http.StatusRequestEntityTooLarge)
		return
	}
	defer r.Body.Close()

	var req compileRequest
	if err := json.Unmarshal(body, &req); err != nil {
		jsonError(w, "invalid json", http.StatusBadRequest)
		return
	}

	validLang := false
	for _, l := range lang.AllLanguages() {
		if l.ID == req.Language {
			validLang = true
			break
		}
	}
	if !validLang {
		req.Language = "rust"
	}

	cfg := lang.GetConfig(lang.Parse(req.Language))
	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()
	res := pipeline.CompileWithLang(ctx, req.Source, cfg)

	var dbData []byte
	if h.db != nil {
		dbData, _ = json.Marshal(res)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)

	if h.db != nil && dbData != nil {
		go func() {
			if _, err := h.db.SaveRaw(req.Source, dbData); err != nil {
				log.Printf("db save error: %v", err)
			}
		}()
	}
}

func (h *Handler) handleLanguages(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lang.AllLanguages())
}

func (h *Handler) handleHistory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if h.db == nil {
		json.NewEncoder(w).Encode([]db.HistoryEntry{})
		return
	}
	entries, err := h.db.List(20)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(entries)
}

func (h *Handler) handleHistoryByID(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	idStr := r.URL.Path[len("/api/history/"):]
	if idStr == "" {
		jsonError(w, "bad request", http.StatusBadRequest)
		return
	}
	var id int
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		jsonError(w, "invalid id", http.StatusBadRequest)
		return
	}
	if h.db == nil {
		jsonError(w, "db not available", http.StatusServiceUnavailable)
		return
	}
	entry, err := h.db.Get(id)
	if err != nil {
		jsonError(w, "not found", http.StatusNotFound)
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
