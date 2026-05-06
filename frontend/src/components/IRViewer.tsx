import { IRInstr } from '../api/compile'

const symMap: Record<string, string> = {
  ADD: '+', SUB: '-', MUL: '*', DIV: '/',
  EQ: '==', NEQ: '!=', LT: '<', GT: '>', LE: '<=', GE: '>=',
}

interface IRViewerProps {
  ir: IRInstr[] | null
}

function formatIR(inst: IRInstr): string {
  switch (inst.op) {
    case 'LABEL':
      return `${inst.label}:`
    case 'JZ':
      return `if_false ${inst.src1} goto ${inst.src2}`
    case 'JMP':
      return `goto ${inst.src2}`
    case 'ASSIGN':
      return `${inst.dest} = ${inst.src1}`
    case 'PRINT':
      return `print ${inst.src1}`
    case 'LOAD_IMM':
      return `${inst.dest} = ${inst.src1}`
    case 'LOAD':
      return `${inst.dest} = ${inst.src1}`
    default: {
      const sym = symMap[inst.op] || inst.op
      return `${inst.dest} = ${inst.src1} ${sym} ${inst.src2}`
    }
  }
}

export default function IRViewer({ ir }: IRViewerProps) {
  if (!ir || ir.length === 0) {
    return <div className="viewer-empty">Compile some code to see IR</div>
  }

  return (
    <div className="viewer ir-viewer">
      <div className="viewer-content">
        <table className="code-table">
          <tbody>
            {ir.map((inst, i) => (
              <tr key={i} className="ir-row">
                <td className="line-num">{i}</td>
                <td className="ir-code">{formatIR(inst)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
