package compiler

type TokenType int

const (
	ILLEGAL TokenType = iota
	EOF
	IDENT
	NUMBER
	STRING
	TRUE
	FALSE
	ASSIGN
	PLUS
	MINUS
	STAR
	MOD
	SLASH
	PERCENT
	EQ
	NEQ
	LT
	GT
	LE
	GE
	LPAREN
	RPAREN
	LBRACE
	RBRACE
	LBRACKET
	RBRACKET
	SEMICOLON
	PRINT
	IF
	ELSE
	WHILE
	LET
	DOT
	COMMA
	CLASS
	EXTENDS
	SELF
	NEW
)

type Token struct {
	Type    TokenType
	Literal string
	Line    int
	Col     int
}
