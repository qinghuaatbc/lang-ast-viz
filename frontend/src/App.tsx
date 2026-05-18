import { useState, useCallback, useEffect, useReducer, useRef } from 'react'
import { compileSource, CompileResult, LangInfo, fetchLanguages } from './api/compile'
import { LangProvider, useLang } from './i18n/lang'
import { ThemeProvider, useTheme } from './theme/theme'
import { examplesByLang } from './examples'
import CodeEditor from './components/CodeEditor'
import ErrorBoundary from './components/ErrorBoundary'
import ASTViewer from './components/ASTViewer'
import IRViewer from './components/IRViewer'
import ASMViewer from './components/ASMViewer'
import BytecodeViewer from './components/BytecodeViewer'
import DataStructuresView from './components/DataStructuresView'
import LinuxView from './components/LinuxView'
import TLPIView from './components/TLPIView'
import AlgoView from './components/AlgoView'
import MemoryView from './components/MemoryView'
import RegexView from './components/RegexView'
import IEEE754View from './components/IEEE754View'
import NetworkView from './components/NetworkView'
import CPUView from './components/CPUView'
import X86View from './components/X86View'

type TopMode = 'ast' | 'ds' | 'linux' | 'tlpi' | 'algo' | 'memory' | 'regex' | 'ieee754' | 'network' | 'cpu' | 'x86'

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
  const [topMode, setTopMode] = useState<TopMode>(() => (localStorage.getItem('lav-top-mode') as TopMode) || 'ast')
  const switchTop = (m: TopMode) => { setTopMode(m); localStorage.setItem('lav-top-mode', m) }
  const [code, setCode] = useState(() => {
    const savedLang = localStorage.getItem('lav-lang') || 'rust'
    const ex = examplesByLang[savedLang]
    return ex && ex.length > 0 ? ex[0].code : examplesByLang.rust[0].code
  })
  const [state, dispatch] = useReducer(compileReducer, { result: null, loading: false, error: '', errorLines: new Set<number>() })
  const [activeTab, setActiveTab] = useState<'ast' | 'ir' | 'asm' | 'bytecode'>('ast')
  const [language, setLanguage] = useState(() => localStorage.getItem('lav-lang') || 'rust')
  const [showHelp, setShowHelp] = useState(false)
  const [optMode, setOptMode] = useState(false)
  const [languages, setLanguages] = useState<LangInfo[]>([])
  const [autoRun, setAutoRun] = useState(false)

  useEffect(() => {
    fetchLanguages().then(setLanguages).catch(() => {})
  }, [])

  // Auto-run: debounced compile on code change
  const autoRunTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!autoRun || !code.trim()) return
    if (autoRunTimerRef.current) clearTimeout(autoRunTimerRef.current)
    autoRunTimerRef.current = setTimeout(() => handleCompile(), 400)
    return () => { if (autoRunTimerRef.current) clearTimeout(autoRunTimerRef.current) }
  }, [code, autoRun, language]) // eslint-disable-line

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
    if (!autoRun) {
      setTimeout(() => {
        const btn = document.querySelector('.btn-compile') as HTMLButtonElement
        if (btn && !btn.disabled) btn.click()
      }, 50)
    }
  }, [autoRun])

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

  useEffect(() => {
    if (!showHelp) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowHelp(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showHelp])

  const topTabs: { id: TopMode; label: string; icon: string }[] = [
    { id: 'ast',     label: 'AST 编译器',   icon: '🔬' },
    { id: 'ds',      label: '数据结构',      icon: '🗂' },
    { id: 'linux',   label: 'Linux OS',     icon: '🐧' },
    { id: 'tlpi',    label: 'TLPI',         icon: '📖' },
    { id: 'algo',    label: '排序算法',      icon: '📊' },
    { id: 'memory',  label: '内存布局',      icon: '🧠' },
    { id: 'regex',   label: '正则表达式',    icon: '🔍' },
    { id: 'ieee754', label: 'IEEE 754',     icon: '🔢' },
    { id: 'network', label: '网络协议栈',    icon: '🌐' },
    { id: 'cpu',     label: 'CPU 流水线',   icon: '⚡' },
    { id: 'x86',     label: 'x86 汇编',    icon: '🖥' },
  ]

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div>
              <h1 style={{ margin: 0 }}>{t('app.title')}</h1>
              <p className="subtitle" style={{ margin: 0 }}>{t('app.subtitle')}</p>
            </div>
            {/* Top-level mode switcher */}
            <div style={{ display: 'flex', gap: 4, background: 'var(--bg-secondary, rgba(255,255,255,0.06))', borderRadius: 10, padding: 4, overflowX: 'auto', maxWidth: 'calc(100vw - 340px)', flexShrink: 1 }}>
              {topTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => switchTop(tab.id)}
                  style={{
                    padding: '6px 10px', border: 'none', borderRadius: 7, cursor: 'pointer', flexShrink: 0,
                    background: topMode === tab.id ? 'var(--accent, #3fb950)' : 'transparent',
                    color: topMode === tab.id ? '#fff' : 'var(--text-muted, #888)',
                    fontWeight: topMode === tab.id ? 700 : 400,
                    fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
                    transition: 'all 0.15s',
                  }}
                >
                  <span>{tab.icon}</span>{tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="header-controls">
            {topMode === 'ast' && (
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
            )}
            <div className="toggle-group">
              {topMode === 'ast' && (
                <button className={`toggle-btn${autoRun ? ' active' : ''}`} onClick={() => setAutoRun(o => !o)}
                  title={autoRun ? 'Auto-run: ON' : 'Auto-run: OFF'} style={autoRun ? { color: '#3fb950' } : {}}>
                  ▶{autoRun ? ' ON' : ''}
                </button>
              )}
              <button className="toggle-btn" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} title="中文/English">
                {lang === 'zh' ? 'EN' : '中'}
              </button>
              <button className="toggle-btn theme-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Light' : 'Dark'}>
                {theme === 'dark' ? '☀' : '☾'}
              </button>
              {topMode === 'ast' && (
                <button className="toggle-btn" onClick={() => setShowHelp(s => !s)} title="Shortcuts">?</button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Data Structures view ──────────────────────────────────────────────── */}
      {topMode === 'ds' && (
        <div style={{ height: 'calc(100vh - var(--header-h, 72px))', overflow: 'hidden' }}>
          <DataStructuresView />
        </div>
      )}

      {/* ── Linux OS view ─────────────────────────────────────────────────────── */}
      {topMode === 'linux' && (
        <div style={{ height: 'calc(100vh - var(--header-h, 72px))', overflow: 'hidden' }}>
          <LinuxView />
        </div>
      )}

      {/* ── TLPI book view ────────────────────────────────────────────────────── */}
      {topMode === 'tlpi' && (
        <div style={{ height: 'calc(100vh - var(--header-h, 72px))', overflow: 'hidden' }}>
          <TLPIView />
        </div>
      )}

      {/* ── Algorithm Visualizer ──────────────────────────────────────────────── */}
      {topMode === 'algo' && (
        <div style={{ height: 'calc(100vh - var(--header-h, 72px))', overflow: 'hidden' }}>
          <AlgoView />
        </div>
      )}

      {/* ── Memory Layout ─────────────────────────────────────────────────────── */}
      {topMode === 'memory' && (
        <div style={{ height: 'calc(100vh - var(--header-h, 72px))', overflow: 'hidden' }}>
          <MemoryView />
        </div>
      )}

      {/* ── Regex NFA ─────────────────────────────────────────────────────────── */}
      {topMode === 'regex' && (
        <div style={{ height: 'calc(100vh - var(--header-h, 72px))', overflow: 'hidden' }}>
          <RegexView />
        </div>
      )}

      {/* ── IEEE 754 ──────────────────────────────────────────────────────────── */}
      {topMode === 'ieee754' && (
        <div style={{ height: 'calc(100vh - var(--header-h, 72px))', overflow: 'hidden' }}>
          <IEEE754View />
        </div>
      )}

      {/* ── Network Protocol Stack ────────────────────────────────────────────── */}
      {topMode === 'network' && (
        <div style={{ height: 'calc(100vh - var(--header-h, 72px))', overflow: 'hidden' }}>
          <NetworkView />
        </div>
      )}

      {/* ── CPU Pipeline ──────────────────────────────────────────────────────── */}
      {topMode === 'cpu' && (
        <div style={{ height: 'calc(100vh - var(--header-h, 72px))', overflow: 'hidden' }}>
          <CPUView />
        </div>
      )}

      {/* ── x86 Assembly ──────────────────────────────────────────────────────── */}
      {topMode === 'x86' && (
        <div style={{ height: 'calc(100vh - var(--header-h, 72px))', overflow: 'hidden' }}>
          <X86View />
        </div>
      )}

      {/* ── AST Compiler view ─────────────────────────────────────────────────── */}
      {topMode === 'ast' && (
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
              {state.result?.optIR && (
                <button className={`tab opt-tab ${optMode ? 'active' : ''}`} onClick={() => setOptMode(o => !o)} style={{ color: optMode ? '#3fb950' : undefined }}>
                  {optMode ? '✓ Optimized' : '⚙ Original'}
                </button>
              )}
            </div>

            {state.loading && (
              <div className="viewer-empty" style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)' }}>
                {t('compiling')}
              </div>
            )}
            <div className="tab-content">
              <ErrorBoundary>{activeTab === 'ast' && <ASTViewer ast={state.result?.ast || null} />}</ErrorBoundary>
              <ErrorBoundary>{activeTab === 'ir' && <IRViewer ir={optMode ? state.result?.optIR || null : state.result?.ir || null} />}</ErrorBoundary>
              <ErrorBoundary>{activeTab === 'asm' && <ASMViewer assembly={optMode ? state.result?.optAssembly || null : state.result?.assembly || null} />}</ErrorBoundary>
              <ErrorBoundary>{activeTab === 'bytecode' && <BytecodeViewer bytecode={optMode ? state.result?.optBytecode || null : state.result?.bytecode || null} />}</ErrorBoundary>
            </div>
          </div>
        </div>
      )}

      {showHelp && topMode === 'ast' && (
        <div className="help-overlay" onClick={() => setShowHelp(false)}>
          <div className="help-panel" onClick={e => e.stopPropagation()}>
            <h3>Keyboard Shortcuts</h3>
            <table className="help-table">
              <tbody>
                <tr><td className="help-key"><kbd>Ctrl</kbd> + <kbd>Enter</kbd></td><td>Compile code</td></tr>
                <tr><td className="help-key"><kbd>Ctrl</kbd> + <kbd>Z</kbd></td><td>Undo</td></tr>
                <tr><td className="help-key"><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> / <kbd>Ctrl</kbd> + <kbd>Y</kbd></td><td>Redo</td></tr>
                <tr><td className="help-key"><kbd>Tab</kbd></td><td>Indent (2 spaces)</td></tr>
                <tr><td className="help-key"><kbd>↑</kbd><kbd>↓</kbd> or <kbd>←</kbd><kbd>→</kbd></td><td>Step through ASM (when focused)</td></tr>
                <tr><td className="help-key"><kbd>Space</kbd></td><td>Play/pause ASM stepping</td></tr>
                <tr><td className="help-key"><kbd>Esc</kbd></td><td>Close this popup</td></tr>
              </tbody>
            </table>
            <button className="btn-compile" style={{ marginTop: 12 }} onClick={() => setShowHelp(false)}>Close</button>
          </div>
        </div>
      )}
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
