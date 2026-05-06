import { useState, useCallback, useRef, useEffect } from 'react'
import { AsmInstr } from '../api/compile'

interface ASMViewerProps {
  assembly: AsmInstr[] | null
}

const REG_ORDER = ['eax', 'ebx', 'ecx', 'edx', 'esi', 'edi']

export default function ASMViewer({ assembly }: ASMViewerProps) {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const total = assembly?.length || 0

  useEffect(() => {
    setStep(0)
    setPlaying(false)
  }, [assembly])

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setStep(s => {
          if (s >= total - 1) {
            setPlaying(false)
            return s
          }
          return s + 1
        })
      }, 600)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [playing, total])

  const togglePlay = useCallback(() => {
    if (step >= total - 1) setStep(0)
    setPlaying(p => !p)
  }, [step, total])

  const goStep = useCallback((delta: number) => {
    setPlaying(false)
    setStep(s => Math.max(0, Math.min(total - 1, s + delta)))
  }, [total])

  if (!assembly || assembly.length === 0) {
    return <div className="viewer-empty">Compile some code to see x86 assembly</div>
  }

  const cur = assembly[step]
  const rs = cur.regState || {}
  const ms = cur.memState || {}
  const changed = new Set(cur.changed || [])
  const isLabel = cur.text.endsWith(':')

  return (
    <div className="viewer asm-viewer">
      <div className="asm-controls">
        <button className="asm-btn" onClick={() => goStep(-1)} disabled={step === 0}>◀</button>
        <button className="asm-btn play-btn" onClick={togglePlay}>
          {playing ? '⏸' : step >= total - 1 ? '↺' : '▶'}
        </button>
        <button className="asm-btn" onClick={() => goStep(1)} disabled={step >= total - 1}>▶</button>
        <span className="asm-step-info">{step + 1} / {total}</span>
      </div>

      <div className="asm-main">
        <table className="code-table asm-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Instruction</th>
              {REG_ORDER.map(r => <th key={r} className="reg-header">{r}</th>)}
            </tr>
          </thead>
          <tbody>
            {assembly.map((inst, i) => {
              const irs = inst.regState || {}
              const ichanged = new Set(inst.changed || [])
              const ilabel = inst.text.endsWith(':')
              const isActive = i === step
              return (
                <tr
                  key={i}
                  className={`asm-row ${ilabel ? 'asm-label-row' : ''} ${isActive ? 'asm-active' : ''}`}
                  onClick={() => { setPlaying(false); setStep(i) }}
                >
                  <td className="line-num">{i}</td>
                  <td className={`asm-code ${ilabel ? 'asm-label-text' : ''}`}>
                    {inst.text}
                  </td>
                  {REG_ORDER.map(r => (
                    <td key={r} className={`reg-cell ${irs[r] ? 'reg-active' : ''} ${ichanged.has(r) ? 'reg-changed' : ''} ${isActive && changed.has(r) ? 'reg-flash' : ''}`}>
                      {irs[r] || ''}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="asm-state-panel">
          <div className="state-section">
            <h3>Registers</h3>
            <div className="reg-grid">
              {REG_ORDER.map(r => (
                <div key={r} className={`reg-item ${rs[r] ? 'reg-filled' : ''} ${changed.has(r) ? 'reg-changed-border' : ''}`}>
                  <span className="reg-name">{r}</span>
                  <span className="reg-val">{rs[r] || '—'}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="state-section">
            <h3>Memory</h3>
            <div className="mem-grid">
              {Object.keys(ms).length === 0 ? (
                <div className="mem-empty">—</div>
              ) : (
                Object.entries(ms).map(([k, v]: [string, string]) => (
                  <div key={k} className={`mem-item ${changed.has(k) ? 'reg-changed-border' : ''}`}>
                    <span className="mem-addr">[{k}]</span>
                    <span className="mem-val">{v}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
