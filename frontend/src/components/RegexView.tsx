import { useState, useMemo } from 'react'

interface Match { start: number; end: number; groups: string[] }

function execAll(pattern: string, flags: string, text: string): Match[] {
  try {
    const re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g')
    const results: Match[] = []
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      results.push({ start: m.index, end: m.index + m[0].length, groups: m.slice(1) })
      if (!flags.includes('g') && !m[0].length) break
      if (!m[0].length) re.lastIndex++
    }
    return results
  } catch { return [] }
}

interface NFAState { id: number; label: string; accept: boolean }
interface NFAEdge { from: number; to: number; label: string }

function buildSimpleNFA(pattern: string): { states: NFAState[]; edges: NFAEdge[] } {
  const states: NFAState[] = []
  const edges: NFAEdge[] = []
  let id = 0
  const newState = (label: string, accept = false): number => {
    states.push({ id: id++, label, accept }); return id - 1
  }
  const start = newState('q₀')
  let cur = start

  const clean = pattern.replace(/^\^/, '').replace(/\$$/, '').slice(0, 12)
  let i = 0
  while (i < clean.length) {
    const ch = clean[i]
    const next = clean[i + 1]
    if (ch === '(' ) { i++; continue }
    if (ch === ')' ) { i++; continue }
    if (ch === '|' ) {
      const alt = newState(`q${id}`)
      edges.push({ from: start, to: alt, label: 'ε' })
      cur = alt; i++; continue
    }
    const label = ch === '.' ? 'any' : ch === '\\' && next ? `\\${next}` : ch === '[' ? '[…]' : ch
    const skip = ch === '\\' ? 2 : ch === '[' ? (clean.indexOf(']', i + 1) - i + 1) : 1
    const q = newState(`q${id}`)
    const quantifier = clean[i + skip]
    if (quantifier === '*') {
      edges.push({ from: cur, to: q, label })
      edges.push({ from: q, to: q, label })
      edges.push({ from: cur, to: q, label: 'ε' })
      cur = q; i += skip + 1
    } else if (quantifier === '+') {
      edges.push({ from: cur, to: q, label })
      edges.push({ from: q, to: q, label })
      cur = q; i += skip + 1
    } else if (quantifier === '?') {
      edges.push({ from: cur, to: q, label })
      edges.push({ from: cur, to: q, label: 'ε' })
      cur = q; i += skip + 1
    } else {
      edges.push({ from: cur, to: q, label })
      cur = q; i += skip
    }
  }
  states[cur].accept = true
  return { states, edges }
}

const PRESETS = [
  { label: '邮箱',      pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', flags: 'g', sample: 'alice@example.com, bob@test.org, invalid@' },
  { label: 'IPv4',      pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b',               flags: 'g', sample: '192.168.1.1 and 10.0.0.1 and 999.999.999.999' },
  { label: '日期',      pattern: '\\d{4}[-/]\\d{2}[-/]\\d{2}',                    flags: 'g', sample: '2024-01-15 or 2023/12/31 done' },
  { label: '手机号',    pattern: '1[3-9]\\d{9}',                                   flags: 'g', sample: '13800138000 and 19912345678 and 12345678901' },
  { label: 'URL',       pattern: 'https?://[\\w./-]+',                              flags: 'g', sample: 'Visit https://example.com/path and http://test.org' },
  { label: '十六进制',  pattern: '#?[0-9a-fA-F]{3,6}\\b',                          flags: 'g', sample: 'Colors: #ff6b6b #3fb950 abc123 #xyz' },
  { label: '重复单词',  pattern: '\\b(\\w+)\\s+\\1\\b',                            flags: 'gi', sample: 'the the quick brown fox fox jumped' },
  { label: '数字',      pattern: '-?\\d+(\\.\\d+)?',                               flags: 'g', sample: 'pi=3.14159, e=2.718, zero=0, neg=-42' },
]

function HighlightText({ text, matches }: { text: string; matches: Match[] }) {
  const parts: { s: string; match: boolean; idx: number }[] = []
  let pos = 0
  for (const m of matches) {
    if (pos < m.start) parts.push({ s: text.slice(pos, m.start), match: false, idx: -1 })
    parts.push({ s: text.slice(m.start, m.end), match: true, idx: parts.length })
    pos = m.end
  }
  if (pos < text.length) parts.push({ s: text.slice(pos), match: false, idx: -1 })
  return (
    <span>
      {parts.map((p, i) => p.match
        ? <mark key={i} style={{ background: '#ffa94d40', color: '#ffa94d', borderRadius: 3, padding: '1px 2px', border: '1px solid #ffa94d80' }}>{p.s}</mark>
        : <span key={i}>{p.s}</span>
      )}
    </span>
  )
}

function NFADiagram({ states, edges }: { states: NFAState[]; edges: NFAEdge[] }) {
  const W = 520, H = 160, r = 22
  const cols = Math.ceil(Math.sqrt(states.length))
  const pos = states.map((_, i) => ({
    x: 60 + (i % cols) * (W / Math.min(cols, states.length + 1)),
    y: 40 + Math.floor(i / cols) * 70,
  }))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block' }}>
      <defs>
        <marker id="rx-arr" markerWidth={8} markerHeight={8} refX={7} refY={3.5} orient="auto">
          <path d="M0,0 L0,7 L8,3.5z" fill="#888" />
        </marker>
      </defs>
      {edges.map((e, i) => {
        const f = pos[e.from], t = pos[e.to]
        if (!f || !t) return null
        const isSelf = e.from === e.to
        if (isSelf) {
          return (
            <g key={i}>
              <path d={`M${f.x - 12},${f.y - r} Q${f.x - 12},${f.y - r - 30} ${f.x + 12},${f.y - r}`}
                fill="none" stroke={e.label === 'ε' ? '#888' : '#ffa94d'} strokeWidth={1.5} markerEnd="url(#rx-arr)" strokeDasharray={e.label === 'ε' ? '4 3' : ''} />
              <text x={f.x} y={f.y - r - 18} textAnchor="middle" fontSize={9} fill={e.label === 'ε' ? '#888' : '#ffa94d'}>{e.label}</text>
            </g>
          )
        }
        const dx = t.x - f.x, dy = t.y - f.y, len = Math.sqrt(dx * dx + dy * dy)
        const ux = dx / len, uy = dy / len
        const sx = f.x + ux * r, sy = f.y + uy * r
        const ex = t.x - ux * r, ey = t.y - uy * r
        const mx = (sx + ex) / 2 - uy * 18, my = (sy + ey) / 2 + ux * 18
        return (
          <g key={i}>
            <path d={`M${sx},${sy} Q${mx},${my} ${ex},${ey}`}
              fill="none" stroke={e.label === 'ε' ? '#888' : '#74c0fc'} strokeWidth={1.5} markerEnd="url(#rx-arr)"
              strokeDasharray={e.label === 'ε' ? '4 3' : ''} />
            <text x={(sx + ex) / 2 + (mx - (sx + ex) / 2) * 0.5 - uy * 5}
              y={(sy + ey) / 2 + (my - (sy + ey) / 2) * 0.5 + ux * 5}
              textAnchor="middle" fontSize={9} fill={e.label === 'ε' ? '#888' : '#74c0fc'}>{e.label}</text>
          </g>
        )
      })}
      {states.map((s, i) => {
        const p = pos[i]
        if (!p) return null
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={r} fill={s.accept ? 'rgba(81,207,102,0.15)' : 'var(--bg-secondary)'}
              stroke={s.accept ? '#51cf66' : '#888'} strokeWidth={s.accept ? 2 : 1.5} />
            {s.accept && <circle cx={p.x} cy={p.y} r={r - 4} fill="none" stroke="#51cf66" strokeWidth={1} />}
            <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={10} fill="var(--text-primary)" fontWeight={600}>{s.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

export default function RegexView() {
  const [pattern, setPattern] = useState('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}')
  const [flags, setFlags] = useState('g')
  const [text, setText] = useState('alice@example.com, bob@test.org, invalid@')
  const [error, setError] = useState('')

  const matches = useMemo(() => {
    try { setError(''); return execAll(pattern, flags, text) }
    catch (e: any) { setError(e.message); return [] }
  }, [pattern, flags, text])

  const nfa = useMemo(() => {
    try { return buildSimpleNFA(pattern) } catch { return { states: [], edges: [] } }
  }, [pattern])

  const applyPreset = (p: typeof PRESETS[0]) => {
    setPattern(p.pattern); setFlags(p.flags); setText(p.sample)
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: 170, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg-secondary)', padding: '12px 8px', overflowY: 'auto' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 1 }}>常用预设</div>
        {PRESETS.map(p => (
          <button key={p.label} onClick={() => applyPreset(p)} style={{
            display: 'block', width: '100%', marginBottom: 4, padding: '7px 10px',
            background: pattern === p.pattern ? 'rgba(255,169,77,0.15)' : 'transparent',
            border: pattern === p.pattern ? '1px solid #ffa94d' : '1px solid transparent',
            color: pattern === p.pattern ? '#ffa94d' : 'var(--text-secondary)',
            borderRadius: 6, cursor: 'pointer', fontSize: 12, textAlign: 'left',
          }}>{p.label}</button>
        ))}

        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', margin: '14px 0 8px', letterSpacing: 1 }}>标志位</div>
        {['g', 'i', 'm', 's'].map(f => (
          <label key={f} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={flags.includes(f)}
              onChange={() => setFlags(fs => fs.includes(f) ? fs.replace(f, '') : fs + f)} />
            <code style={{ color: '#74c0fc' }}>{f}</code>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{{ g: '全局', i: '忽略大小写', m: '多行', s: '. 匹配换行' }[f]}</span>
          </label>
        ))}
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>正则表达式可视化</h2>

        {/* Pattern input */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 14, border: `1px solid ${error ? '#ff6b6b' : 'var(--border)'}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>正则表达式</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#ffa94d', fontSize: 18 }}>/</span>
            <input value={pattern} onChange={e => setPattern(e.target.value)}
              style={{ flex: 1, padding: '7px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 6, color: '#ffa94d', fontSize: 14, fontFamily: 'monospace' }} />
            <span style={{ color: '#ffa94d', fontSize: 18 }}>/{flags}</span>
          </div>
          {error && <div style={{ marginTop: 6, fontSize: 11, color: '#ff6b6b' }}>⚠ {error}</div>}
        </div>

        {/* Test text */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 14, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>测试文本</div>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
            style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }} />
        </div>

        {/* Match result */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 14, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>匹配结果</div>
            <div style={{ fontSize: 12, color: matches.length > 0 ? '#51cf66' : '#ff6b6b', fontWeight: 700 }}>
              {matches.length > 0 ? `✓ 找到 ${matches.length} 个匹配` : '✗ 无匹配'}
            </div>
          </div>
          <div style={{ fontSize: 14, fontFamily: 'monospace', lineHeight: 1.8, wordBreak: 'break-all' }}>
            <HighlightText text={text} matches={matches} />
          </div>
        </div>

        {/* Match list */}
        {matches.length > 0 && (
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
              匹配详情
            </div>
            {matches.slice(0, 10).map((m, i) => (
              <div key={i} style={{ padding: '7px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 14, alignItems: 'baseline', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)', minWidth: 20 }}>#{i + 1}</span>
                <code style={{ color: '#ffa94d', background: 'rgba(255,169,77,0.1)', padding: '2px 6px', borderRadius: 4 }}>{text.slice(m.start, m.end)}</code>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>index [{m.start}, {m.end}]</span>
                {m.groups.length > 0 && <span style={{ color: '#74c0fc', fontSize: 11 }}>捕获组: {m.groups.map((g, j) => `$${j + 1}=${g}`).join(', ')}</span>}
              </div>
            ))}
            {matches.length > 10 && <div style={{ padding: '6px 14px', fontSize: 11, color: 'var(--text-muted)' }}>… 还有 {matches.length - 10} 个匹配</div>}
          </div>
        )}

        {/* NFA diagram */}
        {nfa.states.length > 0 && nfa.states.length <= 12 && (
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 14, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10 }}>NFA 状态机（简化）</div>
            <NFADiagram states={nfa.states} edges={nfa.edges} />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
              双圆圈 = 接受态 · 虚线边 = ε 转移 · 蓝色边 = 字符转移 · 橙色边 = 自环（循环）
            </div>
          </div>
        )}

        {/* Cheatsheet */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>正则速查</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: 8 }}>
            {[
              ['.','任意字符（不含\\n）'],['\\d','数字 [0-9]'],['\\w','单词字符'],['\\s','空白字符'],
              ['^','行首'],['$','行尾'],['*','0或多次'],['+',' 1或多次'],
              ['?','0或1次'],['{n,m}','n到m次'],['(...)','捕获组'],['(?:...)','非捕获组'],
              ['[abc]','字符集'],['[^abc]','排除字符集'],['a|b','或'],['\\b','单词边界'],
            ].map(([sym, desc]) => (
              <div key={sym} style={{ padding: '4px 8px', display: 'flex', gap: 8 }}>
                <code style={{ color: '#ffa94d', minWidth: 60, fontSize: 12 }}>{sym}</code>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
