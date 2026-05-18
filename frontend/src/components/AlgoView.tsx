import { useState, useEffect, useRef, useCallback } from 'react'
import { useMobile } from '../hooks/useMobile'

// ── Sorting ───────────────────────────────────────────────────────────────────
type SortColor = 'default' | 'comparing' | 'swapping' | 'sorted' | 'pivot' | 'selected'
type SortFrame = { arr: number[]; colors: SortColor[]; desc: string }
type SortId = 'bubble' | 'selection' | 'insertion' | 'merge' | 'quick' | 'heap'

const SORT_INFO: Record<SortId, { name: string; time: string; space: string; stable: boolean; desc: string }> = {
  bubble:    { name: 'Bubble Sort',    time: 'O(n²)',       space: 'O(1)',      stable: true,  desc: '相邻元素两两比较，大的向右冒泡' },
  selection: { name: 'Selection Sort', time: 'O(n²)',       space: 'O(1)',      stable: false, desc: '每轮找最小值放到已排序末尾' },
  insertion: { name: 'Insertion Sort', time: 'O(n²)',       space: 'O(1)',      stable: true,  desc: '将元素插入已排序部分的正确位置' },
  merge:     { name: 'Merge Sort',     time: 'O(n log n)', space: 'O(n)',      stable: true,  desc: '分治：拆分到最小再合并' },
  quick:     { name: 'Quick Sort',     time: 'O(n log n)', space: 'O(log n)', stable: false, desc: '选基准，左小右大，递归分区' },
  heap:      { name: 'Heap Sort',      time: 'O(n log n)', space: 'O(1)',      stable: false, desc: '建最大堆，反复取堆顶' },
}

function generateSortFrames(algoId: SortId, input: number[]): SortFrame[] {
  const frames: SortFrame[] = []
  const arr = [...input]
  const n = arr.length
  const push = (colors: SortColor[], desc: string) =>
    frames.push({ arr: [...arr], colors: [...colors], desc })
  const colorsOf = (n: number, init: SortColor = 'default'): SortColor[] => Array(n).fill(init)

  if (algoId === 'bubble') {
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        const c = colorsOf(n); c[j] = 'comparing'; c[j + 1] = 'comparing'
        for (let k = n - i; k < n; k++) c[k] = 'sorted'
        push(c, `比较 arr[${j}]=${arr[j]} 和 arr[${j+1}]=${arr[j+1]}`)
        if (arr[j] > arr[j + 1]) {
          ;[arr[j], arr[j+1]] = [arr[j+1], arr[j]]
          const c2 = colorsOf(n); c2[j] = 'swapping'; c2[j+1] = 'swapping'
          for (let k = n - i; k < n; k++) c2[k] = 'sorted'
          push(c2, `交换 → [${arr[j]}, ${arr[j+1]}]`)
        }
      }
      const cf = colorsOf(n); for (let k = n - i - 1; k < n; k++) cf[k] = 'sorted'
      push(cf, `第 ${i+1} 轮完成`)
    }
    push(colorsOf(n, 'sorted'), '排序完成！')
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
        arr[j+1] = arr[j]
        const c = colorsOf(n); c[j] = 'comparing'; c[j+1] = 'swapping'
        for (let k = 0; k < j; k++) c[k] = 'sorted'
        push(c, `arr[${j}]=${arr[j]} > ${key}，右移`)
        j--
      }
      arr[j+1] = key
      const cf = colorsOf(n); for (let k = 0; k <= i; k++) cf[k] = 'sorted'
      push(cf, `插入 key=${key} 到 index ${j+1}`)
    }
    push(colorsOf(n, 'sorted'), '排序完成！')
  } else if (algoId === 'merge') {
    function mergeSort(l: number, r: number) {
      if (r - l <= 1) return
      const m = Math.floor((l + r) / 2)
      const c0 = colorsOf(n); for (let k = l; k < r; k++) c0[k] = 'comparing'
      push(c0, `分割 [${l}..${r-1}] → [${l}..${m-1}] + [${m}..${r-1}]`)
      mergeSort(l, m); mergeSort(m, r)
      const tmp: number[] = []; let i = l, j = m
      while (i < m && j < r) {
        const c = colorsOf(n); c[i] = 'comparing'; c[j] = 'comparing'
        push(c, `合并：比较 arr[${i}]=${arr[i]} 和 arr[${j}]=${arr[j]}`)
        if (arr[i] <= arr[j]) tmp.push(arr[i++]); else tmp.push(arr[j++])
      }
      while (i < m) tmp.push(arr[i++])
      while (j < r) tmp.push(arr[j++])
      for (let k = 0; k < tmp.length; k++) arr[l+k] = tmp[k]
      const cm = colorsOf(n); for (let k = l; k < r; k++) cm[k] = 'sorted'
      push(cm, `合并完成 [${l}..${r-1}]`)
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
      let largest = i; const l = 2*i+1; const r = 2*i+2
      if (l < size && arr[l] > arr[largest]) largest = l
      if (r < size && arr[r] > arr[largest]) largest = r
      if (largest !== i) {
        const c = colorsOf(n); c[i] = 'comparing'; c[largest] = 'swapping'
        push(c, `堆化：交换 arr[${i}]=${arr[i]} ↔ arr[${largest}]=${arr[largest]}`)
        ;[arr[i], arr[largest]] = [arr[largest], arr[i]]
        heapify(size, largest)
      }
    }
    for (let i = Math.floor(n/2)-1; i >= 0; i--) {
      const c = colorsOf(n); c[i] = 'selected'; push(c, `建堆：heapify(${i})`)
      heapify(n, i)
    }
    push(colorsOf(n), '最大堆建完，开始提取')
    for (let i = n-1; i > 0; i--) {
      ;[arr[0], arr[i]] = [arr[i], arr[0]]
      const c = colorsOf(n); c[0] = 'swapping'; c[i] = 'sorted'
      for (let k = i+1; k < n; k++) c[k] = 'sorted'
      push(c, `堆顶 ${arr[i]} 提取到位置 ${i}`)
      heapify(i, 0)
    }
    push(colorsOf(n, 'sorted'), '排序完成！')
  }
  return frames
}

const BAR_COLOR: Record<SortColor, string> = {
  default:   'var(--text-muted)',
  comparing: '#ffa94d',
  swapping:  '#ff6b6b',
  sorted:    '#51cf66',
  pivot:     '#cc5de8',
  selected:  '#74c0fc',
}

// ── Graph ─────────────────────────────────────────────────────────────────────
type GraphAlgoId = 'bfs' | 'dfs' | 'dijkstra'
type NodeState = 'unvisited' | 'frontier' | 'visiting' | 'visited' | 'path' | 'start' | 'end'
type GraphFrame = {
  nodeStates: NodeState[]
  treeEdges: Set<string>
  pathEdges: Set<string>
  desc: string
  extra: string
  dist?: number[]
}

const NODES = [
  { id: 0, label: 'A', x: 80,  y: 120 },
  { id: 1, label: 'B', x: 210, y: 50  },
  { id: 2, label: 'C', x: 210, y: 190 },
  { id: 3, label: 'D', x: 340, y: 50  },
  { id: 4, label: 'E', x: 340, y: 190 },
  { id: 5, label: 'F', x: 470, y: 50  },
  { id: 6, label: 'G', x: 470, y: 190 },
  { id: 7, label: 'H', x: 560, y: 120 },
]

// undirected weighted edges
const EDGES: { u: number; v: number; w: number }[] = [
  { u: 0, v: 1, w: 4 }, { u: 0, v: 2, w: 2 },
  { u: 1, v: 2, w: 1 }, { u: 1, v: 3, w: 5 },
  { u: 2, v: 3, w: 6 }, { u: 2, v: 4, w: 8 },
  { u: 3, v: 4, w: 2 }, { u: 3, v: 5, w: 3 },
  { u: 4, v: 5, w: 7 }, { u: 4, v: 6, w: 1 },
  { u: 5, v: 6, w: 2 }, { u: 5, v: 7, w: 5 },
  { u: 6, v: 7, w: 6 },
]

function edgeKey(u: number, v: number) { return u < v ? `${u}-${v}` : `${v}-${u}` }

function buildAdj() {
  const adj: { to: number; w: number }[][] = Array.from({ length: NODES.length }, () => [])
  EDGES.forEach(({ u, v, w }) => { adj[u].push({ to: v, w }); adj[v].push({ to: u, w }) })
  return adj
}

function generateBFS(start: number, end: number): GraphFrame[] {
  const frames: GraphFrame[] = []
  const n = NODES.length
  const adj = buildAdj()
  const ns = (): NodeState[] => Array(n).fill('unvisited')
  const push = (nodeStates: NodeState[], te: Set<string>, pe: Set<string>, desc: string, extra: string) =>
    frames.push({ nodeStates: [...nodeStates] as NodeState[], treeEdges: new Set(te), pathEdges: new Set(pe), desc, extra })

  const visited = Array(n).fill(false)
  const parent = Array(n).fill(-1)
  const queue: number[] = [start]
  visited[start] = true
  const treeEdges = new Set<string>()

  let states = ns(); states[start] = 'start'; if (start !== end) states[end] = 'end'
  push(states, treeEdges, new Set(), `BFS 从节点 ${NODES[start].label} 出发，加入队列`, `Queue: [${NODES[start].label}]`)

  while (queue.length > 0) {
    const cur = queue.shift()!
    states = [...states] as NodeState[]
    states[cur] = cur === start ? 'start' : 'visiting'
    push(states, treeEdges, new Set(), `访问节点 ${NODES[cur].label}，逐一检查邻居`, `Queue: [${queue.map(x => NODES[x].label).join(',')||'空'}]`)

    for (const { to } of adj[cur]) {
      if (!visited[to]) {
        visited[to] = true
        parent[to] = cur
        treeEdges.add(edgeKey(cur, to))
        queue.push(to)
        states = [...states] as NodeState[]
        states[to] = to === end ? 'end' : 'frontier'
        push(states, treeEdges, new Set(), `发现未访问邻居 ${NODES[to].label}，加入队列`, `Queue: [${queue.map(x => NODES[x].label).join(',')}]`)
      }
    }
    states = [...states] as NodeState[]
    if (states[cur] === 'visiting') states[cur] = 'visited'
    if (cur === end) {
      // reconstruct path
      const path: number[] = []; let c = end
      while (c !== -1) { path.unshift(c); c = parent[c] }
      const pe = new Set<string>()
      for (let i = 0; i < path.length - 1; i++) pe.add(edgeKey(path[i], path[i+1]))
      for (const id of path) { states[id] = 'path' }
      states[start] = 'start'; states[end] = 'end'
      push(states, treeEdges, pe, `到达目标 ${NODES[end].label}！路径：${path.map(x => NODES[x].label).join(' → ')}`, `路径长度: ${path.length - 1} 步`)
      return frames
    }
  }
  push(states, treeEdges, new Set(), 'BFS 完成，所有可达节点已访问', '队列为空')
  return frames
}

function generateDFS(start: number, end: number): GraphFrame[] {
  const frames: GraphFrame[] = []
  const n = NODES.length
  const adj = buildAdj()
  const ns = (): NodeState[] => Array(n).fill('unvisited')
  const push = (nodeStates: NodeState[], te: Set<string>, pe: Set<string>, desc: string, extra: string) =>
    frames.push({ nodeStates: [...nodeStates] as NodeState[], treeEdges: new Set(te), pathEdges: new Set(pe), desc, extra })

  const visited = Array(n).fill(false)
  const parent = Array(n).fill(-1)
  const stack: number[] = [start]
  const treeEdges = new Set<string>()
  let states = ns(); states[start] = 'start'; if (start !== end) states[end] = 'end'
  push(states, treeEdges, new Set(), `DFS 从 ${NODES[start].label} 出发，压入栈`, `Stack: [${NODES[start].label}]`)
  let found = false

  while (stack.length > 0 && !found) {
    const cur = stack[stack.length - 1]
    if (!visited[cur]) {
      visited[cur] = true
      states = [...states] as NodeState[]
      states[cur] = cur === start ? 'start' : 'visiting'
      push(states, treeEdges, new Set(), `访问 ${NODES[cur].label}，探索邻居`, `Stack: [${stack.map(x => NODES[x].label).join(',')}]`)
      if (cur === end) {
        const path: number[] = []; let c = end
        while (c !== -1) { path.unshift(c); c = parent[c] }
        const pe = new Set<string>()
        for (let i = 0; i < path.length - 1; i++) pe.add(edgeKey(path[i], path[i+1]))
        const s2 = ns()
        for (const id of path) s2[id] = 'path'
        s2[start] = 'start'; s2[end] = 'end'
        for (let i = 0; i < n; i++) if (visited[i] && s2[i] === 'unvisited') s2[i] = 'visited'
        push(s2, treeEdges, pe, `到达目标 ${NODES[end].label}！路径：${path.map(x => NODES[x].label).join(' → ')}`, `路径长度: ${path.length - 1} 步`)
        found = true; break
      }
    }
    let pushed = false
    for (const { to } of adj[cur]) {
      if (!visited[to]) {
        parent[to] = cur
        treeEdges.add(edgeKey(cur, to))
        stack.push(to)
        states = [...states] as NodeState[]
        states[to] = to === end ? 'end' : 'frontier'
        push(states, treeEdges, new Set(), `将 ${NODES[to].label} 压栈（${NODES[cur].label} 的邻居）`, `Stack: [${stack.map(x => NODES[x].label).join(',')}]`)
        pushed = true; break
      }
    }
    if (!pushed) {
      stack.pop()
      states = [...states] as NodeState[]
      if (states[cur] === 'visiting') states[cur] = 'visited'
      push(states, treeEdges, new Set(), `${NODES[cur].label} 所有邻居已访问，回溯`, `Stack: [${stack.map(x => NODES[x].label).join(',')||'空'}]`)
    }
  }
  if (!found) push(states, treeEdges, new Set(), 'DFS 完成', '栈为空')
  return frames
}

function generateDijkstra(start: number, end: number): GraphFrame[] {
  const frames: GraphFrame[] = []
  const n = NODES.length
  const adj = buildAdj()
  const INF = 1e9
  const dist = Array(n).fill(INF); dist[start] = 0
  const visited = Array(n).fill(false)
  const parent = Array(n).fill(-1)
  const treeEdges = new Set<string>()

  const ns = (): NodeState[] => {
    return NODES.map((_, i) => {
      if (i === start) return 'start'
      if (i === end) return 'end'
      if (visited[i]) return 'visited'
      if (dist[i] < INF) return 'frontier'
      return 'unvisited'
    }) as NodeState[]
  }
  const push = (desc: string, extra: string) =>
    frames.push({ nodeStates: ns(), treeEdges: new Set(treeEdges), pathEdges: new Set(), desc, extra, dist: [...dist] })

  push(`Dijkstra 初始化：dist[${NODES[start].label}]=0，其余=∞`, distStr(dist, n))

  for (let iter = 0; iter < n; iter++) {
    // pick unvisited node with min dist
    let u = -1
    for (let i = 0; i < n; i++) if (!visited[i] && dist[i] < INF && (u === -1 || dist[i] < dist[u])) u = i
    if (u === -1) break

    visited[u] = true
    push(`选择 dist 最小的节点 ${NODES[u].label}（dist=${dist[u]}），标记已访问`, distStr(dist, n))

    if (u === end) {
      const path: number[] = []; let c = end
      while (c !== -1) { path.unshift(c); c = parent[c] }
      const pe = new Set<string>()
      for (let i = 0; i < path.length - 1; i++) pe.add(edgeKey(path[i], path[i+1]))
      const s = ns()
      for (const id of path) s[id] = 'path'
      s[start] = 'start'; s[end] = 'end'
      frames.push({ nodeStates: s, treeEdges: new Set(treeEdges), pathEdges: pe,
        desc: `找到最短路径！${path.map(x => NODES[x].label).join(' → ')} = ${dist[end]}`,
        extra: `最短距离: ${dist[end]}`, dist: [...dist] })
      return frames
    }

    for (const { to, w } of adj[u]) {
      if (!visited[to] && dist[u] + w < dist[to]) {
        const old = dist[to]
        dist[to] = dist[u] + w
        parent[to] = u
        treeEdges.add(edgeKey(u, to))
        push(`松弛 ${NODES[u].label}→${NODES[to].label}：${old === INF ? '∞' : old} → ${dist[to]}`, distStr(dist, n))
      }
    }
  }
  push('Dijkstra 完成', distStr(dist, n))
  return frames
}

function distStr(dist: number[], n: number) {
  return dist.slice(0, n).map((d, i) => `${NODES[i].label}:${d === 1e9 ? '∞' : d}`).join('  ')
}

const NODE_COLOR: Record<NodeState, { fill: string; stroke: string; text: string }> = {
  unvisited: { fill: 'var(--bg-secondary)', stroke: 'var(--border)',  text: 'var(--text-muted)' },
  frontier:  { fill: '#ffa94d30',           stroke: '#ffa94d',        text: '#ffa94d' },
  visiting:  { fill: '#74c0fc30',           stroke: '#74c0fc',        text: '#74c0fc' },
  visited:   { fill: '#51cf6630',           stroke: '#51cf66',        text: '#51cf66' },
  path:      { fill: '#cc5de830',           stroke: '#cc5de8',        text: '#cc5de8' },
  start:     { fill: '#4d8fff30',           stroke: '#4d8fff',        text: '#4d8fff' },
  end:       { fill: '#ff6b6b30',           stroke: '#ff6b6b',        text: '#ff6b6b' },
}

const GRAPH_INFO: Record<GraphAlgoId, { name: string; time: string; space: string; desc: string }> = {
  bfs:      { name: 'BFS 广度优先', time: 'O(V+E)', space: 'O(V)', desc: '按层扩展，队列实现，最短路径（无权图）' },
  dfs:      { name: 'DFS 深度优先', time: 'O(V+E)', space: 'O(V)', desc: '沿路深入，栈/递归实现，拓扑排序/连通分量' },
  dijkstra: { name: 'Dijkstra',    time: 'O((V+E)logV)', space: 'O(V)', desc: '贪心松弛，最小堆，有权图单源最短路径' },
}

function genRandom(n: number) {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 90) + 10)
}

// ── Graph SVG ─────────────────────────────────────────────────────────────────
function GraphViz({ frame, algoId }: { frame: GraphFrame | null; algoId: GraphAlgoId }) {
  const defaultNS: NodeState[] = NODES.map((_, i) => i === 0 ? 'start' : i === 7 ? 'end' : 'unvisited')
  const nodeStates = frame ? frame.nodeStates : defaultNS
  const treeEdges = frame ? frame.treeEdges : new Set<string>()
  const pathEdges = frame ? frame.pathEdges : new Set<string>()

  return (
    <svg viewBox="0 0 640 260" style={{ width: '100%', maxWidth: 640, height: 'auto' }}>
      {/* Edges */}
      {EDGES.map(({ u, v, w }) => {
        const key = edgeKey(u, v)
        const isPath = pathEdges.has(key)
        const isTree = treeEdges.has(key)
        const n1 = NODES[u], n2 = NODES[v]
        const mx = (n1.x + n2.x) / 2, my = (n1.y + n2.y) / 2
        return (
          <g key={key}>
            <line x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y}
              stroke={isPath ? '#cc5de8' : isTree ? '#51cf66' : 'var(--border)'}
              strokeWidth={isPath ? 3 : isTree ? 2 : 1.5}
              strokeDasharray={isTree && !isPath ? '4 2' : undefined}
              opacity={isPath || isTree ? 1 : 0.5} />
            {algoId === 'dijkstra' && (
              <text x={mx} y={my - 5} textAnchor="middle" fontSize={10}
                fill={isPath ? '#cc5de8' : 'var(--text-muted)'}>{w}</text>
            )}
          </g>
        )
      })}
      {/* Nodes */}
      {NODES.map(node => {
        const s = nodeStates[node.id]
        const c = NODE_COLOR[s]
        return (
          <g key={node.id}>
            <circle cx={node.x} cy={node.y} r={22} fill={c.fill} stroke={c.stroke} strokeWidth={2} />
            <text x={node.x} y={node.y} textAnchor="middle" dominantBaseline="central"
              fontSize={13} fontWeight={700} fill={c.text}>{node.label}</text>
            {frame?.dist && frame.dist[node.id] < 1e9 && (
              <text x={node.x} y={node.y + 34} textAnchor="middle" fontSize={9}
                fill={c.text}>{frame.dist[node.id]}</text>
            )}
          </g>
        )
      })}
      {/* Legend */}
      {[['start','起点','#4d8fff'],['end','终点','#ff6b6b'],['frontier','队列中','#ffa94d'],
        ['visiting','访问中','#74c0fc'],['visited','已访问','#51cf66'],['path','最短路','#cc5de8']]
        .map(([, label, color], i) => (
        <g key={label} transform={`translate(${10 + i * 95}, 242)`}>
          <circle cx={6} cy={6} r={5} fill={`${color}30`} stroke={color} strokeWidth={1.5} />
          <text x={14} y={10} fontSize={9} fill="var(--text-muted)">{label}</text>
        </g>
      ))}
    </svg>
  )
}

// ── Interview problems ─────────────────────────────────────────────────────────
const SORT_PROBLEMS: Record<SortId, { no: number; title: string; diff: 'Easy'|'Medium'|'Hard'; key: string }[]> = {
  bubble:    [
    { no: 912,  title: 'Sort an Array',                 diff: 'Medium', key: '手写排序，理解比较交换' },
    { no: 283,  title: 'Move Zeroes',                   diff: 'Easy',   key: '双指针原地移动，冒泡思想' },
    { no: 75,   title: 'Sort Colors',                   diff: 'Medium', key: '三路分区（荷兰旗问题）' },
  ],
  selection: [
    { no: 215,  title: 'Kth Largest Element',           diff: 'Medium', key: '部分选择，用堆优化到 O(n log k)' },
    { no: 414,  title: 'Third Maximum Number',          diff: 'Easy',   key: '三次选择最大值' },
    { no: 1337, title: 'K Weakest Rows in a Matrix',   diff: 'Easy',   key: '按条件选择 K 个最小' },
  ],
  insertion: [
    { no: 147,  title: 'Insertion Sort List',           diff: 'Medium', key: '链表插入排序，经典实现' },
    { no: 75,   title: 'Sort Colors',                   diff: 'Medium', key: '插入思想：维护有序区间' },
    { no: 406,  title: 'Queue Reconstruction by Height',diff: 'Medium', key: '排序后按位置插入' },
  ],
  merge:     [
    { no: 88,   title: 'Merge Sorted Array',            diff: 'Easy',   key: '合并有序数组，逆向双指针' },
    { no: 21,   title: 'Merge Two Sorted Lists',        diff: 'Easy',   key: '合并有序链表' },
    { no: 315,  title: 'Count of Smaller Numbers',      diff: 'Hard',   key: '归并排序统计逆序对变体' },
    { no: 327,  title: 'Count of Range Sum',            diff: 'Hard',   key: '归并 + 前缀和统计' },
  ],
  quick:     [
    { no: 215,  title: 'Kth Largest Element',           diff: 'Medium', key: '快速选择 O(n) 平均，必考！' },
    { no: 75,   title: 'Sort Colors',                   diff: 'Medium', key: '三路快排（Lomuto / Hoare）' },
    { no: 973,  title: 'K Closest Points to Origin',   diff: 'Medium', key: '快速选择 + 欧式距离' },
    { no: 912,  title: 'Sort an Array',                 diff: 'Medium', key: '手写快排，注意随机化 pivot' },
  ],
  heap:      [
    { no: 215,  title: 'Kth Largest Element',           diff: 'Medium', key: '最小堆大小 K，O(n log k)' },
    { no: 347,  title: 'Top K Frequent Elements',       diff: 'Medium', key: '频率统计 + 堆排序' },
    { no: 23,   title: 'Merge K Sorted Lists',          diff: 'Hard',   key: '优先队列合并 K 路' },
    { no: 295,  title: 'Find Median from Data Stream',  diff: 'Hard',   key: '大根堆+小根堆维护中位数' },
  ],
}

const GRAPH_PROBLEMS: Record<string, { no: number; title: string; diff: 'Easy'|'Medium'|'Hard'; key: string }[]> = {
  bfs: [
    { no: 102, title: 'Binary Tree Level Order Traversal', diff: 'Medium', key: 'BFS 模板题，层序遍历' },
    { no: 200, title: 'Number of Islands',                 diff: 'Medium', key: 'BFS/DFS 连通分量，必考' },
    { no: 127, title: 'Word Ladder',                       diff: 'Hard',   key: '最短转换路径，BFS+哈希' },
    { no: 752, title: 'Open the Lock',                     diff: 'Medium', key: 'BFS 最短步数' },
    { no: 994, title: 'Rotting Oranges',                   diff: 'Medium', key: '多源 BFS 同时扩散' },
  ],
  dfs: [
    { no: 200, title: 'Number of Islands',                 diff: 'Medium', key: 'DFS 标记连通块' },
    { no: 130, title: 'Surrounded Regions',                diff: 'Medium', key: 'DFS 从边界逆向标记' },
    { no: 207, title: 'Course Schedule',                   diff: 'Medium', key: '拓扑排序（DFS + 入度）' },
    { no: 329, title: 'Longest Increasing Path in Matrix', diff: 'Hard',   key: 'DFS + 记忆化' },
  ],
  dijkstra: [
    { no: 743, title: 'Network Delay Time',                diff: 'Medium', key: 'Dijkstra 模板，单源最短路' },
    { no: 787, title: 'Cheapest Flights K Stops',          diff: 'Medium', key: 'Bellman-Ford / Dijkstra 变体' },
    { no: 1631,title: 'Path With Min Effort',              diff: 'Medium', key: '最小化最大边权，Dijkstra' },
  ],
  'a*': [
    { no: 1263,title: 'Minimum Moves to Box to Target',    diff: 'Hard',   key: 'A* 启发式搜索' },
    { no: 675, title: 'Cut Off Trees for Golf Event',      diff: 'Hard',   key: 'BFS 多次最短路' },
  ],
}

const DIFF_COLOR = { Easy: '#56d364', Medium: '#ffa657', Hard: '#ff7b72' }

function InterviewPanel({ sortId, graphAlgoId, mode }: { sortId: SortId; graphAlgoId: string; mode: 'sort'|'graph' }) {
  const problems = mode === 'sort'
    ? (SORT_PROBLEMS[sortId] ?? [])
    : (GRAPH_PROBLEMS[graphAlgoId] ?? [])

  if (problems.length === 0) return (
    <div style={{ padding: '20px', color: 'var(--text-muted)', fontSize: 12 }}>该算法暂无题目</div>
  )

  return (
    <div style={{ padding: '12px 16px', overflow: 'auto', height: '100%' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
        📝 相关面试题
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {problems.map(p => (
          <div key={p.no} style={{
            background: 'var(--bg-secondary)', borderRadius: 7, padding: '10px 12px',
            border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 32 }}>#{p.no}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{p.title}</span>
              <span style={{
                fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 700,
                background: `${DIFF_COLOR[p.diff]}20`, color: DIFF_COLOR[p.diff],
              }}>{p.diff}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 40 }}>💡 {p.key}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 7, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>🎯 面试考点</div>
        {mode === 'sort' ? (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            <strong style={{ color: 'var(--text-primary)' }}>{SORT_INFO[sortId].name}</strong>
            &nbsp;— 时间 <code style={{ color: '#ffa657' }}>{SORT_INFO[sortId].time}</code>
            &nbsp;空间 <code style={{ color: '#79c0ff' }}>{SORT_INFO[sortId].space}</code>
            &nbsp;稳定 <code style={{ color: SORT_INFO[sortId].stable ? '#56d364' : '#ff7b72' }}>{SORT_INFO[sortId].stable ? '✓' : '✗'}</code>
            <br />{SORT_INFO[sortId].desc}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            {graphAlgoId === 'bfs' && '广度优先搜索 — 最短路（无权图）、多源扩散、层序遍历'}
            {graphAlgoId === 'dfs' && '深度优先搜索 — 连通分量、拓扑排序、记忆化递归'}
            {graphAlgoId === 'dijkstra' && 'Dijkstra — 有权图单源最短路，O((V+E)log V)，不支持负权边'}
            {graphAlgoId === 'a*' && 'A* — 启发式搜索，f(n)=g(n)+h(n)，h 为启发函数'}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AlgoView() {
  const [mode, setMode] = useState<'sort' | 'graph'>('sort')
  const isMobile = useMobile()

  // Sort state
  const [sortId, setSortId] = useState<SortId>('bubble')
  const [size, setSize] = useState(20)
  const [arr, setArr] = useState(() => genRandom(20))
  const [sortFrames, setSortFrames] = useState<SortFrame[]>([])
  const [sortIdx, setSortIdx] = useState(0)
  const [sortPlaying, setSortPlaying] = useState(false)
  const [speed, setSpeed] = useState(100)
  const sortTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Graph state
  const [graphAlgoId, setGraphAlgoId] = useState<GraphAlgoId>('bfs')
  const [graphStart, setGraphStart] = useState(0)
  const [graphEnd, setGraphEnd] = useState(7)
  const [graphFrames, setGraphFrames] = useState<GraphFrame[]>([])
  const [graphIdx, setGraphIdx] = useState(0)
  const [graphPlaying, setGraphPlaying] = useState(false)
  const graphTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const resetSort = useCallback(() => {
    const a = genRandom(size); setArr(a)
    setSortFrames([]); setSortIdx(0); setSortPlaying(false)
  }, [size])

  const buildSort = useCallback(() => {
    const fs = generateSortFrames(sortId, arr)
    setSortFrames(fs); setSortIdx(0); setSortPlaying(false)
  }, [sortId, arr])

  useEffect(() => {
    if (!sortPlaying || sortFrames.length === 0) return
    sortTimerRef.current = setInterval(() => {
      setSortIdx(i => {
        if (i >= sortFrames.length - 1) { setSortPlaying(false); return i }
        return i + 1
      })
    }, Math.max(30, 400 - speed * 3.7))
    return () => { if (sortTimerRef.current) clearInterval(sortTimerRef.current) }
  }, [sortPlaying, sortFrames.length, speed])

  const buildGraph = useCallback(() => {
    let fs: GraphFrame[] = []
    if (graphAlgoId === 'bfs') fs = generateBFS(graphStart, graphEnd)
    else if (graphAlgoId === 'dfs') fs = generateDFS(graphStart, graphEnd)
    else fs = generateDijkstra(graphStart, graphEnd)
    setGraphFrames(fs); setGraphIdx(0); setGraphPlaying(false)
  }, [graphAlgoId, graphStart, graphEnd])

  useEffect(() => {
    if (!graphPlaying || graphFrames.length === 0) return
    graphTimerRef.current = setInterval(() => {
      setGraphIdx(i => {
        if (i >= graphFrames.length - 1) { setGraphPlaying(false); return i }
        return i + 1
      })
    }, 600)
    return () => { if (graphTimerRef.current) clearInterval(graphTimerRef.current) }
  }, [graphPlaying, graphFrames.length])

  // Sort render
  const curSort = sortFrames.length > 0 ? sortFrames[sortIdx] : null
  const displayArr = curSort ? curSort.arr : arr
  const displayColors = curSort ? curSort.colors : Array(displayArr.length).fill('default')
  const maxVal = Math.max(...displayArr, 1)
  const sortInfo = SORT_INFO[sortId]

  // Graph render
  const curGraph = graphFrames.length > 0 ? graphFrames[graphIdx] : null
  const graphInfo = GRAPH_INFO[graphAlgoId]

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{
        width: isMobile ? '100%' : 190, flexShrink: 0,
        borderRight: isMobile ? 'none' : '1px solid var(--border)',
        borderBottom: isMobile ? '1px solid var(--border)' : 'none',
        background: 'var(--bg-secondary)', padding: '8px',
        overflowX: isMobile ? 'auto' : undefined,
        overflowY: isMobile ? 'hidden' : 'auto',
        maxHeight: isMobile ? 120 : undefined,
        display: isMobile ? 'flex' : 'block',
        gap: isMobile ? 8 : undefined,
        alignItems: isMobile ? 'flex-start' : undefined,
        scrollbarWidth: 'none',
      }}>
        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
          {(['sort','graph'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '5px 4px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: mode === m ? '#ffa94d' : 'var(--bg-elevated)',
              color: mode === m ? '#fff' : 'var(--text-muted)',
            }}>{m === 'sort' ? '📊 排序' : '🕸 图算法'}</button>
          ))}
        </div>

        {mode === 'sort' ? (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 1 }}>排序算法</div>
            {(Object.keys(SORT_INFO) as SortId[]).map(id => {
              const inf = SORT_INFO[id]
              return (
                <button key={id} onClick={() => { setSortId(id); setSortFrames([]); setSortIdx(0); setSortPlaying(false) }} style={{
                  display: 'block', width: '100%', marginBottom: 4, padding: '8px 10px',
                  background: sortId === id ? 'rgba(255,169,77,0.15)' : 'transparent',
                  border: sortId === id ? '1px solid #ffa94d' : '1px solid transparent',
                  color: sortId === id ? '#ffa94d' : 'var(--text-secondary)',
                  borderRadius: 7, cursor: 'pointer', fontSize: 12, textAlign: 'left',
                }}>
                  <div style={{ fontWeight: 600 }}>{inf.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{inf.time} · {inf.stable ? '稳定' : '不稳定'}</div>
                </button>
              )
            })}
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', margin: '16px 0 8px', letterSpacing: 1 }}>颜色图例</div>
            {(Object.entries(BAR_COLOR) as [SortColor, string][]).filter(([c]) => c !== 'default').map(([c, col]) => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: col }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{{ comparing:'比较中', swapping:'交换中', sorted:'已排序', pivot:'基准', selected:'已选中', default:'' }[c]}</span>
              </div>
            ))}
          </>
        ) : (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 1 }}>图算法</div>
            {(Object.keys(GRAPH_INFO) as GraphAlgoId[]).map(id => {
              const inf = GRAPH_INFO[id]
              return (
                <button key={id} onClick={() => { setGraphAlgoId(id); setGraphFrames([]); setGraphIdx(0); setGraphPlaying(false) }} style={{
                  display: 'block', width: '100%', marginBottom: 4, padding: '8px 10px',
                  background: graphAlgoId === id ? 'rgba(100,180,255,0.15)' : 'transparent',
                  border: graphAlgoId === id ? '1px solid #74c0fc' : '1px solid transparent',
                  color: graphAlgoId === id ? '#74c0fc' : 'var(--text-secondary)',
                  borderRadius: 7, cursor: 'pointer', fontSize: 12, textAlign: 'left',
                }}>
                  <div style={{ fontWeight: 600 }}>{inf.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{inf.time}</div>
                </button>
              )
            })}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>起点 / 终点</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {NODES.map(n => (
                  <button key={n.id} onClick={() => {
                    if (n.id === graphEnd) return
                    setGraphStart(n.id); setGraphFrames([]); setGraphIdx(0)
                  }} style={{
                    width: 28, height: 28, borderRadius: '50%', border: '1.5px solid',
                    borderColor: n.id === graphStart ? '#4d8fff' : n.id === graphEnd ? '#ff6b6b' : 'var(--border)',
                    background: n.id === graphStart ? '#4d8fff30' : n.id === graphEnd ? '#ff6b6b30' : 'transparent',
                    color: n.id === graphStart ? '#4d8fff' : n.id === graphEnd ? '#ff6b6b' : 'var(--text-muted)',
                    cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  }}>{n.label}</button>
                ))}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>蓝=起点，红=终点（右击切换终点）</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                {NODES.map(n => (
                  <button key={n.id} onContextMenu={e => { e.preventDefault(); if (n.id !== graphStart) { setGraphEnd(n.id); setGraphFrames([]); setGraphIdx(0) } }} onClick={() => { if (n.id !== graphStart) { setGraphEnd(n.id); setGraphFrames([]); setGraphIdx(0) } }} style={{
                    width: 28, height: 28, borderRadius: '50%', border: '1.5px solid',
                    borderColor: n.id === graphEnd ? '#ff6b6b' : 'var(--border)',
                    background: n.id === graphEnd ? '#ff6b6b30' : 'transparent',
                    color: n.id === graphEnd ? '#ff6b6b' : 'var(--text-muted)',
                    cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    display: n.id === graphStart ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{n.label}</button>
                ))}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>点击上排选起点，下排选终点</div>
            </div>
          </>
        )}
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Info bar */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 20, alignItems: 'center', background: 'var(--bg-secondary)', flexWrap: 'wrap' }}>
          {mode === 'sort' ? (
            <>
              <div>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#ffa94d' }}>{sortInfo.name}</span>
                <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--text-muted)' }}>{sortInfo.desc}</span>
              </div>
              <div style={{ display: 'flex', gap: 12, marginLeft: 'auto', flexWrap: 'wrap' }}>
                {[['时间', sortInfo.time], ['空间', sortInfo.space], ['稳定', sortInfo.stable ? '✓' : '✗']].map(([l, v]) => (
                  <div key={l} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{l}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: v === '✓' ? '#51cf66' : v === '✗' ? '#ff6b6b' : '#74c0fc' }}>{v}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#74c0fc' }}>{graphInfo.name}</span>
                <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--text-muted)' }}>{graphInfo.desc}</span>
              </div>
              <div style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}>
                {[['时间', graphInfo.time], ['空间', graphInfo.space]].map(([l, v]) => (
                  <div key={l} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{l}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#74c0fc' }}>{v}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Controls */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {mode === 'sort' ? (
            <>
              <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>元素数量:
                <input type="range" min={8} max={50} value={size} onChange={e => { setSize(+e.target.value); resetSort() }} style={{ marginLeft: 8, width: 80 }} />
                <span style={{ marginLeft: 4 }}>{size}</span>
              </label>
              <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>速度:
                <input type="range" min={1} max={100} value={speed} onChange={e => setSpeed(+e.target.value)} style={{ marginLeft: 8, width: 80 }} />
              </label>
              <button onClick={resetSort} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>🎲 随机</button>
              <button onClick={buildSort} style={{ padding: '5px 14px', borderRadius: 6, border: '1px solid #ffa94d', background: 'rgba(255,169,77,0.15)', color: '#ffa94d', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>生成步骤</button>
              {sortFrames.length > 0 && (
                <>
                  <button onClick={() => setSortIdx(i => Math.max(0, i-1))} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>◀</button>
                  <button onClick={() => setSortPlaying(p => !p)} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: sortPlaying ? '#ff6b6b' : '#51cf66', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                    {sortPlaying ? '⏸' : '▶'}
                  </button>
                  <button onClick={() => setSortIdx(i => Math.min(sortFrames.length-1, i+1))} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>▶</button>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sortIdx+1} / {sortFrames.length}</span>
                </>
              )}
            </>
          ) : (
            <>
              <button onClick={buildGraph} style={{ padding: '5px 14px', borderRadius: 6, border: '1px solid #74c0fc', background: 'rgba(116,192,252,0.15)', color: '#74c0fc', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>▶ 开始演示</button>
              {graphFrames.length > 0 && (
                <>
                  <button onClick={() => setGraphIdx(i => Math.max(0, i-1))} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>◀</button>
                  <button onClick={() => setGraphPlaying(p => !p)} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: graphPlaying ? '#ff6b6b' : '#51cf66', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                    {graphPlaying ? '⏸' : '▶'}
                  </button>
                  <button onClick={() => setGraphIdx(i => Math.min(graphFrames.length-1, i+1))} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>▶</button>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{graphIdx+1} / {graphFrames.length}</span>
                </>
              )}
            </>
          )}
        </div>

        {/* Visualization */}
        <div style={{ flex: 1, padding: '16px 20px 8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {mode === 'sort' ? (
            <>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 2, minHeight: 0 }}>
                {displayArr.map((v, i) => {
                  const color = BAR_COLOR[displayColors[i] as SortColor] || BAR_COLOR.default
                  const heightPct = (v / maxVal) * 100
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                      <div style={{ width: '100%', height: `${heightPct}%`, minHeight: 4, background: color, borderRadius: '3px 3px 0 0', transition: 'height 0.05s, background 0.1s', boxShadow: displayColors[i] !== 'default' ? `0 0 6px ${color}80` : 'none' }} />
                      {displayArr.length <= 25 && <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{v}</div>}
                    </div>
                  )
                })}
              </div>
              <div style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {curSort ? (
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', background: 'var(--bg-secondary)', padding: '5px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>{curSort.desc}</div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>点击「生成步骤」后播放排序动画</div>
                )}
              </div>
              {sortFrames.length > 0 && (
                <input type="range" min={0} max={sortFrames.length-1} value={sortIdx}
                  onChange={e => { setSortIdx(+e.target.value); setSortPlaying(false) }}
                  style={{ width: '100%', marginTop: 4 }} />
              )}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)', padding: 16, display: 'flex', justifyContent: 'center' }}>
                <GraphViz frame={curGraph} algoId={graphAlgoId} />
              </div>
              {/* Step info */}
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)', padding: '10px 16px' }}>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}>
                  {curGraph ? curGraph.desc : `选择起点终点，点击「▶ 开始演示」`}
                </div>
                {curGraph?.extra && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{curGraph.extra}</div>
                )}
              </div>
              {graphFrames.length > 0 && (
                <input type="range" min={0} max={graphFrames.length-1} value={graphIdx}
                  onChange={e => { setGraphIdx(+e.target.value); setGraphPlaying(false) }}
                  style={{ width: '100%' }} />
              )}
            </div>
          )}
        </div>
      </div>
      {/* Interview panel — right column, only on desktop */}
      {!isMobile && (
        <div style={{ width: 280, flexShrink: 0, borderLeft: '1px solid var(--border)', overflow: 'auto' }}>
          <InterviewPanel sortId={sortId} graphAlgoId={graphAlgoId} mode={mode} />
        </div>
      )}
    </div>
  )
}
