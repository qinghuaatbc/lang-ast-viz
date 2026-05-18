import { useState, useEffect, useRef, useCallback } from 'react'

type Color = 'default' | 'comparing' | 'swapping' | 'sorted' | 'pivot' | 'selected'
type Frame = { arr: number[]; colors: Color[]; desc: string }
type AlgoId = 'bubble' | 'selection' | 'insertion' | 'merge' | 'quick' | 'heap'

const ALGO_INFO: Record<AlgoId, { name: string; time: string; space: string; stable: boolean; desc: string }> = {
  bubble:    { name: 'Bubble Sort',    time: 'O(n²)',       space: 'O(1)',      stable: true,  desc: '相邻元素两两比较，大的向右冒泡' },
  selection: { name: 'Selection Sort', time: 'O(n²)',       space: 'O(1)',      stable: false, desc: '每轮找最小值放到已排序末尾' },
  insertion: { name: 'Insertion Sort', time: 'O(n²)',       space: 'O(1)',      stable: true,  desc: '将元素插入已排序部分的正确位置' },
  merge:     { name: 'Merge Sort',     time: 'O(n log n)', space: 'O(n)',      stable: true,  desc: '分治：拆分到最小再合并' },
  quick:     { name: 'Quick Sort',     time: 'O(n log n)', space: 'O(log n)', stable: false, desc: '选基准，左小右大，递归分区' },
  heap:      { name: 'Heap Sort',      time: 'O(n log n)', space: 'O(1)',      stable: false, desc: '建最大堆，反复取堆顶' },
}

function generateFrames(algoId: AlgoId, input: number[]): Frame[] {
  const frames: Frame[] = []
  const arr = [...input]
  const n = arr.length
  const push = (colors: Color[], desc: string) =>
    frames.push({ arr: [...arr], colors: [...colors], desc })
  const colorsOf = (n: number, init: Color = 'default'): Color[] => Array(n).fill(init)

  if (algoId === 'bubble') {
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        const c = colorsOf(n); c[j] = 'comparing'; c[j + 1] = 'comparing'
        for (let k = n - i; k < n; k++) c[k] = 'sorted'
        push(c, `比较 arr[${j}]=${arr[j]} 和 arr[${j + 1}]=${arr[j + 1]}`)
        if (arr[j] > arr[j + 1]) {
          ;[arr[j], arr[j + 1]] = [arr[j + 1], arr[j]]
          const c2 = colorsOf(n); c2[j] = 'swapping'; c2[j + 1] = 'swapping'
          for (let k = n - i; k < n; k++) c2[k] = 'sorted'
          push(c2, `交换 → [${arr[j]}, ${arr[j + 1]}]`)
        }
      }
      const cf = colorsOf(n); for (let k = n - i - 1; k < n; k++) cf[k] = 'sorted'
      push(cf, `第 ${i + 1} 轮完成`)
    }
    const final = colorsOf(n, 'sorted'); push(final, '排序完成！')
  } else if (algoId === 'selection') {
    for (let i = 0; i < n - 1; i++) {
      let minIdx = i
      const c0 = colorsOf(n); c0[i] = 'selected'; for (let k = 0; k < i; k++) c0[k] = 'sorted'
      push(c0, `从 index ${i} 开始找最小值`)
      for (let j = i + 1; j < n; j++) {
        const c = colorsOf(n); c[minIdx] = 'selected'; c[j] = 'comparing'
        for (let k = 0; k < i; k++) c[k] = 'sorted'
        push(c, `比较 arr[${j}]=${arr[j]} 与当前最小 arr[${minIdx}]=${arr[minIdx]}`)
        if (arr[j] < arr[minIdx]) { minIdx = j }
      }
      if (minIdx !== i) {
        ;[arr[i], arr[minIdx]] = [arr[minIdx], arr[i]]
        const c = colorsOf(n); c[i] = 'swapping'; c[minIdx] = 'swapping'
        for (let k = 0; k < i; k++) c[k] = 'sorted'
        push(c, `交换 index ${i} ↔ ${minIdx}`)
      }
    }
    push(colorsOf(n, 'sorted'), '排序完成！')
  } else if (algoId === 'insertion') {
    for (let i = 1; i < n; i++) {
      const key = arr[i]; let j = i - 1
      const c0 = colorsOf(n); c0[i] = 'selected'; for (let k = 0; k < i; k++) c0[k] = 'sorted'
      push(c0, `取 key=${key}，在已排序部分找位置`)
      while (j >= 0 && arr[j] > key) {
        arr[j + 1] = arr[j]
        const c = colorsOf(n); c[j] = 'comparing'; c[j + 1] = 'swapping'
        for (let k = 0; k < j; k++) c[k] = 'sorted'
        push(c, `arr[${j}]=${arr[j]} > ${key}，右移`)
        j--
      }
      arr[j + 1] = key
      const cf = colorsOf(n); for (let k = 0; k <= i; k++) cf[k] = 'sorted'
      push(cf, `插入 key=${key} 到 index ${j + 1}`)
    }
    push(colorsOf(n, 'sorted'), '排序完成！')
  } else if (algoId === 'merge') {
    function mergeSort(l: number, r: number) {
      if (r - l <= 1) return
      const m = Math.floor((l + r) / 2)
      const c0 = colorsOf(n); for (let k = l; k < r; k++) c0[k] = 'comparing'
      push(c0, `分割 [${l}..${r - 1}] → [${l}..${m - 1}] + [${m}..${r - 1}]`)
      mergeSort(l, m); mergeSort(m, r)
      const tmp: number[] = []
      let i = l, j = m
      while (i < m && j < r) {
        const c = colorsOf(n); c[i] = 'comparing'; c[j] = 'comparing'
        push(c, `合并：比较 arr[${i}]=${arr[i]} 和 arr[${j}]=${arr[j]}`)
        if (arr[i] <= arr[j]) tmp.push(arr[i++]); else tmp.push(arr[j++])
      }
      while (i < m) tmp.push(arr[i++])
      while (j < r) tmp.push(arr[j++])
      for (let k = 0; k < tmp.length; k++) arr[l + k] = tmp[k]
      const cm = colorsOf(n); for (let k = l; k < r; k++) cm[k] = 'sorted'
      push(cm, `合并完成 [${l}..${r - 1}]`)
    }
    mergeSort(0, n)
    push(colorsOf(n, 'sorted'), '排序完成！')
  } else if (algoId === 'quick') {
    function quickSort(l: number, r: number) {
      if (l >= r) return
      const pivot = arr[r]; let i = l
      const c0 = colorsOf(n); c0[r] = 'pivot'
      push(c0, `选基准 pivot=${pivot}（index ${r}）`)
      for (let j = l; j < r; j++) {
        const c = colorsOf(n); c[r] = 'pivot'; c[j] = 'comparing'; if (i !== j) c[i] = 'selected'
        push(c, `arr[${j}]=${arr[j]} ${arr[j] <= pivot ? '<= pivot，放左边' : '> pivot'}`)
        if (arr[j] <= pivot) {
          ;[arr[i], arr[j]] = [arr[j], arr[i]]
          if (i !== j) { const cs = colorsOf(n); cs[r] = 'pivot'; cs[i] = 'swapping'; cs[j] = 'swapping'; push(cs, `交换 index ${i} ↔ ${j}`) }
          i++
        }
      }
      ;[arr[i], arr[r]] = [arr[r], arr[i]]
      const cp = colorsOf(n); cp[i] = 'sorted'; push(cp, `基准归位 index ${i}`)
      quickSort(l, i - 1); quickSort(i + 1, r)
    }
    quickSort(0, n - 1)
    push(colorsOf(n, 'sorted'), '排序完成！')
  } else if (algoId === 'heap') {
    function heapify(size: number, i: number) {
      let largest = i; const l = 2 * i + 1; const r = 2 * i + 2
      if (l < size && arr[l] > arr[largest]) largest = l
      if (r < size && arr[r] > arr[largest]) largest = r
      if (largest !== i) {
        const c = colorsOf(n); c[i] = 'comparing'; c[largest] = 'swapping'
        push(c, `堆化：交换 arr[${i}]=${arr[i]} ↔ arr[${largest}]=${arr[largest]}`)
        ;[arr[i], arr[largest]] = [arr[largest], arr[i]]
        heapify(size, largest)
      }
    }
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      const c = colorsOf(n); c[i] = 'selected'; push(c, `建堆：heapify(${i})`)
      heapify(n, i)
    }
    push(colorsOf(n), '最大堆建完，开始提取')
    for (let i = n - 1; i > 0; i--) {
      ;[arr[0], arr[i]] = [arr[i], arr[0]]
      const c = colorsOf(n); c[0] = 'swapping'; c[i] = 'sorted'
      for (let k = i + 1; k < n; k++) c[k] = 'sorted'
      push(c, `堆顶 ${arr[i]} 提取到位置 ${i}`)
      heapify(i, 0)
    }
    push(colorsOf(n, 'sorted'), '排序完成！')
  }

  return frames
}

const BAR_COLOR: Record<Color, string> = {
  default:   'var(--text-muted)',
  comparing: '#ffa94d',
  swapping:  '#ff6b6b',
  sorted:    '#51cf66',
  pivot:     '#cc5de8',
  selected:  '#74c0fc',
}

function genRandom(n: number) {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 90) + 10)
}

export default function AlgoView() {
  const [algoId, setAlgoId] = useState<AlgoId>('bubble')
  const [size, setSize] = useState(20)
  const [arr, setArr] = useState(() => genRandom(20))
  const [frames, setFrames] = useState<Frame[]>([])
  const [frameIdx, setFrameIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(100)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const info = ALGO_INFO[algoId]

  const reset = useCallback(() => {
    const a = genRandom(size); setArr(a)
    setFrames([]); setFrameIdx(0); setPlaying(false)
  }, [size])

  const build = useCallback(() => {
    const fs = generateFrames(algoId, arr)
    setFrames(fs); setFrameIdx(0); setPlaying(false)
  }, [algoId, arr])

  useEffect(() => {
    if (!playing || frames.length === 0) return
    timerRef.current = setInterval(() => {
      setFrameIdx(i => {
        if (i >= frames.length - 1) { setPlaying(false); return i }
        return i + 1
      })
    }, Math.max(30, 400 - speed * 3.7))
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [playing, frames.length, speed])

  const cur = frames.length > 0 ? frames[frameIdx] : null
  const displayArr = cur ? cur.arr : arr
  const displayColors = cur ? cur.colors : Array(displayArr.length).fill('default')
  const maxVal = Math.max(...displayArr, 1)

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: 190, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg-secondary)', padding: '12px 8px', overflowY: 'auto' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 1 }}>排序算法</div>
        {(Object.keys(ALGO_INFO) as AlgoId[]).map(id => {
          const inf = ALGO_INFO[id]
          return (
            <button key={id} onClick={() => { setAlgoId(id); setFrames([]); setFrameIdx(0); setPlaying(false) }} style={{
              display: 'block', width: '100%', marginBottom: 4, padding: '8px 10px',
              background: algoId === id ? 'rgba(255,169,77,0.15)' : 'transparent',
              border: algoId === id ? '1px solid #ffa94d' : '1px solid transparent',
              color: algoId === id ? '#ffa94d' : 'var(--text-secondary)',
              borderRadius: 7, cursor: 'pointer', fontSize: 12, textAlign: 'left',
            }}>
              <div style={{ fontWeight: 600 }}>{inf.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{inf.time} · {inf.stable ? '稳定' : '不稳定'}</div>
            </button>
          )
        })}

        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', margin: '16px 0 8px', letterSpacing: 1 }}>颜色图例</div>
        {(Object.entries(BAR_COLOR) as [Color, string][]).filter(([c]) => c !== 'default').map(([c, col]) => (
          <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: col }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{
              ({ default: '', comparing: '比较中', swapping: '交换中', sorted: '已排序', pivot: '基准', selected: '已选中' } as Record<Color, string>)[c]
            }</span>
          </div>
        ))}
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Info bar */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 20, alignItems: 'center', background: 'var(--bg-secondary)', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#ffa94d' }}>{info.name}</span>
            <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--text-muted)' }}>{info.desc}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, marginLeft: 'auto', flexWrap: 'wrap' }}>
            {[['时间', info.time], ['空间', info.space], ['稳定', info.stable ? '✓' : '✗']].map(([l, v]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: v === '✓' ? '#51cf66' : v === '✗' ? '#ff6b6b' : '#74c0fc' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>元素数量:
            <input type="range" min={8} max={50} value={size} onChange={e => { setSize(+e.target.value); reset() }} style={{ marginLeft: 8, width: 80 }} />
            <span style={{ marginLeft: 4 }}>{size}</span>
          </label>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>速度:
            <input type="range" min={1} max={100} value={speed} onChange={e => setSpeed(+e.target.value)} style={{ marginLeft: 8, width: 80 }} />
          </label>
          <button onClick={reset} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>🎲 随机</button>
          <button onClick={build} style={{ padding: '5px 14px', borderRadius: 6, border: '1px solid #ffa94d', background: 'rgba(255,169,77,0.15)', color: '#ffa94d', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>生成步骤</button>
          {frames.length > 0 && (
            <>
              <button onClick={() => setFrameIdx(i => Math.max(0, i - 1))} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>◀</button>
              <button onClick={() => setPlaying(p => !p)} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: playing ? '#ff6b6b' : '#51cf66', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                {playing ? '⏸' : '▶'}
              </button>
              <button onClick={() => setFrameIdx(i => Math.min(frames.length - 1, i + 1))} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>▶</button>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{frameIdx + 1} / {frames.length}</span>
            </>
          )}
        </div>

        {/* Bar chart */}
        <div style={{ flex: 1, padding: '16px 20px 8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 2, minHeight: 0 }}>
            {displayArr.map((v, i) => {
              const color = BAR_COLOR[displayColors[i] as Color] || BAR_COLOR.default
              const heightPct = (v / maxVal) * 100
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <div style={{
                    width: '100%', height: `${heightPct}%`, minHeight: 4,
                    background: color, borderRadius: '3px 3px 0 0',
                    transition: 'height 0.05s, background 0.1s',
                    boxShadow: displayColors[i] !== 'default' ? `0 0 6px ${color}80` : 'none',
                  }} />
                  {displayArr.length <= 25 && (
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{v}</div>
                  )}
                </div>
              )
            })}
          </div>
          {/* Step description */}
          <div style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {cur ? (
              <div style={{ fontSize: 13, color: 'var(--text-primary)', background: 'var(--bg-secondary)', padding: '5px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
                {cur.desc}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>点击「生成步骤」后播放排序动画</div>
            )}
          </div>
          {/* Progress bar */}
          {frames.length > 0 && (
            <input type="range" min={0} max={frames.length - 1} value={frameIdx}
              onChange={e => { setFrameIdx(+e.target.value); setPlaying(false) }}
              style={{ width: '100%', marginTop: 4 }} />
          )}
        </div>
      </div>
    </div>
  )
}
