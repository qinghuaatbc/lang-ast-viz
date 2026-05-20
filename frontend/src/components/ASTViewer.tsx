import { useState } from 'react'
import { GenASTNode } from '../api/compile'
import { useLang } from '../i18n/lang'

const TYPE_COLOR: Record<string, string> = {
  File: '#58a6ff', FuncDecl: '#d2a8ff', TypeSpec: '#ffa657',
  Struct: '#ffa657', Interface: '#56d364', Method: '#56d364',
  Field: '#8b949e', Embed: '#ff7b72', Param: '#79c0ff',
  Return: '#f85149', Block: '#484f58', If: '#ffa657', For: '#ffa657',
  Range: '#ffa657', Call: '#79c0ff', Selector: '#79c0ff',
  Assign: '#58a6ff', BinaryExpr: '#ffa657', Ident: '#56d364',
  INT: '#79c0ff', FLOAT: '#79c0ff', STRING: '#a5d6ff', CHAR: '#a5d6ff',
  Import: '#8b949e', Var: '#58a6ff', CompositeLit: '#d2a8ff',
}

function nodeColor(type: string): string {
  return TYPE_COLOR[type] ?? 'var(--text-secondary)'
}

interface NodeProps {
  node: GenASTNode
  depth: number
  maxDepth: number
}

function ASTNodeRow({ node, depth, maxDepth }: NodeProps) {
  const [open, setOpen] = useState(depth < 2)
  const hasChildren = node.children && node.children.length > 0
  const indent = depth * 16

  return (
    <div>
      <div
        onClick={() => hasChildren && setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          paddingLeft: indent, paddingTop: 2, paddingBottom: 2,
          cursor: hasChildren ? 'pointer' : 'default',
          borderRadius: 3,
          userSelect: 'none',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <span style={{ width: 10, fontSize: 9, color: 'var(--text-muted)', flexShrink: 0 }}>
          {hasChildren ? (open ? '▾' : '▸') : ''}
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: nodeColor(node.type), fontFamily: 'monospace' }}>
          {node.type}
        </span>
        {node.value && (
          <span style={{ fontSize: 10.5, color: 'var(--text-primary)', fontFamily: 'monospace', opacity: 0.85 }}>
            {node.value}
          </span>
        )}
        {node.line ? (
          <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 'auto', paddingRight: 4 }}>
            :{node.line}
          </span>
        ) : null}
      </div>
      {open && hasChildren && depth < maxDepth && (
        <div style={{ borderLeft: `1px solid var(--border)`, marginLeft: indent + 14 }}>
          {node.children!.map((child, i) => (
            <ASTNodeRow key={i} node={child} depth={depth + 1} maxDepth={maxDepth} />
          ))}
        </div>
      )}
    </div>
  )
}

interface ASTViewerProps {
  ast?: GenASTNode
  lang?: string
}

export default function ASTViewer({ ast, lang }: ASTViewerProps) {
  const { lang: uiLang } = useLang()
  const isZh = uiLang === 'zh'
  const [maxDepth, setMaxDepth] = useState(8)

  if (!ast) {
    return (
      <div className="viewer-empty">
        {isZh ? '粘贴代码后点击「解析」查看 AST' : 'Paste code and click Parse to see AST'}
      </div>
    )
  }

  return (
    <div className="viewer" style={{ overflow: 'auto', padding: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          {lang && <span style={{ color: '#56d364', fontFamily: 'monospace', marginRight: 6 }}>{lang}</span>}
          {isZh ? 'AST 树' : 'AST Tree'}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{isZh ? '深度' : 'depth'}</span>
          {[3, 5, 8, 12].map(d => (
            <button key={d} onClick={() => setMaxDepth(d)}
              style={{ padding: '1px 6px', borderRadius: 3, border: '1px solid var(--border)', fontSize: 9,
                background: maxDepth === d ? 'var(--bg-elevated)' : 'transparent',
                color: maxDepth === d ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer' }}>
              {d}
            </button>
          ))}
        </div>
      </div>
      <ASTNodeRow node={ast} depth={0} maxDepth={maxDepth} />
    </div>
  )
}
