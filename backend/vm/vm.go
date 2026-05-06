package vm

import (
	"fmt"
	"strings"

	"lang-ast-viz/compiler"
)

type classInfo struct {
	name   string
	parent string
	fields []string // field names in order
}

type VM struct {
	stack     []int
	variables map[string]int
	objects   []map[string]int
	classes   map[string]*classInfo
	pc        int
	program   []compiler.BytecodeInstr
	output    []string
}

func NewVM(program []compiler.BytecodeInstr) *VM {
	return &VM{
		stack:     []int{},
		variables: map[string]int{},
		objects:   []map[string]int{},
		classes:   map[string]*classInfo{},
		program:   program,
		output:    []string{},
	}
}

func (vm *VM) push(v int) {
	vm.stack = append(vm.stack, v)
}

func (vm *VM) pop() int {
	if len(vm.stack) == 0 {
		return 0
	}
	v := vm.stack[len(vm.stack)-1]
	vm.stack = vm.stack[:len(vm.stack)-1]
	return v
}

func (vm *VM) safePop() (int, bool) {
	if len(vm.stack) == 0 {
		return 0, false
	}
	v := vm.stack[len(vm.stack)-1]
	vm.stack = vm.stack[:len(vm.stack)-1]
	return v, true
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
			vm.push(inst.Arg)
		case compiler.OP_LOAD:
			val := vm.variables[inst.ArgStr]
			vm.push(val)
		case compiler.OP_STORE:
			vm.variables[inst.ArgStr] = vm.pop()
		case compiler.OP_ADD:
			b, a := vm.pop(), vm.pop()
			vm.push(a + b)
		case compiler.OP_SUB:
			b, a := vm.pop(), vm.pop()
			vm.push(a - b)
		case compiler.OP_MUL:
			b, a := vm.pop(), vm.pop()
			vm.push(a * b)
		case compiler.OP_DIV:
			b, a := vm.pop(), vm.pop()
			vm.push(a / b)
		case compiler.OP_MOD:
			b, a := vm.pop(), vm.pop()
			vm.push(a % b)
		case compiler.OP_EQ:
			b, a := vm.pop(), vm.pop()
			if a == b { vm.push(1) } else { vm.push(0) }
		case compiler.OP_NEQ:
			b, a := vm.pop(), vm.pop()
			if a != b { vm.push(1) } else { vm.push(0) }
		case compiler.OP_LT:
			b, a := vm.pop(), vm.pop()
			if a < b { vm.push(1) } else { vm.push(0) }
		case compiler.OP_GT:
			b, a := vm.pop(), vm.pop()
			if a > b { vm.push(1) } else { vm.push(0) }
		case compiler.OP_LE:
			b, a := vm.pop(), vm.pop()
			if a <= b { vm.push(1) } else { vm.push(0) }
		case compiler.OP_GE:
			b, a := vm.pop(), vm.pop()
			if a >= b { vm.push(1) } else { vm.push(0) }
		case compiler.OP_PRINT:
			vm.output = append(vm.output, fmt.Sprintf("%d", vm.pop()))
		case compiler.OP_JMP:
			vm.pc += inst.Arg - 1
		case compiler.OP_JZ:
			if vm.pop() == 0 {
				vm.pc += inst.Arg - 1
			}
		case compiler.OP_OBJLIT:
			obj := map[string]int{}
			vm.objects = append(vm.objects, obj)
			vm.push(len(vm.objects) - 1)
		case compiler.OP_OBJSET:
			val := vm.pop()
			objIdx := vm.pop()
			if objIdx >= 0 && objIdx < len(vm.objects) {
				vm.objects[objIdx][inst.ArgStr] = val
			}
		case compiler.OP_OBJGET:
			objIdx := vm.pop()
			if objIdx >= 0 && objIdx < len(vm.objects) {
				vm.push(vm.objects[objIdx][inst.ArgStr])
			} else {
				vm.push(0)
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
			obj := map[string]int{}
			if ci, ok := vm.classes[inst.ArgStr]; ok {
				// inherited fields
				parentFields := []string{}
				if ci.parent != "" {
					if pci, pok := vm.classes[ci.parent]; pok {
						parentFields = pci.fields
					}
				}
				allFields := append(parentFields, ci.fields...)
				for _, f := range allFields {
					obj[f] = 0
				}
				// store class name for SETFIELD lookup
				obj["__class"] = 0 // placeholder
			}
			vm.objects = append(vm.objects, obj)
			vm.push(len(vm.objects) - 1)
		case compiler.OP_SETFIELD:
			val := vm.pop()
			objIdx := vm.pop()
			if objIdx >= 0 && objIdx < len(vm.objects) {
				vm.objects[objIdx][inst.ArgStr] = val
			}
		}
	}
	return vm.output, nil
}
