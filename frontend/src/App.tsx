import { useState, useCallback, useEffect } from 'react'
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

function AppInner() {
  const { t, lang, setLang } = useLang()
  const { theme, toggle: toggleTheme } = useTheme()
  const [code, setCode] = useState(examplesByLang.rust[0].code)
  const [result, setResult] = useState<CompileResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'ast' | 'ir' | 'asm' | 'bytecode'>('ast')
  const [language, setLanguage] = useState('rust')
  const [languages, setLanguages] = useState<LangInfo[]>([])
  const [errorLines, setErrorLines] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetchLanguages().then(setLanguages).catch(() => {})
  }, [])

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang)
    const ex = examplesByLang[lang]
    if (ex && ex.length > 0) {
      setCode(ex[0].code)
    }
    setResult(null)
    setError('')
  }

  const handleCompile = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await compileSource(code, language)
      setResult(res)
      if (res.errors?.length > 0) {
        setError(res.errors.join('\n'))
        setErrorLines(parseErrorLines(res.errors))
      } else {
        setErrorLines(new Set())
      }
    } catch (err: any) {
      setError(err.message || 'compile failed')
    } finally {
      setLoading(false)
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
            loading={loading}
            language={language}
            examples={examplesByLang[language] || examplesByLang.rust}
            errorLines={errorLines}
          />
        </div>

        <div className="right-panel">
          {error && <div className="error-bar">{error}</div>}

          {result && result.output && result.output.length > 0 && (
            <div className="output-bar">
              <div className="output-label"><strong>{t('output')} ({result.language})</strong></div>
              <div className="output-lines">
                {result.output.map((line, i) => (
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

          <div className="tab-content">
            {activeTab === 'ast' && <ASTViewer ast={result?.ast || null} />}
            {activeTab === 'ir' && <IRViewer ir={result?.ir || null} />}
            {activeTab === 'asm' && <ASMViewer assembly={result?.assembly || null} />}
            {activeTab === 'bytecode' && <BytecodeViewer bytecode={result?.bytecode || null} />}
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
