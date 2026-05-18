package optimizer

import (
	"testing"

	"deepcode/compiler"
)

func TestFoldAdd(t *testing.T) {
	ir := []compiler.IRInstr{
		{Op: "LOAD_IMM", Dest: "t1", Src1: "2"},
		{Op: "LOAD_IMM", Dest: "t2", Src1: "3"},
		{Op: "ADD", Dest: "t3", Src1: "t1", Src2: "t2"},
	}
	out := FoldConstants(ir)
	if len(out) != 1 {
		t.Fatalf("expected 1 instr after folding + DCE, got %d", len(out))
	}
	if out[0].Op != "LOAD_IMM" || out[0].Src1 != "5" {
		t.Fatalf("expected LOAD_IMM 5, got %s %s", out[0].Op, out[0].Src1)
	}
}

func TestFoldMul(t *testing.T) {
	ir := []compiler.IRInstr{
		{Op: "LOAD_IMM", Dest: "t1", Src1: "6"},
		{Op: "LOAD_IMM", Dest: "t2", Src1: "7"},
		{Op: "MUL", Dest: "t3", Src1: "t1", Src2: "t2"},
	}
	out := FoldConstants(ir)
	if len(out) != 1 || out[0].Src1 != "42" {
		t.Fatalf("expected LOAD_IMM 42, got %s %s", out[0].Op, out[0].Src1)
	}
}

func TestFoldComparison(t *testing.T) {
	ir := []compiler.IRInstr{
		{Op: "LOAD_IMM", Dest: "t1", Src1: "5"},
		{Op: "LOAD_IMM", Dest: "t2", Src1: "3"},
		{Op: "GT", Dest: "t3", Src1: "t1", Src2: "t2"},
	}
	out := FoldConstants(ir)
	if len(out) != 1 || out[0].Src1 != "1" {
		t.Fatalf("expected LOAD_IMM 1 (5>3), got %s %s", out[0].Op, out[0].Src1)
	}
}

func TestFoldPreservesNonConst(t *testing.T) {
	ir := []compiler.IRInstr{
		{Op: "LOAD_IMM", Dest: "t1", Src1: "2"},
		{Op: "LOAD", Dest: "t2", Src1: "x"},
		{Op: "ADD", Dest: "t3", Src1: "t1", Src2: "t2"},
	}
	out := FoldConstants(ir)
	// t1 stays (used by ADD), LOAD stays (used by ADD), ADD stays (not foldable)
	if len(out) != 3 {
		t.Fatalf("expected 3 instrs (LOAD_IMM, LOAD, ADD), got %d", len(out))
	}
}

func TestFoldPropagation(t *testing.T) {
	ir := []compiler.IRInstr{
		{Op: "LOAD_IMM", Dest: "t1", Src1: "2"},
		{Op: "LOAD_IMM", Dest: "t2", Src1: "3"},
		{Op: "ADD", Dest: "t3", Src1: "t1", Src2: "t2"},
		{Op: "LOAD_IMM", Dest: "t4", Src1: "4"},
		{Op: "MUL", Dest: "t5", Src1: "t3", Src2: "t4"},
	}
	out := FoldConstants(ir)
	// t3=5 (folded from ADD, used by MUL), t5=20 (folded from MUL)
	if len(out) != 2 {
		t.Fatalf("expected 2 instrs (t3=5, t5=20), got %d", len(out))
	}
	if out[1].Src1 != "20" {
		t.Fatalf("expected second instr Src1=20, got %s", out[1].Src1)
	}
}

func TestFoldDivZero(t *testing.T) {
	ir := []compiler.IRInstr{
		{Op: "LOAD_IMM", Dest: "t1", Src1: "5"},
		{Op: "LOAD_IMM", Dest: "t2", Src1: "0"},
		{Op: "DIV", Dest: "t3", Src1: "t1", Src2: "t2"},
	}
	out := FoldConstants(ir)
	// Not folded: t1 and t2 are still used by DIV
	if len(out) != 3 {
		t.Fatalf("expected 3 instrs (no fold for div by zero), got %d", len(out))
	}
}

func TestFoldPipeline(t *testing.T) {
	lex := compiler.NewLexer("print 2 + 3 * 4;")
	parser := compiler.NewParser(lex)
	ast := parser.Parse()
	ir := compiler.NewIRGen().Gen(ast)
	optIr := FoldConstants(ir)
	if len(optIr) >= len(ir) {
		t.Fatalf("expected optimized IR to be shorter (%d >= %d)", len(optIr), len(ir))
	}
}
