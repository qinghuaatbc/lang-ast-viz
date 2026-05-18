import { useState, useCallback } from 'react'
import { IRInstr } from '../api/compile'
import { useLang } from '../i18n/lang'

interface IRViewerProps {
  ir: IRInstr[] | null
}

export default function IRViewer({ ir }: IRViewerProps) {
  const { t } = useLang()
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    if (!ir) return
    const text = ir.map((inst, i) => `${i}: ${inst.formatted || ''}`).join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }, [ir])

  if (!ir || ir.length === 0) {
    return <div className="viewer-empty">{t('compile.first')}</div>
  }

  return (
    <div className="viewer ir-viewer">
      <div className="viewer-content">
        <div style={{ textAlign: 'right', marginBottom: 4 }}>
          <button className="asm-btn" onClick={handleCopy} style={{ fontSize: 11, padding: '2px 8px' }}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
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
