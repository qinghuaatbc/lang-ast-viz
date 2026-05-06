package pipeline_test

import (
	"testing"

	"lang-ast-viz/pipeline"
)

func compile(src string) *pipeline.CompileResult {
	return pipeline.Compile(src)
}

func assertOutput(t *testing.T, name string, r *pipeline.CompileResult, want ...string) {
	t.Helper()
	if len(r.Errors) > 0 {
		t.Errorf("%s: unexpected errors: %v", name, r.Errors)
		return
	}
	if len(r.Output) != len(want) {
		t.Errorf("%s: output len=%d want=%d: got %v want %v", name, len(r.Output), len(want), r.Output, want)
		return
	}
	for i, w := range want {
		if r.Output[i] != w {
			t.Errorf("%s: output[%d]=%q want %q", name, i, r.Output[i], w)
		}
	}
}

func assertError(t *testing.T, name string, r *pipeline.CompileResult, substr string) {
	t.Helper()
	for _, e := range r.Errors {
		if len(e) > 0 {
			return
		}
	}
	t.Errorf("%s: expected error containing %q, got none", name, substr)
}

func TestPrintDirectIdent(t *testing.T) {
	r := compile("let x = 42;\nprint x;")
	assertOutput(t, "print ident", r, "42")
}

func TestPrintDirectLiteral(t *testing.T) {
	r := compile("print 99;")
	assertOutput(t, "print literal", r, "99")
}

func TestIdentAssignment(t *testing.T) {
	r := compile("let a = 5;\nlet b = a;\nprint b;")
	assertOutput(t, "ident assign", r, "5")
}

func TestWhileLoop(t *testing.T) {
	r := compile("let i = 0;\nwhile i < 3 {\n  print i;\n  i = i + 1;\n}")
	assertOutput(t, "while loop", r, "0", "1", "2")
}

func TestFactorial(t *testing.T) {
	r := compile("let n = 5;\nlet fact = 1;\nwhile n > 0 {\n  fact = fact * n;\n  n = n - 1;\n}\nprint fact;")
	assertOutput(t, "factorial", r, "120")
}

func TestFibonacci(t *testing.T) {
	r := compile("let a = 0;\nlet b = 1;\nlet i = 0;\nwhile i < 6 {\n  let c = a + b;\n  print c;\n  a = b;\n  b = c;\n  i = i + 1;\n}")
	assertOutput(t, "fibonacci", r, "1", "2", "3", "5", "8", "13")
}

func TestIfElse(t *testing.T) {
	r1 := compile("let x = 5;\nif x > 3 {\n  print 1;\n} else {\n  print 0;\n}")
	assertOutput(t, "if true", r1, "1")

	r2 := compile("let x = 1;\nif x > 3 {\n  print 1;\n} else {\n  print 0;\n}")
	assertOutput(t, "if false", r2, "0")
}

func TestModulo(t *testing.T) {
	r := compile("let x = 7;\nif x % 2 == 0 {\n  print 1;\n} else {\n  print 0;\n}")
	assertOutput(t, "modulo odd", r, "0")

	r2 := compile("let x = 8;\nif x % 2 == 0 {\n  print 1;\n} else {\n  print 0;\n}")
	assertOutput(t, "modulo even", r2, "1")
}

func TestDivisionByZero(t *testing.T) {
	r := compile("let x = 10;\nlet y = 0;\nprint x / y;")
	assertError(t, "div zero", r, "division by zero")
}

func TestModuloByZero(t *testing.T) {
	r := compile("let x = 10;\nlet y = 0;\nprint x % y;")
	assertError(t, "mod zero", r, "division by zero")
}

func TestInfiniteLoopLimit(t *testing.T) {
	r := compile("let x = 1;\nwhile x > 0 {\n  x = x + 1;\n}")
	assertError(t, "infinite loop", r, "limit reached")
}

func TestMultiFieldObject(t *testing.T) {
	r := compile("let p = [x = 10, y = 20];\nprint p.x;\nprint p.y;")
	assertOutput(t, "multi-field obj", r, "10", "20")
}

func TestObjectExpression(t *testing.T) {
	r := compile("let p = [x = 5, y = 3];\nlet q = [x = p.x + p.y, y = p.x - p.y];\nprint q.x;\nprint q.y;")
	assertOutput(t, "object expr", r, "8", "2")
}

func TestSumLoop(t *testing.T) {
	r := compile("let sum = 0;\nlet i = 1;\nwhile i <= 10 {\n  sum = sum + i;\n  i = i + 1;\n}\nprint sum;")
	assertOutput(t, "sum 1..10", r, "55")
}

func TestOperatorPrecedence(t *testing.T) {
	r := compile("let x = 1;\nlet y = 2;\nlet z = 3;\nprint x + y * z;")
	assertOutput(t, "precedence * before +", r, "7")

	r2 := compile("print (1 + 2) * 3;")
	assertOutput(t, "precedence parens", r2, "9")
}

func TestBoolLiteral(t *testing.T) {
	r := compile("let t = true;\nlet f = false;\nif t {\n  print 1;\n}\nif f {\n  print 2;\n}")
	assertOutput(t, "bool literal", r, "1")
}

func TestSwapVariables(t *testing.T) {
	r := compile("let x = 1;\nlet y = 2;\nlet t = x;\nx = y;\ny = t;\nprint x;\nprint y;")
	assertOutput(t, "swap", r, "2", "1")
}

func TestClassBasic(t *testing.T) {
	r := compile("class Point {\n  x = 0;\n  y = 0;\n}\nlet p = Point(10, 20);\nprint p.x;\nprint p.y;")
	assertOutput(t, "class basic", r, "10", "20")
}

func TestClassInheritance(t *testing.T) {
	r := compile("class Point {\n  x = 0;\n  y = 0;\n}\nclass ColoredPoint extends Point {\n  color = 0;\n}\nlet cp = ColoredPoint(1, 2, 3);\nprint cp.x;\nprint cp.color;")
	assertOutput(t, "class inheritance", r, "1", "3")
}

func TestClassMultipleInstances(t *testing.T) {
	r := compile("class Point {\n  x = 0;\n  y = 0;\n}\nlet a = Point(1, 2);\nlet b = Point(3, 4);\nprint a.x;\nprint b.x;")
	assertOutput(t, "class multiple instances", r, "1", "3")
}
