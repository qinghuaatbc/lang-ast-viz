import { useLang } from '../i18n/lang'

interface CallEdge {
  from: string; to: string; method: string
  params: string; ret: string; relation: string
}

interface IRViewerProps {
  calls?: CallEdge[]
  chips?: { name: string; methods: string[]; fields: string[] }[]
  lang?: string
}

const REL_COLOR: Record<string, string> = {
  call: '#79c0ff', compose: '#ff7b72', aggregate: '#ffa657',
  inherit: '#d2a8ff', depend: '#8b949e',
}
const REL_LABEL: Record<string, string> = {
  call: 'call →', compose: 'compose ◆→', aggregate: 'aggregate ◇→',
  inherit: 'inherit ⊳', depend: 'depend --→',
}

export default function IRViewer({ calls, chips, lang }: IRViewerProps) {
  const { lang: uiLang } = useLang()
  const isZh = uiLang === 'zh'

  if (!calls || calls.length === 0) {
    return (
      <div className="viewer-empty">
        {isZh ? '粘贴代码后点击「解析」查看调用图' : 'Paste code and click Parse to see call graph'}
      </div>
    )
  }

  return (
    <div className="viewer" style={{ padding: 12, overflow: 'auto' }}>
      {chips && chips.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
            {isZh ? '结构' : 'Structure'} ({lang})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {chips.map(chip => (
              <div key={chip.name} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', background: 'var(--bg-elevated)', minWidth: 100 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#d2a8ff', marginBottom: 4 }}>{chip.name}</div>
                {(chip.methods ?? []).map(m => (
                  <div key={m} style={{ fontSize: 10, color: '#79c0ff', fontFamily: 'monospace' }}>
                    fn {m}()
                  </div>
                ))}
                {(chip.fields ?? []).map(f => (
                  <div key={f} style={{ fontSize: 10, color: '#56d364', fontFamily: 'monospace' }}>
                    {f}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
        {isZh ? '调用图' : 'Call Graph'} ({calls.length} {isZh ? '条边' : 'edges'})
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'monospace' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            <th style={{ textAlign: 'left', padding: '3px 8px', fontWeight: 500 }}>{isZh ? '来源' : 'From'}</th>
            <th style={{ textAlign: 'left', padding: '3px 8px', fontWeight: 500 }}>{isZh ? '关系' : 'Rel'}</th>
            <th style={{ textAlign: 'left', padding: '3px 8px', fontWeight: 500 }}>{isZh ? '目标' : 'To'}</th>
            <th style={{ textAlign: 'left', padding: '3px 8px', fontWeight: 500 }}>{isZh ? '方法' : 'Method'}</th>
            <th style={{ textAlign: 'left', padding: '3px 8px', fontWeight: 500 }}>{isZh ? '参数' : 'Params'}</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((c, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border)', opacity: 0.9 }}>
              <td style={{ padding: '3px 8px', color: '#79c0ff' }}>{c.from}</td>
              <td style={{ padding: '3px 8px', color: REL_COLOR[c.relation] ?? '#8b949e', fontSize: 10 }}>
                {REL_LABEL[c.relation] ?? c.relation}
              </td>
              <td style={{ padding: '3px 8px', color: '#d2a8ff' }}>{c.to}</td>
              <td style={{ padding: '3px 8px', color: '#ffa657' }}>{c.method}</td>
              <td style={{ padding: '3px 8px', color: 'var(--text-secondary)' }}>{c.params}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
