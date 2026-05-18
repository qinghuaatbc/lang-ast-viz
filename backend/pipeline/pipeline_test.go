package pipeline

import (
	"context"
	"encoding/json"
	"testing"

	"deepcode/compiler/lang"
)

func TestBasicArithmetic(t *testing.T) {
	res := Compile("let x = 10; print x;")
	if len(res.Errors) > 0 {
		t.Fatalf("unexpected errors: %v", res.Errors)
	}
	if len(res.Output) != 1 || res.Output[0] != "10" {
		t.Fatalf("expected [10], got %v", res.Output)
	}
}

func TestStringLiteral(t *testing.T) {
	res := Compile(`print "hello";`)
	if len(res.Errors) > 0 {
		t.Fatalf("unexpected errors: %v", res.Errors)
	}
	if len(res.Output) != 1 || res.Output[0] != "hello" {
		t.Fatalf("expected [hello], got %v", res.Output)
	}
}

func TestWhileLoop(t *testing.T) {
	res := Compile("let i=0; while i<3 { print i; i=i+1; }")
	if len(res.Errors) > 0 {
		t.Fatalf("unexpected errors: %v", res.Errors)
	}
	if len(res.Output) != 3 || res.Output[0] != "0" || res.Output[1] != "1" || res.Output[2] != "2" {
		t.Fatalf("expected [0 1 2], got %v", res.Output)
	}
}

func TestIfElse(t *testing.T) {
	res := Compile("let x=5; if x>3 { print 1; } else { print 0; }")
	if len(res.Errors) > 0 {
		t.Fatalf("unexpected errors: %v", res.Errors)
	}
	if len(res.Output) != 1 || res.Output[0] != "1" {
		t.Fatalf("expected [1], got %v", res.Output)
	}
}

func TestElifChain(t *testing.T) {
	res := Compile("let x=2; if x==1 { print 1; } elif x==2 { print 2; } else { print 3; }")
	if len(res.Errors) > 0 {
		t.Fatalf("unexpected errors: %v", res.Errors)
	}
	if len(res.Output) != 1 || res.Output[0] != "2" {
		t.Fatalf("expected [2], got %v", res.Output)
	}
}

func TestElifFallback(t *testing.T) {
	res := Compile("let x=5; if x==1 { print 1; } elif x==2 { print 2; } else { print 3; }")
	if len(res.Errors) > 0 {
		t.Fatalf("unexpected errors: %v", res.Errors)
	}
	if len(res.Output) != 1 || res.Output[0] != "3" {
		t.Fatalf("expected [3], got %v", res.Output)
	}
}

func TestASTTypeName(t *testing.T) {
	res := Compile("print 42;")
	if res.AST == nil {
		t.Fatal("expected non-nil AST")
	}
	data, err := json.Marshal(res.AST)
	if err != nil {
		t.Fatalf("marshal error: %v", err)
	}
	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if raw["typeName"] != "Program" {
		t.Fatalf("expected typeName=Program, got %v", raw["typeName"])
	}
}

func TestPythonColon(t *testing.T) {
	cfg := lang.GetConfig(lang.Python)
	res := CompileWithLang(context.Background(), "x=5\nif x > 3: {\nprint(1)\n} else: {\nprint(0)\n}", cfg)
	if len(res.Errors) > 0 {
		t.Fatalf("unexpected errors: %v", res.Errors)
	}
	if len(res.Output) != 1 || res.Output[0] != "1" {
		t.Fatalf("expected [1], got %v", res.Output)
	}
}
