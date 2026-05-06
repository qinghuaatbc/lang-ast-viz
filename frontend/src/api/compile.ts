export interface ASTNode {
  nodeType: number
  children: ASTNode[]
  value: string
  line: number
  col: number
}

export function astTypeName(nodeType: number): string {
  const names: Record<number, string> = {
    0: 'Program',
    1: 'LetStatement',
    2: 'AssignStatement',
    3: 'PrintStatement',
    4: 'IfStatement',
    5: 'WhileStatement',
    6: 'BlockStatement',
    7: 'BinaryExpression',
    8: 'NumberLiteral',
    9: 'StringLiteral',
    10: 'BoolLiteral',
    11: 'Identifier',
    12: 'FieldAccess',
    13: 'ObjectLiteral',
    14: 'ClassDecl',
    15: 'CallExpr',
    16: 'Self',
    17: 'NewExpr',
  }
  return names[nodeType] || 'Unknown'
}

export function astTypeClass(nodeType: number): string {
  const classes: Record<number, string> = {
    0: 'program',
    1: 'letstatement',
    2: 'assignstatement',
    3: 'printstatement',
    4: 'ifstatement',
    5: 'whilestatement',
    6: 'blockstatement',
    7: 'binaryexpression',
    8: 'numberliteral',
    9: 'stringliteral',
    10: 'boolliteral',
    11: 'identifier',
    12: 'fieldaccess',
    13: 'objectliteral',
    14: 'classdecl',
    15: 'callexpr',
    16: 'self',
    17: 'newexpr',
  }
  return classes[nodeType] || 'unknown'
}

export interface IRInstr {
  op: string
  dest?: string
  src1?: string
  src2?: string
  label?: string
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
  assembly: AsmInstr[]
  bytecode: BytecodeInstr[]
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
  if (!res.ok) throw new Error('compile request failed')
  return res.json()
}

export async function fetchLanguages(): Promise<LangInfo[]> {
  const res = await fetch('/api/languages')
  if (!res.ok) return []
  return res.json()
}
