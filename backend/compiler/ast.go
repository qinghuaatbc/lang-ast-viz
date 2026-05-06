package compiler

import "fmt"

type NodeType int

const (
	NProgram NodeType = iota
	NLetStmt
	NAssignStmt
	NPrintStmt
	NIfStmt
	NWhileStmt
	NBlockStmt
	NBinaryExpr
	NNumberLit
	NStringLit
	NBoolLit
	NIdent
	NFieldAccess
	NObjLit
	NClassDecl
	NCallExpr
	NSelf
	NNewExpr
)

type Node struct {
	Type     NodeType `json:"nodeType"`
	Children []*Node  `json:"children"`
	Value    string   `json:"value"`
	Line     int      `json:"line"`
	Col      int      `json:"col"`
}

func NewNode(t NodeType, val string, line, col int) *Node {
	return &Node{Type: t, Value: val, Children: []*Node{}, Line: line, Col: col}
}

func (n *Node) AddChild(child *Node) {
	n.Children = append(n.Children, child)
}

func (n *Node) TypeName() string {
	switch n.Type {
	case NProgram:
		return "Program"
	case NLetStmt:
		return "LetStatement"
	case NAssignStmt:
		return "AssignStatement"
	case NPrintStmt:
		return "PrintStatement"
	case NIfStmt:
		return "IfStatement"
	case NWhileStmt:
		return "WhileStatement"
	case NBlockStmt:
		return "BlockStatement"
	case NBinaryExpr:
		return "BinaryExpression"
	case NNumberLit:
		return "NumberLiteral"
	case NStringLit:
		return "StringLiteral"
	case NBoolLit:
		return "BoolLiteral"
	case NIdent:
		return "Identifier"
	case NFieldAccess:
		return "FieldAccess"
	case NObjLit:
		return "ObjectLiteral"
	case NClassDecl:
		return "ClassDecl"
	case NCallExpr:
		return "CallExpr"
	case NSelf:
		return "Self"
	case NNewExpr:
		return "NewExpr"
	default:
		return "Unknown"
	}
}

func (n *Node) String() string {
	return fmt.Sprintf("%s(%s)", n.TypeName(), n.Value)
}
