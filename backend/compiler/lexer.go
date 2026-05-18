package compiler

import "deepcode/compiler/lang"

type Lexer struct {
	input          string
	pos            int
	readPos        int
	ch             byte
	line, col      int
	tokLine, tokCol int
	config         lang.Config
	lines          []string // cached source lines for error display
}

func (l *Lexer) SourceLine(n int) string {
	if n < 1 || n > len(l.lines) {
		return ""
	}
	return l.lines[n-1]
}

func (l *Lexer) cacheLines() {
	l.lines = splitLines(l.input)
}

func splitLines(s string) []string {
	var lines []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == '\n' {
			lines = append(lines, s[start:i])
			start = i + 1
		}
	}
	lines = append(lines, s[start:])
	return lines
}

func NewLexer(input string) *Lexer {
	return NewLexerWithLang(input, lang.Config{Lang: lang.Rust, DeclKeyword: "let", RequireSemicolon: true, UseBraces: true, PrintFuncStyle: false})
}

func NewLexerWithLang(input string, cfg lang.Config) *Lexer {
	l := &Lexer{input: input, line: 1, col: 0, config: cfg}
	l.cacheLines()
	l.readChar()
	return l
}

func (l *Lexer) readChar() {
	if l.readPos >= len(l.input) {
		l.ch = 0
	} else {
		l.ch = l.input[l.readPos]
	}
	l.pos = l.readPos
	l.readPos++
	if l.ch == '\n' {
		l.line++
		l.col = 0
	} else {
		l.col++
	}
}

func (l *Lexer) NextToken() Token {
	l.skipWhitespace()
	l.tokLine = l.line
	l.tokCol = l.col

	// Handle newlines: Python mode = terminator, other modes = whitespace
	for l.ch == '\n' {
		if l.config.RequireSemicolon {
			l.readChar()
			l.skipWhitespace()
			l.tokLine = l.line
			l.tokCol = l.col
		} else {
			tok := Token{Type: SEMICOLON, Literal: "\n", Line: l.tokLine, Col: l.tokCol}
			l.readChar()
			return tok
		}
	}

	var tok Token
	switch l.ch {
	case '=':
		if l.peekChar() == '=' {
			l.readChar()
			tok = l.makeToken(EQ, "==")
		} else {
			tok = l.makeToken(ASSIGN, "=")
		}
	case '+':
		if l.peekChar() == '=' {
			l.readChar()
			tok = l.makeToken(PLUS_ASSIGN, "+=")
		} else {
			tok = l.makeToken(PLUS, "+")
		}
	case '-':
		if l.peekChar() == '=' {
			l.readChar()
			tok = l.makeToken(MINUS_ASSIGN, "-=")
		} else {
			tok = l.makeToken(MINUS, "-")
		}
	case '*':
		if l.peekChar() == '=' {
			l.readChar()
			tok = l.makeToken(STAR_ASSIGN, "*=")
		} else {
			tok = l.makeToken(STAR, "*")
		}
	case '%':
		if l.peekChar() == '=' {
			l.readChar()
			tok = l.makeToken(MOD_ASSIGN, "%=")
		} else {
			tok = l.makeToken(MOD, "%")
		}
	case '/':
		if l.peekChar() == '/' {
			// line comment: skip until end of line
			for l.ch != '\n' && l.ch != 0 {
				l.readChar()
			}
			return l.NextToken() // restart tokenization
		}
		if l.peekChar() == '=' {
			l.readChar()
			tok = l.makeToken(SLASH_ASSIGN, "/=")
		} else {
			tok = l.makeToken(SLASH, "/")
		}
	case '!':
		if l.peekChar() == '=' {
			l.readChar()
			tok = l.makeToken(NEQ, "!=")
		} else {
			tok = l.makeToken(ILLEGAL, "!")
		}
	case '<':
		if l.peekChar() == '=' {
			l.readChar()
			tok = l.makeToken(LE, "<=")
		} else {
			tok = l.makeToken(LT, "<")
		}
	case '>':
		if l.peekChar() == '=' {
			l.readChar()
			tok = l.makeToken(GE, ">=")
		} else {
			tok = l.makeToken(GT, ">")
		}
	case '(':
		tok = l.makeToken(LPAREN, "(")
	case ')':
		tok = l.makeToken(RPAREN, ")")
	case '{':
		tok = l.makeToken(LBRACE, "{")
	case '}':
		tok = l.makeToken(RBRACE, "}")
	case ';':
		tok = l.makeToken(SEMICOLON, ";")
	case ':':
		tok = l.makeToken(COLON, ":")
	case '.':
		tok = l.makeToken(DOT, ".")
	case ',':
		tok = l.makeToken(COMMA, ",")
	case '[':
		tok = l.makeToken(LBRACKET, "[")
	case ']':
		tok = l.makeToken(RBRACKET, "]")
	case 0:
		tok = l.makeToken(EOF, "")
	default:
		if isLetter(l.ch) || l.ch == '_' {
			lit := l.readIdentifier()
			tok = Token{Type: l.lookupIdent(lit), Literal: lit, Line: l.tokLine, Col: l.tokCol}
			return tok
		}
		if isDigit(l.ch) {
			lit := l.readNumber()
			tok = Token{Type: NUMBER, Literal: lit, Line: l.tokLine, Col: l.tokCol}
			return tok
		}
		if l.ch == '"' {
			lit := l.readString()
			tok = Token{Type: STRING, Literal: lit, Line: l.tokLine, Col: l.tokCol}
			return tok
		}
		tok = l.makeToken(ILLEGAL, string(l.ch))
	}
	return tok
}

// makeToken creates a token from current char and advances past it
func (l *Lexer) makeToken(tt TokenType, lit string) Token {
	t := Token{Type: tt, Literal: lit, Line: l.tokLine, Col: l.tokCol}
	l.readChar()
	return t
}

func (l *Lexer) skipWhitespace() {
	for l.ch == ' ' || l.ch == '\t' || l.ch == '\r' {
		l.readChar()
	}
}

func (l *Lexer) readIdentifier() string {
	start := l.pos
	for isLetter(l.ch) || isDigit(l.ch) || l.ch == '_' {
		l.readChar()
	}
	return l.input[start:l.pos]
}

func (l *Lexer) readNumber() string {
	start := l.pos
	for isDigit(l.ch) {
		l.readChar()
	}
	return l.input[start:l.pos]
}

func (l *Lexer) readString() string {
	l.readChar() // skip opening "
	start := l.pos
	for l.ch != '"' && l.ch != 0 {
		l.readChar()
	}
	result := l.input[start:l.pos]
	if l.ch == '"' {
		l.readChar() // skip closing "
	}
	return result
}

func (l *Lexer) peekChar() byte {
	if l.readPos >= len(l.input) {
		return 0
	}
	return l.input[l.readPos]
}

func isLetter(ch byte) bool {
	return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch == '_'
}

func isDigit(ch byte) bool {
	return ch >= '0' && ch <= '9'
}

func (l *Lexer) lookupIdent(ident string) TokenType {
	// Common keywords across all languages
	switch ident {
	case "class":
		return CLASS
	case "extends":
		return EXTENDS
	case "self":
		return SELF
	case "new":
		return NEW
	case "fn", "func", "function":
		return FN
	case "return":
		return RETURN
	case "continue":
		return CONTINUE
	case "break":
		return BREAK
	case "if":
		return IF
	case "else":
		return ELSE
	case "elif":
		return ELIF
	case "while":
		return WHILE
	}

	switch l.config.Lang {
	case lang.GoLang:
		switch ident {
		case "true":
			return TRUE
		case "false":
			return FALSE
		case "print":
			return PRINT
		case "var":
			return LET
		default:
			return IDENT
		}
	case lang.Python:
		switch ident {
		case "True", "False":
			return TRUE
		case "print":
			return PRINT
		default:
			return IDENT
		}
	case lang.TypeScript:
		switch ident {
		case "true":
			return TRUE
		case "false":
			return FALSE
		case "print":
			return PRINT
		case "let", "const":
			return LET
		default:
			return IDENT
		}
	case lang.CLang:
		switch ident {
		case "true":
			return TRUE
		case "false":
			return FALSE
		case "printf":
			return PRINT
		case "int":
			return LET
		default:
			return IDENT
		}
	default: // Rust-like
		switch ident {
		case "true":
			return TRUE
		case "false":
			return FALSE
		case "print":
			return PRINT
		case "let":
			return LET
		default:
			return IDENT
		}
	}
}
