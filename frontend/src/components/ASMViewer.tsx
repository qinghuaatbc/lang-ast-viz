import { useState, useCallback, useRef, useEffect } from 'react'
import { AsmInstr } from '../api/compile'
import { useLang } from '../i18n/lang'

interface ASMViewerProps {
  assembly: AsmInstr[] | null
}

const REG_ORDER = ['eax', 'ebx', 'ecx', 'edx', 'esi', 'edi']

const REG_CODE: Record<string, number> = { eax: 0, ebx: 3, ecx: 1, edx: 2, esi: 6, edi: 7 }

function asmBytes(text: string): string {
  const t = text.trim()
  if (t.endsWith(':')) return ''

  const parts = t.split(/\s+/)
  const mnemonic = parts[0].toLowerCase()

  if (mnemonic === 'mov' && parts.length >= 3) {
    const dst = parts[1].replace(',', '')
    const src = parts[2]
    if (REG_CODE[dst] !== undefined && REG_CODE[src] !== undefined) {
      const r = REG_CODE[dst] << 3 | REG_CODE[src]
      return '0x89 0x' + r.toString(16).padStart(2, '0').toUpperCase()
    }
    if (REG_CODE[dst] !== undefined && /^\d+$/.test(src)) {
      const r = 0xB8 + REG_CODE[dst]
      const v = parseInt(src)
      const b2 = (v >> 24) & 0xff, b1 = (v >> 16) & 0xff
      const b0 = (v >> 8) & 0xff, b3 = v & 0xff
      return '0x' + r.toString(16).padStart(2, '0').toUpperCase() +
        ' 0x' + b3.toString(16).padStart(2, '0').toUpperCase() +
        ' 0x' + b0.toString(16).padStart(2, '0').toUpperCase() +
        ' 0x' + b1.toString(16).padStart(2, '0').toUpperCase() +
        ' 0x' + b2.toString(16).padStart(2, '0').toUpperCase()
    }
    if (REG_CODE[dst] !== undefined) {
      return '0x89 0x' + (REG_CODE[dst] << 3 | 7).toString(16).padStart(2, '0').toUpperCase()
    }
    if (REG_CODE[src.replace(/[\[\]]/g, '')] !== undefined) {
      const r = REG_CODE[src.replace(/[\[\]]/g, '')]
      return '0x8B 0x' + (REG_CODE[dst] << 3 | r).toString(16).padStart(2, '0').toUpperCase()
    }
  }

  const binOps: Record<string, string> = {
    add: '01', sub: '29', imul: '0F AF', cmp: '39',
  }
  if (binOps[mnemonic] && parts.length >= 3) {
    const dst = parts[1].replace(',', '')
    const src = parts[2]
    if (REG_CODE[dst] !== undefined && REG_CODE[src] !== undefined) {
      const modrm = 0xC0 + (REG_CODE[dst] << 3) + REG_CODE[src]
      return '0x' + binOps[mnemonic].split(' ').map(b => b.padStart(2, '0')).join(' 0x') +
        ' 0x' + modrm.toString(16).padStart(2, '0').toUpperCase()
    }
  }

  if (mnemonic === 'xor' && parts.length >= 3 && parts[2] === 'edx,edx') {
    return '0x31 0xD2'
  }
  if (mnemonic === 'xor') {
    return '0x31 0xC0'
  }
  if (mnemonic === 'idiv' && parts.length >= 2) {
    const r = REG_CODE[parts[1].replace(',', '')] ?? 0
    return '0xF7 0x' + (0xF8 | r).toString(16).padStart(2, '0').toUpperCase()
  }
  if (mnemonic === 'jmp') return '0xE9 0x?? 0x?? 0x?? 0x??'
  if (mnemonic === 'jz' || mnemonic === 'je') return '0x0F 0x84 0x?? 0x?? 0x?? 0x??'
  if (mnemonic === 'jne') return '0x0F 0x85 0x?? 0x?? 0x?? 0x??'
  if (mnemonic === 'jl') return '0x0F 0x8C 0x?? 0x?? 0x?? 0x??'
  if (mnemonic === 'jg') return '0x0F 0x8F 0x?? 0x?? 0x?? 0x??'
  if (mnemonic === 'jle') return '0x0F 0x8E 0x?? 0x?? 0x?? 0x??'
  if (mnemonic === 'jge') return '0x0F 0x8D 0x?? 0x?? 0x?? 0x??'
  if (mnemonic === 'call') return '0xE8 0x?? 0x?? 0x?? 0x??'
  if (mnemonic === 'ret') return '0xC3'
  return ''
}

export default function ASMViewer({ assembly }: ASMViewerProps) {
  const { t } = useLang()
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const viewerRef = useRef<HTMLDivElement>(null)

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

  const [asmCopied, setAsmCopied] = useState(false)

  const handleCopyAsm = useCallback(() => {
    if (!assembly) return
    const text = assembly.map((inst, i) => `${i}: ${asmBytes(inst.text).padEnd(25)} ${inst.text}`).join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setAsmCopied(true)
      setTimeout(() => setAsmCopied(false), 1500)
    }).catch(() => {})
  }, [assembly])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); goStep(-1) }
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); goStep(1) }
    if (e.key === ' ') { e.preventDefault(); togglePlay() }
  }, [goStep, togglePlay])

  if (!assembly || assembly.length === 0) {
    return <div className="viewer-empty">{t('compile.first')}</div>
  }

  const cur = assembly[step]
  const rs = cur.regState || {}
  const ms = cur.memState || {}
  const changed = new Set(cur.changed || [])
  const isLabel = cur.text.endsWith(':')

  return (
    <div className="viewer asm-viewer" tabIndex={0} onKeyDown={handleKeyDown} ref={viewerRef}>
      <div className="asm-controls">
        <button className="asm-btn" onClick={() => goStep(-1)} disabled={step === 0}>◀</button>
        <button className="asm-btn play-btn" onClick={togglePlay}>
          {playing ? '⏸' : step >= total - 1 ? '↺' : '▶'}
        </button>
        <button className="asm-btn" onClick={() => goStep(1)} disabled={step >= total - 1}>▶</button>
        <span className="asm-step-info">{step + 1} / {total}</span>
        <span style={{ flex: 1 }} />
        <button className="asm-btn" onClick={handleCopyAsm} style={{ fontSize: 11, padding: '2px 8px' }}>
          {asmCopied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <div className="asm-main">
        <table className="code-table asm-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Bytes</th>
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
                  <td className="asm-bytes">{asmBytes(inst.text)}</td>
                  <td className={`asm-code ${ilabel ? 'asm-label-text' : ''}`}>
                    {inst.text}
                  </td>
                  {REG_ORDER.map(r => (
                    <td key={`${r}-${step}`} className={`reg-cell ${irs[r] ? 'reg-active' : ''} ${ichanged.has(r) ? 'reg-changed' : ''} ${isActive && changed.has(r) ? 'reg-flash' : ''}`}>
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
