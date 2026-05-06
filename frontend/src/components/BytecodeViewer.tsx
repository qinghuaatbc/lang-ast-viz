import { BytecodeInstr } from '../api/compile'

interface BytecodeViewerProps {
  bytecode: BytecodeInstr[] | null
}

export default function BytecodeViewer({ bytecode }: BytecodeViewerProps) {
  if (!bytecode || bytecode.length === 0) {
    return <div className="viewer-empty">Compile some code to see bytecode</div>
  }

  return (
    <div className="viewer bytecode-viewer">
      <h2>Bytecode</h2>
      <div className="viewer-content">
        <table className="code-table">
          <thead>
            <tr>
              <th>Addr</th>
              <th>Opcode</th>
              <th>Operand</th>
            </tr>
          </thead>
          <tbody>
            {bytecode.map((inst, i) => (
              <tr key={i} className="bytecode-row">
                <td className="line-num">{i}</td>
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
