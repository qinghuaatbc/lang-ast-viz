package compiler

import (
	"encoding/json"
	"fmt"
)

type Opcode int

const (
	OP_HALT Opcode = iota
	OP_PUSH
	OP_PUSHSTR
	OP_LOAD
	OP_STORE
	OP_ADD
	OP_SUB
	OP_MUL
	OP_DIV
	OP_MOD
	OP_CONCAT
	OP_EQ
	OP_NEQ
	OP_LT
	OP_GT
	OP_LE
	OP_GE
	OP_PRINT
	OP_JMP
	OP_JZ
	OP_OBJLIT
	OP_OBJSET
	OP_OBJGET
	OP_CLASS_DEF
	OP_CLASS_FIELD
	OP_INSTANTIATE
	OP_SETFIELD
	OP_CALL
	OP_RETURN
	OP_PUSHARG
	OP_POPARG
	OP_DECLARE
	OP_SCOPE_ENTER
	OP_SCOPE_EXIT
	OP_DUP
	OP_ARRAYLIT
	OP_ARRAYGET
	OP_ARRAYSET
	OP_METHOD_CALL
	OP_CLASS_METHOD
	OP_CALL_INIT
)

func (op Opcode) String() string {
	switch op {
	case OP_HALT:        return "HALT"
	case OP_PUSH:         return "PUSH"
	case OP_PUSHSTR:      return "PUSHSTR"
	case OP_LOAD:        return "LOAD"
	case OP_STORE:       return "STORE"
	case OP_ADD:         return "ADD"
	case OP_SUB:         return "SUB"
	case OP_MUL:         return "MUL"
	case OP_DIV:         return "DIV"
	case OP_MOD:          return "MOD"
	case OP_CONCAT:       return "CONCAT"
	case OP_EQ:          return "EQ"
	case OP_NEQ:         return "NEQ"
	case OP_LT:          return "LT"
	case OP_GT:          return "GT"
	case OP_LE:          return "LE"
	case OP_GE:          return "GE"
	case OP_PRINT:       return "PRINT"
	case OP_JMP:         return "JMP"
	case OP_JZ:          return "JZ"
	case OP_OBJLIT:      return "OBJLIT"
	case OP_OBJSET:      return "OBJSET"
	case OP_OBJGET:      return "OBJGET"
	case OP_CLASS_DEF:   return "CLASS_DEF"
	case OP_CLASS_FIELD: return "CLASS_FIELD"
	case OP_INSTANTIATE: return "INSTANTIATE"
	case OP_SETFIELD:    return "SETFIELD"
	case OP_CALL:        return "CALL"
	case OP_RETURN:      return "RETURN"
	case OP_PUSHARG:     return "PUSHARG"
	case OP_POPARG:      return "POPARG"
	case OP_DECLARE:     return "DECLARE"
	case OP_SCOPE_ENTER: return "SCOPE_ENTER"
	case OP_DUP:         return "DUP"
	case OP_ARRAYLIT:    return "ARRAYLIT"
	case OP_ARRAYGET:    return "ARRAYGET"
	case OP_ARRAYSET:    return "ARRAYSET"
	case OP_METHOD_CALL: return "METHOD_CALL"
	case OP_CLASS_METHOD: return "CLASS_METHOD"
	case OP_CALL_INIT:   return "CALL_INIT"
	default:             return "UNKNOWN"
	}
}

func (op Opcode) MarshalJSON() ([]byte, error) {
	return json.Marshal(op.String())
}

type BytecodeInstr struct {
	Op     Opcode `json:"op"`
	Arg    int    `json:"arg,omitempty"`
	ArgStr string `json:"argStr,omitempty"`
}

func (b BytecodeInstr) String() string {
	if b.ArgStr != "" {
		return fmt.Sprintf("%-12s %s", b.Op.String(), b.ArgStr)
	}
	if b.Op == OP_HALT {
		return b.Op.String()
	}
	return fmt.Sprintf("%-12s %d", b.Op.String(), b.Arg)
}

type BytecodeGen struct {
	instrs    []BytecodeInstr
	labelPos  map[string]int
	labelRefs []labelRef
	nextAddr  int
}

type labelRef struct {
	instrIdx int
	label    string
}

func NewBytecodeGen() *BytecodeGen {
	return &BytecodeGen{labelPos: map[string]int{}}
}

func (bg *BytecodeGen) emit(op Opcode, arg int, argStr string) {
	bg.instrs = append(bg.instrs, BytecodeInstr{Op: op, Arg: arg, ArgStr: argStr})
	bg.nextAddr++
}

func (bg *BytecodeGen) Gen(ir []IRInstr) []BytecodeInstr {
	bg.instrs = nil
	bg.labelPos = map[string]int{}
	bg.labelRefs = nil
	bg.nextAddr = 0

	for _, inst := range ir {
		if inst.Op == "LABEL" {
			bg.labelPos[inst.Label] = bg.nextAddr
			continue
		}
		if inst.Op == "JZ" || inst.Op == "JMP" || inst.Op == "CALL" {
			ref := labelRef{instrIdx: len(bg.instrs), label: inst.Src2}
			bg.labelRefs = append(bg.labelRefs, ref)
			switch inst.Op {
			case "JMP":
				bg.emit(OP_JMP, 0, inst.Src2)
			case "JZ":
				bg.emit(OP_JZ, 0, inst.Src2)
			case "CALL":
				// For CALL, label is in Src1, not Src2
				ref.label = inst.Src1
				bg.labelRefs[len(bg.labelRefs)-1] = ref
				bg.emit(OP_CALL, 0, inst.Src1)
			}
			continue
		}
		switch inst.Op {
		case "LOAD_IMM":
			val := 0
			if _, err := fmt.Sscanf(inst.Src1, "%d", &val); err != nil {
				val = 0
			}
			bg.emit(OP_PUSH, val, inst.Src1)
		case "LOAD_STR":
			bg.emit(OP_PUSHSTR, 0, inst.Src1)
		case "LOAD":
			bg.emit(OP_LOAD, 0, inst.Src1)
		case "ASSIGN":
			if IsNumber(inst.Src1) {
				val := 0
				if _, err := fmt.Sscanf(inst.Src1, "%d", &val); err != nil {
					val = 0
				}
				bg.emit(OP_PUSH, val, inst.Src1)
			}
			bg.emit(OP_STORE, 0, inst.Dest)
		case "DECLARE":
			if IsNumber(inst.Src1) {
				val := 0
				if _, err := fmt.Sscanf(inst.Src1, "%d", &val); err != nil {
					val = 0
				}
				bg.emit(OP_PUSH, val, inst.Src1)
			}
			bg.emit(OP_DECLARE, 0, inst.Dest)
		case "PRINT":
			bg.emit(OP_PRINT, 0, "")
		case "ADD":
			bg.emit(OP_ADD, 0, "")
		case "SUB":
			bg.emit(OP_SUB, 0, "")
		case "MUL":
			bg.emit(OP_MUL, 0, "")
		case "DIV":
			bg.emit(OP_DIV, 0, "")
		case "MOD":
			bg.emit(OP_MOD, 0, "")
		case "EQ":
			bg.emit(OP_EQ, 0, "")
		case "NEQ":
			bg.emit(OP_NEQ, 0, "")
		case "LT":
			bg.emit(OP_LT, 0, "")
		case "GT":
			bg.emit(OP_GT, 0, "")
		case "LE":
			bg.emit(OP_LE, 0, "")
		case "GE":
			bg.emit(OP_GE, 0, "")
		case "OBJ_LIT":
			bg.emit(OP_OBJLIT, 0, "")
		case "OBJ_SET":
			bg.emit(OP_OBJSET, 0, inst.Src1)
		case "GETFIELD":
			bg.emit(OP_OBJGET, 0, inst.Src2)
		case "CLASS_DEF":
			// ArgStr = "ClassName" or "ClassName:ParentClass"
			argStr := inst.Dest
			if inst.Src1 != "" {
				argStr += ":" + inst.Src1
			}
			bg.emit(OP_CLASS_DEF, 0, argStr)
		case "CLASS_FIELD":
			// ArgStr = "ClassName.fieldName", pops default value from stack
			bg.emit(OP_CLASS_FIELD, 0, inst.Dest+"."+inst.Src1)
		case "INSTANTIATE":
			// ArgStr = className, creates object with class fields at defaults
			bg.emit(OP_INSTANTIATE, 0, inst.Src1)
		case "SETFIELD":
			bg.emit(OP_SETFIELD, 0, inst.Src1)
		case "FUNC_DEF":
			// No-op: function body is guarded by JMP/skip label from IR
		case "RETURN":
			bg.emit(OP_RETURN, 0, "")
		case "PUSH_ARG":
			bg.emit(OP_PUSHARG, 0, "")
		case "POP_ARG":
			bg.emit(OP_POPARG, 0, inst.Dest)
		case "SCOPE_ENTER":
			bg.emit(OP_SCOPE_ENTER, 0, "")
		case "SCOPE_EXIT":
			bg.emit(OP_SCOPE_EXIT, 0, "")
		case "CLASS_METHOD":
			// Dest = className, Src1 = methodName, Src2 = ClassName_methodName
			fnLabel := "fn_" + inst.Src2
			if pos, ok := bg.labelPos[fnLabel]; ok {
				bg.emit(OP_CLASS_METHOD, pos, inst.Dest+":"+inst.Src1+":"+inst.Src2)
			} else {
				// Emit a HALT-like address so the VM stops instead of jumping to 0
				bg.emit(OP_HALT, 0, "ERROR: undefined method "+inst.Src2)
			}
		case "ARRAY_LIT":
			bg.emit(OP_ARRAYLIT, 0, "")
		case "ARRAY_SET":
			bg.emit(OP_ARRAYSET, 0, "")
		case "ARRAY_GET":
			bg.emit(OP_ARRAYGET, 0, "")
		case "METHOD_CALL":
			bg.emit(OP_METHOD_CALL, 0, inst.Src1+":"+inst.Src2)
		case "CALL_INIT":
			bg.emit(OP_CALL_INIT, 0, inst.Dest+":"+inst.Src2)
		}
	}

	bg.emit(OP_HALT, 0, "")

	for _, ref := range bg.labelRefs {
		if pos, ok := bg.labelPos[ref.label]; ok {
			offset := pos - ref.instrIdx
			bg.instrs[ref.instrIdx].Arg = offset
		}
	}

	return bg.instrs
}

func IsNumber(s string) bool {
	if len(s) == 0 {
		return false
	}
	start := 0
	if s[0] == '-' {
		start = 1
	}
	if start >= len(s) {
		return false
	}
	for _, c := range s[start:] {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}
