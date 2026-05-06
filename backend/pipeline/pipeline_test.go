package pipeline

import (
	"testing"
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

func TestFunctionCall(t *testing.T) {
	res := Compile("fn add(a,b){return a+b;} print add(3,4);")
	if len(res.Errors) > 0 {
		t.Fatalf("unexpected errors: %v", res.Errors)
	}
	if len(res.Output) != 1 || res.Output[0] != "7" {
		t.Fatalf("expected [7], got %v", res.Output)
	}
}

func TestModulo(t *testing.T) {
	res := Compile("print 17 % 5;")
	if len(res.Errors) > 0 {
		t.Fatalf("unexpected errors: %v", res.Errors)
	}
	if len(res.Output) != 1 || res.Output[0] != "2" {
		t.Fatalf("expected [2], got %v", res.Output)
	}
}

func TestClassInstantiation(t *testing.T) {
	res := Compile("class P{x=0;} let p=P(42); print p.x;")
	if len(res.Errors) > 0 {
		t.Fatalf("unexpected errors: %v", res.Errors)
	}
	if len(res.Output) != 1 || res.Output[0] != "42" {
		t.Fatalf("expected [42], got %v", res.Output)
	}
}

func TestObjectLiteral(t *testing.T) {
	res := Compile("let p=[x=10,y=20]; print p.x; print p.y;")
	if len(res.Errors) > 0 {
		t.Fatalf("unexpected errors: %v", res.Errors)
	}
	if len(res.Output) != 2 || res.Output[0] != "10" || res.Output[1] != "20" {
		t.Fatalf("expected [10 20], got %v", res.Output)
	}
}

func TestErrorRecovery(t *testing.T) {
	res := Compile("let x = ; print 42;")
	if len(res.Errors) == 0 {
		t.Fatal("expected errors but got none")
	}
	if len(res.Output) != 1 || res.Output[0] != "42" {
		t.Fatalf("expected [42] after recovery, got %v", res.Output)
	}
}

func TestInheritance(t *testing.T) {
	res := Compile("class A{x=0;} class B extends A{y=0;} let b=B(1,2); print b.x; print b.y;")
	if len(res.Errors) > 0 {
		t.Fatalf("unexpected errors: %v", res.Errors)
	}
	if len(res.Output) != 2 || res.Output[0] != "1" || res.Output[1] != "2" {
		t.Fatalf("expected [1 2], got %v", res.Output)
	}
}
