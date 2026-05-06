package compiler

import (
	"fmt"
	"lang-ast-viz/compiler/lang"
)

type Parser struct {
	lex    *Lexer
	cur    Token
	peek   Token
	errs   []string
	config lang.Config
}

func NewParser(lex *Lexer) *Parser {
	p := &Parser{lex: lex}
	p.config = lex.config
	p.peek = lex.NextToken()
	p.nextToken()
	return p
}

func (p *Parser) Errors() []string { return p.errs }

func (p *Parser) addErr(msg string) {
	p.errs = append(p.errs, fmt.Sprintf("line %d:%d: %s", p.cur.Line, p.cur.Col, msg))
}

func (p *Parser) nextToken() {
	p.cur = p.peek
	p.peek = p.lex.NextToken()
	if p.cur.Type == ILLEGAL {
		p.addErr(fmt.Sprintf("illegal character: %s", p.cur.Literal))
	}
}

func (p *Parser) expect(tt TokenType) bool {
	if p.peek.Type == tt {
		p.nextToken()
		return true
	}
	p.addErr(fmt.Sprintf("expected next token to be %d, got %s (%d)", tt, p.peek.Literal, p.peek.Type))
	return false
}

func (p *Parser) expectPeek(tt TokenType) bool {
	if p.cur.Type == tt {
		return true
	}
	return false
}

func (p *Parser) Parse() *Node {
	prog := NewNode(NProgram, "program", 0, 0)
	for p.cur.Type != EOF {
		stmt := p.parseStmt()
		if stmt != nil {
			prog.AddChild(stmt)
		}
		if p.cur.Type == SEMICOLON {
			p.nextToken()
		} else if !p.config.RequireSemicolon && (p.cur.Type == RBRACE || p.cur.Type == EOF) {
		} else if !p.config.RequireSemicolon {
		}
	}
	return prog
}

func (p *Parser) parseStmt() *Node {
	switch p.cur.Type {
	case LET:
		return p.parseLetStmt()
	case PRINT:
		return p.parsePrintStmt()
	case IF:
		return p.parseIfStmt()
	case WHILE:
		return p.parseWhileStmt()
	case CLASS:
		return p.parseClassDecl()
	case RBRACE:
		return nil
	case EOF:
		return nil
	case SEMICOLON:
		p.nextToken()
		return nil
	default:
		if p.cur.Type == IDENT && p.peek.Type == ASSIGN {
			return p.parseAssignStmt()
		}
		p.addErr(fmt.Sprintf("unexpected token: %s (%d)", p.cur.Literal, p.cur.Type))
		return nil
	}
}

func (p *Parser) parseLetStmt() *Node {
	n := NewNode(NLetStmt, p.config.DeclKeyword, p.cur.Line, p.cur.Col)
	if p.peek.Type != IDENT {
		p.addErr("expected identifier")
		return n
	}
	p.nextToken()
	ident := NewNode(NIdent, p.cur.Literal, p.cur.Line, p.cur.Col)
	n.AddChild(ident)
	if p.peek.Type != ASSIGN {
		p.addErr("expected =")
		return n
	}
	p.nextToken() // advance to ASSIGN
	p.nextToken() // advance past ASSIGN to expression
	expr := p.parseExpr(0)
	if expr != nil {
		n.AddChild(expr)
	}
	return n
}

func (p *Parser) parseAssignStmt() *Node {
	if p.cur.Type != IDENT {
		p.addErr(fmt.Sprintf("unexpected token: %s", p.cur.Literal))
		return nil
	}
	n := NewNode(NAssignStmt, "assign", p.cur.Line, p.cur.Col)
	ident := NewNode(NIdent, p.cur.Literal, p.cur.Line, p.cur.Col)
	n.AddChild(ident)
	if p.peek.Type != ASSIGN {
		p.addErr("expected =")
		return n
	}
	p.nextToken() // advance to ASSIGN
	p.nextToken() // advance past ASSIGN to expression
	expr := p.parseExpr(0)
	if expr != nil {
		n.AddChild(expr)
	}
	return n
}

func (p *Parser) parsePrintStmt() *Node {
	n := NewNode(NPrintStmt, "print", p.cur.Line, p.cur.Col)

	if p.config.PrintFuncStyle && p.peek.Type == LPAREN {
		p.nextToken() // consume (
		p.nextToken()
		expr := p.parseExpr(0)
		if expr != nil {
			n.AddChild(expr)
		}
		if p.cur.Type == RPAREN {
			p.nextToken()
		}
	} else {
		p.nextToken()
		expr := p.parseExpr(0)
		if expr != nil {
			n.AddChild(expr)
		}
	}
	return n
}

func (p *Parser) parseIfStmt() *Node {
	n := NewNode(NIfStmt, "if", p.cur.Line, p.cur.Col)
	p.nextToken()
	cond := p.parseExpr(0)
	if cond != nil {
		n.AddChild(cond)
	}
	if !p.config.UseBraces && p.peek.Type == SEMICOLON {
		p.nextToken()
	}
	if p.config.UseBraces {
		if p.cur.Type != LBRACE {
			p.addErr("expected {")
			return n
		}
		p.nextToken()
	} else {
		if p.peek.Type == LBRACE {
			p.nextToken()
			if p.cur.Type == LBRACE {
				p.nextToken()
			}
		} else if p.peek.Type == SEMICOLON {
			p.nextToken()
		}
	}
	conseq := p.parseBlock()
	n.AddChild(conseq)
	if p.cur.Type == ELSE {
		if p.config.UseBraces {
			if p.peek.Type != LBRACE {
				p.addErr("expected { after else")
				return n
			}
			p.nextToken()
			p.nextToken()
		} else if p.cur.Type == LBRACE {
			p.nextToken()
		}
		alt := p.parseBlock()
		n.AddChild(alt)
	}
	return n
}

func (p *Parser) parseWhileStmt() *Node {
	n := NewNode(NWhileStmt, "while", p.cur.Line, p.cur.Col)
	p.nextToken()
	cond := p.parseExpr(0)
	if cond != nil {
		n.AddChild(cond)
	}
	if p.config.UseBraces {
		if p.cur.Type != LBRACE {
			p.addErr("expected {")
			return n
		}
		p.nextToken()
	} else if p.cur.Type == LBRACE {
		p.nextToken()
	}
	body := p.parseBlock()
	n.AddChild(body)
	return n
}

func (p *Parser) parseClassDecl() *Node {
	n := NewNode(NClassDecl, "class", p.cur.Line, p.cur.Col)
	p.nextToken() // consume 'class'
	if p.cur.Type == IDENT {
		n.Value = p.cur.Literal
		p.nextToken()
	}
	// extends ParentClass
	if p.cur.Type == EXTENDS {
		p.nextToken()
		if p.cur.Type == IDENT {
			parent := NewNode(NIdent, p.cur.Literal, p.cur.Line, p.cur.Col)
			n.AddChild(parent)
			p.nextToken()
		}
	}
	// parse body { field = val; ... }
	if p.cur.Type == LBRACE {
		p.nextToken()
	}
	for p.cur.Type != RBRACE && p.cur.Type != EOF {
		if p.cur.Type == IDENT && p.peek.Type == ASSIGN {
			fident := NewNode(NIdent, p.cur.Literal, p.cur.Line, p.cur.Col)
			p.nextToken()
			p.nextToken()
			val := p.parseExpr(0)
			n.AddChild(fident)
			if val != nil {
				n.AddChild(val)
			}
		} else if p.cur.Type == IDENT && p.peek.Type == SEMICOLON {
			fident := NewNode(NIdent, p.cur.Literal, p.cur.Line, p.cur.Col)
			n.AddChild(fident)
			defaultVal := NewNode(NNumberLit, "0", p.cur.Line, p.cur.Col)
			n.AddChild(defaultVal)
			p.nextToken()
		} else {
			fident := NewNode(NIdent, p.cur.Literal, p.cur.Line, p.cur.Col)
			n.AddChild(fident)
			defaultVal := NewNode(NNumberLit, "0", p.cur.Line, p.cur.Col)
			n.AddChild(defaultVal)
			p.nextToken()
		}
		if p.cur.Type == SEMICOLON {
			p.nextToken()
		}
	}
	if p.cur.Type == RBRACE {
		p.nextToken()
	}
	return n
}

func (p *Parser) parseBlock() *Node {
	n := NewNode(NBlockStmt, "block", p.cur.Line, p.cur.Col)
	for p.cur.Type != RBRACE && p.cur.Type != EOF {
		stmt := p.parseStmt()
		if stmt != nil {
			n.AddChild(stmt)
		}
		if p.cur.Type == SEMICOLON {
			p.nextToken()
		}
	}
	if p.cur.Type == RBRACE {
		p.nextToken()
	}
	return n
}

const (
	_ int = iota
	LOWEST
	EQUALS
	COMPARISON
	SUM
	PRODUCT
	PREFIX
)

var precedences = map[TokenType]int{
	EQ:   EQUALS,
	NEQ:  EQUALS,
	LT:   COMPARISON,
	GT:   COMPARISON,
	LE:   COMPARISON,
	GE:   COMPARISON,
	PLUS:   SUM,
	MINUS:  SUM,
	STAR:    PRODUCT,
	SLASH:   PRODUCT,
	PERCENT: PRODUCT,
	DOT:    PREFIX, // highest precedence for field access
}

func (p *Parser) peekPrecedence() int {
	if pr, ok := precedences[p.peek.Type]; ok {
		return pr
	}
	return 0
}

func (p *Parser) curPrecedence() int {
	if pr, ok := precedences[p.cur.Type]; ok {
		return pr
	}
	return 0
}

func (p *Parser) parseExpr(prec int) *Node {
	var left *Node
	switch p.cur.Type {
	case NUMBER:
		left = NewNode(NNumberLit, p.cur.Literal, p.cur.Line, p.cur.Col)
		p.nextToken()
	case TRUE, FALSE:
		left = NewNode(NBoolLit, p.cur.Literal, p.cur.Line, p.cur.Col)
		p.nextToken()
	case IDENT:
		left = NewNode(NIdent, p.cur.Literal, p.cur.Line, p.cur.Col)
		p.nextToken()
		// function call: ident(...)
		if p.cur.Type == LPAREN {
			call := NewNode(NCallExpr, left.Value, left.Line, left.Col)
			call.AddChild(left)
			p.nextToken()
			for p.cur.Type != RPAREN && p.cur.Type != EOF {
				arg := p.parseExpr(0)
				if arg != nil {
					call.AddChild(arg)
				}
				if p.cur.Type == COMMA {
					p.nextToken()
				} else {
					break
				}
			}
			if p.cur.Type == RPAREN {
				p.nextToken()
			}
			left = call
		}
	case SELF:
		left = NewNode(NSelf, "self", p.cur.Line, p.cur.Col)
		p.nextToken()
	case NEW:
		left = NewNode(NNewExpr, "new", p.cur.Line, p.cur.Col)
		p.nextToken()
		if p.cur.Type == IDENT {
			className := NewNode(NIdent, p.cur.Literal, p.cur.Line, p.cur.Col)
			left.AddChild(className)
			p.nextToken()
			// parse arguments
			if p.cur.Type == LPAREN {
				p.nextToken()
				for p.cur.Type != RPAREN && p.cur.Type != EOF {
					arg := p.parseExpr(0)
					if arg != nil {
						left.AddChild(arg)
					}
					if p.cur.Type == COMMA {
						p.nextToken()
					} else {
						break
					}
				}
				if p.cur.Type == RPAREN {
					p.nextToken()
				}
			}
		}
	case LPAREN:
		p.nextToken()
		left = p.parseExpr(0)
		if p.cur.Type == RPAREN {
			p.nextToken()
		}
	case LBRACKET:
		left = NewNode(NObjLit, "object", p.cur.Line, p.cur.Col)
		p.nextToken()
		for p.cur.Type != RBRACKET && p.cur.Type != EOF {
			if p.cur.Type == IDENT && p.peek.Type == ASSIGN {
				fident := NewNode(NIdent, p.cur.Literal, p.cur.Line, p.cur.Col)
				p.nextToken()
				p.nextToken()
				val := p.parseExpr(0)
				left.AddChild(fident)
				if val != nil {
					left.AddChild(val)
				}
			}
			if p.cur.Type == COMMA {
				p.nextToken()
			} else {
				break
			}
		}
		if p.cur.Type == RBRACKET {
			p.nextToken()
		}
	default:
		p.addErr(fmt.Sprintf("unexpected token in expression: %s (type=%d)", p.cur.Literal, p.cur.Type))
		return nil
	}

	for prec < p.curPrecedence() {
		if p.cur.Type == DOT {
			p.nextToken()
			if p.cur.Type == IDENT {
				field := NewNode(NIdent, p.cur.Literal, p.cur.Line, p.cur.Col)
				p.nextToken()
				access := NewNode(NFieldAccess, ".", p.cur.Line, p.cur.Col)
				access.AddChild(left)
				access.AddChild(field)
				left = access
			} else {
				p.addErr("expected field name after '.'")
				break
			}
			continue
		}
		op := p.cur.Literal
		bin := NewNode(NBinaryExpr, op, p.cur.Line, p.cur.Col)
		bin.AddChild(left)
		opPrec := p.curPrecedence()
		p.nextToken()
		right := p.parseExpr(opPrec)
		if right != nil {
			bin.AddChild(right)
		}
		left = bin
	}
	return left
}
