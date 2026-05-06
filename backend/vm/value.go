package vm

import "fmt"

type ValType int

const (
	ValInt ValType = iota
	ValStr
)

type Value struct {
	Type  ValType
	Int   int
	Str   string
}

func VInt(v int) Value    { return Value{Type: ValInt, Int: v} }
func VStr(s string) Value { return Value{Type: ValStr, Str: s} }

func (v Value) String() string {
	if v.Type == ValStr {
		return v.Str
	}
	return fmt.Sprintf("%d", v.Int)
}
