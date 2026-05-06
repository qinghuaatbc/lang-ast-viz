package asm

import (
	"fmt"
	"sort"
	"strings"

	"lang-ast-viz/compiler"
)

type AsmInstr struct {
	Text     string            `json:"text"`
	RegState map[string]string `json:"regState,omitempty"`
	MemState map[string]string `json:"memState,omitempty"`
	Changed  []string          `json:"changed,omitempty"`
}

type Generator struct {
	regs       []string
	regMap     map[string]string
	regContent map[string]string
	memContent map[string]string // variable name -> value description
	prevRegs   map[string]string
	prevMem    map[string]string
	nextReg    int
}

func NewGenerator() *Generator {
	return &Generator{
		regs:       []string{"eax", "ebx", "ecx", "edx", "esi", "edi"},
		regMap:     map[string]string{},
		regContent: map[string]string{},
		memContent: map[string]string{},
		prevRegs:   map[string]string{},
		prevMem:    map[string]string{},
	}
}

func (g *Generator) allocReg(temp string) string {
	if r, ok := g.regMap[temp]; ok {
		return r
	}
	r := g.regs[g.nextReg%len(g.regs)]
	g.nextReg++
	g.regMap[temp] = r
	return r
}

func (g *Generator) snapshot() map[string]string {
	s := map[string]string{}
	for _, r := range g.regs {
		if c, ok := g.regContent[r]; ok && c != "" {
			s[r] = c
		}
	}
	if len(s) == 0 {
		return nil
	}
	return s
}

func (g *Generator) memSnapshot() map[string]string {
	if len(g.memContent) == 0 {
		return nil
	}
	s := map[string]string{}
	// Sort keys for consistent output
	keys := make([]string, 0, len(g.memContent))
	for k := range g.memContent {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		s[k] = g.memContent[k]
	}
	return s
}

func (g *Generator) Gen(ir []compiler.IRInstr) []AsmInstr {
	var out []AsmInstr
	g.regMap = map[string]string{}
	g.regContent = map[string]string{}
	g.memContent = map[string]string{}
	g.prevRegs = map[string]string{}
	g.prevMem = map[string]string{}
	g.nextReg = 0

	emit := func(text string, varName ...string) {
		if len(varName) > 0 && varName[0] != "" {
			vn := varName[0]
			if r, ok := g.regMap[vn]; ok {
				g.memContent[vn] = g.regContent[r]
			} else if len(varName) > 1 && varName[1] != "" {
				g.memContent[vn] = varName[1]
			} else {
				g.memContent[vn] = vn
			}
		}
		// detect changed registers
		var changed []string
		for _, r := range g.regs {
			old := g.prevRegs[r]
			cur := g.regContent[r]
			if old != cur {
				changed = append(changed, r)
			}
		}
		// detect changed memory
		var memChanged []string
		for k, v := range g.memContent {
			if g.prevMem[k] != v {
				memChanged = append(memChanged, k)
			}
		}
		for k := range g.prevMem {
			if _, ok := g.memContent[k]; !ok {
				memChanged = append(memChanged, k)
			}
		}
		changed = append(changed, memChanged...)

		// update prev for next comparison
		for _, r := range g.regs {
			g.prevRegs[r] = g.regContent[r]
		}
		for k, v := range g.memContent {
			g.prevMem[k] = v
		}

		if len(changed) == 0 {
			changed = nil
		}
		out = append(out, AsmInstr{
			Text:     text,
			RegState: g.snapshot(),
			MemState: g.memSnapshot(),
			Changed:  changed,
		})
	}

	emitPlain := func(text string) {
		out = append(out, AsmInstr{
			Text:     text,
			RegState: g.snapshot(),
			MemState: g.memSnapshot(),
		})
	}

	labelCount := 0
	newLabel := func() string {
		labelCount++
		return fmt.Sprintf(".L%d", labelCount)
	}

	for _, inst := range ir {
		switch inst.Op {
		case "LABEL":
			emitPlain(fmt.Sprintf("%s:", inst.Label))

		case "LOAD_IMM":
			r := g.allocReg(inst.Dest)
			g.regContent[r] = inst.Src1
			emitPlain(fmt.Sprintf("\tmov\t%s, %s", r, inst.Src1))

		case "LOAD":
			r := g.allocReg(inst.Dest)
			g.regContent[r] = fmt.Sprintf("[%s]", inst.Src1)
			emitPlain(fmt.Sprintf("\tmov\t%s, [%s]", r, inst.Src1))

		case "ASSIGN":
			if isNumber(inst.Src1) {
				r := g.allocReg("$lit_" + inst.Src1)
				g.regContent[r] = inst.Src1
				emitPlain(fmt.Sprintf("\tmov\t%s, %s", r, inst.Src1))
				emit(fmt.Sprintf("\tmov\t[%s], %s", inst.Dest, r), inst.Dest, g.regContent[r])
			} else {
				srcR := g.allocReg(inst.Src1)
				emit(fmt.Sprintf("\tmov\t[%s], %s", inst.Dest, srcR), inst.Dest, g.regContent[srcR])
			}

		case "PRINT":
			if isNumber(inst.Src1) || (len(inst.Src1) > 0 && inst.Src1[0] >= 'a' && inst.Src1[0] <= 'z') {
				// src1 is a literal or already in a register
				if isNumber(inst.Src1) {
					r := g.allocReg("$lit_" + inst.Src1)
					g.regContent[r] = inst.Src1
					emitPlain(fmt.Sprintf("\tmov\t%s, %s", r, inst.Src1))
					emitPlain(fmt.Sprintf("\tcall\tprint\t; %s", r))
				} else {
					r := g.allocReg(inst.Src1)
					emitPlain(fmt.Sprintf("\tcall\tprint\t; %s", r))
				}
			} else {
				r := g.allocReg(inst.Src1)
				emitPlain(fmt.Sprintf("\tcall\tprint\t; %s", r))
			}

		case "ADD":
			dst := g.allocReg(inst.Dest)
			src1 := g.allocReg(inst.Src1)
			src2 := g.allocReg(inst.Src2)
			if dst == src1 {
				g.regContent[dst] = fmt.Sprintf("%s+%s", g.regContent[src1], g.regContent[src2])
				emitPlain(fmt.Sprintf("\tadd\t%s, %s", dst, src2))
			} else {
				g.regContent[dst] = fmt.Sprintf("%s+%s", g.regContent[src1], g.regContent[src2])
				emitPlain(fmt.Sprintf("\tmov\t%s, %s", dst, src1))
				emitPlain(fmt.Sprintf("\tadd\t%s, %s", dst, src2))
			}

		case "SUB":
			dst := g.allocReg(inst.Dest)
			src1 := g.allocReg(inst.Src1)
			src2 := g.allocReg(inst.Src2)
			if dst == src1 {
				g.regContent[dst] = fmt.Sprintf("%s-%s", g.regContent[src1], g.regContent[src2])
				emitPlain(fmt.Sprintf("\tsub\t%s, %s", dst, src2))
			} else {
				g.regContent[dst] = fmt.Sprintf("%s-%s", g.regContent[src1], g.regContent[src2])
				emitPlain(fmt.Sprintf("\tmov\t%s, %s", dst, src1))
				emitPlain(fmt.Sprintf("\tsub\t%s, %s", dst, src2))
			}

		case "MUL":
			dst := g.allocReg(inst.Dest)
			src1 := g.allocReg(inst.Src1)
			src2 := g.allocReg(inst.Src2)
			if dst == src1 {
				g.regContent[dst] = fmt.Sprintf("%s*%s", g.regContent[src1], g.regContent[src2])
				emitPlain(fmt.Sprintf("\timul\t%s, %s", dst, src2))
			} else {
				g.regContent[dst] = fmt.Sprintf("%s*%s", g.regContent[src1], g.regContent[src2])
				emitPlain(fmt.Sprintf("\tmov\t%s, %s", dst, src1))
				emitPlain(fmt.Sprintf("\timul\t%s, %s", dst, src2))
			}

		case "DIV":
			dst := g.allocReg(inst.Dest)
			src1 := g.allocReg(inst.Src1)
			src2 := g.allocReg(inst.Src2)
			g.regContent["eax"] = fmt.Sprintf("%s/%s", g.regContent[src1], g.regContent[src2])
			emitPlain(fmt.Sprintf("\tmov\teax, %s", src1))
			emitPlain(fmt.Sprintf("\tidiv\t%s", src2))
			if dst != "eax" {
				g.regContent[dst] = g.regContent["eax"]
				emitPlain(fmt.Sprintf("\tmov\t%s, eax", dst))
			}

		case "MOD":
			dst := g.allocReg(inst.Dest)
			src1 := g.allocReg(inst.Src1)
			src2 := g.allocReg(inst.Src2)
			emitPlain(fmt.Sprintf("\tmov\teax, %s", src1))
			emitPlain("\txor\tedx, edx")
			emitPlain(fmt.Sprintf("\tidiv\t%s", src2))
			g.regContent[dst] = fmt.Sprintf("%s%%%s", g.regContent[src1], g.regContent[src2])
			emitPlain(fmt.Sprintf("\tmov\t%s, edx", dst))

		case "EQ", "NEQ", "LT", "GT", "LE", "GE":
			cmplabel := map[string]string{
				"EQ": "e", "NEQ": "ne", "LT": "l", "GT": "g", "LE": "le", "GE": "ge",
			}
			dst := g.allocReg(inst.Dest)
			src1 := g.allocReg(inst.Src1)
			src2 := g.allocReg(inst.Src2)
			lTrue := newLabel()
			lEnd := newLabel()
			emitPlain(fmt.Sprintf("\tcmp\t%s, %s", src1, src2))
			emitPlain(fmt.Sprintf("\tj%s\t%s", cmplabel[inst.Op], lTrue))
			g.regContent[dst] = "0"
			emitPlain(fmt.Sprintf("\tmov\t%s, 0", dst))
			emitPlain(fmt.Sprintf("\tjmp\t%s", lEnd))
			emitPlain(fmt.Sprintf("%s:", lTrue))
			g.regContent[dst] = "1"
			emitPlain(fmt.Sprintf("\tmov\t%s, 1", dst))
			emitPlain(fmt.Sprintf("%s:", lEnd))

		case "JZ":
			r := g.allocReg(inst.Src1)
			emitPlain(fmt.Sprintf("\tcmp\t%s, 0", r))
			emitPlain(fmt.Sprintf("\tjz\t%s", inst.Src2))

		case "JMP":
			emitPlain(fmt.Sprintf("\tjmp\t%s", inst.Src2))

		case "OBJ_LIT":
			r := g.allocReg(inst.Dest)
			g.regContent[r] = "object"
			emitPlain(fmt.Sprintf("\t; object {} -> %s", r))

		case "OBJ_SET":
			objR := g.allocReg(inst.Dest)
			valR := g.allocReg(inst.Src2)
			g.regContent[objR] = fmt.Sprintf("{%s=%s}", inst.Src1, g.regContent[valR])
			emitPlain(fmt.Sprintf("\t; %s.%s = %s", g.regContent[objR], inst.Src1, g.regContent[valR]))

		case "GETFIELD":
			dst := g.allocReg(inst.Dest)
			g.regContent[dst] = fmt.Sprintf("%s.%s", inst.Src1, inst.Src2)
			emitPlain(fmt.Sprintf("\t; %s = %s.%s", inst.Dest, inst.Src1, inst.Src2))

		default:
			emitPlain(fmt.Sprintf("\t; unknown: %s %s", inst.Op, strings.Join([]string{inst.Dest, inst.Src1, inst.Src2}, " ")))
		}
	}

	return out
}

// for display
func RegStateString(rs map[string]string) string {
	if len(rs) == 0 {
		return ""
	}
	keys := make([]string, 0, len(rs))
	for k := range rs {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	var parts []string
	for _, k := range keys {
		parts = append(parts, fmt.Sprintf("%s=%s", k, rs[k]))
	}
	return strings.Join(parts, " ")
}

func isNumber(s string) bool {
	if len(s) == 0 {
		return false
	}
	for _, c := range s {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}
