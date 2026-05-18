import { useState, useCallback } from 'react'

function floatToBits(f: number): number[] {
  const buf = new ArrayBuffer(4)
  new DataView(buf).setFloat32(0, f, false)
  const v = new DataView(buf).getUint32(0, false)
  return Array.from({ length: 32 }, (_, i) => (v >>> (31 - i)) & 1)
}
function bitsToFloat(bits: number[]): number {
  const v = bits.reduce((acc, b, i) => acc | (b << (31 - i)), 0) >>> 0
  const buf = new ArrayBuffer(4)
  new DataView(buf).setUint32(0, v, false)
  return new DataView(buf).getFloat32(0, false)
}
function doubleToBits(f: number): number[] {
  const buf = new ArrayBuffer(8)
  new DataView(buf).setFloat64(0, f, false)
  const hi = new DataView(buf).getUint32(0, false)
  const lo = new DataView(buf).getUint32(4, false)
  const bits: number[] = []
  for (let i = 31; i >= 0; i--) bits.push((hi >>> i) & 1)
  for (let i = 31; i >= 0; i--) bits.push((lo >>> i) & 1)
  return bits
}
function bitsToDouble(bits: number[]): number {
  const buf = new ArrayBuffer(8)
  let hi = 0, lo = 0
  for (let i = 0; i < 32; i++) hi = (hi | (bits[i] << (31 - i))) >>> 0
  for (let i = 0; i < 32; i++) lo = (lo | (bits[32 + i] << (31 - i))) >>> 0
  new DataView(buf).setUint32(0, hi, false)
  new DataView(buf).setUint32(4, lo, false)
  return new DataView(buf).getFloat64(0, false)
}

function bitColor(i: number, mode: '32' | '64'): string {
  if (i === 0) return '#ff6b6b'
  if (mode === '32') return i <= 8 ? '#ffa94d' : '#74c0fc'
  return i <= 11 ? '#ffa94d' : '#74c0fc'
}
function bitLabel(i: number, mode: '32' | '64'): string {
  if (i === 0) return 'S'
  if (mode === '32') return i <= 8 ? 'E' : 'M'
  return i <= 11 ? 'E' : 'M'
}

const PRESETS = [
  { label: '0.1',       v: 0.1 },
  { label: '0.2',       v: 0.2 },
  { label: '0.1+0.2',   v: 0.1 + 0.2 },
  { label: '1.0',       v: 1.0 },
  { label: '-1.5',      v: -1.5 },
  { label: 'π',         v: Math.PI },
  { label: 'NaN',       v: NaN },
  { label: '∞',         v: Infinity },
  { label: '-∞',        v: -Infinity },
  { label: 'MAX',       v: 3.4028235e38 },
  { label: 'MIN+',      v: 1.17549435e-38 },
  { label: '0',         v: 0 },
  { label: '-0',        v: -0 },
]

function analyzeFloat(bits: number[]): string {
  const exp = bits.slice(1, 9).reduce((a, b, i) => a | (b << (7 - i)), 0)
  const mantissa = bits.slice(9)
  if (exp === 255) {
    const allZero = mantissa.every(b => b === 0)
    return allZero ? (bits[0] ? '-Infinity' : '+Infinity') : 'NaN'
  }
  if (exp === 0) {
    const allZero = mantissa.every(b => b === 0)
    return allZero ? (bits[0] ? '-0' : '+0') : `Denormalized (exp bias: -126)`
  }
  return `Normalized: exp=${exp} (biased), actual exponent=${exp - 127}`
}
function analyzeDouble(bits: number[]): string {
  const exp = bits.slice(1, 12).reduce((a, b, i) => a | (b << (10 - i)), 0)
  const mantissa = bits.slice(12)
  if (exp === 2047) {
    const allZero = mantissa.every(b => b === 0)
    return allZero ? (bits[0] ? '-Infinity' : '+Infinity') : 'NaN'
  }
  if (exp === 0) {
    const allZero = mantissa.every(b => b === 0)
    return allZero ? (bits[0] ? '-0' : '+0') : `Denormalized (exp bias: -1022)`
  }
  return `Normalized: exp=${exp} (biased), actual exponent=${exp - 1023}`
}

export default function IEEE754View() {
  const [mode, setMode] = useState<'32' | '64'>('32')
  const [input, setInput] = useState('0.1')
  const [bits32, setBits32] = useState<number[]>(() => floatToBits(0.1))
  const [bits64, setBits64] = useState<number[]>(() => doubleToBits(0.1))
  const [hover, setHover] = useState(-1)

  const bits = mode === '32' ? bits32 : bits64
  const value = mode === '32' ? bitsToFloat(bits32) : bitsToDouble(bits64)

  const applyValue = useCallback((v: number) => {
    setBits32(floatToBits(v))
    setBits64(doubleToBits(v))
  }, [])

  const handleInput = (s: string) => {
    setInput(s)
    const v = parseFloat(s)
    if (!isNaN(v)) applyValue(v)
  }

  const toggleBit = (i: number) => {
    if (mode === '32') {
      const nb = [...bits32]; nb[i] ^= 1; setBits32(nb)
      setInput(String(bitsToFloat(nb)))
    } else {
      const nb = [...bits64]; nb[i] ^= 1; setBits64(nb)
      setInput(String(bitsToDouble(nb)))
    }
  }

  const expStart = 1, expEnd = mode === '32' ? 8 : 11
  const expVal = bits.slice(expStart, expEnd + 1).reduce((a, b, i) => a | (b << (expEnd - expStart - i)), 0)
  const bias = mode === '32' ? 127 : 1023
  const mantBits = bits.slice(expEnd + 1)
  const mantVal = mantBits.reduce((a, b, i) => a + b * Math.pow(2, -(i + 1)), 0)

  const analysis = mode === '32' ? analyzeFloat(bits32) : analyzeDouble(bits64)
  const hexVal = bits.reduce((a, b, i) => {
    const byteIdx = Math.floor(i / 4)
    const bitIdx = 3 - (i % 4)
    if (byteIdx >= a.length) a.push(0)
    a[a.length - 1] |= (b << bitIdx)
    return a
  }, [] as number[]).map(n => n.toString(16).toUpperCase()).join('')

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', fontFamily: 'monospace' }}>
      {/* Sidebar */}
      <div style={{ width: 160, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg-secondary)', padding: '12px 8px', overflowY: 'auto' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 1 }}>MODE</div>
        {(['32', '64'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            display: 'block', width: '100%', marginBottom: 4, padding: '6px 8px',
            background: mode === m ? 'rgba(116,192,252,0.2)' : 'transparent',
            border: mode === m ? '1px solid #74c0fc' : '1px solid transparent',
            color: mode === m ? '#74c0fc' : 'var(--text-secondary)',
            borderRadius: 6, cursor: 'pointer', fontSize: 12, textAlign: 'left',
          }}>float{m} ({m === '32' ? 'C float' : 'C double'})</button>
        ))}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', margin: '16px 0 8px', letterSpacing: 1 }}>PRESETS</div>
        {PRESETS.map(p => (
          <button key={p.label} onClick={() => { setInput(String(p.v)); applyValue(p.v) }} style={{
            display: 'block', width: '100%', marginBottom: 3, padding: '4px 8px',
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', borderRadius: 5, cursor: 'pointer', fontSize: 11, textAlign: 'left',
          }}>{p.label}</button>
        ))}
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, color: 'var(--text-primary)' }}>IEEE 754 浮点数可视化</h2>
        <p style={{ margin: '0 0 20px', fontSize: 12, color: 'var(--text-muted)' }}>
          {mode === '32' ? '32-bit: 1 sign + 8 exponent + 23 mantissa bits' : '64-bit: 1 sign + 11 exponent + 52 mantissa bits'}
        </p>

        {/* Input */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>十进制值：</label>
          <input value={input} onChange={e => handleInput(e.target.value)}
            style={{ padding: '6px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 14, width: 180 }} />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>= </span>
          <span style={{ fontSize: 14, color: '#74c0fc', fontWeight: 700 }}>{isNaN(value) ? 'NaN' : value}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>0x{hexVal}</span>
        </div>

        {/* Bit grid */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 20, marginBottom: 20, border: '1px solid var(--border)', overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', minWidth: mode === '32' ? 600 : 1100 }}>
            {bits.map((b, i) => {
              const color = bitColor(i, mode)
              const isHover = hover === i
              return (
                <div key={i} onClick={() => toggleBit(i)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(-1)}
                  title={`bit ${i} (${bitLabel(i, mode)})`}
                  style={{
                    width: mode === '32' ? 26 : 15, height: mode === '32' ? 36 : 28, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', borderRadius: 4, cursor: 'pointer',
                    background: isHover ? `${color}50` : b ? `${color}30` : 'transparent',
                    border: `1px solid ${isHover ? color : b ? color : 'var(--border)'}`,
                    transition: 'all 0.1s', userSelect: 'none',
                  }}>
                  <span style={{ fontSize: mode === '32' ? 13 : 10, fontWeight: 700, color: b ? color : 'var(--text-muted)' }}>{b}</span>
                  {mode === '32' && <span style={{ fontSize: 7, color: 'var(--text-muted)' }}>{i}</span>}
                </div>
              )
            })}
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            {[['#ff6b6b', 'Sign (1)'], ['#ffa94d', mode === '32' ? 'Exponent (8)' : 'Exponent (11)'], ['#74c0fc', mode === '32' ? 'Mantissa (23)' : 'Mantissa (52)']].map(([c, l]) => (
              <div key={l as string} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: c as string }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l as string}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Sign', color: '#ff6b6b', value: bits[0] === 0 ? '+1' : '-1', bits: `bit[0] = ${bits[0]}` },
            { label: 'Exponent', color: '#ffa94d', value: expVal === 0 ? '0 (denorm)' : expVal === (mode === '32' ? 255 : 2047) ? 'max (±Inf/NaN)' : `${expVal} − ${bias} = ${expVal - bias}`, bits: `bits[1..${expEnd}] = ${expVal}` },
            { label: 'Mantissa', color: '#74c0fc', value: `1.${mantBits.slice(0, 8).join('')}… ≈ ${(1 + mantVal).toFixed(6)}`, bits: `bits[${expEnd + 1}..${mode === '32' ? 31 : 63}]` },
          ].map(card => (
            <div key={card.label} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 14, border: `1px solid ${card.color}40` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: card.color, marginBottom: 6 }}>{card.label}</div>
              <div style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>{card.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{card.bits}</div>
            </div>
          ))}
        </div>

        {/* Formula */}
        <div style={{ background: 'rgba(116,192,252,0.08)', borderRadius: 10, padding: 14, border: '1px solid rgba(116,192,252,0.25)', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#74c0fc', marginBottom: 8 }}>公式</div>
          <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
            value = (−1)<sup>sign</sup> × 2<sup>(exp−{bias})</sup> × (1 + mantissa)
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{analysis}</div>
        </div>

        {/* Special values table */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>特殊值 (float32)</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['值', 'Sign', 'Exponent', 'Mantissa', '说明'].map(h => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['+0',        '0','00000000','00000000000000000000000','零'],
                ['-0',        '1','00000000','00000000000000000000000','负零（等于+0）'],
                ['+∞',        '0','11111111','00000000000000000000000','正无穷'],
                ['-∞',        '1','11111111','00000000000000000000000','负无穷'],
                ['NaN',       '0','11111111','10000000000000000000000','非数字'],
                ['最大正数',   '0','11111110','11111111111111111111111','≈ 3.4×10³⁸'],
                ['最小正数',   '0','00000001','00000000000000000000000','≈ 1.18×10⁻³⁸'],
              ].map(([v, s, e, m, d]) => (
                <tr key={v} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '5px 10px', color: '#74c0fc', fontWeight: 700 }}>{v}</td>
                  <td style={{ padding: '5px 10px', color: '#ff6b6b' }}>{s}</td>
                  <td style={{ padding: '5px 10px', color: '#ffa94d', fontSize: 10 }}>{e}</td>
                  <td style={{ padding: '5px 10px', color: '#74c0fc', fontSize: 9 }}>{m}</td>
                  <td style={{ padding: '5px 10px', color: 'var(--text-muted)' }}>{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
