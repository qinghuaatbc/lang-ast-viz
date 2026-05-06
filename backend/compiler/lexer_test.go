package compiler

import (
	"testing"

	"lang-ast-viz/compiler/lang"
)

func lex(s string) []Token {
	l := NewLexer(s)
	var toks []Token
	for {
		t := l.NextToken()
		toks = append(toks, t)
		if t.Type == EOF {
			break
		}
	}
	return toks
}

func TestLexNumbers(t *testing.T) {
	toks := lex("123")
	if len(toks) != 2 || toks[0].Type != NUMBER || toks[0].Literal != "123" {
		t.Fatalf("expected NUMBER(123) EOF, got %v", toks)
	}
}

func TestLexIdent(t *testing.T) {
	toks := lex("foo")
	if len(toks) != 2 || toks[0].Type != IDENT || toks[0].Literal != "foo" {
		t.Fatalf("expected IDENT(foo) EOF, got %v", toks)
	}
}

func TestLexKeywords(t *testing.T) {
	toks := lex("let if else elif while fn return class true false print")
	types := []TokenType{LET, IF, ELSE, ELIF, WHILE, FN, RETURN, CLASS, TRUE, FALSE, PRINT, EOF}
	if len(toks) != len(types) {
		t.Fatalf("expected %d tokens, got %d: %v", len(types), len(toks), toks)
	}
	for i, tt := range types {
		if toks[i].Type != tt {
			t.Fatalf("token %d: expected %d, got %d (%s)", i, tt, toks[i].Type, toks[i].Literal)
		}
	}
}

func TestLexString(t *testing.T) {
	toks := lex(`"hello world"`)
	if len(toks) != 2 || toks[0].Type != STRING || toks[0].Literal != "hello world" {
		t.Fatalf("expected STRING(hello world) EOF, got %v", toks)
	}
}

func TestLexOperators(t *testing.T) {
	toks := lex("+ - * / % == != < > <= >= = . , ( ) { } [ ] ; :")
	types := []TokenType{PLUS, MINUS, STAR, SLASH, MOD, EQ, NEQ, LT, GT, LE, GE, ASSIGN, DOT, COMMA, LPAREN, RPAREN, LBRACE, RBRACE, LBRACKET, RBRACKET, SEMICOLON, COLON, EOF}
	if len(toks) != len(types) {
		t.Fatalf("expected %d tokens, got %d: %v", len(types), len(toks), toks)
	}
	for i, tt := range types {
		if toks[i].Type != tt {
			t.Fatalf("token %d: expected %d, got %d (%s)", i, tt, toks[i].Type, toks[i].Literal)
		}
	}
}

func TestLexNewlineAsSemicolon(t *testing.T) {
	cfg := lang.GetConfig(lang.Python)
	l := NewLexerWithLang("x = 5\nprint(x)", cfg)
	toks := []Token{}
	for {
		t := l.NextToken()
		toks = append(toks, t)
		if t.Type == EOF {
			break
		}
	}
	// x, ASSIGN, 5, SEMICOLON(newline), print, LPAREN, x, RPAREN, EOF
	if len(toks) < 5 {
		t.Fatalf("expected at least 5 tokens, got %d: %v", len(toks), toks)
	}
	if toks[3].Type != SEMICOLON {
		t.Fatalf("expected SEMICOLON for newline, got %d (%s)", toks[3].Type, toks[3].Literal)
	}
}

func TestLexComment(t *testing.T) {
	toks := lex("// comment\n42")
	if len(toks) != 2 || toks[0].Type != NUMBER || toks[0].Literal != "42" {
		t.Fatalf("expected NUMBER(42) EOF, got %v", toks)
	}
}
