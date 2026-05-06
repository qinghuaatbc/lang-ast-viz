package vm

import "fmt"

type ValType int

const (
	ValInt ValType = iota
	ValStr
	ValObj // object reference (Int = obj index)
)

type Value struct {
	Type ValType
	Int  int
	Str  string
}

func VInt(v int) Value    { return Value{Type: ValInt, Int: v} }
func VStr(s string) Value { return Value{Type: ValStr, Str: s} }
func VObj(idx int) Value  { return Value{Type: ValObj, Int: idx} }

func (v Value) String() string {
	switch v.Type {
	case ValStr:
		return v.Str
	case ValObj:
		return fmt.Sprintf("<obj %d>", v.Int)
	default:
		return fmt.Sprintf("%d", v.Int)
	}
}

// PopInt returns the int value, checking type
func (v Value) AsInt() (int, error) {
	if v.Type != ValInt {
		return 0, fmt.Errorf("expected integer, got %s", v.TypeName())
	}
	return v.Int, nil
}

func (v Value) TypeName() string {
	switch v.Type {
	case ValInt:
		return "int"
	case ValStr:
		return "string"
	case ValObj:
		return "object"
	default:
		return "unknown"
	}
}
