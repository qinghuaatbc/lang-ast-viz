package vm

import (
	"context"
	"fmt"
	"strings"

	"deepcode/compiler"
)

type classInfo struct {
	name    string
	parent  string
	fields  []string
	methods map[string]int // method name -> bytecode address
}

type VM struct {
	stack        []Value
	variables    map[string]Value
	scopeStack   []map[string]bool       // true = shadowed, false = new var
	shadowedVars []map[string]Value      // old values of shadowed vars (parallel to scopeStack)
	objects      []map[string]Value
	objRefs      []int // reference count per object
	classes      map[string]*classInfo
	callStack    []int
	argStack     []Value
	pc           int
	program      []compiler.BytecodeInstr
	output       []string
}

func NewVM(program []compiler.BytecodeInstr) *VM {
	return &VM{
		stack:        []Value{},
		variables:    map[string]Value{},
		scopeStack:   []map[string]bool{},
		shadowedVars: []map[string]Value{},
		objects:      []map[string]Value{},
		objRefs:      []int{},
		classes:      map[string]*classInfo{},
		callStack:    []int{},
		argStack:     []Value{},
		program:      program,
		output:       []string{},
	}
}

func (vm *VM) push(v Value) {
	if v.Type == ValObj {
		vm.objRefs[v.Int]++
	}
	vm.stack = append(vm.stack, v)
}

func (vm *VM) pop() Value {
	if len(vm.stack) == 0 {
		vm.output = append(vm.output, "runtime error: stack underflow")
		return VInt(0)
	}
	v := vm.stack[len(vm.stack)-1]
	vm.stack = vm.stack[:len(vm.stack)-1]
	if v.Type == ValObj {
		vm.objRefs[v.Int]--
		if vm.objRefs[v.Int] <= 0 {
			vm.objRefs[v.Int] = 0
		}
	}
	return v
}

func (vm *VM) storeVar(name string, v Value) {
	if old, ok := vm.variables[name]; ok && old.Type == ValObj {
		vm.objRefs[old.Int]--
	}
	if v.Type == ValObj {
		vm.objRefs[v.Int]++
	}
	vm.variables[name] = v
}

func (vm *VM) declareVar(name string, v Value) {
	if len(vm.scopeStack) > 0 {
		scope := vm.scopeStack[len(vm.scopeStack)-1]
		if _, exists := scope[name]; !exists {
			if old, ok := vm.variables[name]; ok {
				scope[name] = true
				vm.shadowedVars[len(vm.shadowedVars)-1][name] = old
			} else {
				scope[name] = false
			}
		}
	}
	vm.storeVar(name, v)
}

func (vm *VM) popInt() (int, error) {
	v := vm.pop()
	return v.AsInt()
}

func (vm *VM) popTwoInts() (int, int, error) {
	b, err := vm.popInt()
	if err != nil { return 0, 0, err }
	a, err := vm.popInt()
	if err != nil { return 0, 0, err }
	return a, b, nil
}

func (vm *VM) Run() ([]string, error) { return vm.RunWithCtx(context.Background()) }

func (vm *VM) RunWithCtx(ctx context.Context) ([]string, error) {
	vm.pc = 0
	vm.output = nil

	for vm.pc >= 0 && vm.pc < len(vm.program) {
		// Check context every 128 instructions to reduce overhead
		if vm.pc&127 == 0 {
			select {
			case <-ctx.Done():
				vm.output = append(vm.output, "halted: "+ctx.Err().Error())
				return vm.output, nil
			default:
			}
		}
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
			if v, ok := vm.variables[inst.ArgStr]; ok {
				vm.push(v)
			} else {
				vm.output = append(vm.output, fmt.Sprintf("runtime error: undefined variable '%s'", inst.ArgStr))
				vm.push(VInt(0))
			}
		case compiler.OP_STORE:
			vm.storeVar(inst.ArgStr, vm.pop())
		case compiler.OP_DECLARE:
			vm.declareVar(inst.ArgStr, vm.pop())
		case compiler.OP_ADD:
			b, a := vm.pop(), vm.pop()
			if a.Type == ValStr || b.Type == ValStr {
				vm.push(VStr(a.String() + b.String()))
			} else if a.Type == ValInt && b.Type == ValInt {
				vm.push(VInt(a.Int + b.Int))
			} else {
				vm.push(VInt(0))
			}
		case compiler.OP_SUB:
			a, b, err := vm.popTwoInts()
			if err != nil { return nil, fmt.Errorf("line %d: %v", vm.pc, err) }
			vm.push(VInt(a - b))
		case compiler.OP_MUL:
			a, b, err := vm.popTwoInts()
			if err != nil { return nil, fmt.Errorf("line %d: %v", vm.pc, err) }
			vm.push(VInt(a * b))
		case compiler.OP_DIV:
			a, b, err := vm.popTwoInts()
			if err != nil { return nil, fmt.Errorf("line %d: %v", vm.pc, err) }
			if b == 0 { return nil, fmt.Errorf("division by zero") }
			vm.push(VInt(a / b))
		case compiler.OP_MOD:
			a, b, err := vm.popTwoInts()
			if err != nil { return nil, fmt.Errorf("line %d: %v", vm.pc, err) }
			if b == 0 { return nil, fmt.Errorf("modulo by zero") }
			vm.push(VInt(a % b))
		case compiler.OP_CONCAT:
			a, b := vm.pop(), vm.pop()
			vm.push(VStr(b.String() + a.String()))
		case compiler.OP_EQ:
			a, b, err := vm.popTwoInts()
			if err != nil { return nil, fmt.Errorf("line %d: %v", vm.pc, err) }
			if a == b { vm.push(VInt(1)) } else { vm.push(VInt(0)) }
		case compiler.OP_NEQ:
			a, b, err := vm.popTwoInts()
			if err != nil { return nil, fmt.Errorf("line %d: %v", vm.pc, err) }
			if a != b { vm.push(VInt(1)) } else { vm.push(VInt(0)) }
		case compiler.OP_LT:
			a, b, err := vm.popTwoInts()
			if err != nil { return nil, fmt.Errorf("line %d: %v", vm.pc, err) }
			if a < b { vm.push(VInt(1)) } else { vm.push(VInt(0)) }
		case compiler.OP_GT:
			a, b, err := vm.popTwoInts()
			if err != nil { return nil, fmt.Errorf("line %d: %v", vm.pc, err) }
			if a > b { vm.push(VInt(1)) } else { vm.push(VInt(0)) }
		case compiler.OP_LE:
			a, b, err := vm.popTwoInts()
			if err != nil { return nil, fmt.Errorf("line %d: %v", vm.pc, err) }
			if a <= b { vm.push(VInt(1)) } else { vm.push(VInt(0)) }
		case compiler.OP_GE:
			a, b, err := vm.popTwoInts()
			if err != nil { return nil, fmt.Errorf("line %d: %v", vm.pc, err) }
			if a >= b { vm.push(VInt(1)) } else { vm.push(VInt(0)) }
		case compiler.OP_PRINT:
			vm.output = append(vm.output, vm.pop().String())
		case compiler.OP_JMP:
			vm.pc += inst.Arg - 1
		case compiler.OP_JZ:
			val, err := vm.popInt()
			if err != nil { return nil, fmt.Errorf("line %d: %v", vm.pc, err) }
			if val == 0 {
				vm.pc += inst.Arg - 1
			}
		case compiler.OP_OBJLIT:
			obj := map[string]Value{}
			vm.objects = append(vm.objects, obj)
			vm.objRefs = append(vm.objRefs, 0)
			vm.push(VObj(len(vm.objects) - 1))
		case compiler.OP_OBJSET:
			val := vm.pop()
			if len(vm.stack) > 0 {
				objIdx := vm.stack[len(vm.stack)-1].Int // peek
				if objIdx >= 0 && objIdx < len(vm.objects) {
					vm.objects[objIdx][inst.ArgStr] = val
				}
			}
		case compiler.OP_OBJGET:
			v := vm.pop()
			if v.Type == ValObj {
				objIdx := v.Int
				if objIdx >= 0 && objIdx < len(vm.objects) {
					vm.push(vm.objects[objIdx][inst.ArgStr])
				} else {
					vm.push(VInt(0))
				}
			} else {
				vm.push(VInt(0))
			}
		case compiler.OP_CLASS_DEF:
			parts := strings.SplitN(inst.ArgStr, ":", 2)
			ci := &classInfo{name: parts[0], methods: map[string]int{}}
			if len(parts) > 1 {
				ci.parent = parts[1]
			}
			vm.classes[ci.name] = ci
		case compiler.OP_CLASS_FIELD:
			parts := strings.SplitN(inst.ArgStr, ".", 2)
			className, fieldName := parts[0], parts[1]
			if ci, ok := vm.classes[className]; ok {
				ci.fields = append(ci.fields, fieldName)
			}
			vm.pop()
		case compiler.OP_INSTANTIATE:
			obj := map[string]Value{}
			if ci, ok := vm.classes[inst.ArgStr]; ok {
				var allFields []string
				if ci.parent != "" {
					if pci, pok := vm.classes[ci.parent]; pok {
						allFields = append(allFields, pci.fields...)
					}
				}
				allFields = append(allFields, ci.fields...)
				for _, f := range allFields {
					obj[f] = VInt(0)
				}
				obj["__class"] = VStr(ci.name)
			}
			vm.objects = append(vm.objects, obj)
			vm.objRefs = append(vm.objRefs, 0)
			vm.push(VObj(len(vm.objects) - 1))
		case compiler.OP_SETFIELD:
			val := vm.pop()
			if len(vm.stack) > 0 {
				objIdx := vm.stack[len(vm.stack)-1].Int // peek
				if objIdx >= 0 && objIdx < len(vm.objects) {
					vm.objects[objIdx][inst.ArgStr] = val
				}
			}
		case compiler.OP_CALL:
			vm.callStack = append(vm.callStack, vm.pc)
			vm.pc += inst.Arg - 1
		case compiler.OP_RETURN:
			returnVal := vm.pop()
			vm.argStack = nil // cleanup args
			if len(vm.callStack) > 0 {
				vm.pc = vm.callStack[len(vm.callStack)-1]
				vm.callStack = vm.callStack[:len(vm.callStack)-1]
				vm.push(returnVal)
			} else {
				vm.push(returnVal)
				vm.pc = len(vm.program)
			}
		case compiler.OP_PUSHARG:
			vm.argStack = append(vm.argStack, vm.pop())
		case compiler.OP_POPARG:
			if len(vm.argStack) > 0 {
				val := vm.argStack[len(vm.argStack)-1]
				vm.argStack = vm.argStack[:len(vm.argStack)-1]
				vm.declareVar(inst.ArgStr, val)
			}
		case compiler.OP_SCOPE_ENTER:
			vm.scopeStack = append(vm.scopeStack, map[string]bool{})
			vm.shadowedVars = append(vm.shadowedVars, map[string]Value{})
		case compiler.OP_SCOPE_EXIT:
			if len(vm.scopeStack) > 0 {
				scope := vm.scopeStack[len(vm.scopeStack)-1]
				shadows := vm.shadowedVars[len(vm.shadowedVars)-1]
				for name, wasShadowed := range scope {
					if wasShadowed {
						vm.storeVar(name, shadows[name])
					} else {
						if v, ok := vm.variables[name]; ok && v.Type == ValObj {
							vm.objRefs[v.Int]--
						}
						delete(vm.variables, name)
					}
				}
				vm.scopeStack = vm.scopeStack[:len(vm.scopeStack)-1]
				vm.shadowedVars = vm.shadowedVars[:len(vm.shadowedVars)-1]
			}
		case compiler.OP_DUP:
			if len(vm.stack) > 0 {
				vm.push(vm.stack[len(vm.stack)-1])
			}
		case compiler.OP_ARRAYLIT:
			vm.objects = append(vm.objects, map[string]Value{})
			vm.objRefs = append(vm.objRefs, 0)
			// Tag with __array=1 internally
			vm.objects[len(vm.objects)-1]["__len"] = VInt(0)
			vm.push(VObj(len(vm.objects) - 1))
		case compiler.OP_ARRAYSET:
			val := vm.pop()
			if len(vm.stack) > 0 {
				arrIdx := vm.stack[len(vm.stack)-1].Int
				if arrIdx >= 0 && arrIdx < len(vm.objects) {
					len := vm.objects[arrIdx]["__len"].Int
					vm.objects[arrIdx][fmt.Sprintf("%d", len)] = val
					vm.objects[arrIdx]["__len"] = VInt(len + 1)
				}
			}
		case compiler.OP_ARRAYGET:
			idx, err := vm.popInt()
			if err != nil { return nil, fmt.Errorf("array index: %v", err) }
			v := vm.pop()
			if v.Type == ValObj && v.Int >= 0 && v.Int < len(vm.objects) {
				vm.push(vm.objects[v.Int][fmt.Sprintf("%d", idx)])
			} else {
				vm.push(VInt(0))
			}
		case compiler.OP_CLASS_METHOD:
			// ArgStr = "ClassName:methodName:ClassName_methodName", Arg = function entry address
			parts := strings.SplitN(inst.ArgStr, ":", 3)
			if len(parts) == 3 {
				className := parts[0]
				methodName := parts[1]
				if ci, ok := vm.classes[className]; ok {
					ci.methods[methodName] = inst.Arg
				}
			}
		case compiler.OP_METHOD_CALL:
			// ArgStr = "methodName:argCount"
			parts := strings.SplitN(inst.ArgStr, ":", 2)
			methodName := parts[0]
			argCount := 0
			fmt.Sscanf(parts[1], "%d", &argCount)

			// Look up the method from self's class
			if len(vm.argStack) >= argCount {
				selfVal := vm.argStack[0]
				if selfVal.Type == ValObj && selfVal.Int >= 0 && selfVal.Int < len(vm.objects) {
					if clsStr := vm.objects[selfVal.Int]["__class"]; clsStr.Type == ValStr {
						className := clsStr.Str
						if ci, ok := vm.classes[className]; ok {
							if fnAddr, ok := ci.methods[methodName]; ok {
								// Ref count self before pushing to argStack
								vm.objRefs[selfVal.Int]++
								vm.callStack = append(vm.callStack, vm.pc)
								vm.pc = fnAddr
								break
							}
						}
					}
				}
			}
			// Fallback: method not found, push 0
			vm.argStack = nil
			vm.push(VInt(0))
		case compiler.OP_CALL_INIT:
			// ArgStr = "className:argCount", Dest = obj temp
			parts := strings.SplitN(inst.ArgStr, ":", 2)
			className := parts[0]
			argCount := 0
			fmt.Sscanf(parts[1], "%d", &argCount)

			if ci, ok := vm.classes[className]; ok {
				if addr, ok := ci.methods["__init__"]; ok {
					// argStack has [self, arg1, arg2, ...]
					// Increment self ref for the method call
					if len(vm.argStack) > argCount {
						selfVal := vm.argStack[0]
						if selfVal.Type == ValObj {
							vm.objRefs[selfVal.Int]++
						}
					}
					vm.callStack = append(vm.callStack, vm.pc)
					vm.pc = addr
					break
				}
			}
			// No __init__: clean up args
			for i := 0; i <= argCount; i++ {
				if len(vm.argStack) > 0 {
					vm.argStack = vm.argStack[:len(vm.argStack)-1]
				}
			}
		}
	}
	return vm.output, nil
}
