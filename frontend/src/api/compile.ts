// Generic AST node — real-language parser (/api/parse)
export interface GenASTNode {
  type: string
  value?: string
  line?: number
  children?: GenASTNode[]
}

export interface ParseResult {
  chips: { name: string; methods: string[]; fields: string[] }[]
  calls: { from: string; to: string; method: string; params: string; ret: string; relation: string }[]
  ast?: GenASTNode
  lang: string
}

export async function parseSource(source: string, language = 'auto'): Promise<ParseResult> {
  const res = await fetch('/api/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: source, lang: language }),
  })
  if (!res.ok) throw new Error(`parse failed (${res.status})`)
  return res.json()
}

// Legacy MiniLang AST node
export interface ASTNode {
  nodeType: number
  children: ASTNode[]
  value: string
  line: number
  col: number
  typeName?: string
}

const typeNames: Record<number, string> = {
  0: 'Program', 1: 'LetStatement', 2: 'AssignStatement', 3: 'PrintStatement',
  4: 'IfStatement', 5: 'WhileStatement', 6: 'BlockStatement', 7: 'BinaryExpression',
  8: 'NumberLiteral', 9: 'StringLiteral', 10: 'BoolLiteral', 11: 'Identifier',
  12: 'FieldAccess', 13: 'ObjectLiteral', 14: 'ClassDecl', 15: 'CallExpr',
  16: 'Self', 17: 'NewExpr', 18: 'FuncDecl', 19: 'ReturnStmt',
  20: 'MethodCall', 21: 'ArrayList', 22: 'ArrayAccess', 23: 'BreakStmt', 24: 'ContinueStmt',
}

export function astTypeName(node: ASTNode | number): string {
  if (typeof node === 'object' && node?.typeName) return node.typeName
  return typeNames[typeof node === 'number' ? node : node?.nodeType ?? 0] || 'Unknown'
}

const typeClasses: Record<number, string> = {
  0: 'program', 1: 'letstatement', 2: 'assignstatement', 3: 'printstatement',
  4: 'ifstatement', 5: 'whilestatement', 6: 'blockstatement', 7: 'binaryexpression',
  8: 'numberliteral', 9: 'stringliteral', 10: 'boolliteral', 11: 'identifier',
  12: 'fieldaccess', 13: 'objectliteral', 14: 'classdecl', 15: 'callexpr',
  16: 'self', 17: 'newexpr', 18: 'funcdecl', 19: 'returnstmt',
  20: 'methodcall', 21: 'arraylist', 22: 'arrayaccess', 23: 'breakstmt', 24: 'continuestmt',
}

export function astTypeClass(nodeType: number): string {
  return typeClasses[nodeType] || 'unknown'
}

export interface IRInstr {
  op: string
  dest?: string
  src1?: string
  src2?: string
  label?: string
  formatted?: string
}

export interface BytecodeInstr {
  op: string
  arg?: number
  argStr?: string
}

export interface Example {
  name: string
  code: string
}

export interface AsmInstr {
  text: string
  regState?: Record<string, string>
  memState?: Record<string, string>
  changed?: string[]
}

export interface CompileResult {
  ast: ASTNode
  ir: IRInstr[]
  optIR?: IRInstr[]
  assembly: AsmInstr[]
  optAssembly?: AsmInstr[]
  bytecode: BytecodeInstr[]
  optBytecode?: BytecodeInstr[]
  output: string[]
  errors: string[]
  language: string
}

export interface LangInfo {
  id: string
  name: string
  desc: string
}

export async function compileSource(source: string, language: string = 'rust'): Promise<CompileResult> {
  const res = await fetch('/api/compile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, language }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(body || `compile request failed (${res.status})`)
  }
  return res.json()
}

export async function fetchLanguages(): Promise<LangInfo[]> {
  const res = await fetch('/api/languages')
  if (!res.ok) {
    console.warn('fetchLanguages failed:', res.status, await res.text().catch(() => ''))
    return []
  }
  return res.json()
}
