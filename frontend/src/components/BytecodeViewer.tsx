import { BytecodeInstr } from '../api/compile'
import { useLang } from '../i18n/lang'

interface BytecodeViewerProps {
  bytecode: BytecodeInstr[] | null
}

const opcodeMap: Record<string, number> = {
  HALT: 0, PUSH: 1, PUSHSTR: 2, LOAD: 3, STORE: 4,
  ADD: 5, SUB: 6, MUL: 7, DIV: 8, MOD: 9, CONCAT: 10,
  EQ: 11, NEQ: 12, LT: 13, GT: 14, LE: 15, GE: 16,
  PRINT: 17, JMP: 18, JZ: 19,
  OBJLIT: 20, OBJSET: 21, OBJGET: 22,
  CLASS_DEF: 23, CLASS_FIELD: 24, INSTANTIATE: 25, SETFIELD: 26,
  CALL: 27, RETURN: 28, PUSHARG: 29, POPARG: 30, DECLARE: 31,
  SCOPE_ENTER: 32, SCOPE_EXIT: 33, DUP: 34,
  ARRAYLIT: 35, ARRAYGET: 36, ARRAYSET: 37,
  METHOD_CALL: 38, CLASS_METHOD: 39,
}

function hexByte(v: number): string {
  return '0x' + (v & 0xff).toString(16).padStart(2, '0').toUpperCase()
}

function signed16(v: number): number {
  return v < 0 ? v + 0x10000 : v
}

function bcBytes(inst: BytecodeInstr): string[] {
  const opcode = opcodeMap[inst.op] ?? 0xff
  const parts = [hexByte(opcode)]
  if (inst.op === 'PUSH') {
    const v = (inst.arg ?? 0) & 0xffff
    parts.push(hexByte(v >> 8), hexByte(v))
  } else if (inst.op === 'JMP' || inst.op === 'JZ' || inst.op === 'CALL') {
    const v = signed16(inst.arg ?? 0)
    if (v <= 0xff) {
      parts.push(hexByte(v))
    } else {
      parts.push(hexByte(v >> 8), hexByte(v))
    }
  } else if (inst.argStr && (inst.op === 'PUSHSTR' || inst.op === 'LOAD' || inst.op === 'STORE' || inst.op === 'DECLARE' || inst.op === 'POPARG' || inst.op === 'CLASS_DEF' || inst.op === 'CLASS_FIELD' || inst.op === 'INSTANTIATE' || inst.op === 'SETFIELD' || inst.op === 'METHOD_CALL' || inst.op === 'CLASS_METHOD')) {
    parts.push(hexByte(inst.argStr.length))
    for (let j = 0; j < inst.argStr.length; j++) {
      parts.push(hexByte(inst.argStr.charCodeAt(j)))
    }
  }
  return parts
}

function hexColor(idx: number): string {
  if (idx === 0) return 'var(--accent-purple)'
  return 'var(--accent-blue)'
}

export default function BytecodeViewer({ bytecode }: BytecodeViewerProps) {
  const { t } = useLang()
  if (!bytecode || bytecode.length === 0) {
    return <div className="viewer-empty">{t('compile.first')}</div>
  }

  return (
    <div className="viewer bytecode-viewer">
      <h2>{t('bytecode')}</h2>
      <div className="viewer-content">
        <table className="code-table">
          <thead>
            <tr>
              <th>Addr</th>
              <th>Bytes</th>
              <th>Opcode</th>
              <th>Operand</th>
            </tr>
          </thead>
          <tbody>
            {bytecode.map((inst, i) => (
              <tr key={i} className="bytecode-row">
                <td className="line-num">{i}</td>
                <td className="bc-bytes">{bcBytes(inst).map((b, j) => <span key={j} style={{ color: hexColor(j) }}>{b}&thinsp;</span>)}</td>
                <td className="bc-op">{inst.op}</td>
                <td className="bc-arg">{inst.argStr || (inst.arg !== undefined ? inst.arg : '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
