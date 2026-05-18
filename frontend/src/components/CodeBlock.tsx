import { useState, useCallback } from 'react'

interface Props {
  code: string
  title?: string
  maxHeight?: number | string
}

export default function CodeBlock({ code, title, maxHeight = 400 }: Props) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      // Fallback for older browsers
      const ta = document.createElement('textarea')
      ta.value = code
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [code])

  return (
    <div style={{ position: 'relative' }}>
      {title && (
        <div style={{
          fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
          marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase',
        }}>
          {title}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <button
          onClick={copy}
          title={copied ? 'Copied!' : 'Copy'}
          style={{
            position: 'absolute', top: 8, right: 8, zIndex: 2,
            padding: '4px 10px', borderRadius: 5,
            border: '1px solid rgba(255,255,255,0.12)',
            background: copied ? 'rgba(63,185,80,0.15)' : 'rgba(255,255,255,0.07)',
            color: copied ? '#3fb950' : '#8b949e',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s',
            backdropFilter: 'blur(4px)',
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
        <pre style={{
          margin: 0, padding: '14px 16px', paddingRight: 72,
          background: '#0d1117', borderRadius: 8,
          border: '1px solid var(--border)',
          fontSize: 12, lineHeight: 1.7, color: '#e6edf3',
          overflowX: 'auto', overflowY: 'auto',
          whiteSpace: 'pre',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
          maxHeight,
        }}>
          {code.split('\n').map((line, i) => {
            const tr = line.trimStart()
            const isComment = tr.startsWith('#') || tr.startsWith('//') || tr.startsWith('--')
            const isShellPrompt = tr.startsWith('$') || tr.startsWith('>')
            return (
              <span key={i} style={{
                display: 'block',
                color: isComment ? '#8b949e' : isShellPrompt ? '#79c0ff' : '#e6edf3',
              }}>
                {line}
              </span>
            )
          })}
        </pre>
      </div>
    </div>
  )
}
