import { useState, useCallback } from 'react'
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
  // Handle comments first (whole line)
  const commentPrefixes: Record<string, string[]> = {
    c: ['//','/*'], cpp: ['//','/*'], java: ['//','/*'],
    rust: ['//'], go: ['//'],
    javascript: ['//','/*'], python: ['#'],
  }
  const prefixes = commentPrefixes[lang] ?? ['//']
  const trimmed = line.trimStart()
  const indent = line.length - trimmed.length
  const indentStr = line.slice(0, indent)

  // Check if the trimmed line starts with a comment prefix
  for (const p of prefixes) {
    if (trimmed.startsWith(p)) {
      return escHtml(indentStr) + `<span class="hl-comment">${escHtml(trimmed)}</span>`
    }
  }

  let out = ''
  let i = 0
  // Scan for inline comment
  const commentStart = findInlineComment(line, lang)
  const mainPart = commentStart >= 0 ? line.slice(0, commentStart) : line
  const commentPart = commentStart >= 0 ? line.slice(commentStart) : ''

  while (i < mainPart.length) {
    const c = mainPart[i]

    // String literal
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

    // Number
    if (c >= '0' && c <= '9') {
      let num = ''
      while (i < mainPart.length && (mainPart[i] >= '0' && mainPart[i] <= '9' || mainPart[i] === '.')) num += mainPart[i++]
      out += `<span class="hl-num">${num}</span>`
      continue
    }

    // Identifier / keyword
    if (isIdStart(c)) {
      let word = ''
      while (i < mainPart.length && isIdChar(mainPart[i])) word += mainPart[i++]
      out += kws.has(word)
        ? `<span class="hl-kw">${escHtml(word)}</span>`
        : `<span class="hl-id">${escHtml(word)}</span>`
      continue
    }

    // Operators
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

// ─── Main View ────────────────────────────────────────────────────────────────

export default function DataStructuresView() {
  const [selectedDs, setSelectedDs] = useState(DS_LIST[0].id)
  const [selectedLang, setSelectedLang] = useState<DSLangId>('c')

  const ds = DS_LIST.find(d => d.id === selectedDs) ?? DS_LIST[0]

  const langColor: Record<DSLangId, string> = {
    c: '#555599', cpp: '#f34b7d', java: '#b07219',
    rust: '#dea584', go: '#00add8', javascript: '#f1e05a', python: '#3572A5',
  }

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      {/* ── Left sidebar: DS list ────────────────────────────────────────── */}
      <div style={{
        width: 200, flexShrink: 0,
        borderRight: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        overflowY: 'auto', padding: '8px 0',
      }}>
        {DS_LIST.map(d => (
          <button
            key={d.id}
            onClick={() => setSelectedDs(d.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '10px 16px',
              background: selectedDs === d.id ? 'var(--bg-elevated)' : 'transparent',
              border: 'none', borderLeft: selectedDs === d.id ? '3px solid var(--accent-blue)' : '3px solid transparent',
              color: selectedDs === d.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: selectedDs === d.id ? 600 : 400,
              transition: 'background 0.12s',
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>{d.icon}</span>
            <span>{d.name}</span>
          </button>
        ))}
      </div>

      {/* ── Right panel ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
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
      </div>
    </div>
  )
}
