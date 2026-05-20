import { useState, useEffect, useRef } from 'react'
import { useLang } from '../i18n/lang'

type Stage = 'IF' | 'ID' | 'EX' | 'MEM' | 'WB' | 'STALL' | 'FLUSH'
type HazardType = 'none' | 'data' | 'control' | 'structural'

interface Instruction { asm: string; type: string; reads: string[]; writes: string[]; memAccess: boolean }
interface PipelineSlot { instr: Instruction | null; stage: Stage; cycle: number; hazard: HazardType }

const STAGE_COLOR: Record<Stage, string> = {
  IF: '#4d8fff', ID: '#a371f7', EX: '#ffa657', MEM: '#3fb950', WB: '#ff6b6b',
  STALL: '#555', FLUSH: '#ff453a',
}
const STAGE_DESC_ZH: Record<Stage, string> = {
  IF: 'Instruction Fetch — 从内存/缓存取指令',
  ID: 'Instruction Decode — 解码，读寄存器',
  EX: 'Execute — ALU 运算/地址计算',
  MEM: 'Memory Access — 读写数据内存',
  WB: 'Write Back — 结果写回寄存器',
  STALL: 'Stall — 流水线停顿（等待数据）',
  FLUSH: 'Flush — 刷新无效指令（分支预测失败）',
}
const STAGE_DESC_EN: Record<Stage, string> = {
  IF: 'Instruction Fetch — read instruction from memory/cache',
  ID: 'Instruction Decode — decode, read registers',
  EX: 'Execute — ALU operation / address calculation',
  MEM: 'Memory Access — read/write data memory',
  WB: 'Write Back — write result to register file',
  STALL: 'Stall — pipeline paused (waiting for data)',
  FLUSH: 'Flush — discard invalid instructions (branch misprediction)',
}

interface Program { name_zh: string; name_en: string; desc_zh: string; desc_en: string; instrs: Instruction[] }
const PROGRAMS: Program[] = [
  {
    name_zh: '无冒险', name_en: 'No Hazards',
    desc_zh: '独立指令，无数据/控制依赖', desc_en: 'Independent instructions, no data/control dependencies',
    instrs: [
      { asm: 'ADD R1, R2, R3',  type: 'ALU',   reads: ['R2','R3'], writes: ['R1'], memAccess: false },
      { asm: 'SUB R4, R5, R6',  type: 'ALU',   reads: ['R5','R6'], writes: ['R4'], memAccess: false },
      { asm: 'MUL R7, R8, R9',  type: 'ALU',   reads: ['R8','R9'], writes: ['R7'], memAccess: false },
      { asm: 'AND R10, R1, R4', type: 'ALU',   reads: ['R1','R4'], writes: ['R10'],memAccess: false },
      { asm: 'OR  R11, R7, R10',type: 'ALU',   reads: ['R7','R10'],writes: ['R11'],memAccess: false },
    ],
  },
  {
    name_zh: '数据冒险 (RAW)', name_en: 'Data Hazard (RAW)',
    desc_zh: '先写后读依赖：ADD 写 R1，下条立即用 R1', desc_en: 'Read-after-write: ADD writes R1, next instr reads R1',
    instrs: [
      { asm: 'ADD R1, R2, R3',  type: 'ALU',  reads: ['R2','R3'], writes: ['R1'], memAccess: false },
      { asm: 'SUB R4, R1, R5',  type: 'ALU',  reads: ['R1','R5'], writes: ['R4'], memAccess: false },
      { asm: 'MUL R6, R4, R7',  type: 'ALU',  reads: ['R4','R7'], writes: ['R6'], memAccess: false },
      { asm: 'ADD R8, R6, R9',  type: 'ALU',  reads: ['R6','R9'], writes: ['R8'], memAccess: false },
      { asm: 'OR  R10, R8, R1', type: 'ALU',  reads: ['R8','R1'], writes: ['R10'],memAccess: false },
    ],
  },
  {
    name_zh: 'Load-Use 冒险', name_en: 'Load-Use Hazard',
    desc_zh: 'LW 取内存后立即使用：需强制停顿 1 周期', desc_en: 'LW then immediate use — forced 1-cycle stall',
    instrs: [
      { asm: 'LW  R1, 0(R2)',   type: 'Load', reads: ['R2'],      writes: ['R1'], memAccess: true  },
      { asm: 'ADD R3, R1, R4',  type: 'ALU',  reads: ['R1','R4'], writes: ['R3'], memAccess: false },
      { asm: 'LW  R5, 4(R2)',   type: 'Load', reads: ['R2'],      writes: ['R5'], memAccess: true  },
      { asm: 'SUB R6, R5, R7',  type: 'ALU',  reads: ['R5','R7'], writes: ['R6'], memAccess: false },
      { asm: 'SW  R6, 8(R2)',   type: 'Store',reads: ['R6','R2'], writes: [],     memAccess: true  },
    ],
  },
  {
    name_zh: '控制冒险 (分支)', name_en: 'Control Hazard (Branch)',
    desc_zh: 'BEQ 分支：预测失败时 flush 2 条指令', desc_en: 'BEQ branch: flush 2 instructions on misprediction',
    instrs: [
      { asm: 'ADD R1, R2, R3',  type: 'ALU',    reads: ['R2','R3'], writes: ['R1'], memAccess: false },
      { asm: 'BEQ R1, R0, done',type: 'Branch', reads: ['R1','R0'], writes: [],     memAccess: false },
      { asm: 'SUB R4, R5, R6',  type: 'ALU',    reads: ['R5','R6'], writes: ['R4'], memAccess: false },
      { asm: 'MUL R7, R8, R9',  type: 'ALU',    reads: ['R8','R9'], writes: ['R7'], memAccess: false },
      { asm: 'done: OR R10, R1, R4', type: 'ALU', reads: ['R1','R4'], writes: ['R10'], memAccess: false },
    ],
  },
]

function computePipeline(instrs: Instruction[]): PipelineSlot[][] {
  const STAGES: Stage[] = ['IF','ID','EX','MEM','WB']
  const n = instrs.length
  const result: PipelineSlot[][] = []
  const issued: number[] = []

  for (let i = 0; i < n; i++) {
    let startCycle = i === 0 ? 0 : (issued[i - 1] + 1)
    const instr = instrs[i]
    const prev = i > 0 ? instrs[i - 1] : null

    if (prev?.type === 'Load' && instr.reads.some(r => prev.writes.includes(r))) {
      startCycle++
    }
    const hazard: HazardType = prev?.type === 'Load' && instr.reads.some(r => prev.writes.includes(r))
      ? 'data'
      : instr.type === 'Branch' ? 'control'
      : instrs.slice(0, i).some(p => p.writes.some(w => instr.reads.includes(w))) ? 'data'
      : 'none'

    issued.push(startCycle)
    for (let s = 0; s < STAGES.length; s++) {
      const c = startCycle + s
      if (!result[c]) result[c] = []
      result[c].push({ instr, stage: STAGES[s], cycle: c, hazard: s === 1 ? hazard : 'none' })
    }
    if (instr.type === 'Branch') {
      for (let f = 0; f < 2; f++) {
        const c = startCycle + 1 + f
        if (!result[c]) result[c] = []
        result[c].push({ instr: null, stage: 'FLUSH', cycle: c, hazard: 'control' })
      }
    }
  }
  return result
}

export default function CPUView() {
  const { lang } = useLang()
  const isZh = lang === 'zh'
  const [progIdx, setProgIdx] = useState(0)
  const [cycle, setCycle] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hovStage, setHovStage] = useState<Stage | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prog = PROGRAMS[progIdx]
  const pipeline = computePipeline(prog.instrs)
  const maxCycle = pipeline.length - 1

  useEffect(() => {
    setCycle(0); setPlaying(false)
  }, [progIdx])

  useEffect(() => {
    if (!playing) return
    timerRef.current = setInterval(() => {
      setCycle(c => { if (c >= maxCycle) { setPlaying(false); return c }; return c + 1 })
    }, 600)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [playing, maxCycle])

  const curSlots = pipeline[cycle] || []
  const STAGES: Stage[] = ['IF','ID','EX','MEM','WB']
  const STAGE_DESC = isZh ? STAGE_DESC_ZH : STAGE_DESC_EN

  const CONCEPTS_ZH = [
    ['数据冒险 (RAW)', '#ff6b6b', '先写后读：指令 N+1 需要指令 N 的结果，N 还未完成 WB'],
    ['Load-Use 冒险', '#ff6b6b', 'LW 取数后立即使用：MEM 阶段才有数据，需插入 1 个 bubble'],
    ['控制冒险', '#ffa657', '分支跳转：结果在 EX 才知道，期间取的指令可能需要 flush'],
    ['数据前递 (Forwarding)', '#51cf66', '将 EX/MEM 阶段结果直接传给下条指令，减少停顿'],
    ['分支预测', '#74c0fc', '静态预测（总预测不跳）/ 动态预测（基于历史），降低 flush 频率'],
  ]
  const CONCEPTS_EN = [
    ['Data Hazard (RAW)', '#ff6b6b', 'Read-after-write: instr N+1 needs result of N before WB completes'],
    ['Load-Use Hazard', '#ff6b6b', 'LW then immediate use: data arrives at MEM stage — insert 1 bubble'],
    ['Control Hazard', '#ffa657', 'Branch: outcome known only at EX — fetched instructions may be flushed'],
    ['Data Forwarding', '#51cf66', 'Route EX/MEM result directly to next instr, reducing stalls'],
    ['Branch Prediction', '#74c0fc', 'Static (always not-taken) / dynamic (history-based) — reduces flushes'],
  ]
  const concepts = isZh ? CONCEPTS_ZH : CONCEPTS_EN

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: 200, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg-secondary)', padding: '12px 8px', overflowY: 'auto' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 1 }}>{isZh ? '示例程序' : 'PROGRAMS'}</div>
        {PROGRAMS.map((p, i) => (
          <button key={i} onClick={() => setProgIdx(i)} style={{
            display: 'block', width: '100%', marginBottom: 5, padding: '8px 10px',
            background: progIdx === i ? 'rgba(255,166,87,0.15)' : 'transparent',
            border: progIdx === i ? '1px solid #ffa657' : '1px solid transparent',
            color: progIdx === i ? '#ffa657' : 'var(--text-secondary)',
            borderRadius: 7, cursor: 'pointer', fontSize: 12, textAlign: 'left',
          }}>
            <div style={{ fontWeight: 600 }}>{isZh ? p.name_zh : p.name_en}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{isZh ? p.desc_zh : p.desc_en}</div>
          </button>
        ))}

        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', margin: '14px 0 8px', letterSpacing: 1 }}>{isZh ? '阶段图例' : 'STAGES'}</div>
        {STAGES.map(s => (
          <div key={s} onMouseEnter={() => setHovStage(s)} onMouseLeave={() => setHovStage(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', borderRadius: 5, marginBottom: 3,
              background: hovStage === s ? `${STAGE_COLOR[s]}20` : 'transparent', cursor: 'default' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: STAGE_COLOR[s], flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: STAGE_COLOR[s] }}>{s}</span>
          </div>
        ))}
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
          {hovStage && <div style={{ padding: '6px 8px', background: `${STAGE_COLOR[hovStage]}15`, borderRadius: 6, border: `1px solid ${STAGE_COLOR[hovStage]}40`, fontSize: 10, lineHeight: 1.5 }}>{STAGE_DESC[hovStage]}</div>}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Controls */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center', background: 'var(--bg-secondary)' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#ffa657' }}>{isZh ? prog.name_zh : prog.name_en}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{isZh ? prog.desc_zh : prog.desc_en}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setCycle(c => Math.max(0, c - 1))} style={{ padding: '4px 10px', borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>◀</button>
            <button onClick={() => setPlaying(p => !p)} style={{ padding: '4px 14px', borderRadius: 5, border: 'none', background: playing ? '#ff6b6b' : '#3fb950', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
              {playing ? '⏸' : '▶'}
            </button>
            <button onClick={() => setCycle(c => Math.min(maxCycle, c + 1))} style={{ padding: '4px 10px', borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>▶</button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 80 }}>
              {isZh ? `周期 ${cycle} / ${maxCycle}` : `Cycle ${cycle} / ${maxCycle}`}
            </span>
            <button onClick={() => { setCycle(0); setPlaying(false) }} style={{ padding: '4px 10px', borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11 }}>
              {isZh ? '重置' : 'Reset'}
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {/* Pipeline diagram */}
          <div style={{ marginBottom: 20, overflowX: 'auto' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
              {isZh ? '时空图（行=指令，列=时钟周期）' : 'Time-Space Diagram (row=instruction, col=clock cycle)'}
            </div>
            <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: 400 }}>
              <thead>
                <tr>
                  <th style={{ padding: '4px 8px', textAlign: 'left', color: 'var(--text-muted)', minWidth: 140, fontWeight: 600 }}>{isZh ? '指令' : 'Instruction'}</th>
                  {Array.from({ length: maxCycle + 1 }, (_, c) => (
                    <th key={c} style={{ padding: '4px 6px', textAlign: 'center', color: c === cycle ? '#ffa657' : 'var(--text-muted)', fontWeight: c === cycle ? 700 : 400, minWidth: 36, background: c === cycle ? 'rgba(255,166,87,0.08)' : 'transparent' }}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prog.instrs.map((instr, iIdx) => (
                  <tr key={iIdx}>
                    <td style={{ padding: '3px 8px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)', borderRight: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                      {instr.asm}
                    </td>
                    {Array.from({ length: maxCycle + 1 }, (_, c) => {
                      const slot = (pipeline[c] || []).find(s => s.instr === instr)
                      const isCurrentCycle = c === cycle
                      return (
                        <td key={c} style={{ padding: '3px 4px', textAlign: 'center', background: isCurrentCycle ? 'rgba(255,166,87,0.08)' : 'transparent', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
                          {slot ? (
                            <div style={{
                              padding: '2px 4px', borderRadius: 3, fontSize: 10, fontWeight: 700,
                              background: `${STAGE_COLOR[slot.stage]}25`,
                              color: STAGE_COLOR[slot.stage],
                              border: `1px solid ${STAGE_COLOR[slot.stage]}50`,
                              minWidth: 28, textAlign: 'center',
                              boxShadow: slot.hazard !== 'none' ? `0 0 4px ${slot.hazard === 'data' ? '#ff6b6b' : '#ffa657'}` : 'none',
                            }}>{slot.stage}</div>
                          ) : <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>·</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Current cycle detail */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
              {isZh ? `周期 ${cycle} — 流水线状态` : `Cycle ${cycle} — Pipeline State`}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {STAGES.map(stage => {
                const slot = curSlots.find(s => s.stage === stage && s.instr)
                const color = STAGE_COLOR[stage]
                return (
                  <div key={stage} style={{
                    flex: 1, padding: 12, borderRadius: 8, minHeight: 80,
                    background: slot ? `${color}18` : 'var(--bg-secondary)',
                    border: `1px solid ${slot ? color + '60' : 'var(--border)'}`,
                    transition: 'all 0.2s',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: color, marginBottom: 6 }}>{stage}</div>
                    {slot?.instr ? (
                      <>
                        <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-primary)', lineHeight: 1.4 }}>{slot.instr.asm}</div>
                        {slot.hazard !== 'none' && (
                          <div style={{ marginTop: 5, fontSize: 9, color: slot.hazard === 'data' ? '#ff6b6b' : '#ffa657', background: slot.hazard === 'data' ? 'rgba(255,107,107,0.1)' : 'rgba(255,166,87,0.1)', padding: '2px 5px', borderRadius: 3 }}>
                            ⚠ {slot.hazard === 'data' ? (isZh ? '数据冒险' : 'Data Hazard') : (isZh ? '控制冒险' : 'Control Hazard')}
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>—</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Concepts */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
              {isZh ? '流水线关键概念' : 'Key Pipeline Concepts'}
            </div>
            {concepts.map(([k, c, v]) => (
              <div key={k as string} style={{ padding: '7px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: c as string, minWidth: 140 }}>{k as string}</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{v as string}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
