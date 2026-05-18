import { useState } from 'react'

type Segment = 'text' | 'rodata' | 'data' | 'bss' | 'heap' | 'stack'

const SNIPPETS: { label: string; code: string; annotations: { seg: Segment; name: string; desc: string }[] }[] = [
  {
    label: '基本变量',
    code: `#include <stdio.h>
#include <stdlib.h>

const char *msg = "hello";   // .rodata
int global = 42;             // .data
int uninit;                  // .bss

int main() {
    int local = 10;          // stack
    int *heap = malloc(16);  // heap
    heap[0] = 99;
    free(heap);
    return 0;
}`,
    annotations: [
      { seg: 'rodata', name: 'msg → "hello"', desc: '只读字符串常量，存于 .rodata 段' },
      { seg: 'data',   name: 'global = 42',  desc: '已初始化全局变量，存于 .data 段' },
      { seg: 'bss',    name: 'uninit = 0',   desc: '未初始化全局变量，存于 .bss 段（程序启动时清零）' },
      { seg: 'text',   name: 'main()',        desc: '函数代码指令，存于 .text 段（只读、可执行）' },
      { seg: 'stack',  name: 'local = 10',   desc: '局部变量，分配在栈帧上，函数返回后自动释放' },
      { seg: 'heap',   name: 'malloc(16)',    desc: '动态分配内存，需要 free() 手动释放' },
    ],
  },
  {
    label: '函数调用栈',
    code: `int add(int a, int b) {
    int result = a + b;  // stack frame: add
    return result;
}

int mul(int x, int y) {
    int r = add(x, y);  // stack frame: mul
    return r * y;
}

int main() {
    int ans = mul(3, 4); // stack frame: main
    return ans;
}`,
    annotations: [
      { seg: 'stack', name: 'main frame',  desc: 'main 的栈帧：保存返回地址、ans 变量' },
      { seg: 'stack', name: 'mul frame',   desc: 'mul 的栈帧：x, y, r 局部变量' },
      { seg: 'stack', name: 'add frame',   desc: 'add 的栈帧：a, b, result 局部变量（最顶端）' },
      { seg: 'text',  name: 'add()/mul()/main()', desc: '三个函数的机器码均在 .text 段' },
    ],
  },
  {
    label: '指针与内存',
    code: `#include <stdlib.h>
#include <string.h>

typedef struct {
    int id;
    char name[32];
} User;

User *create(int id, const char *n) {
    User *u = malloc(sizeof(User)); // heap
    u->id = id;
    strncpy(u->name, n, 31);
    return u;
}

int main() {
    User *u = create(1, "Alice"); // ptr on stack
    free(u);
}`,
    annotations: [
      { seg: 'heap',  name: 'User struct',  desc: 'sizeof(User)=36 bytes 分配在堆上，生命周期跨越函数调用' },
      { seg: 'stack', name: 'u (pointer)',  desc: '指针变量 u 本身在栈上，只占 8 bytes（64位）' },
      { seg: 'rodata', name: '"Alice"',     desc: '字符串字面量在 .rodata，只读' },
      { seg: 'text',  name: 'create()',     desc: '函数代码在 .text' },
    ],
  },
]

const SEG_CONFIG: Record<Segment, { label: string; color: string; addr: string; desc: string }> = {
  text:   { label: '.text',   color: '#4d8fff', addr: '0x400000',  desc: '可执行代码（只读）' },
  rodata: { label: '.rodata', color: '#a371f7', addr: '0x401000',  desc: '只读常量数据' },
  data:   { label: '.data',   color: '#3fb950', addr: '0x402000',  desc: '已初始化全局/静态变量' },
  bss:    { label: '.bss',    color: '#58a6ff', addr: '0x403000',  desc: '未初始化全局/静态变量' },
  heap:   { label: 'heap ↑',  color: '#ffa657', addr: '0x10000000', desc: '动态分配（malloc/free），向高地址增长' },
  stack:  { label: 'stack ↓', color: '#ff6b6b', addr: '0x7fff0000', desc: '函数调用栈，向低地址增长' },
}

const SEG_ORDER: Segment[] = ['stack', 'heap', 'bss', 'data', 'rodata', 'text']
const SEG_HEIGHTS: Record<Segment, number> = { stack: 100, heap: 80, bss: 50, data: 50, rodata: 40, text: 70 }

export default function MemoryView() {
  const [snap, setSnap] = useState(0)
  const [hovSeg, setHovSeg] = useState<Segment | null>(null)
  const [selAnnot, setSelAnnot] = useState<number | null>(null)
  const snippet = SNIPPETS[snap]

  const highlightedSeg = selAnnot !== null ? snippet.annotations[selAnnot].seg : hovSeg

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: 200, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg-secondary)', padding: '12px 8px', overflowY: 'auto' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 1 }}>示例程序</div>
        {SNIPPETS.map((s, i) => (
          <button key={i} onClick={() => { setSnap(i); setSelAnnot(null) }} style={{
            display: 'block', width: '100%', marginBottom: 4, padding: '8px 10px',
            background: snap === i ? 'rgba(63,185,80,0.15)' : 'transparent',
            border: snap === i ? '1px solid #3fb950' : '1px solid transparent',
            color: snap === i ? '#3fb950' : 'var(--text-secondary)',
            borderRadius: 7, cursor: 'pointer', fontSize: 12, textAlign: 'left',
          }}>{s.label}</button>
        ))}

        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', margin: '16px 0 8px', letterSpacing: 1 }}>内存段图例</div>
        {SEG_ORDER.map(seg => {
          const cfg = SEG_CONFIG[seg]
          return (
            <div key={seg} onMouseEnter={() => setHovSeg(seg)} onMouseLeave={() => setHovSeg(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px', borderRadius: 5,
                background: highlightedSeg === seg ? `${cfg.color}20` : 'transparent', cursor: 'pointer', marginBottom: 2 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: cfg.color, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: cfg.color }}>{cfg.label}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{cfg.addr}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Code */}
      <div style={{ width: 320, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>C 源码</div>
        <pre style={{ flex: 1, margin: 0, padding: '14px 16px', overflow: 'auto', fontSize: 12, lineHeight: 1.7,
          fontFamily: 'monospace', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
          {snippet.code}
        </pre>
        {/* Annotations */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '8px 10px', background: 'var(--bg-secondary)', overflowY: 'auto', maxHeight: 200 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>变量/符号分配</div>
          {snippet.annotations.map((a, i) => {
            const cfg = SEG_CONFIG[a.seg]
            return (
              <div key={i} onClick={() => setSelAnnot(selAnnot === i ? null : i)}
                onMouseEnter={() => setHovSeg(a.seg)} onMouseLeave={() => setHovSeg(null)}
                style={{ padding: '5px 8px', borderRadius: 5, cursor: 'pointer', marginBottom: 3,
                  background: (selAnnot === i || highlightedSeg === a.seg) ? `${cfg.color}20` : 'transparent',
                  border: selAnnot === i ? `1px solid ${cfg.color}` : '1px solid transparent' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: cfg.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: cfg.color }}>{a.name}</span>
                </div>
                {selAnnot === i && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, paddingLeft: 14 }}>{a.desc}</div>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Memory diagram */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 16, color: 'var(--text-primary)' }}>虚拟地址空间</h3>
        <p style={{ margin: '0 0 20px', fontSize: 11, color: 'var(--text-muted)' }}>Linux x86-64 进程内存布局（地址从高到低）</p>

        <div style={{ width: 280, position: 'relative' }}>
          {/* High address label */}
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right', marginBottom: 2 }}>高地址 0xFFFFFFFF</div>

          {SEG_ORDER.map((seg, idx) => {
            const cfg = SEG_CONFIG[seg]
            const h = SEG_HEIGHTS[seg]
            const isHighlighted = highlightedSeg === seg
            return (
              <div key={seg}>
                <div onMouseEnter={() => setHovSeg(seg)} onMouseLeave={() => setHovSeg(null)}
                  onClick={() => setSelAnnot(null)}
                  style={{
                    height: h, background: isHighlighted ? `${cfg.color}30` : `${cfg.color}14`,
                    border: `1px solid ${isHighlighted ? cfg.color : cfg.color + '60'}`,
                    borderRadius: idx === 0 ? '8px 8px 0 0' : idx === SEG_ORDER.length - 1 ? '0 0 8px 8px' : 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 12px', cursor: 'pointer', transition: 'all 0.15s',
                    boxShadow: isHighlighted ? `inset 0 0 0 2px ${cfg.color}` : 'none',
                  }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: cfg.color }}>{cfg.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{cfg.desc}</div>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>
                    <div>{cfg.addr}</div>
                    {/* Animated items */}
                    {isHighlighted && snippet.annotations.filter(a => a.seg === seg).map((a, i) => (
                      <div key={i} style={{ color: cfg.color, fontSize: 10 }}>{a.name}</div>
                    ))}
                  </div>
                </div>
                {/* Gap between heap and stack */}
                {seg === 'heap' && (
                  <div style={{ height: 30, background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.03) 4px, rgba(255,255,255,0.03) 8px)',
                    border: '1px dashed var(--border)', borderTop: 'none', borderBottom: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>… 未映射 …</span>
                  </div>
                )}
              </div>
            )
          })}

          {/* Low address label */}
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>低地址 0x00000000</div>
        </div>

        {/* Key rules */}
        <div style={{ marginTop: 24, maxWidth: 400, width: '100%' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: 1 }}>关键规则</div>
          {[
            ['🔒', 'text 和 rodata 是只读的，写入会产生段错误 (SIGSEGV)'],
            ['⬆️', 'heap 向高地址增长（brk/mmap）'],
            ['⬇️', 'stack 向低地址增长，默认上限 8MB'],
            ['♻️', 'bss 段在加载时由内核清零（不占磁盘空间）'],
            ['💡', '局部变量过大（如 int arr[1000000]）会导致栈溢出'],
          ].map(([icon, text]) => (
            <div key={text as string} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <span>{icon}</span><span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
