import { useState, useCallback, useEffect, useReducer, useRef, lazy, Suspense } from 'react'
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
import { searchEntries, TAB_LABELS, type TopMode as SearchTopMode } from './searchIndex'

const DataStructuresView = lazy(() => import('./components/DataStructuresView'))
const LinuxView          = lazy(() => import('./components/LinuxView'))
const TLPIView           = lazy(() => import('./components/TLPIView'))
const AlgoView           = lazy(() => import('./components/AlgoView'))
const MemoryView         = lazy(() => import('./components/MemoryView'))
const RegexView          = lazy(() => import('./components/RegexView'))
const IEEE754View        = lazy(() => import('./components/IEEE754View'))
const NetworkView        = lazy(() => import('./components/NetworkView'))
const CPUView            = lazy(() => import('./components/CPUView'))
const X86View            = lazy(() => import('./components/X86View'))
const HardwareView       = lazy(() => import('./components/HardwareView'))
const DockerView         = lazy(() => import('./components/DockerView'))
const SystemDesignView   = lazy(() => import('./components/SystemDesignView'))
const GitView            = lazy(() => import('./components/GitView'))
const ConcurrencyView    = lazy(() => import('./components/ConcurrencyView'))
const WasmView           = lazy(() => import('./components/WasmView'))
const DatabaseView       = lazy(() => import('./components/DatabaseView'))
const ObjectBusView      = lazy(() => import('./components/ObjectBusView'))

type TopMode = SearchTopMode

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

// ─── Visited topics progress tracking ─────────────────────────────────────────
function getVisited(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem('lav-visited') || '[]')) } catch { return new Set() }
}
function markVisited(tab: string) {
  const v = getVisited(); v.add(tab)
  localStorage.setItem('lav-visited', JSON.stringify([...v]))
}

// ─── Search overlay ───────────────────────────────────────────────────────────
function SearchOverlay({ lang, onSelect, onClose }: { lang: 'zh'|'en'; onSelect: (tab: TopMode) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  const results = searchEntries(q, lang)
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 16, opacity: 0.5 }}>🔍</span>
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder={lang === 'zh' ? '搜索所有主题…' : 'Search all topics…'} style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 15, color: 'var(--text-primary)', fontFamily: 'inherit' }} />
          <kbd style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>Esc</kbd>
        </div>
        {results.length > 0 ? (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {results.map((r, i) => {
              const tabInfo = TAB_LABELS[r.tab]
              const title = lang === 'zh' ? r.title_zh : r.title_en
              return (
                <button key={i} onClick={() => { onSelect(r.tab); onClose() }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: 20 }}>{tabInfo?.icon}</span>
                  <span style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{lang === 'zh' ? tabInfo?.zh : tabInfo?.en}</div>
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: 4 }}>{r.tab}</span>
                </button>
              )
            })}
          </div>
        ) : q ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            {lang === 'zh' ? '未找到相关主题' : 'No topics found'}
          </div>
        ) : (
          <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 12 }}>
            {lang === 'zh' ? '输入关键词搜索：mutex、B-tree、TCP、wasm、goroutine…' : 'Type to search: mutex, B-tree, TCP, wasm, goroutine…'}
          </div>
        )}
      </div>
    </div>
  )
}

function AppInner() {
  const { t, lang, setLang } = useLang()
  const { theme, toggle: toggleTheme } = useTheme()
  const [topMode, setTopMode] = useState<TopMode>(() => {
    // URL hash takes priority: #tab=git
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const fromHash = hash.get('tab') as TopMode | null
    if (fromHash && fromHash in TAB_LABELS) return fromHash
    return (localStorage.getItem('lav-top-mode') as TopMode) || 'ast'
  })
  const [visited, setVisited] = useState<Set<string>>(() => getVisited())
  const [showSearch, setShowSearch] = useState(false)

  const switchTop = (m: TopMode) => {
    setTopMode(m)
    localStorage.setItem('lav-top-mode', m)
    window.location.hash = `tab=${m}`
    markVisited(m)
    setVisited(getVisited())
  }
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

  // Keyboard shortcuts: Alt+1..9 switch tabs, Ctrl+K / Cmd+K open search
  useEffect(() => {
    const tabIds = topTabs.map(t => t.id)
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault(); setShowSearch(s => !s); return
      }
      if (e.altKey && e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key) - 1
        if (idx < tabIds.length) { e.preventDefault(); switchTop(tabIds[idx] as TopMode) }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [topMode]) // eslint-disable-line

  const topTabs: { id: TopMode; label: string; icon: string }[] = [
    { id: 'ast',     label: t('tab.ast'),     icon: '🔬' },
    { id: 'ds',      label: t('tab.ds'),      icon: '🗂' },
    { id: 'linux',   label: t('tab.linux'),   icon: '🐧' },
    { id: 'tlpi',    label: t('tab.tlpi'),    icon: '📖' },
    { id: 'algo',    label: t('tab.algo'),    icon: '📊' },
    { id: 'memory',  label: t('tab.memory'),  icon: '🧠' },
    { id: 'regex',   label: t('tab.regex'),   icon: '🔍' },
    { id: 'ieee754', label: t('tab.ieee754'), icon: '🔢' },
    { id: 'network', label: t('tab.network'), icon: '🌐' },
    { id: 'cpu',     label: t('tab.cpu'),     icon: '⚡' },
    { id: 'x86',     label: t('tab.x86'),    icon: '🖥' },
    { id: 'hw',      label: t('tab.hw'),     icon: '🔌' },
    { id: 'docker',      label: t('tab.docker'),      icon: '🐳' },
    { id: 'sysdesign',   label: t('tab.sysdesign'),   icon: '🏗' },
    { id: 'git',         label: t('tab.git'),         icon: '🔀' },
    { id: 'concurrency', label: t('tab.concurrency'), icon: '🔄' },
    { id: 'wasm',        label: t('tab.wasm'),        icon: '🕸' },
    { id: 'database',    label: t('tab.database'),    icon: '🗄' },
    { id: 'objectbus',   label: t('tab.objectbus'),   icon: '🔌' },
  ]

  return (
    <div className="app">
      <header className="app-header">
        {/* Row 1: title + controls */}
        <div className="header-top">
          <div>
            <h1 style={{ margin: 0 }}>{t('app.title')}</h1>
            <p className="subtitle" style={{ margin: 0 }}>{t('app.subtitle')}</p>
          </div>
          <div className="header-controls">
            {topMode === 'ast' && (
              <div className="lang-selector">
                <label htmlFor="lang-select">{t('language')}:</label>
                <select id="lang-select" value={language} onChange={(e) => handleLanguageChange(e.target.value)}>
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
              <button className="toggle-btn" onClick={() => setShowSearch(s => !s)} title="Search (Ctrl+K)" style={{ minWidth: 36 }}>🔍</button>
              <button className="toggle-btn" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} title={lang === 'zh' ? 'Switch to English' : '切换为中文'}
                style={{ minWidth: 36 }}>
                {lang === 'zh' ? '中' : 'EN'}
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
        {/* Row 2: tab bar — full width, scrollable */}
        <div className="top-tab-bar">
          {topTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => switchTop(tab.id)}
              className={`top-tab-btn${topMode === tab.id ? ' active' : ''}`}
              style={{ position: 'relative' }}
            >
              <span className="top-tab-icon">{tab.icon}</span>
              <span className="top-tab-label">{tab.label}</span>
              {visited.has(tab.id) && topMode !== tab.id && (
                <span style={{ position: 'absolute', top: 4, right: 4, width: 5, height: 5, borderRadius: '50%', background: '#3fb950', opacity: 0.7 }} />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* ── Lazy-loaded views ─────────────────────────────────────────────────── */}
      {(['ds','linux','tlpi','algo','memory','regex','ieee754','network','cpu','x86','hw','docker','sysdesign','git','concurrency','wasm','database','objectbus'] as TopMode[]).includes(topMode) && (
        <div style={{ height: 'calc(100vh - var(--header-h, 130px))', overflow: 'hidden' }}>
          <ErrorBoundary fallback={
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:12, color:'var(--text-muted)' }}>
              <div style={{ fontSize:32 }}>⚠</div>
              <div style={{ fontSize:14 }}>加载失败，请刷新页面重试</div>
              <button onClick={() => window.location.reload()} style={{ padding:'6px 16px', borderRadius:6, border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontSize:13 }}>刷新</button>
            </div>
          }>
            <Suspense fallback={<div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--text-muted)', fontSize:14 }}>加载中…</div>}>
              {topMode === 'ds'      && <DataStructuresView />}
              {topMode === 'linux'   && <LinuxView />}
              {topMode === 'tlpi'    && <TLPIView />}
              {topMode === 'algo'    && <AlgoView />}
              {topMode === 'memory'  && <MemoryView />}
              {topMode === 'regex'   && <RegexView />}
              {topMode === 'ieee754' && <IEEE754View />}
              {topMode === 'network' && <NetworkView />}
              {topMode === 'cpu'     && <CPUView />}
              {topMode === 'x86'     && <X86View />}
              {topMode === 'hw'      && <HardwareView />}
              {topMode === 'docker'      && <DockerView />}
              {topMode === 'sysdesign'   && <SystemDesignView />}
              {topMode === 'git'         && <GitView />}
              {topMode === 'concurrency' && <ConcurrencyView />}
              {topMode === 'wasm'        && <WasmView />}
              {topMode === 'database'    && <DatabaseView />}
              {topMode === 'objectbus'   && <ObjectBusView />}
            </Suspense>
          </ErrorBoundary>
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
                <tr><td className="help-key"><kbd>Ctrl</kbd> + <kbd>K</kbd></td><td>Global search</td></tr>
                <tr><td className="help-key"><kbd>Alt</kbd> + <kbd>1-9</kbd></td><td>Switch to tab N</td></tr>
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

      {showSearch && (
        <SearchOverlay
          lang={lang}
          onSelect={(tab) => switchTop(tab)}
          onClose={() => setShowSearch(false)}
        />
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
