import { IRInstr } from '../api/compile'
import { useLang } from '../i18n/lang'

interface IRViewerProps {
  ir: IRInstr[] | null
}

export default function IRViewer({ ir }: IRViewerProps) {
  const { t } = useLang()
  if (!ir || ir.length === 0) {
    return <div className="viewer-empty">{t('compile.first')}</div>
  }

  return (
    <div className="viewer ir-viewer">
      <div className="viewer-content">
        <table className="code-table">
          <tbody>
            {ir.map((inst, i) => (
              <tr key={i} className="ir-row">
                <td className="line-num">{i}</td>
                <td className="ir-code">{inst.formatted || `${inst.dest || ''} ${inst.op} ${inst.src1 || ''} ${inst.src2 || ''}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
