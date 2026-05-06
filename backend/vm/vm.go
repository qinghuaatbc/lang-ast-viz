package vm

import (
	"strings"

	"lang-ast-viz/compiler"
)

type classInfo struct {
	name   string
	parent string
	fields []string
}

type VM struct {
	stack     []Value
	variables map[string]Value
	objects   []map[string]Value
	classes   map[string]*classInfo
	pc        int
	program   []compiler.BytecodeInstr
	output    []string
}

func NewVM(program []compiler.BytecodeInstr) *VM {
	return &VM{
		stack:     []Value{},
		variables: map[string]Value{},
		objects:   []map[string]Value{},
		classes:   map[string]*classInfo{},
		program:   program,
		output:    []string{},
	}
}

func (vm *VM) push(v Value) {
	vm.stack = append(vm.stack, v)
}

func (vm *VM) pop() Value {
	if len(vm.stack) == 0 {
		return VInt(0)
	}
	v := vm.stack[len(vm.stack)-1]
	vm.stack = vm.stack[:len(vm.stack)-1]
	return v
}

func (vm *VM) popInt() int {
	return vm.pop().Int
}

func (vm *VM) Run() ([]string, error) {
	vm.pc = 0
	vm.output = nil

	for vm.pc >= 0 && vm.pc < len(vm.program) {
		inst := vm.program[vm.pc]
		vm.pc++

		switch inst.Op {
		case compiler.OP_HALT:
			return vm.output, nil
		case compiler.OP_PUSH:
			vm.push(VInt(inst.Arg))
		case compiler.OP_PUSHSTR:
			vm.push(VStr(inst.ArgStr))
		case compiler.OP_LOAD:
			vm.push(vm.variables[inst.ArgStr])
		case compiler.OP_STORE:
			vm.variables[inst.ArgStr] = vm.pop()
		case compiler.OP_ADD:
			b, a := vm.popInt(), vm.popInt()
			vm.push(VInt(a + b))
		case compiler.OP_SUB:
			b, a := vm.popInt(), vm.popInt()
			vm.push(VInt(a - b))
		case compiler.OP_MUL:
			b, a := vm.popInt(), vm.popInt()
			vm.push(VInt(a * b))
		case compiler.OP_DIV:
			b, a := vm.popInt(), vm.popInt()
			vm.push(VInt(a / b))
		case compiler.OP_MOD:
			b, a := vm.popInt(), vm.popInt()
			vm.push(VInt(a % b))
		case compiler.OP_CONCAT:
			b, a := vm.pop(), vm.pop()
			vm.push(VStr(a.String() + b.String()))
		case compiler.OP_EQ:
			b, a := vm.popInt(), vm.popInt()
			if a == b { vm.push(VInt(1)) } else { vm.push(VInt(0)) }
		case compiler.OP_NEQ:
			b, a := vm.popInt(), vm.popInt()
			if a != b { vm.push(VInt(1)) } else { vm.push(VInt(0)) }
		case compiler.OP_LT:
			b, a := vm.popInt(), vm.popInt()
			if a < b { vm.push(VInt(1)) } else { vm.push(VInt(0)) }
		case compiler.OP_GT:
			b, a := vm.popInt(), vm.popInt()
			if a > b { vm.push(VInt(1)) } else { vm.push(VInt(0)) }
		case compiler.OP_LE:
			b, a := vm.popInt(), vm.popInt()
			if a <= b { vm.push(VInt(1)) } else { vm.push(VInt(0)) }
		case compiler.OP_GE:
			b, a := vm.popInt(), vm.popInt()
			if a >= b { vm.push(VInt(1)) } else { vm.push(VInt(0)) }
		case compiler.OP_PRINT:
			vm.output = append(vm.output, vm.pop().String())
		case compiler.OP_JMP:
			vm.pc += inst.Arg - 1
		case compiler.OP_JZ:
			if vm.popInt() == 0 {
				vm.pc += inst.Arg - 1
			}
		case compiler.OP_OBJLIT:
			obj := map[string]Value{}
			vm.objects = append(vm.objects, obj)
			vm.push(VInt(len(vm.objects) - 1))
		case compiler.OP_OBJSET:
			val := vm.pop()
			objIdx := vm.popInt()
			if objIdx >= 0 && objIdx < len(vm.objects) {
				vm.objects[objIdx][inst.ArgStr] = val
			}
		case compiler.OP_OBJGET:
			objIdx := vm.popInt()
			if objIdx >= 0 && objIdx < len(vm.objects) {
				vm.push(vm.objects[objIdx][inst.ArgStr])
			} else {
				vm.push(VInt(0))
			}
		case compiler.OP_CLASS_DEF:
			parts := strings.SplitN(inst.ArgStr, ":", 2)
			ci := &classInfo{name: parts[0]}
			if len(parts) > 1 {
				ci.parent = parts[1]
			}
			vm.classes[ci.name] = ci
		case compiler.OP_CLASS_FIELD:
			parts := strings.SplitN(inst.ArgStr, ".", 2)
			className := parts[0]
			fieldName := parts[1]
			if ci, ok := vm.classes[className]; ok {
				ci.fields = append(ci.fields, fieldName)
			}
			vm.pop() // discard default value
		case compiler.OP_INSTANTIATE:
			obj := map[string]Value{}
			if ci, ok := vm.classes[inst.ArgStr]; ok {
				parentFields := []string{}
				if ci.parent != "" {
					if pci, pok := vm.classes[ci.parent]; pok {
						parentFields = pci.fields
					}
				}
				for _, f := range append(parentFields, ci.fields...) {
					obj[f] = VInt(0)
				}
			}
			vm.objects = append(vm.objects, obj)
			vm.push(VInt(len(vm.objects) - 1))
		case compiler.OP_SETFIELD:
			val := vm.pop()
			objIdx := vm.popInt()
			if objIdx >= 0 && objIdx < len(vm.objects) {
				vm.objects[objIdx][inst.ArgStr] = val
			}
		}
	}
	return vm.output, nil
}
