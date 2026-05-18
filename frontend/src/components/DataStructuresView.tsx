import { useState, useCallback } from 'react'
import { useMobile } from '../hooks/useMobile'
import { DS_LIST, DS_LANGS, DS_LANG_LABELS, DSLangId } from '../dataStructures'

// ─── Real-language syntax highlighter ─────────────────────────────────────────

const REAL_KW: Record<string, Set<string>> = {
  c: new Set(['int','char','void','struct','typedef','return','if','else','while','for','do','break','continue','NULL','sizeof','malloc','free','include','define','printf','main','static','const','unsigned','long','short','float','double']),
  cpp: new Set(['int','char','void','struct','class','template','typename','return','if','else','while','for','do','break','continue','nullptr','new','delete','this','public','private','protected','const','auto','bool','true','false','static','inline','virtual','override','size_t','using','namespace','std','cout','cin','endl','include','define','main','explicit','operator','sizeof','noexcept']),
  java: new Set(['int','long','char','void','class','interface','extends','implements','return','if','else','while','for','do','break','continue','new','null','this','public','private','protected','static','final','boolean','true','false','import','package','throw','throws','try','catch','finally','super','abstract','String','Object','System','Arrays','List','Queue','ArrayList','ArrayDeque','LinkedList']),
  rust: new Set(['let','mut','fn','struct','enum','impl','trait','pub','use','return','if','else','while','for','loop','break','continue','match','Some','None','Ok','Err','true','false','self','Self','type','where','in','ref','Box','Vec','Option','Result','usize','i32','i64','u32','u64','bool','String','str','println','print','format','push','pop','unwrap','map','collect','iter','into_iter']),
  go: new Set(['var','func','struct','interface','return','if','else','for','range','break','continue','go','defer','select','chan','map','make','new','nil','true','false','package','import','type','const','append','len','cap','fmt','Println','Printf','Sprintf','error','int','int64','bool','string','byte','rune','uint','any']),
  javascript: new Set(['const','let','var','class','function','return','if','else','while','for','of','in','do','break','continue','new','null','undefined','true','false','this','super','static','get','set','async','await','import','export','default','typeof','instanceof','Array','console','log','push','pop','shift','unshift','length','toString','from','throw','try','catch','finally']),
  python: new Set(['def','class','return','if','elif','else','while','for','in','break','continue','pass','import','from','as','True','False','None','self','not','and','or','is','lambda','yield','with','try','except','finally','raise','del','global','nonlocal','print','len','range','list','dict','set','tuple','str','int','bool','float','type','isinstance','append','extend','super','property','staticmethod','classmethod','Optional','TypeVar','Generic','dataclass','field','deque']),
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlightCode(code: string, lang: string): string {
  const kws = REAL_KW[lang] ?? REAL_KW.python
  const lines = code.split('\n')
  return lines.map(line => highlightLine(line, kws, lang)).join('\n')
}

function highlightLine(line: string, kws: Set<string>, lang: string): string {
  const commentPrefixes: Record<string, string[]> = {
    c: ['//','/*'], cpp: ['//','/*'], java: ['//','/*'],
    rust: ['//'], go: ['//'],
    javascript: ['//','/*'], python: ['#'],
  }
  const prefixes = commentPrefixes[lang] ?? ['//']
  const trimmed = line.trimStart()
  const indent = line.length - trimmed.length
  const indentStr = line.slice(0, indent)

  for (const p of prefixes) {
    if (trimmed.startsWith(p)) {
      return escHtml(indentStr) + `<span class="hl-comment">${escHtml(trimmed)}</span>`
    }
  }

  let out = ''
  let i = 0
  const commentStart = findInlineComment(line, lang)
  const mainPart = commentStart >= 0 ? line.slice(0, commentStart) : line
  const commentPart = commentStart >= 0 ? line.slice(commentStart) : ''

  while (i < mainPart.length) {
    const c = mainPart[i]

    if (c === '"' || c === '\'') {
      let str = c
      const q = c
      i++
      while (i < mainPart.length) {
        const ch = mainPart[i]
        str += ch
        if (ch === '\\') { i++; if (i < mainPart.length) str += mainPart[i] }
        else if (ch === q) break
        i++
      }
      out += `<span class="hl-str">${escHtml(str)}</span>`
      i++
      continue
    }

    if (c >= '0' && c <= '9') {
      let num = ''
      while (i < mainPart.length && (mainPart[i] >= '0' && mainPart[i] <= '9' || mainPart[i] === '.')) num += mainPart[i++]
      out += `<span class="hl-num">${num}</span>`
      continue
    }

    if (isIdStart(c)) {
      let word = ''
      while (i < mainPart.length && isIdChar(mainPart[i])) word += mainPart[i++]
      out += kws.has(word)
        ? `<span class="hl-kw">${escHtml(word)}</span>`
        : `<span class="hl-id">${escHtml(word)}</span>`
      continue
    }

    if (i + 1 < mainPart.length) {
      const two = c + mainPart[i + 1]
      if (['==','!=','<=','>=','->','::','&&','||','<<','>>','+=','-=','*=','/='].includes(two)) {
        out += `<span class="hl-op">${escHtml(two)}</span>`
        i += 2; continue
      }
    }
    if ('+-*/%=<>!&|^~'.includes(c)) {
      out += `<span class="hl-op">${escHtml(c)}</span>`; i++; continue
    }
    if ('{}'.includes(c)) { out += `<span class="hl-brace">${c}</span>`; i++; continue }
    if ('()[]'.includes(c)) { out += `<span class="hl-paren">${escHtml(c)}</span>`; i++; continue }
    if (';:,.'.includes(c)) { out += `<span class="hl-punct">${c}</span>`; i++; continue }
    if (c === '#') { out += `<span class="hl-comment">${escHtml(mainPart.slice(i))}</span>`; break }

    out += escHtml(c); i++
  }

  if (commentPart) out += `<span class="hl-comment">${escHtml(commentPart)}</span>`
  return out
}

function isIdStart(c: string) { return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_' }
function isIdChar(c: string)  { return isIdStart(c) || (c >= '0' && c <= '9') }

function findInlineComment(line: string, lang: string): number {
  const prefix = lang === 'python' ? '#' : '//'
  let inStr = false; let q = ''
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inStr) {
      if (c === '\\') { i++; continue }
      if (c === q) inStr = false
    } else {
      if (c === '"' || c === '\'') { inStr = true; q = c }
      else if (line.startsWith(prefix, i)) return i
    }
  }
  return -1
}

// ─── Code Block ───────────────────────────────────────────────────────────────

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const lines = code.split('\n')
  const highlighted = highlightCode(code, lang)
  const highlightedLines = highlighted.split('\n')
  const [copied, setCopied] = useState(false)

  const copy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [code])

  return (
    <div style={{ position: 'relative', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.55 }}>
      <button
        onClick={copy}
        style={{
          position: 'absolute', top: 8, right: 8,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '2px 10px', fontSize: 11,
          color: copied ? 'var(--accent-green)' : 'var(--text-secondary)',
          cursor: 'pointer', zIndex: 1,
        }}
      >{copied ? '✓ Copied' : 'Copy'}</button>
      <div style={{
        overflowX: 'auto', background: 'var(--bg-tertiary)',
        borderRadius: 8, padding: '12px 0',
      }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
          <colgroup><col style={{ width: 44 }} /><col /></colgroup>
          <tbody>
            {highlightedLines.map((hl, i) => (
              <tr key={i} style={{ lineHeight: 1.55 }}>
                <td style={{
                  textAlign: 'right', paddingRight: 16, paddingLeft: 12,
                  color: 'var(--text-muted)', userSelect: 'none',
                  fontSize: 12, verticalAlign: 'top', whiteSpace: 'nowrap',
                }}>{lines.length > 1 ? i + 1 : ''}</td>
                <td style={{ paddingRight: 16, whiteSpace: 'pre', verticalAlign: 'top' }}
                    dangerouslySetInnerHTML={{ __html: hl || '&nbsp;' }} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── DS Visual Diagrams ───────────────────────────────────────────────────────

const B = '#4d8fff'     // blue
const G = '#3fb950'     // green
const P = '#a371f7'     // purple
const O = '#ffa657'     // orange

function Arrow({ id, color = B }: { id: string; color?: string }) {
  return (
    <marker id={id} markerWidth={9} markerHeight={9} refX={8} refY={3.5} orient="auto">
      <path d="M0,0 L0,7 L9,3.5z" fill={color} />
    </marker>
  )
}

function LinkedListDiagram() {
  const vals = [12, 37, 99, 5]
  const nw = 38, pw = 18, nh = 32, gap = 20, cy = 60, sx = 60
  const W = sx + vals.length * (nw + pw + gap) + 40
  return (
    <svg viewBox={`0 0 ${W} 110`} style={{ width: '100%', maxWidth: W, display: 'block' }}>
      <defs><Arrow id="ll" /><Arrow id="llg" color={G} /></defs>
      {/* HEAD box */}
      <rect x={4} y={cy-14} width={46} height={28} rx={5} fill="none" stroke={G} strokeWidth={1.5} strokeDasharray="4 2" />
      <text x={27} y={cy+5} textAnchor="middle" fontSize={10} fill={G} fontWeight={700} fontFamily="monospace">HEAD</text>
      <line x1={50} y1={cy} x2={sx-3} y2={cy} stroke={G} strokeWidth={2} markerEnd="url(#llg)" />
      {vals.map((v, i) => {
        const x = sx + i * (nw + pw + gap)
        const hasNext = i < vals.length - 1
        return (
          <g key={i}>
            <rect x={x} y={cy-nh/2} width={nw} height={nh} rx={5}
              fill="rgba(77,143,255,0.18)" stroke={B} strokeWidth={1.5} />
            <text x={x+nw/2} y={cy+5} textAnchor="middle" fontSize={13} fontWeight={700}
              fill="var(--text-primary)" fontFamily="monospace">{v}</text>
            <rect x={x+nw} y={cy-nh/2} width={pw} height={nh} rx={4}
              fill="rgba(77,143,255,0.06)" stroke={B} strokeWidth={1} />
            <text x={x+nw+pw/2} y={cy+3} textAnchor="middle" fontSize={9} fill="var(--text-muted)">→</text>
            {hasNext
              ? <line x1={x+nw+pw} y1={cy} x2={x+nw+pw+gap-3} y2={cy} stroke={B} strokeWidth={1.5} markerEnd="url(#ll)" />
              : <text x={x+nw+pw+10} y={cy+4} fontSize={11} fill="var(--text-muted)" fontFamily="monospace">null</text>
            }
            <text x={x+(nw+pw)/2} y={cy+nh/2+14} textAnchor="middle" fontSize={9} fill="var(--text-muted)">node{i}</text>
          </g>
        )
      })}
      <text x={sx} y={20} fontSize={10} fill="var(--text-muted)">Singly Linked List — O(n) search · O(1) insert at head</text>
    </svg>
  )
}

function StackDiagram() {
  const items = [9, 1, 7, 3]   // bottom → top
  const rw = 100, rh = 30, rx0 = 70, gap = 2, startY = 40
  const H = startY + items.length * (rh + gap) + 40
  return (
    <svg viewBox={`0 0 260 ${H}`} style={{ width: '100%', maxWidth: 260, display: 'block' }}>
      <defs><Arrow id="su" color={G} /><Arrow id="sd" color={O} /></defs>
      <text x={130} y={18} textAnchor="middle" fontSize={10} fill="var(--text-muted)">Stack — LIFO · O(1) push/pop</text>
      {/* PUSH */}
      <text x={rx0+rw/2} y={startY-8} textAnchor="middle" fontSize={10} fill={G} fontWeight={700}>↓ PUSH</text>
      {items.slice().reverse().map((v, i) => {
        const y = startY + i * (rh + gap)
        const isTop = i === 0
        return (
          <g key={i}>
            <rect x={rx0} y={y} width={rw} height={rh} rx={5}
              fill={isTop ? 'rgba(77,143,255,0.28)' : 'rgba(77,143,255,0.10)'}
              stroke={isTop ? B : 'rgba(77,143,255,0.45)'} strokeWidth={isTop ? 2 : 1} />
            <text x={rx0+rw/2} y={y+rh/2+5} textAnchor="middle" fontSize={13}
              fontWeight={isTop ? 700 : 400} fill="var(--text-primary)" fontFamily="monospace">{v}</text>
            {isTop && (
              <text x={rx0+rw+8} y={y+rh/2+5} fontSize={10} fill={B} fontWeight={700}>← top</text>
            )}
          </g>
        )
      })}
      {/* base line */}
      <line x1={rx0-4} y1={startY + items.length*(rh+gap)} x2={rx0+rw+4} y2={startY + items.length*(rh+gap)} stroke={B} strokeWidth={2.5} />
      {/* POP */}
      <text x={rx0-10} y={startY+10} textAnchor="end" fontSize={10} fill={O} fontWeight={700}>POP ↑</text>
    </svg>
  )
}

function QueueDiagram() {
  const vals = [4, 2, 8, 1]
  const nw = 52, nh = 36, gap = 2, sx = 90, cy = 65
  const W = sx + vals.length * (nw + gap) + 80
  return (
    <svg viewBox={`0 0 ${W} 120`} style={{ width: '100%', maxWidth: W, display: 'block' }}>
      <defs>
        <Arrow id="qe" color={G} />
        <Arrow id="qd" color={O} />
      </defs>
      <text x={W/2} y={18} textAnchor="middle" fontSize={10} fill="var(--text-muted)">Queue — FIFO · O(1) enqueue/dequeue</text>
      {/* ENQUEUE from left */}
      <text x={sx-30} y={cy-18} textAnchor="middle" fontSize={10} fill={G} fontWeight={700}>ENQUEUE</text>
      <line x1={sx-56} y1={cy} x2={sx-4} y2={cy} stroke={G} strokeWidth={1.8} markerEnd="url(#qe)" />
      {vals.map((v, i) => {
        const x = sx + i * (nw + gap)
        const isFirst = i === 0
        const isLast = i === vals.length - 1
        const rl = isFirst ? 6 : 0, rr = isLast ? 6 : 0
        return (
          <g key={i}>
            <rect x={x} y={cy-nh/2} width={nw} height={nh}
              rx={0} ry={0}
              fill={isFirst ? 'rgba(255,166,87,0.22)' : isLast ? 'rgba(63,185,80,0.16)' : 'rgba(77,143,255,0.12)'}
              stroke={B} strokeWidth={1.5} />
            {/* rounded corners hack via clipPath on first/last */}
            <text x={x+nw/2} y={cy+5} textAnchor="middle" fontSize={13}
              fontWeight={700} fill="var(--text-primary)" fontFamily="monospace">{v}</text>
            {isFirst && <text x={x+nw/2} y={cy+nh/2+14} textAnchor="middle" fontSize={9} fill={O}>front</text>}
            {isLast  && <text x={x+nw/2} y={cy+nh/2+14} textAnchor="middle" fontSize={9} fill={G}>rear</text>}
          </g>
        )
      })}
      {/* DEQUEUE to right */}
      <text x={sx+vals.length*(nw+gap)+34} y={cy-18} textAnchor="middle" fontSize={10} fill={O} fontWeight={700}>DEQUEUE</text>
      <line x1={sx+vals.length*(nw+gap)} y1={cy} x2={sx+vals.length*(nw+gap)+54} y2={cy} stroke={O} strokeWidth={1.8} markerEnd="url(#qd)" />
    </svg>
  )
}

function BSTDiagram() {
  type N = { v: number; x: number; y: number }
  const nodes: N[] = [
    { v:8,  x:200, y:28  },
    { v:3,  x:105, y:85  }, { v:10, x:295, y:85  },
    { v:1,  x:55,  y:145 }, { v:6,  x:155, y:145 }, { v:14, x:345, y:145 },
    { v:4,  x:125, y:205 }, { v:7,  x:185, y:205 }, { v:13, x:315, y:205 },
  ]
  const edges: [number,number][] = [[0,1],[0,2],[1,3],[1,4],[2,5],[4,6],[4,7],[5,8]]
  const R = 20
  return (
    <svg viewBox="0 0 400 240" style={{ width: '100%', maxWidth: 400, display: 'block' }}>
      <text x={200} y={16} textAnchor="middle" fontSize={10} fill="var(--text-muted)">BST — O(log n) avg · left &lt; root &lt; right</text>
      {edges.map(([a,b],i) => (
        <line key={i} x1={nodes[a].x} y1={nodes[a].y+R} x2={nodes[b].x} y2={nodes[b].y-R}
          stroke="rgba(77,143,255,0.35)" strokeWidth={1.8} />
      ))}
      {nodes.map((n,i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={R}
            fill={i===0 ? 'rgba(163,113,247,0.30)' : i<3 ? 'rgba(77,143,255,0.18)' : 'rgba(77,143,255,0.10)'}
            stroke={i===0 ? P : B} strokeWidth={i===0 ? 2.5 : 1.5} />
          <text x={n.x} y={n.y+5} textAnchor="middle" fontSize={12} fontWeight={700}
            fill="var(--text-primary)" fontFamily="monospace">{n.v}</text>
        </g>
      ))}
      <text x={200} y={235} textAnchor="middle" fontSize={9} fill="var(--text-muted)" fontStyle="italic">
        inorder traversal: 1 3 4 6 7 8 10 13 14 (sorted!)
      </text>
    </svg>
  )
}

function HashTableDiagram() {
  const buckets: (string|null)[][] = [
    ['john'], ['alice', 'charlie'], [null], ['bob'], ['carol', 'eve']
  ]
  const bw = 60, bh = 28, cw = 52, gap = 8, sx = 80, sy = 26
  const H = sy + buckets.length * (bh + gap) + 16
  return (
    <svg viewBox={`0 0 380 ${H}`} style={{ width: '100%', maxWidth: 380, display: 'block' }}>
      <defs><Arrow id="ha" /></defs>
      <text x={190} y={15} textAnchor="middle" fontSize={10} fill="var(--text-muted)">Hash Table — O(1) avg · separate chaining</text>
      {buckets.map((chain, i) => {
        const y = sy + i * (bh + gap)
        const hasItems = chain[0] !== null
        return (
          <g key={i}>
            {/* index */}
            <text x={sx-8} y={y+bh/2+5} textAnchor="end" fontSize={11} fill="var(--text-muted)" fontFamily="monospace">[{i}]</text>
            {/* bucket */}
            <rect x={sx} y={y} width={bw} height={bh} rx={5}
              fill="rgba(77,143,255,0.12)" stroke={B} strokeWidth={1.5} />
            {hasItems ? (
              <>
                <line x1={sx+bw} y1={y+bh/2} x2={sx+bw+gap+2} y2={y+bh/2} stroke={B} strokeWidth={1.5} markerEnd="url(#ha)" />
                {chain.map((name, j) => {
                  if (!name) return null
                  const cx = sx + bw + gap + j * (cw + gap + 14)
                  return (
                    <g key={j}>
                      <rect x={cx} y={y} width={cw} height={bh} rx={5}
                        fill="rgba(63,185,80,0.15)" stroke={G} strokeWidth={1.5} />
                      <text x={cx+cw/2} y={y+bh/2+4} textAnchor="middle" fontSize={10}
                        fill="var(--text-primary)">{name}</text>
                      {j < chain.length-1 && chain[j+1] && (
                        <line x1={cx+cw} y1={y+bh/2} x2={cx+cw+gap+2} y2={y+bh/2} stroke={G} strokeWidth={1.5} markerEnd="url(#ha)" />
                      )}
                    </g>
                  )
                })}
              </>
            ) : (
              <text x={sx+bw+12} y={y+bh/2+4} fontSize={10} fill="var(--text-muted)" fontFamily="monospace">null</text>
            )}
          </g>
        )
      })}
      <text x={sx+bw/2} y={sy-8} textAnchor="middle" fontSize={9} fill="var(--text-muted)">buckets</text>
      <text x={sx+bw+gap+cw/2+10} y={sy-8} textAnchor="middle" fontSize={9} fill="var(--text-muted)">chains (nodes)</text>
    </svg>
  )
}

function MinHeapDiagram() {
  type N = { v: number; x: number; y: number }
  const nodes: N[] = [
    { v:1, x:200, y:28 },
    { v:3, x:120, y:88 }, { v:2, x:280, y:88 },
    { v:5, x:72,  y:148}, { v:4, x:168, y:148}, { v:6, x:232, y:148}, { v:7, x:328, y:148},
  ]
  const edges: [number,number][] = [[0,1],[0,2],[1,3],[1,4],[2,5],[2,6]]
  const R = 20
  return (
    <svg viewBox="0 0 400 190" style={{ width: '100%', maxWidth: 400, display: 'block' }}>
      <text x={200} y={15} textAnchor="middle" fontSize={10} fill="var(--text-muted)">Min Heap — O(log n) insert/delete · O(1) peek min</text>
      {edges.map(([a,b],i) => (
        <line key={i} x1={nodes[a].x} y1={nodes[a].y+R} x2={nodes[b].x} y2={nodes[b].y-R}
          stroke="rgba(255,166,87,0.4)" strokeWidth={1.8} />
      ))}
      {nodes.map((n,i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={R}
            fill={i===0 ? 'rgba(255,166,87,0.38)' : 'rgba(255,166,87,0.14)'}
            stroke={O} strokeWidth={i===0 ? 2.5 : 1.5} />
          <text x={n.x} y={n.y+5} textAnchor="middle" fontSize={12} fontWeight={700}
            fill="var(--text-primary)" fontFamily="monospace">{n.v}</text>
          {i===0 && <text x={n.x+26} y={n.y+4} fontSize={9} fill={O} fontWeight={700}>MIN</text>}
        </g>
      ))}
      {/* parent ≤ children annotation */}
      <text x={12} y={108} fontSize={9} fill="rgba(255,166,87,0.6)" fontStyle="italic">parent ≤ children</text>
      {/* array */}
      <text x={200} y={182} textAnchor="middle" fontSize={10} fill="var(--text-muted)" fontFamily="monospace">
        array: [1, 3, 2, 5, 4, 6, 7]
      </text>
    </svg>
  )
}

function GraphDiagram() {
  type N = { id: string; x: number; y: number; lvl: number }
  const nodes: N[] = [
    { id:'A', x:55,  y:85,  lvl:0 },
    { id:'B', x:155, y:35,  lvl:1 }, { id:'C', x:155, y:135, lvl:1 },
    { id:'D', x:265, y:35,  lvl:2 }, { id:'E', x:265, y:85,  lvl:2 }, { id:'F', x:265, y:135, lvl:2 },
    { id:'G', x:365, y:60,  lvl:3 }, { id:'H', x:365, y:130, lvl:3 },
  ]
  const edges: [number,number][] = [[0,1],[0,2],[1,3],[1,4],[2,4],[2,5],[3,6],[4,6],[5,7]]
  const lc = [P, B, G, O]
  const R = 20
  return (
    <svg viewBox="0 0 430 180" style={{ width: '100%', maxWidth: 430, display: 'block' }}>
      <text x={215} y={15} textAnchor="middle" fontSize={10} fill="var(--text-muted)">Graph BFS — shortest path · O(V+E) · level-by-level</text>
      {edges.map(([a,b],i) => (
        <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
          stroke="rgba(255,255,255,0.12)" strokeWidth={1.8} />
      ))}
      {nodes.map((n,i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={R}
            fill={`${lc[n.lvl]}28`} stroke={lc[n.lvl]} strokeWidth={2} />
          <text x={n.x} y={n.y+5} textAnchor="middle" fontSize={12} fontWeight={700}
            fill="var(--text-primary)" fontFamily="monospace">{n.id}</text>
        </g>
      ))}
      {/* BFS order label */}
      {nodes.map((n,i) => (
        <text key={i} x={n.x} y={n.y-R-5} textAnchor="middle" fontSize={8} fill={lc[n.lvl]}>
          L{n.lvl}
        </text>
      ))}
      {/* legend */}
      {['Start (L0)','L1','L2','L3'].map((l,i) => (
        <g key={i}>
          <circle cx={16+i*90} cy={168} r={5} fill={`${lc[i]}28`} stroke={lc[i]} strokeWidth={1.5} />
          <text x={26+i*90} y={172} fontSize={9} fill={lc[i]}>{l}</text>
        </g>
      ))}
    </svg>
  )
}

const DS_DIAGRAM: Record<string, React.FC> = {
  'linked-list': LinkedListDiagram,
  'stack':       StackDiagram,
  'queue':       QueueDiagram,
  'bst':         BSTDiagram,
  'hash-table':  HashTableDiagram,
  'min-heap':    MinHeapDiagram,
  'graph-bfs':   GraphDiagram,
}

// ─── Main View ────────────────────────────────────────────────────────────────

const DS_PROBLEMS: Record<string, { no: number; title: string; diff: 'Easy'|'Medium'|'Hard'; key: string }[]> = {
  linkedlist: [
    { no: 206,  title: 'Reverse Linked List',              diff: 'Easy',   key: '迭代/递归翻转，必背模板' },
    { no: 21,   title: 'Merge Two Sorted Lists',           diff: 'Easy',   key: '虚拟头节点，双指针合并' },
    { no: 141,  title: 'Linked List Cycle',                diff: 'Easy',   key: '快慢指针判环（Floyd）' },
    { no: 142,  title: 'Linked List Cycle II',             diff: 'Medium', key: '找环入口：相遇后一指针回头' },
    { no: 19,   title: 'Remove Nth Node From End',         diff: 'Medium', key: '快慢指针，间距 N' },
    { no: 23,   title: 'Merge K Sorted Lists',             diff: 'Hard',   key: '优先队列，O(n log k)' },
    { no: 25,   title: 'Reverse Nodes in k-Group',         diff: 'Hard',   key: '分组翻转，递归或迭代' },
  ],
  stack: [
    { no: 20,   title: 'Valid Parentheses',                diff: 'Easy',   key: '栈匹配括号，经典模板' },
    { no: 155,  title: 'Min Stack',                        diff: 'Medium', key: '辅助栈同步存最小值' },
    { no: 739,  title: 'Daily Temperatures',               diff: 'Medium', key: '单调栈：下一个更大元素' },
    { no: 84,   title: 'Largest Rectangle in Histogram',  diff: 'Hard',   key: '单调栈求面积，必考压轴题' },
    { no: 85,   title: 'Maximal Rectangle',                diff: 'Hard',   key: '逐行转换为柱状图 + 84' },
    { no: 394,  title: 'Decode String',                    diff: 'Medium', key: '双栈：数字栈 + 字符串栈' },
  ],
  queue: [
    { no: 102,  title: 'Binary Tree Level Order Traversal',diff: 'Medium', key: 'BFS 队列模板，必背' },
    { no: 239,  title: 'Sliding Window Maximum',           diff: 'Hard',   key: '单调递减双端队列，O(n)' },
    { no: 622,  title: 'Design Circular Queue',            diff: 'Medium', key: '循环队列实现，front/rear 指针' },
    { no: 933,  title: 'Number of Recent Calls',           diff: 'Easy',   key: '队列维护时间窗口' },
  ],
  bst: [
    { no: 98,   title: 'Validate Binary Search Tree',      diff: 'Medium', key: '中序遍历有序 / 上下界递归' },
    { no: 230,  title: 'Kth Smallest in BST',              diff: 'Medium', key: '中序第 K 个' },
    { no: 235,  title: 'LCA of BST',                       diff: 'Medium', key: '利用 BST 有序性找公共祖先' },
    { no: 450,  title: 'Delete Node in BST',               diff: 'Medium', key: '删除三种情况：叶/单子/双子' },
    { no: 108,  title: 'Sorted Array to BST',              diff: 'Easy',   key: '取中点为根，递归建树' },
  ],
  hashtable: [
    { no: 1,    title: 'Two Sum',                          diff: 'Easy',   key: '哈希表O(n)，面试开场白' },
    { no: 49,   title: 'Group Anagrams',                   diff: 'Medium', key: '排序/计数作 key' },
    { no: 128,  title: 'Longest Consecutive Sequence',     diff: 'Medium', key: '哈希 O(n) 判断连续段' },
    { no: 146,  title: 'LRU Cache',                        diff: 'Medium', key: '哈希表 + 双向链表，必考！' },
    { no: 460,  title: 'LFU Cache',                        diff: 'Hard',   key: '哈希表 + 频率双链表' },
    { no: 380,  title: 'RandomizedSet O(1) Insert/Delete', diff: 'Medium', key: '哈希表 + 数组实现 O(1)' },
  ],
  heap: [
    { no: 215,  title: 'Kth Largest Element',              diff: 'Medium', key: '最小堆大小 K，O(n log k)' },
    { no: 347,  title: 'Top K Frequent Elements',          diff: 'Medium', key: '频率统计 + 堆' },
    { no: 295,  title: 'Find Median from Data Stream',     diff: 'Hard',   key: '大根堆+小根堆，必考！' },
    { no: 23,   title: 'Merge K Sorted Lists',             diff: 'Hard',   key: '优先队列合并' },
    { no: 1046, title: 'Last Stone Weight',                diff: 'Easy',   key: '最大堆模拟' },
    { no: 355,  title: 'Design Twitter',                   diff: 'Medium', key: '堆合并 K 个有序 Feed' },
  ],
  graph: [
    { no: 200,  title: 'Number of Islands',                diff: 'Medium', key: 'DFS/BFS 连通分量，必考' },
    { no: 207,  title: 'Course Schedule',                  diff: 'Medium', key: '拓扑排序判环（入度法）' },
    { no: 210,  title: 'Course Schedule II',               diff: 'Medium', key: '拓扑排序返回顺序' },
    { no: 743,  title: 'Network Delay Time',               diff: 'Medium', key: 'Dijkstra 单源最短路' },
    { no: 684,  title: 'Redundant Connection',             diff: 'Medium', key: '并查集检测环' },
    { no: 127,  title: 'Word Ladder',                      diff: 'Hard',   key: 'BFS 最短路 + 字符替换' },
  ],
  avl: [
    { no: 1382, title: 'Balance a Binary Search Tree',     diff: 'Medium', key: '中序 + 有序数组建平衡 BST' },
    { no: 110,  title: 'Balanced Binary Tree',             diff: 'Easy',   key: '递归判高度差 ≤ 1' },
    { no: 108,  title: 'Convert Sorted Array to BST',      diff: 'Easy',   key: '二分取中点建平衡树' },
  ],
  trie: [
    { no: 208,  title: 'Implement Trie',                   diff: 'Medium', key: 'Trie 节点数组/哈希，插入/查找' },
    { no: 212,  title: 'Word Search II',                   diff: 'Hard',   key: 'Trie + DFS 回溯，剪枝' },
    { no: 211,  title: 'Design Add and Search Words',      diff: 'Medium', key: 'Trie + . 通配符 DFS' },
    { no: 648,  title: 'Replace Words',                    diff: 'Medium', key: 'Trie 最短前缀替换' },
    { no: 421,  title: 'Maximum XOR of Two Numbers',       diff: 'Medium', key: '二进制 Trie 贪心 XOR' },
  ],
  skiplist: [
    { no: 1206, title: 'Design Skiplist',                  diff: 'Hard',   key: '实现跳表 insert/erase/search' },
    { no: 1348, title: 'Tweet Counts Per Frequency',       diff: 'Medium', key: '有序结构范围查询' },
  ],
  bloomfilter: [
    { no: 0,    title: '设计题：URL 黑名单过滤',           diff: 'Hard',   key: '布隆过滤器：误判率 vs 空间权衡' },
    { no: 0,    title: '设计题：缓存穿透防护',             diff: 'Medium', key: '不存在 key 用 BF 拦截，避免打穿 DB' },
  ],
}

const DIFF_COLOR_DS = { Easy: '#56d364', Medium: '#ffa657', Hard: '#ff7b72' }

export default function DataStructuresView() {
  const [selectedDs, setSelectedDs] = useState(DS_LIST[0].id)
  const [selectedLang, setSelectedLang] = useState<DSLangId>('c')
  const [rightTab, setRightTab] = useState<'code'|'problems'>('code')
  const isMobile = useMobile()

  const ds = DS_LIST.find(d => d.id === selectedDs) ?? DS_LIST[0]
  const Diagram = DS_DIAGRAM[ds.id]

  const langColor: Record<DSLangId, string> = {
    c: '#555599', cpp: '#f34b7d', java: '#b07219',
    rust: '#dea584', go: '#00add8', javascript: '#f1e05a', python: '#3572A5',
  }

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100%', gap: 0 }}>
      {/* ── Left sidebar: DS list ────────────────────────────────────────── */}
      <div style={{
        width: isMobile ? '100%' : 200, flexShrink: 0,
        borderRight: isMobile ? 'none' : '1px solid var(--border)',
        borderBottom: isMobile ? '1px solid var(--border)' : 'none',
        background: 'var(--bg-secondary)',
        overflowX: isMobile ? 'auto' : undefined,
        overflowY: isMobile ? 'hidden' : 'auto',
        padding: isMobile ? '4px 0' : '8px 0',
        maxHeight: isMobile ? 56 : undefined,
        display: isMobile ? 'flex' : 'block',
        scrollbarWidth: 'none',
      }}>
        {DS_LIST.map(d => (
          <button
            key={d.id}
            onClick={() => setSelectedDs(d.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 10,
              flexShrink: 0,
              width: isMobile ? 'auto' : '100%',
              padding: isMobile ? '6px 10px' : '10px 16px',
              background: selectedDs === d.id ? 'var(--bg-elevated)' : 'transparent',
              border: 'none',
              borderLeft: isMobile ? 'none' : (selectedDs === d.id ? '3px solid var(--accent-blue)' : '3px solid transparent'),
              borderBottom: isMobile ? (selectedDs === d.id ? '2px solid var(--accent-blue)' : '2px solid transparent') : 'none',
              color: selectedDs === d.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer', textAlign: 'left', fontSize: isMobile ? 11 : 13, fontWeight: selectedDs === d.id ? 600 : 400,
              transition: 'background 0.12s', whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: isMobile ? 14 : 18, lineHeight: 1 }}>{d.icon}</span>
            {!isMobile && <span>{d.name}</span>}
          </button>
        ))}
      </div>

      {/* ── Right panel ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <span style={{ fontSize: 28 }}>{ds.icon}</span>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{ds.name}</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '4px 0 8px' }}>{ds.description}</p>
          <div style={{ display: 'flex', gap: 16 }}>
            <span style={{
              background: 'var(--bg-elevated)', borderRadius: 6, padding: '3px 10px',
              fontSize: 12, color: 'var(--accent-blue)', fontFamily: 'monospace',
            }}>⏱ {ds.complexity.time}</span>
            <span style={{
              background: 'var(--bg-elevated)', borderRadius: 6, padding: '3px 10px',
              fontSize: 12, color: 'var(--accent-purple)', fontFamily: 'monospace',
            }}>💾 {ds.complexity.space}</span>
          </div>
        </div>

        {/* ── Visual Diagram ────────────────────────────────────────────── */}
        {Diagram && (
          <div style={{
            padding: '16px 24px', borderBottom: '1px solid var(--border)',
            background: 'var(--bg-primary)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            flexShrink: 0, overflowX: 'auto',
          }}>
            <Diagram />
          </div>
        )}

        {/* View toggle: Code vs Interview problems */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
          {(['code','problems'] as const).map(tab => (
            <button key={tab} onClick={() => setRightTab(tab)} style={{
              padding: '8px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
              borderBottom: rightTab === tab ? '2px solid var(--accent-blue)' : '2px solid transparent',
              color: rightTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: 12, fontWeight: rightTab === tab ? 700 : 400,
            }}>
              {tab === 'code' ? '💻 多语言实现' : '📝 面试题'}
            </button>
          ))}
          {rightTab === 'problems' && DS_PROBLEMS[selectedDs] && (
            <span style={{ marginLeft: 'auto', padding: '8px 14px', fontSize: 11, color: 'var(--text-muted)' }}>
              {DS_PROBLEMS[selectedDs].length} 题
            </span>
          )}
        </div>

        {rightTab === 'problems' ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
            {(DS_PROBLEMS[selectedDs] ?? []).map(p => (
              <div key={`${p.no}-${p.title}`} style={{
                background: 'var(--bg-secondary)', borderRadius: 7, padding: '10px 12px',
                border: '1px solid var(--border)', marginBottom: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  {p.no > 0 && <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 34 }}>#{p.no}</span>}
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{p.title}</span>
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 700,
                    background: `${DIFF_COLOR_DS[p.diff]}20`, color: DIFF_COLOR_DS[p.diff],
                  }}>{p.diff}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: p.no > 0 ? 40 : 0 }}>💡 {p.key}</div>
              </div>
            ))}
            {!(DS_PROBLEMS[selectedDs]?.length) && (
              <div style={{ color: 'var(--text-muted)', fontSize: 12, paddingTop: 20 }}>题目补充中…</div>
            )}
            {/* Complexity reminder */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 7, padding: '12px 14px', border: '1px solid var(--border)', marginTop: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>🎯 复杂度速记</div>
              <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                <span>时间 <code style={{ color: '#ffa657' }}>{ds.complexity.time}</code></span>
                <span>空间 <code style={{ color: '#79c0ff' }}>{ds.complexity.space}</code></span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>{ds.description}</div>
            </div>
          </div>
        ) : null}

        {rightTab === 'code' && <>
        {/* Language tabs */}
        <div style={{
          display: 'flex', gap: 0, borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)', overflowX: 'auto',
          flexShrink: 0,
        }}>
          {DS_LANGS.map(lang => (
            <button
              key={lang}
              onClick={() => setSelectedLang(lang)}
              style={{
                padding: '10px 18px', border: 'none', background: 'transparent',
                borderBottom: selectedLang === lang ? `2px solid ${langColor[lang]}` : '2px solid transparent',
                color: selectedLang === lang ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer', fontSize: 13, fontWeight: selectedLang === lang ? 700 : 400,
                display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                transition: 'color 0.12s',
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: selectedLang === lang ? langColor[lang] : 'var(--border)',
                flexShrink: 0, transition: 'background 0.12s',
              }} />
              {DS_LANG_LABELS[lang]}
            </button>
          ))}
        </div>

        {/* Code panel */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <CodeBlock code={ds.langs[selectedLang]?.code ?? '// not available'} lang={selectedLang} />
        </div>
        </>}
      </div>
    </div>
  )
}
