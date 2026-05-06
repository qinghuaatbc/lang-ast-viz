import { describe, it, expect, test } from 'vitest'
import { astTypeName, astTypeClass } from './api/compile'
import { examplesByLang } from './examples'
import { highlight } from './utils/highlight'

describe('examples', () => {
  const langs = ['rust', 'go', 'python', 'typescript', 'c']
  for (const lang of langs) {
    it(`has 60 ${lang} examples`, () => {
      expect(examplesByLang[lang].length).toBe(60)
    })
    it(`first ${lang} example has name and code`, () => {
      const ex = examplesByLang[lang][0]
      expect(ex.name).toBeTruthy()
      expect(ex.code).toBeTruthy()
    })
  }
})

describe('astTypeName', () => {
  const cases: [number, string][] = [
    [0, 'Program'], [1, 'LetStatement'], [7, 'BinaryExpression'],
    [8, 'NumberLiteral'], [9, 'StringLiteral'], [11, 'Identifier'],
    [14, 'ClassDecl'], [15, 'CallExpr'], [18, 'FuncDecl'],
    [19, 'ReturnStmt'], [20, 'MethodCall'], [99, 'Unknown'],
  ]
  for (const [n, name] of cases) {
    it(`nodeType ${n} → ${name}`, () => expect(astTypeName(n)).toBe(name))
  }
})

describe('astTypeClass', () => {
  it('maps all known types', () => {
    expect(astTypeClass(0)).toBe('program')
    expect(astTypeClass(18)).toBe('funcdecl')
    expect(astTypeClass(99)).toBe('unknown')
  })
})

describe('astTypeName from node', () => {
  it('uses typeName field when available', () => {
    expect(astTypeName({ nodeType: 0, children: [], value: '', line: 0, col: 0, typeName: 'Custom' })).toBe('Custom')
  })
  it('falls back to map when typeName missing', () => {
    expect(astTypeName({ nodeType: 0, children: [], value: '', line: 0, col: 0 })).toBe('Program')
  })
})

describe('highlight', () => {
  it('highlights keywords', () => {
    const html = highlight('let x = 5;', 'rust')
    expect(html).toContain('hl-kw')
  })
  it('highlights numbers', () => {
    const html = highlight('let x = 42;', 'rust')
    expect(html).toContain('hl-num')
  })
})

describe('examples syntax', () => {
  const codePatterns: Record<string, RegExp> = {
    rust: /^(let|fn|class|while|if|print)/m,
    go: /^(var|fn|class|while|if|print)/m,
    python: /^[a-z_]/m,
    typescript: /^(let|fn|class|while|if|print)/m,
    c: /^(int|fn|class|while|if|printf)/m,
  }
  for (const [lang, pattern] of Object.entries(codePatterns)) {
    it(`${lang} examples match expected syntax`, () => {
      for (const ex of examplesByLang[lang]) {
        expect(ex.code).toMatch(pattern)
      }
    })
  }
})
