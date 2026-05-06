package vm

import (
	"testing"

	"lang-ast-viz/compiler"
)

func compile(source string) []compiler.BytecodeInstr {
	lex := compiler.NewLexer(source)
	p := compiler.NewParser(lex)
	ast := p.Parse()
	ir := compiler.NewIRGen().Gen(ast)
	return compiler.NewBytecodeGen().Gen(ir)
}

func run(source string) ([]string, error) {
	bc := compile(source)
	return NewVM(bc).Run()
}

func TestHalt(t *testing.T) {
	vm := NewVM([]compiler.BytecodeInstr{
		{Op: compiler.OP_HALT},
	})
	out, err := vm.Run()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(out) != 0 {
		t.Fatalf("expected empty output, got %v", out)
	}
}

func TestPushPop(t *testing.T) {
	vm := NewVM([]compiler.BytecodeInstr{
		{Op: compiler.OP_PUSH, Arg: 42},
		{Op: compiler.OP_HALT},
	})
	out, err := vm.Run()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(vm.stack) != 1 || vm.stack[0].Int != 42 {
		t.Fatalf("expected [42], got %v", vm.stack)
	}
	_ = out
}

func TestPrint(t *testing.T) {
	out, err := run("print 42;")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(out) != 1 || out[0] != "42" {
		t.Fatalf("expected [42], got %v", out)
	}
}

func TestArithmetic(t *testing.T) {
	out, err := run("print 2 + 3 * 4;")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(out) != 1 || out[0] != "14" {
		t.Fatalf("expected [14], got %v", out)
	}
}

func TestComparison(t *testing.T) {
	out, err := run("print 5 > 3;")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(out) != 1 || out[0] != "1" {
		t.Fatalf("expected [1], got %v", out)
	}
}

func TestStringLit(t *testing.T) {
	out, err := run(`print "hello";`)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(out) != 1 || out[0] != "hello" {
		t.Fatalf("expected [hello], got %v", out)
	}
}

func TestScopeShadowing(t *testing.T) {
	out, err := run("let a=5; if true { let a=10; print a; } print a;")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(out) != 2 || out[0] != "10" || out[1] != "5" {
		t.Fatalf("expected [10 5], got %v", out)
	}
}

func TestStringConcat(t *testing.T) {
	out, err := run(`let a="Hello, "; let b="World!"; print a + b;`)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(out) != 1 || out[0] != "Hello, World!" {
		t.Fatalf("expected [Hello, World!], got %v", out)
	}
}

func TestFunctionArgs(t *testing.T) {
	out, err := run("fn sub(a,b){return a-b;} print sub(10,3);")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(out) != 1 || out[0] != "7" {
		t.Fatalf("expected [7], got %v", out)
	}
}

func TestUndefinedVar(t *testing.T) {
	out, err := run("print undefinedVar;")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(out) == 0 {
		t.Fatal("expected runtime error in output")
	}
}

func TestNestedScope(t *testing.T) {
	out, err := run("let x=1; if true { let y=2; print x+y; }")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(out) != 1 || out[0] != "3" {
		t.Fatalf("expected [3], got %v", out)
	}
}

func TestAssignVarToVar(t *testing.T) {
	out, err := run("let x=10; let y=x; print y;")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(out) != 1 || out[0] != "10" {
		t.Fatalf("expected [10], got %v", out)
	}
}
