package compiler

import "fmt"

type IRInstr struct {
	Op        string `json:"op"`
	Dest      string `json:"dest,omitempty"`
	Src1      string `json:"src1,omitempty"`
	Src2      string `json:"src2,omitempty"`
	Label     string `json:"label,omitempty"`
	Formatted string `json:"formatted,omitempty"`
}

type IRGen struct {
	instrs      []IRInstr
	tmpCnt      int
	labelCnt    int
	classFields map[string][]string
	loopStack   []loopLabels
	methodFuncs map[string]bool
	hasInit     map[string]bool
}

type loopLabels struct {
	start string
	end   string
}

func NewIRGen() *IRGen {
	return &IRGen{
		classFields: map[string][]string{},
		loopStack:   []loopLabels{},
		methodFuncs: map[string]bool{},
		hasInit:     map[string]bool{},
	}
}

func (ir *IRGen) Gen(ast *Node) []IRInstr {
	ir.instrs = nil
	ir.tmpCnt = 0
	ir.labelCnt = 0
	ir.genNode(ast)
	for i := range ir.instrs {
		ir.instrs[i].Formatted = ir.instrs[i].String()
	}
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
			ch := n.Children[1]
			if ch.Type == NNumberLit || ch.Type == NBoolLit {
				ir.emit("DECLARE", ident, ch.Value, "")
			} else {
				val := ir.genNode(ch)
				ir.emit("DECLARE", ident, val, "")
			}
		}
		return ""
	case NAssignStmt:
		if len(n.Children) >= 2 {
			ident := n.Children[0].Value
			ch := n.Children[1]
			if ch.Type == NNumberLit || ch.Type == NBoolLit {
				ir.emit("ASSIGN", ident, ch.Value, "")
			} else {
				val := ir.genNode(ch)
				ir.emit("ASSIGN", ident, val, "")
			}
		}
		return ""
	case NPrintStmt:
		if len(n.Children) >= 1 {
			val := ir.genNode(n.Children[0])
			ir.emit("PRINT", "", val, "")
		}
		return ""
	case NIfStmt:
		// Collect elif chain: find consecutive NIfStmt children then an optional else
		elifCount := 0
		hasElse := false
		for i := 2; i < len(n.Children); i++ {
			if n.Children[i].Type == NIfStmt {
				elifCount++
			} else {
				hasElse = true
				break
			}
		}
		// Generate labels: one per elif, plus end label
		elifLabels := make([]string, elifCount)
		for i := 0; i < elifCount; i++ {
			elifLabels[i] = ir.newLabel()
		}
		endLabel := ir.newLabel()

		// Main if: cond → if false jump to first elif (or end if no elif/else)
		firstElseTarget := endLabel
		if elifCount > 0 {
			firstElseTarget = elifLabels[0]
		}
		cond := ir.genNode(n.Children[0])
		ir.emit("JZ", "", cond, firstElseTarget)
		ir.genNode(n.Children[1])
		ir.emit("JMP", "", "", endLabel)

		// Each elif: false jumps to next elif label, or elseLabel, or endLabel
		elseLabel := ""
		if hasElse {
			elseLabel = ir.newLabel()
		}
		for i := 0; i < elifCount; i++ {
			elifNode := n.Children[2+i]
			ir.emitLabel(elifLabels[i])
			nextTarget := endLabel
			if i+1 < elifCount {
				nextTarget = elifLabels[i+1]
			} else if hasElse {
				nextTarget = elseLabel
			}
			elifCond := ir.genNode(elifNode.Children[0])
			ir.emit("JZ", "", elifCond, nextTarget)
			ir.genNode(elifNode.Children[1])
			ir.emit("JMP", "", "", endLabel)
		}

		// Else block (if any)
		if hasElse {
			ir.emitLabel(elseLabel)
			elseNode := n.Children[2+elifCount]
			ir.genNode(elseNode)
		}

		ir.emitLabel(endLabel)
		return ""
	case NWhileStmt:
		startLabel := ir.newLabel()
		endLabel := ir.newLabel()
		ir.loopStack = append(ir.loopStack, loopLabels{start: startLabel, end: endLabel})
		ir.emitLabel(startLabel)
		cond := ir.genNode(n.Children[0])
		ir.emit("JZ", "", cond, endLabel)
		ir.genNode(n.Children[1])
		ir.emit("JMP", "", "", startLabel)
		ir.emitLabel(endLabel)
		ir.loopStack = ir.loopStack[:len(ir.loopStack)-1]
		return ""
	case NBreakStmt:
		if len(ir.loopStack) > 0 {
			ir.emit("JMP", "", "", ir.loopStack[len(ir.loopStack)-1].end)
		}
		return ""
	case NContinueStmt:
		if len(ir.loopStack) > 0 {
			ir.emit("JMP", "", "", ir.loopStack[len(ir.loopStack)-1].start)
		}
		return ""
	case NBlockStmt:
		ir.emit("SCOPE_ENTER", "", "", "")
		for _, c := range n.Children {
			ir.genNode(c)
		}
		ir.emit("SCOPE_EXIT", "", "", "")
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
	case NStringLit:
		dest := ir.newTemp()
		ir.emit("LOAD_STR", dest, n.Value, "")
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
		var allFields []string
		if parentClass != "" {
			allFields = append(allFields, ir.classFields[parentClass]...)
		}
		i := startIdx
		for i < len(n.Children) {
			child := n.Children[i]
			if child.Type == NFuncDecl {
				// Method: generate ClassName_methodName function
				origName := child.Value
				mangled := n.Value + "_" + origName
				child.Value = mangled
				ir.methodFuncs[mangled] = true
				if origName == "__init__" {
					ir.hasInit[n.Value] = true
				}
				ir.genNode(child)
				child.Value = origName // restore
				ir.emit("CLASS_METHOD", n.Value, origName, mangled)
				i++
			} else if i+1 < len(n.Children) {
				// Field: name + value pair
				fname := child.Value
				fval := ir.genNode(n.Children[i+1])
				ir.emit("CLASS_FIELD", n.Value, fname, fval)
				allFields = append(allFields, fname)
				i += 2
			} else {
				i++
			}
		}
		ir.classFields[n.Value] = allFields
		return ""
	case NFieldAccess:
		obj := ir.genNode(n.Children[0])
		field := n.Children[1].Value
		dest := ir.newTemp()
		ir.emit("GETFIELD", dest, obj, field)
		return dest
	case NObjLit:
		obj := ir.newTemp()
		ir.emit("OBJ_LIT", obj, "", "")
		for i := 0; i+1 < len(n.Children); i += 2 {
			fname := n.Children[i].Value
			fval := ir.genNode(n.Children[i+1])
			ir.emit("OBJ_SET", obj, fname, fval)
		}
		return obj
	case NCallExpr:
		name := n.Children[0].Value
		if _, isClass := ir.classFields[name]; isClass {
			// Class instantiation: ClassName(args...)
			obj := ir.newTemp()
			ir.emit("INSTANTIATE", obj, name, fmt.Sprintf("%d", len(n.Children)-1))
			if ir.hasInit[name] {
				// Push self and constructor args for __init__
				ir.emit("PUSH_ARG", "", obj, "")
				for i := 1; i < len(n.Children); i++ {
					arg := ir.genNode(n.Children[i])
					ir.emit("PUSH_ARG", "", arg, "")
				}
				ir.emit("CALL_INIT", obj, name, fmt.Sprintf("%d", len(n.Children)-1))
			} else {
				fieldNames := ir.classFields[name]
				for i := 1; i < len(n.Children); i++ {
					arg := ir.genNode(n.Children[i])
					fname := fmt.Sprintf("_arg%d", i-1)
					if i-1 < len(fieldNames) {
						fname = fieldNames[i-1]
					}
					ir.emit("SETFIELD", obj, fname, arg)
				}
			}
			return obj
		}
		// Function call: name(args...)
		fnLabel := "fn_" + name
		for i := 1; i < len(n.Children); i++ {
			arg := ir.genNode(n.Children[i])
			ir.emit("PUSH_ARG", "", arg, "")
		}
		dest := ir.newTemp()
		ir.emit("CALL", dest, fnLabel, fmt.Sprintf("%d", len(n.Children)-1))
		return dest
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
	case NArrayList:
		arr := ir.newTemp()
		ir.emit("ARRAY_LIT", arr, "", fmt.Sprintf("%d", len(n.Children)))
		for _, child := range n.Children {
			val := ir.genNode(child)
			ir.emit("ARRAY_SET", arr, val, "")
		}
		return arr
	case NArrayAccess:
		arrObj := ir.genNode(n.Children[0])
		idx := ir.genNode(n.Children[1])
		dest := ir.newTemp()
		ir.emit("ARRAY_GET", dest, arrObj, idx)
		return dest
	case NFuncDecl:
		// fn name(params) { body }
		paramCount := 0
		for _, c := range n.Children {
			if c.Type == NIdent {
				paramCount++
			} else {
				break
			}
		}
		fnLabel := "fn_" + n.Value
		skipLabel := "__skip_" + n.Value
		ir.emit("FUNC_DEF", n.Value, "", fmt.Sprintf("%d", paramCount))
		// Jump over function body at startup
		ir.emit("JMP", "", "", skipLabel)
		ir.emitLabel(fnLabel)
		// Pop self first if this is a method
		if ir.methodFuncs[n.Value] {
			ir.emit("POP_ARG", "self", "", "")
		}
		// Pop args from argStack into local variables (reverse order: LIFO)
		for i := paramCount - 1; i >= 0; i-- {
			param := n.Children[i].Value
			ir.emit("POP_ARG", param, "", "")
		}
		body := n.Children[paramCount:] // skip param nodes
		for _, stmt := range body {
			ir.genNode(stmt)
		}
		ir.emit("RETURN", "", "0", "")
		ir.emitLabel(skipLabel)
		return ""
	case NReturnStmt:
		if len(n.Children) > 0 {
			val := ir.genNode(n.Children[0])
			ir.emit("RETURN", "", val, "")
		} else {
			ir.emit("RETURN", "", "0", "")
		}
		return ""
	case NMethodCall:
		obj := ir.genNode(n.Children[0])
		methodName := n.Value
		// Push self and args
		ir.emit("PUSH_ARG", "", obj, "")
		for i := 1; i < len(n.Children); i++ {
			arg := ir.genNode(n.Children[i])
			ir.emit("PUSH_ARG", "", arg, "")
		}
		dest := ir.newTemp()
		// Use METHOD_CALL which does dynamic dispatch at runtime
		ir.emit("METHOD_CALL", dest, methodName, fmt.Sprintf("%d", len(n.Children)))
		return dest
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
	case "FUNC_DEF":
		return fmt.Sprintf("\tfunc %s(%s params)", ir.Dest, ir.Src2)
	case "RETURN":
		return fmt.Sprintf("\treturn %s", ir.Src1)
	case "METHOD_CALL":
		return fmt.Sprintf("\t%s = %s.%s()", ir.Dest, ir.Src1, ir.Src2)
	case "PUSH_ARG":
		return fmt.Sprintf("\tpush_arg %s", ir.Src1)
	case "CALL":
		return fmt.Sprintf("\tcall %s (%s args)", ir.Src1, ir.Src2)
	default:
		if sym, ok := opSymbols[ir.Op]; ok {
			return fmt.Sprintf("\t%s = %s %s %s", ir.Dest, ir.Src1, sym, ir.Src2)
		}
		return fmt.Sprintf("\t%s = %s %s %s", ir.Dest, ir.Src1, ir.Op, ir.Src2)
	}
}
