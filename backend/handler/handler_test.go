package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCompileEndpoint(t *testing.T) {
	h := New(nil)
	mux := http.NewServeMux()
	h.Register(mux)

	body := `{"source":"print 42;","language":"rust"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/compile", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var res map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
		t.Fatalf("json decode: %v", err)
	}
	if res["errors"] != nil {
		t.Fatalf("unexpected errors: %v", res["errors"])
	}
}

func TestCompileWithLet(t *testing.T) {
	h := New(nil)
	mux := http.NewServeMux()
	h.Register(mux)

	body := `{"source":"let x = 10;\nprint x;","language":"rust"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/compile", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var res map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &res)
	output := res["output"].([]interface{})
	if len(output) != 1 || output[0].(string) != "10" {
		t.Fatalf("expected [10], got %v", output)
	}
}

func TestCompilePythonMode(t *testing.T) {
	h := New(nil)
	mux := http.NewServeMux()
	h.Register(mux)

	body := `{"source":"x = 5\nprint(x)","language":"python"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/compile", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var res map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &res)
	output := res["output"].([]interface{})
	if len(output) != 1 || output[0].(string) != "5" {
		t.Fatalf("expected [5], got %v", output)
	}
}

func TestLanguagesEndpoint(t *testing.T) {
	h := New(nil)
	mux := http.NewServeMux()
	h.Register(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/languages", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var langs []map[string]string
	json.Unmarshal(w.Body.Bytes(), &langs)
	if len(langs) != 5 {
		t.Fatalf("expected 5 languages, got %d", len(langs))
	}
}

func TestCompileInvalidLang(t *testing.T) {
	h := New(nil)
	mux := http.NewServeMux()
	h.Register(mux)

	body := `{"source":"print 42;","language":"invalid"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/compile", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 (falls back to rust), got %d", w.Code)
	}
}

func TestCompileWithFormattedIR(t *testing.T) {
	h := New(nil)
	mux := http.NewServeMux()
	h.Register(mux)

	body := `{"source":"print 42;","language":"rust"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/compile", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	var res map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &res)
	ir := res["ir"].([]interface{})
	if len(ir) == 0 {
		t.Fatal("expected non-empty IR")
	}
	first := ir[0].(map[string]interface{})
	if _, ok := first["formatted"]; !ok {
		t.Fatal("expected formatted field in IR")
	}
}
