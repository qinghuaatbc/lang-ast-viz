import { useState, useCallback, useEffect, useReducer } from 'react'
import { compileSource, CompileResult, LangInfo, fetchLanguages } from './api/compile'
import { LangProvider, useLang } from './i18n/lang'
import { ThemeProvider, useTheme } from './theme/theme'
import { examplesByLang } from './examples'
import CodeEditor from './components/CodeEditor'
import ASTViewer from './components/ASTViewer'
import IRViewer from './components/IRViewer'
import ASMViewer from './components/ASMViewer'
import BytecodeViewer from './components/BytecodeViewer'

function parseErrorLines(errors: string[]): Set<number> {
  const s = new Set<number>()
  for (const e of errors) {
    const m = e.match(/line\s+(\d+)/i)
    if (m) s.add(parseInt(m[1], 10))
  }
  return s
}

interface CompileState {
  result: CompileResult | null
  loading: boolean
  error: string
  errorLines: Set<number>
}

type CompileAction =
  | { type: 'START' }
  | { type: 'DONE'; result: CompileResult }
  | { type: 'ERROR'; error: string }
  | { type: 'ERRORS'; errors: string[] }
  | { type: 'CLEAR' }

function compileReducer(state: CompileState, action: CompileAction): CompileState {
  switch (action.type) {
    case 'START':
      return { ...state, loading: true, error: '' }
    case 'DONE':
      return { result: action.result, loading: false, error: '', errorLines: new Set<number>() }
    case 'ERROR':
      return { ...state, loading: false, error: action.error }
    case 'ERRORS':
      return { result: null, loading: false, error: action.errors.join('\n'), errorLines: parseErrorLines(action.errors) }
    case 'CLEAR':
      return { result: null, loading: false, error: '', errorLines: new Set<number>() }
  }
}

function AppInner() {
  const { t, lang, setLang } = useLang()
  const { theme, toggle: toggleTheme } = useTheme()
  const [code, setCode] = useState(() => {
    const savedLang = localStorage.getItem('lav-lang') || 'rust'
    const ex = examplesByLang[savedLang]
    return ex && ex.length > 0 ? ex[0].code : examplesByLang.rust[0].code
  })
  const [state, dispatch] = useReducer(compileReducer, { result: null, loading: false, error: '', errorLines: new Set<number>() })
  const [activeTab, setActiveTab] = useState<'ast' | 'ir' | 'asm' | 'bytecode'>('ast')
  const [language, setLanguage] = useState(() => localStorage.getItem('lav-lang') || 'rust')
  const [languages, setLanguages] = useState<LangInfo[]>([])

  useEffect(() => {
    fetchLanguages().then(setLanguages).catch(() => {})
  }, [])

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang)
    localStorage.setItem('lav-lang', lang)
    const ex = examplesByLang[lang]
    if (ex && ex.length > 0) { setCode(ex[0].code) }
    dispatch({ type: 'CLEAR' })
  }

  const handleExampleSelect = useCallback((code: string) => {
    setCode(code)
    dispatch({ type: 'CLEAR' })
    setTimeout(() => {
      const btn = document.querySelector('.btn-compile') as HTMLButtonElement
      if (btn && !btn.disabled) btn.click()
    }, 50)
  }, [])

  const handleCompile = useCallback(async () => {
    dispatch({ type: 'START' })
    try {
      const res = await compileSource(code, language)
      if (res.errors?.length > 0) {
        dispatch({ type: 'ERRORS', errors: res.errors })
      } else {
        dispatch({ type: 'DONE', result: res })
      }
    } catch (err: any) {
      dispatch({ type: 'ERROR', error: err.message || 'compile failed' })
    }
  }, [code, language])

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <div>
            <h1>{t('app.title')}</h1>
            <p className="subtitle">{t('app.subtitle')}</p>
          </div>
          <div className="header-controls">
            <div className="lang-selector">
              <label htmlFor="lang-select">{t('language')}:</label>
              <select
                id="lang-select"
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
              >
                {languages.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="toggle-group">
              <button className="toggle-btn" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} title="中文/English">
                {lang === 'zh' ? 'EN' : '中'}
              </button>
              <button className="toggle-btn theme-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Light' : 'Dark'}>
                {theme === 'dark' ? '☀' : '☾'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="main-layout">
        <div className="left-panel">
          <CodeEditor
            value={code}
            onChange={setCode}
            onCompile={handleCompile}
            onExampleSelect={handleExampleSelect}
            loading={state.loading}
            language={language}
            examples={examplesByLang[language] || examplesByLang.rust}
            errorLines={state.errorLines}
          />
        </div>

        <div className="right-panel">
          {state.error && <div className="error-bar">{state.error}</div>}

          {state.result && state.result.output && state.result.output.length > 0 && (
            <div className="output-bar">
              <div className="output-label"><strong>{t('output')} ({state.result.language})</strong></div>
              <div className="output-lines">
                {state.result.output.map((line, i) => (
                  <div key={i} className="output-line">{line}</div>
                ))}
              </div>
            </div>
          )}

          <div className="tab-bar">
            <button className={`tab ${activeTab === 'ast' ? 'active' : ''}`} onClick={() => setActiveTab('ast')}>{t('ast.tree')}</button>
            <button className={`tab ${activeTab === 'ir' ? 'active' : ''}`} onClick={() => setActiveTab('ir')}>{t('ir.code')}</button>
            <button className={`tab ${activeTab === 'asm' ? 'active' : ''}`} onClick={() => setActiveTab('asm')}>{t('x86.asm')}</button>
            <button className={`tab ${activeTab === 'bytecode' ? 'active' : ''}`} onClick={() => setActiveTab('bytecode')}>{t('bytecode')}</button>
          </div>

          {state.loading && (
            <div className="viewer-empty" style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)' }}>
              {t('compiling')}
            </div>
          )}
          <div className="tab-content">
            {activeTab === 'ast' && <ASTViewer ast={state.result?.ast || null} />}
            {activeTab === 'ir' && <IRViewer ir={state.result?.ir || null} />}
            {activeTab === 'asm' && <ASMViewer assembly={state.result?.assembly || null} />}
            {activeTab === 'bytecode' && <BytecodeViewer bytecode={state.result?.bytecode || null} />}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <AppInner />
      </LangProvider>
    </ThemeProvider>
  )
}
