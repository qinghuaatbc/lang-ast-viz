package vm

import (
	"strings"
	"testing"

	cc "deepcode/compiler"
)

func compile(source string) []cc.BytecodeInstr {
	lex := cc.NewLexer(source)
	p := cc.NewParser(lex)
	ast := p.Parse()
	ir := cc.NewIRGen().Gen(ast)
	return cc.NewBytecodeGen().Gen(ir)
}

func run(source string) ([]string, error) {
	bc := compile(source)
	return NewVM(bc).Run()
}

func TestHalt(t *testing.T) {
	vm := NewVM([]cc.BytecodeInstr{
		{Op: cc.OP_HALT},
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
	vm := NewVM([]cc.BytecodeInstr{
		{Op: cc.OP_PUSH, Arg: 42},
		{Op: cc.OP_HALT},
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

func TestClassInitCall(t *testing.T) {
	out, err := run("class P{x=0;} fn __init__(a){self.x=a;} let p=P(42); print p.x;")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(out) != 1 || out[0] != "42" {
		t.Fatalf("expected [42], got %v", out)
	}
}

func TestElifChain(t *testing.T) {
	out, err := run("let x=2; if x==1 { print 1; } elif x==2 { print 2; } else { print 3; }")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(out) != 1 || out[0] != "2" {
		t.Fatalf("expected [2], got %v", out)
	}
}

func TestOptimizerPreservesOutput(t *testing.T) {
	out, err := run("print 2 + 3 * 4;")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(out) != 1 || out[0] != "14" {
		t.Fatalf("expected [14] (constant folded), got %v", out)
	}
}

func TestDivisionByZero(t *testing.T) {
	out, err := run("print 10 / 0;")
	if err == nil {
		t.Fatal("expected division by zero error")
	}
	_ = out
}

func TestNestedFuncCall(t *testing.T) {
	out, err := run("fn add(a,b){return a+b;} print add(add(1,2), add(3,4));")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(out) != 1 || out[0] != "10" {
		t.Fatalf("expected [10], got %v", out)
	}
}

func TestIntEquality(t *testing.T) {
	out, err := run("let a=5; let b=5; if a==b { print 1; } else { print 0; }")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(out) != 1 || out[0] != "1" {
		t.Fatalf("expected [1], got %v", out)
	}
}

func TestComplexExpression(t *testing.T) {
	out, err := run("print (2 + 3) * (4 + 5) - 6 / 2;")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(out) != 1 || out[0] != "42" {
		t.Fatalf("expected [42], got %v", out)
	}
}

func TestParserErrorContext(t *testing.T) {
	lex := cc.NewLexer("let x = ;\nprint 42;")
	p := cc.NewParser(lex)
	p.Parse()
	errs := p.Errors()
	if len(errs) == 0 {
		t.Fatal("expected parse errors")
	}
	if !strings.Contains(errs[0], "let x = ;") {
		t.Fatalf("expected source line in error, got: %s", errs[0])
	}
	if !strings.Contains(errs[0], "^") {
		t.Fatalf("expected caret in error, got: %s", errs[0])
	}
}
