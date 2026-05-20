import { useState, useEffect, useRef, useCallback } from 'react'
import { AsmInstruction } from '../api/compile'
import { useLang } from '../i18n/lang'

const MNEM_COLOR: Record<string, string> = {
  MOV: '#79c0ff', LEA: '#79c0ff', MOVSX: '#79c0ff', MOVZX: '#79c0ff',
  PUSH: '#ff7b72', POP: '#ff7b72',
  SUB: '#ffa657', ADD: '#ffa657', IMUL: '#ffa657', IDIV: '#ffa657',
  XOR: '#79c0ff', AND: '#79c0ff', OR: '#79c0ff', NOT: '#79c0ff',
  SHL: '#ffa657', SHR: '#ffa657',
  CMP: '#8b949e', TEST: '#8b949e',
  JMP: '#d2a8ff', JZ: '#d2a8ff', JNZ: '#d2a8ff', JE: '#d2a8ff', JNE: '#d2a8ff',
  JL: '#d2a8ff', JG: '#d2a8ff', JLE: '#d2a8ff', JGE: '#d2a8ff',
  CALL: '#56d364', RET: '#f85149',
  NOP: '#484f58', HLT: '#484f58',
}

const REG_ORDER = ['RAX','RBX','RCX','RDX','RSI','RDI','RSP','RBP','RIP','FLAGS']
const REG_COLOR: Record<string, string> = {
  RAX: '#56d364', RBX: '#58a6ff', RCX: '#ffa657', RDX: '#f0883e',
  RSI: '#d2a8ff', RDI: '#ff7b72', RSP: '#79c0ff', RBP: '#a5d6ff',
  RIP: '#ff7b72', FLAGS: '#8b949e',
}

const btnSt: React.CSSProperties = {
  padding: '2px 8px', borderRadius: 3, border: '1px solid var(--border)',
  background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 11,
}

interface Props {
  asm?: AsmInstruction[]
  lang?: string
}

export default function AsmViewer({ asm, lang }: Props) {
  const { lang: uiLang } = useLang()
  const isZh = uiLang === 'zh'
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [showBin, setShowBin] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const n = asm?.length ?? 0

  const goTo = useCallback((s: number) => setStep(Math.max(0, Math.min(n - 1, s))), [n])

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-step="${step}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [step])

  useEffect(() => {
    if (playing && n > 0) {
      intervalRef.current = setInterval(() => {
        setStep(s => {
          if (s >= n - 1) { setPlaying(false); return s }
          return s + 1
        })
      }, Math.round(900 / speed))
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [playing, n, speed])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); setStep(s => Math.min(s + 1, n - 1)) }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); setStep(s => Math.max(s - 1, 0)) }
      else if (e.key === ' ') { e.preventDefault(); setPlaying(p => !p) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [n])

  if (!asm || asm.length === 0) {
    return (
      <div className="viewer-empty">
        {isZh ? '粘贴代码后点击「解析」查看汇编与寄存器状态' : 'Paste code and click Parse to see assembly & register state'}
      </div>
    )
  }

  const cur = asm[step]
  const prev = step > 0 ? asm[step - 1] : null
  const changedRegs = new Set<string>()
  if (prev?.regs && cur.regs) {
    for (const k of REG_ORDER) { if (prev.regs[k] !== cur.regs[k]) changedRegs.add(k) }
  }

  const hexToBin = (hex: string) =>
    hex.split(' ').map(b => parseInt(b, 16).toString(2).padStart(8, '0')).join(' ')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
        borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)' }}>
          {lang && <span style={{ color: '#56d364', fontFamily: 'monospace', marginRight: 5 }}>{lang.toUpperCase()}</span>}
          {isZh ? 'x86-64 汇编' : 'x86-64 Assembly'}
        </span>
        <code style={{ fontSize: 9, color: '#79c0ff' }}>{cur.addr}</code>
        {cur.isCall && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: '#56d36425', color: '#56d364', fontWeight: 700 }}>CALL</span>}
        {cur.isRet  && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: '#f8514925', color: '#f85149', fontWeight: 700 }}>RET</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
          <label style={{ fontSize: 9, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
            <input type="checkbox" checked={showBin} onChange={e => setShowBin(e.target.checked)} style={{ accentColor: '#4d8fff' }} />
            {isZh ? '二进制' : 'BIN'}
          </label>
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{speed}x</span>
          <input type="range" min={1} max={5} value={speed} onChange={e => setSpeed(+e.target.value)}
            style={{ width: 40, accentColor: '#4d8fff' }} />
          <button style={btnSt} onClick={() => { setStep(0); setPlaying(false) }}>⏮</button>
          <button style={btnSt} onClick={() => goTo(step - 1)}>◀</button>
          <button style={{ ...btnSt, background: playing ? '#ff7b72' : '#56d364', color: '#000', fontWeight: 700, border: 'none' }}
            onClick={() => { if (step >= n - 1) setStep(0); setPlaying(p => !p) }}>
            {playing ? '⏸' : '▶'} {isZh ? (playing ? '暂停' : '播放') : (playing ? 'Pause' : 'Play')}
          </button>
          <button style={btnSt} onClick={() => goTo(step + 1)}>▶</button>
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{step + 1} / {n}</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* Instruction listing */}
        <div ref={listRef} style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: 10.5 }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 2 }}>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={thSt}>{isZh ? '地址' : 'Addr'}</th>
                <th style={thSt}>{showBin ? (isZh ? '二进制' : 'Binary') : (isZh ? '机器码' : 'Bytes')}</th>
                <th style={thSt}>{isZh ? '指令' : 'Instruction'}</th>
                <th style={thSt}>{isZh ? '注释' : 'Comment'}</th>
              </tr>
            </thead>
            <tbody>
              {asm.map((instr, i) => {
                const isCur = i === step
                const mc = MNEM_COLOR[instr.mnemonic] || 'var(--text-primary)'
                return (
                  <tr key={i} data-step={i} onClick={() => setStep(i)}
                    style={{
                      background: isCur ? 'rgba(79,140,255,0.1)' : 'transparent',
                      borderLeft: isCur ? '3px solid #4d8fff' : '3px solid transparent',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => { if (!isCur) e.currentTarget.style.background = 'var(--bg-elevated)' }}
                    onMouseLeave={e => { if (!isCur) e.currentTarget.style.background = 'transparent' }}>
                    <td style={{ ...tdSt, color: '#58a6ff', fontSize: 9 }}>{instr.addr}</td>
                    <td style={{ ...tdSt, fontSize: showBin ? 7.5 : 9.5, color: '#3d6090',
                      letterSpacing: showBin ? '0.3px' : '1px', maxWidth: showBin ? 240 : 90 }}>
                      {showBin ? hexToBin(instr.bytes) : instr.bytes}
                    </td>
                    <td style={tdSt}>
                      <span style={{ color: mc, fontWeight: 700 }}>{instr.mnemonic}</span>
                      {instr.operands && <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>{instr.operands}</span>}
                    </td>
                    <td style={{ ...tdSt, color: 'var(--text-muted)', fontSize: 9 }}>{instr.comment}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Right panel: registers + stack */}
        <div style={{ width: 216, borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

          {/* Register file */}
          <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5, letterSpacing: '0.5px' }}>
              {isZh ? '🔧 寄存器' : '🔧 REGISTERS'}
            </div>
            {REG_ORDER.map(reg => {
              const val = cur.regs?.[reg] ?? '—'
              const changed = changedRegs.has(reg)
              return (
                <div key={reg} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '2px 4px', borderRadius: 3, marginBottom: 1,
                  background: changed ? REG_COLOR[reg] + '18' : 'transparent',
                  border: changed ? `1px solid ${REG_COLOR[reg]}40` : '1px solid transparent',
                }}>
                  <span style={{ fontSize: 9, color: REG_COLOR[reg] || '#8b949e', fontFamily: 'monospace', fontWeight: 700, minWidth: 36 }}>{reg}</span>
                  <span style={{
                    fontSize: 8, color: changed ? REG_COLOR[reg] : 'var(--text-secondary)',
                    fontFamily: 'monospace', fontWeight: changed ? 700 : 400,
                    maxWidth: 148, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right',
                  }}>{val}</span>
                </div>
              )
            })}
          </div>

          {/* Memory: stack frame + heap object blocks */}
          <div style={{ flex: 1, overflow: 'auto', padding: '6px 8px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5, letterSpacing: '0.5px' }}>
              {isZh ? '📦 内存布局' : '📦 MEMORY'}
            </div>
            {(cur.mem || []).map((slot, i, arr) => {
              const isRSP = slot.addr === cur.regs?.RSP
              const isRBP = slot.addr === cur.regs?.RBP
              // heap slots start at 0x0060..., stack at 0x7fff...
              const isHeap = slot.addr.startsWith('0x0060')
              const prevIsStack = i > 0 && !arr[i-1].addr.startsWith('0x0060')
              const showDivider = isHeap && prevIsStack
              return (
                <div key={i}>
                  {showDivider && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '5px 0 4px' }}>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      <span style={{ fontSize: 7, color: '#56d364', fontWeight: 700, letterSpacing: '0.5px' }}>
                        {isZh ? 'HEAP (对象连续块)' : 'HEAP (contiguous objects)'}
                      </span>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    </div>
                  )}
                  <div style={{
                    padding: '2px 5px', borderRadius: 3, marginBottom: 2,
                    background: isRSP ? '#79c0ff14' : isRBP ? '#f0883e14' : isHeap ? '#56d36408' : 'transparent',
                    border: isRSP ? '1px solid #79c0ff40' : isRBP ? '1px solid #f0883e40' : isHeap ? '1px solid #56d36420' : '1px solid transparent',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <code style={{ fontSize: 8, color: isRSP ? '#79c0ff' : isRBP ? '#f0883e' : isHeap ? '#56d364' : '#484f58' }}>
                        {isRSP ? '▶ ' : isRBP ? '● ' : '  '}{slot.addr.slice(-10)}
                      </code>
                      {slot.label && <span style={{ fontSize: 7, color: isHeap ? '#56d36499' : 'var(--text-muted)', fontStyle: 'italic' }}>{slot.label}</span>}
                    </div>
                    <code style={{ fontSize: 8, color: 'var(--text-secondary)', paddingLeft: 12, display: 'block',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 196 }}>
                      {slot.value}
                    </code>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)', padding: '3px 10px',
        display: 'flex', gap: 10, fontSize: 8.5, color: 'var(--text-muted)', fontFamily: 'monospace', flexWrap: 'wrap' }}>
        <span style={{ color: '#ff7b72' }}>RIP={cur.regs?.RIP ?? '—'}</span>
        <span style={{ color: '#56d364' }}>RAX={cur.regs?.RAX ?? '—'}</span>
        <span style={{ color: '#79c0ff' }}>RSP={cur.regs?.RSP ?? '—'}</span>
        <span style={{ color: '#8b949e' }}>{cur.regs?.FLAGS ?? ''}</span>
        <span style={{ marginLeft: 'auto', color: '#484f58' }}>
          {isZh ? '方向键步进 | Space 播放' : 'Arrow keys to step · Space to play'}
        </span>
      </div>
    </div>
  )
}

const thSt: React.CSSProperties = {
  textAlign: 'left', padding: '4px 8px', fontSize: 9, fontWeight: 600,
  color: 'var(--text-muted)', fontFamily: 'monospace',
}
const tdSt: React.CSSProperties = {
  padding: '2px 8px', verticalAlign: 'middle', whiteSpace: 'nowrap',
}
