package optimizer

import (
	"strconv"

	"deepcode/compiler"
)

// FoldConstants performs constant folding on IR instructions.
// It evaluates arithmetic expressions where both operands are known constants
// at compile time, replacing them with the computed result.
func FoldConstants(ir []compiler.IRInstr) []compiler.IRInstr {
	// Track which temps hold known constant values
	constValues := map[string]int{}
	foldedDest := map[string]bool{} // temps that were produced by folding (not by original code)

	var out []compiler.IRInstr
	for _, inst := range ir {
		switch inst.Op {
		case "LOAD_IMM":
			if val, err := strconv.Atoi(inst.Src1); err == nil {
				constValues[inst.Dest] = val
			}
			out = append(out, inst)

		case "ADD", "SUB", "MUL", "DIV", "MOD":
			leftVal, leftOk := constValues[inst.Src1]
			rightVal, rightOk := constValues[inst.Src2]
			if leftOk && rightOk {
				var result int
				switch inst.Op {
				case "ADD":
					result = leftVal + rightVal
				case "SUB":
					result = leftVal - rightVal
				case "MUL":
					result = leftVal * rightVal
				case "DIV":
					if rightVal != 0 {
						result = leftVal / rightVal
					} else {
						out = append(out, inst)
						continue
					}
				case "MOD":
					if rightVal != 0 {
						result = leftVal % rightVal
					} else {
						out = append(out, inst)
						continue
					}
				}
				// Replace with LOAD_IMM
				constValues[inst.Dest] = result
				foldedDest[inst.Dest] = true
				out = append(out, compiler.IRInstr{
					Op:   "LOAD_IMM",
					Dest: inst.Dest,
					Src1: strconv.Itoa(result),
				})
			} else {
				out = append(out, inst)
			}

		case "EQ", "NEQ", "LT", "GT", "LE", "GE":
			leftVal, leftOk := constValues[inst.Src1]
			rightVal, rightOk := constValues[inst.Src2]
			if leftOk && rightOk {
				var result bool
				switch inst.Op {
				case "EQ":
					result = leftVal == rightVal
				case "NEQ":
					result = leftVal != rightVal
				case "LT":
					result = leftVal < rightVal
				case "GT":
					result = leftVal > rightVal
				case "LE":
					result = leftVal <= rightVal
				case "GE":
					result = leftVal >= rightVal
				}
				val := 0
				if result {
					val = 1
				}
				constValues[inst.Dest] = val
				foldedDest[inst.Dest] = true
				out = append(out, compiler.IRInstr{
					Op:   "LOAD_IMM",
					Dest: inst.Dest,
					Src1: strconv.Itoa(val),
				})
			} else {
				out = append(out, inst)
			}

		case "LOAD":
			// If loading from a const-propagated var, fold it
			if val, ok := constValues[inst.Src1]; ok {
				constValues[inst.Dest] = val
				foldedDest[inst.Dest] = true
				out = append(out, compiler.IRInstr{
					Op:   "LOAD_IMM",
					Dest: inst.Dest,
					Src1: strconv.Itoa(val),
				})
			} else {
				out = append(out, inst)
			}

		case "DECLARE", "ASSIGN":
			if val, ok := constValues[inst.Src1]; ok {
				constValues[inst.Dest] = val
			}
			out = append(out, inst)

		default:
			out = append(out, inst)
		}
	}

	// Dead code elimination: remove original LOAD_IMM for temps never used elsewhere
	used := map[string]int{}
	for _, inst := range out {
		if inst.Src1 != "" && (inst.Src1[0] == 't' || inst.Src1[0] == 'T') {
			used[inst.Src1]++
		}
		if inst.Src2 != "" && (inst.Src2[0] == 't' || inst.Src2[0] == 'T') {
			used[inst.Src2]++
		}
	}
	var cleaned []compiler.IRInstr
	for _, inst := range out {
		if inst.Op == "LOAD_IMM" && !foldedDest[inst.Dest] && inst.Dest != "" && (inst.Dest[0] == 't' || inst.Dest[0] == 'T') && used[inst.Dest] == 0 {
			continue // remove unused original temp
		}
		cleaned = append(cleaned, inst)
	}

	// Recompute formatted strings
	for i := range cleaned {
		cleaned[i].Formatted = cleaned[i].String()
	}

	return cleaned
}
