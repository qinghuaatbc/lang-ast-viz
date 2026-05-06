import { useMemo, useState, useCallback, useRef } from 'react'
import { ASTNode, astTypeName } from '../api/compile'
import { useLang } from '../i18n/lang'

const NODE_W = 130
const NODE_H = 34
const H_GAP = 12
const V_GAP = 40

const NODE_COLORS: Record<number, string> = {
  0: '#58a6ff',  // Program
  1: '#d2a8ff',  // LetStatement
  2: '#58a6ff',  // AssignStatement
  3: '#3fb950',  // PrintStatement
  4: '#ffa657',  // IfStatement
  5: '#f85149',  // WhileStatement
  6: '#58a6ff',  // BlockStatement
  7: '#ffa657',  // BinaryExpression
  8: '#58a6ff',  // NumberLiteral
  9: '#58a6ff',  // StringLiteral
  10: '#ffa657', // BoolLiteral
  11: '#3fb950', // Identifier
  12: '#58a6ff', // FieldAccess
  13: '#d2a8ff', // ObjectLiteral
  14: '#ffa657', // ClassDecl
  15: '#58a6ff', // CallExpr
  16: '#3fb950', // Self
  17: '#ffa657', // NewExpr
  18: '#d2a8ff', // FuncDecl
  19: '#f85149', // ReturnStmt
  20: '#58a6ff', // MethodCall
  21: '#58a6ff', // ArrayList
  22: '#58a6ff', // ArrayAccess
  23: '#f85149', // BreakStmt
  24: '#f85149', // ContinueStmt
}

// result of subtree layout
interface SubTree {
  w: number              // total width
  cx: number             // center x of this subtree (relative)
  nodes: { n: ASTNode; x: number; y: number }[]
}

function layout(node: ASTNode): SubTree {
  if (!node.children || node.children.length === 0) {
    return { w: NODE_W, cx: NODE_W / 2, nodes: [{ n: node, x: 0, y: 0 }] }
  }

  const kids = node.children.map(c => layout(c))
  const totalW = kids.reduce((s, k) => s + k.w, 0) + (kids.length - 1) * H_GAP
  const w = Math.max(NODE_W, totalW)
  const cx = w / 2

  let offset = (w - totalW) / 2
  const all: { n: ASTNode; x: number; y: number }[] = []
  for (const k of kids) {
    for (const n of k.nodes) {
      all.push({ n: n.n, x: offset + n.x, y: V_GAP + NODE_H + n.y })
    }
    offset += k.w + H_GAP
  }

  // parent at top center of its subtree
  const parentX = cx - NODE_W / 2
  all.push({ n: node, x: parentX, y: 0 })

  return { w, cx, nodes: all }
}

interface ASTTreeGraphProps {
  ast: ASTNode
  onSelect: (node: ASTNode) => void
  selectedKey: string | null
}

function nodeKey(n: ASTNode): string {
  return `${n.nodeType}-${n.value}-${n.line}-${n.col}`
}

function ASTTreeGraph({ ast, onSelect, selectedKey }: ASTTreeGraphProps) {
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale(s => Math.max(0.2, Math.min(3, s * delta)))
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as Element).tagName === 'rect' || (e.target as Element).tagName === 'svg') {
      dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
    }
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragRef.current) {
      setPan({
        x: dragRef.current.panX + (e.clientX - dragRef.current.startX),
        y: dragRef.current.panY + (e.clientY - dragRef.current.startY),
      })
    }
  }, [])

  const handleMouseUp = useCallback(() => { dragRef.current = null }, [])

  const data = useMemo(() => {
    const tree = layout(ast)
    const minX = Math.min(...tree.nodes.map(n => n.x))
    const maxX = Math.max(...tree.nodes.map(n => n.x + NODE_W))
    const maxY = Math.max(...tree.nodes.map(n => n.y + NODE_H))
    const pad = 20
    const offsetX = pad - minX

    const shifted = tree.nodes.map(n => ({ ...n, x: n.x + offsetX }))

    // Build child->parent edges
    const edgeSet: Set<string> = new Set()
    function walk(n: ASTNode, children: ASTNode[]) {
      for (const c of children) {
        edgeSet.add(`${n.nodeType}-${n.value}-${n.line}-${n.col}|${c.nodeType}-${c.value}-${c.line}-${c.col}`)
        walk(c, c.children || [])
      }
    }
    walk(ast, ast.children || [])

    const nodeMap = new Map<string, { n: ASTNode; x: number; y: number }>()
    for (const n of shifted) {
      const key = `${n.n.nodeType}-${n.n.value}-${n.n.line}-${n.n.col}`
      nodeMap.set(key, n)
    }

    const lines: { x1: number; y1: number; x2: number; y2: number }[] = []
    for (const key of edgeSet) {
      const [pk, ck] = key.split('|')
      const p = nodeMap.get(pk)
      const c = nodeMap.get(ck)
      if (p && c) {
        lines.push({
          x1: p.x + NODE_W / 2,
          y1: p.y + NODE_H,
          x2: c.x + NODE_W / 2,
          y2: c.y,
        })
      }
    }

    return { nodes: shifted, lines, width: maxX + pad - minX, height: maxY + pad }
  }, [ast])

  if (!ast) return null

  return (
    <svg ref={svgRef} width={data.width * scale} height={data.height * scale}
      className="ast-tree-svg"
      style={{ cursor: dragRef.current ? 'grabbing' : 'grab' }}
      onWheel={handleWheel} onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}>
      <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
      {data.lines.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#30363d" strokeWidth={1.5} />
      ))}
      {data.nodes.map((n, i) => {
        const key = nodeKey(n.n)
        const selected = key === selectedKey
        return (
          <g key={i} style={{ cursor: 'pointer' }} onClick={() => onSelect(n.n)}>
            <rect
              x={n.x}
              y={n.y}
              width={NODE_W}
              height={NODE_H}
              rx={6}
              ry={6}
              fill={selected ? '#1f3a5f' : '#161b22'}
              stroke={NODE_COLORS[n.n.nodeType] || '#30363d'}
              strokeWidth={selected ? 2.5 : 1.5}
            />
            <text
              x={n.x + NODE_W / 2}
              y={n.y + NODE_H / 2 - 4}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={11}
              fill="#e6edf3"
              fontFamily="'JetBrains Mono', monospace"
            >
              {astTypeName(n.n.nodeType)}
            </text>
            {n.n.value && (
              <text
                x={n.x + NODE_W / 2}
                y={n.y + NODE_H / 2 + 12}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={10}
                fill="#8b949e"
                fontFamily="'JetBrains Mono', monospace"
              >
                {n.n.value}
              </text>
            )}
          </g>
        )
      })}
      </g>
    </svg>
  )
}

interface ASTViewerProps {
  ast: ASTNode | null
}

export default function ASTViewer({ ast }: ASTViewerProps) {
  const { t } = useLang()
  const [selected, setSelected] = useState<ASTNode | null>(null)

  if (!ast) {
    return <div className="viewer-empty">{t('compile.first')}</div>
  }

  const selKey = selected ? nodeKey(selected) : null

  return (
    <div className="viewer ast-viewer" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {selected && (
        <div className="ast-detail-panel">
          <span className="ast-detail-close" onClick={() => setSelected(null)}>✕</span>
          <div className="ast-detail-row"><span className="ast-detail-key">Type</span><span className="ast-detail-val">{astTypeName(selected.nodeType)}</span></div>
          {selected.value && <div className="ast-detail-row"><span className="ast-detail-key">Value</span><span className="ast-detail-val">{selected.value}</span></div>}
          <div className="ast-detail-row"><span className="ast-detail-key">Line</span><span className="ast-detail-val">{selected.line ?? '—'}</span></div>
          <div className="ast-detail-row"><span className="ast-detail-key">Col</span><span className="ast-detail-val">{selected.col ?? '—'}</span></div>
          <div className="ast-detail-row"><span className="ast-detail-key">Children</span><span className="ast-detail-val">{selected.children?.length ?? 0}</span></div>
        </div>
      )}
      <div className="viewer-content" style={{ overflow: 'auto', flex: 1 }}>
        <ASTTreeGraph ast={ast} onSelect={setSelected} selectedKey={selKey} />
      </div>
    </div>
  )
}
