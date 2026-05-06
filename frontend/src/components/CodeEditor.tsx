import { useState, useRef, useCallback } from 'react'
import { Example } from '../api/compile'
import { useLang } from '../i18n/lang'
import { highlight } from '../utils/highlight'

interface CodeEditorProps {
  value: string
  onChange: (val: string) => void
  onCompile: () => void
  loading: boolean
  language: string
  examples: Example[]
  errorLines?: Set<number>
}

export default function CodeEditor({ value, onChange, onCompile, loading, language, examples, errorLines }: CodeEditorProps) {
  const { t } = useLang()
  const [showExamples, setShowExamples] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)

  const syncScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    if (preRef.current) {
      preRef.current.scrollTop = e.currentTarget.scrollTop
      preRef.current.scrollLeft = e.currentTarget.scrollLeft
    }
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      onCompile()
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
  }, [value, onChange, onCompile])

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
            {loading ? t('compiling') : t('compile')}
          </button>
        </div>
      </div>
      {showExamples && (
        <div className="examples-dropdown">
          {examples.map((ex, i) => (
            <div
              key={i}
              className="example-item"
              onClick={() => { onChange(ex.code); setShowExamples(false) }}
            >
              <span className="example-name">{ex.name}</span>
            </div>
          ))}
        </div>
      )}
      <div className="editor-wrapper">
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
      <div className="editor-footer">
        <span className="shortcut-hint">{t('ctrl.enter')} &nbsp;·&nbsp; Tab: indent</span>
      </div>
    </div>
  )
}
