package compiler

import "fmt"

type IRInstr struct {
	Op     string `json:"op"`
	Dest   string `json:"dest,omitempty"`
	Src1   string `json:"src1,omitempty"`
	Src2   string `json:"src2,omitempty"`
	Label  string `json:"label,omitempty"`
}

type IRGen struct {
	instrs   []IRInstr
	tmpCnt   int
	labelCnt int
	classFields map[string][]string // className -> field names
}

func NewIRGen() *IRGen {
	return &IRGen{classFields: map[string][]string{}}
}

func (ir *IRGen) Gen(ast *Node) []IRInstr {
	ir.instrs = nil
	ir.tmpCnt = 0
	ir.labelCnt = 0
	ir.genNode(ast)
	return ir.instrs
}

func (ir *IRGen) newTemp() string {
	ir.tmpCnt++
	return fmt.Sprintf("t%d", ir.tmpCnt)
}

func (ir *IRGen) newLabel() string {
	ir.labelCnt++
	return fmt.Sprintf("L%d", ir.labelCnt)
}

func (ir *IRGen) emit(op, dest, src1, src2 string) {
	ir.instrs = append(ir.instrs, IRInstr{Op: op, Dest: dest, Src1: src1, Src2: src2})
}

func (ir *IRGen) emitLabel(label string) {
	ir.instrs = append(ir.instrs, IRInstr{Op: "LABEL", Label: label})
}

func (ir *IRGen) genNode(n *Node) string {
	switch n.Type {
	case NProgram:
		for _, c := range n.Children {
			ir.genNode(c)
		}
		return ""
	case NLetStmt:
		if len(n.Children) >= 2 {
			ident := n.Children[0].Value
			val := ir.genNode(n.Children[1])
			ir.emit("ASSIGN", ident, val, "")
		}
		return ""
	case NAssignStmt:
		if len(n.Children) >= 2 {
			ident := n.Children[0].Value
			val := ir.genNode(n.Children[1])
			ir.emit("ASSIGN", ident, val, "")
		}
		return ""
	case NPrintStmt:
		if len(n.Children) >= 1 {
			val := ir.genNode(n.Children[0])
			ir.emit("PRINT", "", val, "")
		}
		return ""
	case NIfStmt:
		cond := ir.genNode(n.Children[0])
		elseLabel := ir.newLabel()
		endLabel := ir.newLabel()
		ir.emit("JZ", "", cond, elseLabel)
		ir.genNode(n.Children[1])
		ir.emit("JMP", "", "", endLabel)
		ir.emitLabel(elseLabel)
		if len(n.Children) == 3 {
			ir.genNode(n.Children[2])
		}
		ir.emitLabel(endLabel)
		return ""
	case NWhileStmt:
		startLabel := ir.newLabel()
		endLabel := ir.newLabel()
		ir.emitLabel(startLabel)
		cond := ir.genNode(n.Children[0])
		ir.emit("JZ", "", cond, endLabel)
		ir.genNode(n.Children[1])
		ir.emit("JMP", "", "", startLabel)
		ir.emitLabel(endLabel)
		return ""
	case NBlockStmt:
		for _, c := range n.Children {
			ir.genNode(c)
		}
		return ""
	case NBinaryExpr:
		left := ir.genNode(n.Children[0])
		right := ir.genNode(n.Children[1])
		dest := ir.newTemp()
		opMap := map[string]string{
			"+": "ADD", "-": "SUB", "*": "MUL", "/": "DIV", "%": "MOD",
			"==": "EQ", "!=": "NEQ", "<": "LT", ">": "GT", "<=": "LE", ">=": "GE",
		}
		op, ok := opMap[n.Value]
		if !ok {
			op = n.Value
		}
		ir.emit(op, dest, left, right)
		return dest
	case NNumberLit:
		dest := ir.newTemp()
		ir.emit("LOAD_IMM", dest, n.Value, "")
		return dest
	case NBoolLit:
		dest := ir.newTemp()
		val := "0"
		if n.Value == "true" {
			val = "1"
		}
		ir.emit("LOAD_IMM", dest, val, "")
		return dest
	case NIdent:
		dest := ir.newTemp()
		ir.emit("LOAD", dest, n.Value, "")
		return dest
	case NSelf:
		dest := ir.newTemp()
		ir.emit("LOAD_SELF", dest, "", "")
		return dest
	case NClassDecl:
		startIdx := 0
		parentClass := ""
		if len(n.Children)%2 == 1 {
			parentClass = n.Children[0].Value
			startIdx = 1
		}
		ir.emit("CLASS_DEF", n.Value, parentClass, "")
		var fieldNames []string
		for i := startIdx; i+1 < len(n.Children); i += 2 {
			fname := n.Children[i].Value
			fval := ir.genNode(n.Children[i+1])
			ir.emit("CLASS_FIELD", n.Value, fname, fval)
			fieldNames = append(fieldNames, fname)
		}
		ir.classFields[n.Value] = fieldNames
		return ""
	case NFieldAccess:
		obj := ir.genNode(n.Children[0])
		field := n.Children[1].Value
		dest := ir.newTemp()
		ir.emit("GETFIELD", dest, obj, field)
		return dest
	case NCallExpr:
		className := n.Children[0].Value
		obj := ir.newTemp()
		ir.emit("INSTANTIATE", obj, className, fmt.Sprintf("%d", len(n.Children)-1))
		fieldNames := ir.classFields[className]
		for i := 1; i < len(n.Children); i++ {
			arg := ir.genNode(n.Children[i])
			fname := fmt.Sprintf("_arg%d", i-1)
			if i-1 < len(fieldNames) {
				fname = fieldNames[i-1]
			}
			ir.emit("SETFIELD", obj, fname, arg)
		}
		return obj
	case NNewExpr:
		className := ""
		if len(n.Children) > 0 {
			className = n.Children[0].Value
		}
		obj := ir.newTemp()
		ir.emit("INSTANTIATE", obj, className, fmt.Sprintf("%d", len(n.Children)-1))
		fieldNames := ir.classFields[className]
		for i := 1; i < len(n.Children); i++ {
			arg := ir.genNode(n.Children[i])
			fname := fmt.Sprintf("_arg%d", i-1)
			if i-1 < len(fieldNames) {
				fname = fieldNames[i-1]
			}
			ir.emit("SETFIELD", obj, fname, arg)
		}
		return obj
	}
	return ""
}

func (ir *IRInstr) String() string {
	opSymbols := map[string]string{
		"ADD": "+", "SUB": "-", "MUL": "*", "DIV": "/", "MOD": "%",
		"EQ": "==", "NEQ": "!=", "LT": "<", "GT": ">", "LE": "<=", "GE": ">=",
	}
	switch ir.Op {
	case "LABEL":
		return fmt.Sprintf("%s:", ir.Label)
	case "JZ":
		return fmt.Sprintf("\tif_false %s goto %s", ir.Src1, ir.Src2)
	case "JMP":
		return fmt.Sprintf("\tgoto %s", ir.Src2)
	case "ASSIGN":
		return fmt.Sprintf("\t%s = %s", ir.Dest, ir.Src1)
	case "PRINT":
		return fmt.Sprintf("\tprint %s", ir.Src1)
	case "LOAD_IMM":
		return fmt.Sprintf("\t%s = %s", ir.Dest, ir.Src1)
	case "LOAD":
		return fmt.Sprintf("\t%s = %s", ir.Dest, ir.Src1)
	case "OBJ_LIT":
		return fmt.Sprintf("\t%s = object{}", ir.Dest)
	case "OBJ_SET":
		return fmt.Sprintf("\t%s.%s = %s", ir.Dest, ir.Src1, ir.Src2)
	case "GETFIELD":
		return fmt.Sprintf("\t%s = %s.%s", ir.Dest, ir.Src1, ir.Src2)
	default:
		if sym, ok := opSymbols[ir.Op]; ok {
			return fmt.Sprintf("\t%s = %s %s %s", ir.Dest, ir.Src1, sym, ir.Src2)
		}
		return fmt.Sprintf("\t%s = %s %s %s", ir.Dest, ir.Src1, ir.Op, ir.Src2)
	}
}
