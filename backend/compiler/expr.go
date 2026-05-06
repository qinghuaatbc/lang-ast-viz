package compiler

import "fmt"

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
	STAR:   PRODUCT,
	MOD:    PRODUCT,
	SLASH:  PRODUCT,
	DOT:    PREFIX,
	LBRACKET: PREFIX,
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
	case STRING:
		left = NewNode(NStringLit, p.cur.Literal, p.cur.Line, p.cur.Col)
		p.nextToken()
	case TRUE, FALSE:
		left = NewNode(NBoolLit, p.cur.Literal, p.cur.Line, p.cur.Col)
		p.nextToken()
	case IDENT:
		left = NewNode(NIdent, p.cur.Literal, p.cur.Line, p.cur.Col)
		p.nextToken()
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
		p.nextToken()
		if p.cur.Type == IDENT && p.peek.Type == ASSIGN {
			left = NewNode(NObjLit, "object", p.cur.Line, p.cur.Col)
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
		} else {
			left = NewNode(NArrayList, "array", p.cur.Line, p.cur.Col)
			for p.cur.Type != RBRACKET && p.cur.Type != EOF {
				val := p.parseExpr(0)
				if val != nil {
					left.AddChild(val)
				}
				if p.cur.Type == COMMA {
					p.nextToken()
				} else {
					break
				}
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
				methodOrField := p.cur.Literal
				p.nextToken()
				if p.cur.Type == LPAREN {
					mc := NewNode(NMethodCall, methodOrField, p.cur.Line, p.cur.Col)
					mc.AddChild(left)
					p.nextToken()
					for p.cur.Type != RPAREN && p.cur.Type != EOF {
						arg := p.parseExpr(0)
						if arg != nil {
							mc.AddChild(arg)
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
					left = mc
				} else {
					field := NewNode(NIdent, methodOrField, p.cur.Line, p.cur.Col)
					access := NewNode(NFieldAccess, ".", p.cur.Line, p.cur.Col)
					access.AddChild(left)
					access.AddChild(field)
					left = access
				}
			} else {
				p.addErr("expected field/method name after '.'")
				break
			}
			continue
		}
		if p.cur.Type == LBRACKET {
			p.nextToken()
			idx := p.parseExpr(0)
			access := NewNode(NArrayAccess, "[]", p.cur.Line, p.cur.Col)
			access.AddChild(left)
			if idx != nil {
				access.AddChild(idx)
			}
			if p.cur.Type == RBRACKET {
				p.nextToken()
			}
			left = access
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
