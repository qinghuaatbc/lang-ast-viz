import { useState, useRef, useCallback, useEffect } from 'react'
import { Example } from '../api/compile'
import { useLang } from '../i18n/lang'
import { highlight } from '../utils/highlight'

interface CodeEditorProps {
  value: string
  onChange: (val: string) => void
  onCompile: () => void
  onExampleSelect?: (code: string) => void
  loading: boolean
  language: string
  examples: Example[]
  errorLines?: Set<number>
}

const MAX_HISTORY = 100

export default function CodeEditor({ value, onChange, onCompile, onExampleSelect, loading, language, examples, errorLines }: CodeEditorProps) {
  const { t } = useLang()
  const [showExamples, setShowExamples] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)
  const gutterRef = useRef<HTMLPreElement>(null)
  const historyRef = useRef<string[]>([value])
  const histIdxRef = useRef(0)
  const ignoreNextRef = useRef(false)

  useEffect(() => {
    // Reset history when value changes externally (example select, language switch)
    if (historyRef.current[histIdxRef.current] !== value) {
      historyRef.current = [value]
      histIdxRef.current = 0
    }
  }, [language]) // eslint-disable-line

  useEffect(() => {
    const h = historyRef.current
    if (h[histIdxRef.current] !== value) {
      h.splice(histIdxRef.current + 1)
      h.push(value)
      if (h.length > MAX_HISTORY) h.shift()
      histIdxRef.current = h.length - 1
    }
  }, [value])

  const undo = useCallback(() => {
    if (histIdxRef.current > 0) {
      histIdxRef.current--
      ignoreNextRef.current = true
      onChange(historyRef.current[histIdxRef.current])
    }
  }, [onChange])

  const redo = useCallback(() => {
    if (histIdxRef.current < historyRef.current.length - 1) {
      histIdxRef.current++
      ignoreNextRef.current = true
      onChange(historyRef.current[histIdxRef.current])
    }
  }, [onChange])

  const syncScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    const st = e.currentTarget.scrollTop
    const sl = e.currentTarget.scrollLeft
    if (preRef.current) {
      preRef.current.scrollTop = st
      preRef.current.scrollLeft = sl
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = st
    }
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      onCompile()
      return
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault()
      if (e.shiftKey) redo(); else undo()
      return
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault()
      redo()
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = e.currentTarget
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const newVal = value.substring(0, start) + '  ' + value.substring(end)
      onChange(newVal)
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2
      })
    }
  }, [value, onChange, onCompile, undo, redo])

  const lineCount = value.split('\n').length
  const lineNums = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n')
  const highlighted = highlight(value, language, errorLines)

  return (
    <div className="editor-panel">
      <div className="editor-header">
        <h2>{t('source.code')}</h2>
        <div className="editor-actions">
          <button className="btn-examples" onClick={() => setShowExamples(!showExamples)}>
            {t('examples')} ▾
          </button>
          <button className="btn-compile" onClick={onCompile} disabled={loading || !value.trim()}>
            {loading ? t('compiling') : t('compile')} {navigator.platform.includes('Mac') ? '⌘⏎' : 'Ctrl+Enter'}
          </button>
        </div>
      </div>
      {showExamples && (
        <div className="examples-dropdown">
          {examples.map((ex, i) => (
            <div
              key={i}
              className="example-item"
              onClick={() => { onChange(ex.code); setShowExamples(false); if (onExampleSelect) onExampleSelect(ex.code) }}
            >
              <span className="example-name">{ex.name}</span>
            </div>
          ))}
        </div>
      )}
      <div className="editor-wrapper">
        <div className="editor-gutter">
          <pre ref={gutterRef} aria-hidden="true" className="editor-lines">{lineNums}</pre>
        </div>
        <div className="editor-code-area">
          <pre
            ref={preRef}
            className="editor-highlight"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: highlighted + '\n' }}
          />
          <textarea
            className="code-editor"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={syncScroll}
            placeholder={t('ctrl.enter')}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
        </div>
      </div>
      <div className="editor-footer">
        <span className="shortcut-hint">{t('ctrl.enter')} &nbsp;·&nbsp; Tab: indent &nbsp;·&nbsp; Ctrl+Z/Y: undo/redo</span>
      </div>
    </div>
  )
}
