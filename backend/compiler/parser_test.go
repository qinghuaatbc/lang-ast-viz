package compiler

import (
	"testing"
)

func parse(s string) *Node {
	l := NewLexer(s)
	p := NewParser(l)
	return p.Parse()
}

func parseErrors(s string) []string {
	l := NewLexer(s)
	p := NewParser(l)
	p.Parse()
	return p.errs
}

func TestParseLet(t *testing.T) {
	prog := parse("let x = 42;")
	if len(prog.Children) != 1 {
		t.Fatalf("expected 1 stmt, got %d", len(prog.Children))
	}
	n := prog.Children[0]
	if n.Type != NLetStmt {
		t.Fatalf("expected NLetStmt, got %d", n.Type)
	}
	if n.Children[0].Value != "x" {
		t.Fatalf("expected ident x, got %s", n.Children[0].Value)
	}
	if n.Children[1].Value != "42" {
		t.Fatalf("expected value 42, got %s", n.Children[1].Value)
	}
}

func TestParseAssign(t *testing.T) {
	prog := parse("x = 10;")
	if len(prog.Children) != 1 {
		t.Fatalf("expected 1 stmt, got %d", len(prog.Children))
	}
	n := prog.Children[0]
	if n.Type != NAssignStmt {
		t.Fatalf("expected NAssignStmt, got %d", n.Type)
	}
}

func TestParseIf(t *testing.T) {
	prog := parse("if true { print 1; } else { print 0; }")
	if len(prog.Children) != 1 {
		t.Fatalf("expected 1 stmt, got %d", len(prog.Children))
	}
	n := prog.Children[0]
	if n.Type != NIfStmt {
		t.Fatalf("expected NIfStmt, got %d", n.Type)
	}
	if len(n.Children) != 3 {
		t.Fatalf("expected 3 children (cond, conseq, alt), got %d", len(n.Children))
	}
}

func TestParseWhile(t *testing.T) {
	prog := parse("while x < 5 { print x; }")
	if len(prog.Children) != 1 {
		t.Fatalf("expected 1 stmt, got %d", len(prog.Children))
	}
	n := prog.Children[0]
	if n.Type != NWhileStmt {
		t.Fatalf("expected NWhileStmt, got %d", n.Type)
	}
}

func TestParseFn(t *testing.T) {
	prog := parse("fn add(a, b) { return a + b; }")
	if len(prog.Children) != 1 {
		t.Fatalf("expected 1 stmt, got %d", len(prog.Children))
	}
	n := prog.Children[0]
	if n.Type != NFuncDecl {
		t.Fatalf("expected NFuncDecl, got %d", n.Type)
	}
	if n.Value != "add" {
		t.Fatalf("expected func name 'add', got %s", n.Value)
	}
	if len(n.Children) < 2 {
		t.Fatalf("expected params + body, got %d children", len(n.Children))
	}
}

func TestParseBinaryExpr(t *testing.T) {
	prog := parse("print 1 + 2 * 3;")
	n := prog.Children[0]
	if n.Type != NPrintStmt || len(n.Children) != 1 {
		t.Fatalf("expected print with 1 child, got %v", n)
	}
	expr := n.Children[0]
	if expr.Type != NBinaryExpr || expr.Value != "+" {
		t.Fatalf("expected BinaryExpr(+), got %s(%d)", expr.Value, expr.Type)
	}
}

func TestParseErrors(t *testing.T) {
	errs := parseErrors("let = 5;")
	if len(errs) == 0 {
		t.Fatal("expected parse errors")
	}
}

func TestParseString(t *testing.T) {
	prog := parse(`print "hello";`)
	n := prog.Children[0]
	if n.Type != NPrintStmt || len(n.Children) != 1 {
		t.Fatalf("expected print with 1 child, got %v", n)
	}
	if n.Children[0].Type != NStringLit || n.Children[0].Value != "hello" {
		t.Fatalf("expected StringLit(hello), got %s(%d)", n.Children[0].Value, n.Children[0].Type)
	}
}

func TestParseClass(t *testing.T) {
	prog := parse("class Point { x = 0; y = 0; }")
	if len(prog.Children) != 1 {
		t.Fatalf("expected 1 stmt, got %d", len(prog.Children))
	}
	n := prog.Children[0]
	if n.Type != NClassDecl || n.Value != "Point" {
		t.Fatalf("expected ClassDecl(Point), got %d(%s)", n.Type, n.Value)
	}
}

func TestParseCall(t *testing.T) {
	prog := parse("let x = foo(1, 2);")
	n := prog.Children[0]
	if len(n.Children) != 2 {
		t.Fatalf("expected let with 2 children, got %d", len(n.Children))
	}
	call := n.Children[1]
	if call.Type != NCallExpr || call.Value != "foo" {
		t.Fatalf("expected CallExpr(foo), got %d(%s)", call.Type, call.Value)
	}
}
