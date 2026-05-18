import { useState } from 'react'

interface Instruction {
  offset: string
  bytes: string
  mnemonic: string
  operands: string
  desc: string
  category: 'data' | 'arith' | 'logic' | 'control' | 'stack' | 'simd'
}

interface Example {
  label: string
  c_code: string
  asm: Instruction[]
  notes: string[]
}

const EXAMPLES: Example[] = [
  {
    label: '函数调用',
    c_code: `int add(int a, int b) {
    return a + b;
}

int main() {
    return add(3, 7);
}`,
    asm: [
      { offset: '0000', bytes: '55',           mnemonic: 'push',  operands: 'rbp',              desc: '保存调用者的基址指针', category: 'stack' },
      { offset: '0001', bytes: '48 89 e5',     mnemonic: 'mov',   operands: 'rbp, rsp',          desc: '建立新栈帧', category: 'data' },
      { offset: '0004', bytes: '89 7d fc',     mnemonic: 'mov',   operands: '[rbp-4], edi',      desc: '存参数 a 到栈', category: 'data' },
      { offset: '0007', bytes: '89 75 f8',     mnemonic: 'mov',   operands: '[rbp-8], esi',      desc: '存参数 b 到栈', category: 'data' },
      { offset: '000a', bytes: '8b 45 fc',     mnemonic: 'mov',   operands: 'eax, [rbp-4]',      desc: '加载 a 到 eax', category: 'data' },
      { offset: '000d', bytes: '03 45 f8',     mnemonic: 'add',   operands: 'eax, [rbp-8]',      desc: '计算 a + b', category: 'arith' },
      { offset: '0010', bytes: '5d',           mnemonic: 'pop',   operands: 'rbp',              desc: '恢复调用者基址指针', category: 'stack' },
      { offset: '0011', bytes: 'c3',           mnemonic: 'ret',   operands: '',                  desc: '返回（eax 存返回值）', category: 'control' },
      { offset: '0020', bytes: '55',           mnemonic: 'push',  operands: 'rbp',              desc: 'main: 保存 rbp', category: 'stack' },
      { offset: '0021', bytes: '48 89 e5',     mnemonic: 'mov',   operands: 'rbp, rsp',          desc: 'main: 建立栈帧', category: 'data' },
      { offset: '0024', bytes: 'be 07 00 00 00', mnemonic: 'mov', operands: 'esi, 7',           desc: '第2个参数 b=7', category: 'data' },
      { offset: '0029', bytes: 'bf 03 00 00 00', mnemonic: 'mov', operands: 'edi, 3',           desc: '第1个参数 a=3', category: 'data' },
      { offset: '002e', bytes: 'e8 cd ff ff ff', mnemonic: 'call', operands: 'add',             desc: '调用 add 函数', category: 'control' },
      { offset: '0033', bytes: '5d',           mnemonic: 'pop',   operands: 'rbp',              desc: '恢复 rbp', category: 'stack' },
      { offset: '0034', bytes: 'c3',           mnemonic: 'ret',   operands: '',                  desc: '返回', category: 'control' },
    ],
    notes: [
      'System V AMD64 ABI: 前6个整数参数用 rdi, rsi, rdx, rcx, r8, r9 传递',
      '返回值存在 rax/eax 寄存器',
      'call 指令自动把下一条指令地址压栈（返回地址）',
      'ret 指令从栈顶弹出返回地址并跳转',
    ],
  },
  {
    label: 'if/else 分支',
    c_code: `int max(int a, int b) {
    if (a > b)
        return a;
    else
        return b;
}`,
    asm: [
      { offset: '0000', bytes: '55',           mnemonic: 'push',  operands: 'rbp',              desc: '保存 rbp', category: 'stack' },
      { offset: '0001', bytes: '48 89 e5',     mnemonic: 'mov',   operands: 'rbp, rsp',          desc: '建立栈帧', category: 'data' },
      { offset: '0004', bytes: '89 7d fc',     mnemonic: 'mov',   operands: '[rbp-4], edi',      desc: '存 a', category: 'data' },
      { offset: '0007', bytes: '89 75 f8',     mnemonic: 'mov',   operands: '[rbp-8], esi',      desc: '存 b', category: 'data' },
      { offset: '000a', bytes: '8b 45 fc',     mnemonic: 'mov',   operands: 'eax, [rbp-4]',      desc: '加载 a', category: 'data' },
      { offset: '000d', bytes: '3b 45 f8',     mnemonic: 'cmp',   operands: 'eax, [rbp-8]',      desc: '比较 a 和 b，设置 FLAGS', category: 'arith' },
      { offset: '0010', bytes: '7e 07',        mnemonic: 'jle',   operands: '.L1',               desc: '如果 a <= b 则跳转（else 分支）', category: 'control' },
      { offset: '0012', bytes: '8b 45 fc',     mnemonic: 'mov',   operands: 'eax, [rbp-4]',      desc: 'if 分支: 返回 a', category: 'data' },
      { offset: '0015', bytes: 'eb 05',        mnemonic: 'jmp',   operands: '.L2',               desc: '跳过 else 分支', category: 'control' },
      { offset: '0017', bytes: '8b 45 f8',     mnemonic: 'mov',   operands: 'eax, [rbp-8]',      desc: '.L1: else 分支: 返回 b', category: 'data' },
      { offset: '001a', bytes: '5d',           mnemonic: 'pop',   operands: 'rbp',              desc: '.L2: 恢复 rbp', category: 'stack' },
      { offset: '001b', bytes: 'c3',           mnemonic: 'ret',   operands: '',                  desc: '返回', category: 'control' },
    ],
    notes: [
      'cmp 指令做减法但不存结果，只更新 EFLAGS（ZF/SF/OF/CF）',
      'jle = jump if less or equal，根据 SF XOR OF 和 ZF 跳转',
      '条件码: JE/JNE/JL/JG/JLE/JGE/JA/JB 等对应有符号/无符号比较',
    ],
  },
  {
    label: 'for 循环',
    c_code: `int sum(int n) {
    int s = 0;
    for (int i = 1; i <= n; i++)
        s += i;
    return s;
}`,
    asm: [
      { offset: '0000', bytes: '55',           mnemonic: 'push',  operands: 'rbp',              desc: '保存 rbp', category: 'stack' },
      { offset: '0001', bytes: '48 89 e5',     mnemonic: 'mov',   operands: 'rbp, rsp',          desc: '建立栈帧', category: 'data' },
      { offset: '0004', bytes: '89 7d ec',     mnemonic: 'mov',   operands: '[rbp-20], edi',     desc: '存参数 n', category: 'data' },
      { offset: '0007', bytes: 'c7 45 f8 00 00 00 00', mnemonic: 'mov', operands: '[rbp-8], 0', desc: 'int s = 0', category: 'data' },
      { offset: '000e', bytes: 'c7 45 fc 01 00 00 00', mnemonic: 'mov', operands: '[rbp-4], 1', desc: 'int i = 1', category: 'data' },
      { offset: '0015', bytes: '8b 45 fc',     mnemonic: 'mov',   operands: 'eax, [rbp-4]',      desc: '.LOOP_CHECK: 加载 i', category: 'data' },
      { offset: '0018', bytes: '3b 45 ec',     mnemonic: 'cmp',   operands: 'eax, [rbp-20]',     desc: '比较 i 和 n', category: 'arith' },
      { offset: '001b', bytes: '7f 0d',        mnemonic: 'jg',    operands: '.LOOP_END',         desc: '如果 i > n 则退出循环', category: 'control' },
      { offset: '001d', bytes: '8b 45 fc',     mnemonic: 'mov',   operands: 'eax, [rbp-4]',      desc: '加载 i', category: 'data' },
      { offset: '0020', bytes: '01 45 f8',     mnemonic: 'add',   operands: '[rbp-8], eax',      desc: 's += i', category: 'arith' },
      { offset: '0023', bytes: 'ff 45 fc',     mnemonic: 'inc',   operands: '[rbp-4]',           desc: 'i++ (i = i+1)', category: 'arith' },
      { offset: '0026', bytes: 'eb ed',        mnemonic: 'jmp',   operands: '.LOOP_CHECK',       desc: '跳回循环条件检查', category: 'control' },
      { offset: '0028', bytes: '8b 45 f8',     mnemonic: 'mov',   operands: 'eax, [rbp-8]',      desc: '.LOOP_END: 加载 s', category: 'data' },
      { offset: '002b', bytes: '5d',           mnemonic: 'pop',   operands: 'rbp',              desc: '恢复 rbp', category: 'stack' },
      { offset: '002c', bytes: 'c3',           mnemonic: 'ret',   operands: '',                  desc: '返回 s', category: 'control' },
    ],
    notes: [
      '循环编译为: 初始化 → 检查条件(jg 退出) → 循环体 → i++ → 跳回检查',
      'inc 指令等价于 add reg, 1，但更短（1字节 vs 3字节）',
      '-O2 优化后 GCC 会用 lea 和寄存器替代内存访问，消除栈变量',
    ],
  },
  {
    label: '指针操作',
    c_code: `void swap(int *a, int *b) {
    int t = *a;
    *a = *b;
    *b = t;
}`,
    asm: [
      { offset: '0000', bytes: '55',           mnemonic: 'push',  operands: 'rbp',              desc: '保存 rbp', category: 'stack' },
      { offset: '0001', bytes: '48 89 e5',     mnemonic: 'mov',   operands: 'rbp, rsp',          desc: '建立栈帧', category: 'data' },
      { offset: '0004', bytes: '48 89 7d f8',  mnemonic: 'mov',   operands: '[rbp-8], rdi',      desc: '存指针 a（地址）', category: 'data' },
      { offset: '0008', bytes: '48 89 75 f0',  mnemonic: 'mov',   operands: '[rbp-16], rsi',     desc: '存指针 b（地址）', category: 'data' },
      { offset: '000c', bytes: '48 8b 45 f8',  mnemonic: 'mov',   operands: 'rax, [rbp-8]',      desc: '加载指针 a 的值（地址）', category: 'data' },
      { offset: '0010', bytes: '8b 00',        mnemonic: 'mov',   operands: 'eax, [rax]',        desc: '解引用 *a → t', category: 'data' },
      { offset: '0012', bytes: '89 45 fc',     mnemonic: 'mov',   operands: '[rbp-4], eax',      desc: '存 t', category: 'data' },
      { offset: '0015', bytes: '48 8b 45 f0',  mnemonic: 'mov',   operands: 'rax, [rbp-16]',     desc: '加载指针 b', category: 'data' },
      { offset: '0019', bytes: '8b 10',        mnemonic: 'mov',   operands: 'edx, [rax]',        desc: '解引用 *b', category: 'data' },
      { offset: '001b', bytes: '48 8b 45 f8',  mnemonic: 'mov',   operands: 'rax, [rbp-8]',      desc: '加载指针 a', category: 'data' },
      { offset: '001f', bytes: '89 10',        mnemonic: 'mov',   operands: '[rax], edx',        desc: '*a = *b', category: 'data' },
      { offset: '0021', bytes: '48 8b 45 f0',  mnemonic: 'mov',   operands: 'rax, [rbp-16]',     desc: '加载指针 b', category: 'data' },
      { offset: '0025', bytes: '8b 55 fc',     mnemonic: 'mov',   operands: 'edx, [rbp-4]',      desc: '加载 t', category: 'data' },
      { offset: '0028', bytes: '89 10',        mnemonic: 'mov',   operands: '[rax], edx',        desc: '*b = t', category: 'data' },
      { offset: '002a', bytes: '5d',           mnemonic: 'pop',   operands: 'rbp',              desc: '恢复 rbp', category: 'stack' },
      { offset: '002b', bytes: 'c3',           mnemonic: 'ret',   operands: '',                  desc: '返回', category: 'control' },
    ],
    notes: [
      '64位指针用 rax/rdi/rsi（64位寄存器），解引用后的整数用 eax/edx（32位）',
      '[rax] 表示"以 rax 的值为地址，访问内存"（即 *ptr）',
      '指针传参：调用者把变量地址放入 rdi/rsi，被调用者通过解引用修改原变量',
    ],
  },
]

const CAT_COLOR: Record<string, string> = {
  data:    '#4d8fff',
  arith:   '#3fb950',
  logic:   '#a371f7',
  control: '#ff6b6b',
  stack:   '#ffa657',
  simd:    '#58a6ff',
}

const CAT_LABEL: Record<string, string> = {
  data: '数据传送', arith: '算术/比较', logic: '逻辑运算',
  control: '跳转/控制', stack: '栈操作', simd: 'SIMD',
}

const REGISTERS = [
  { name: 'rax', bits: '64', alias: 'eax/ax/al', use: '返回值，通用' },
  { name: 'rbx', bits: '64', alias: 'ebx/bx/bl', use: '被调用者保存' },
  { name: 'rcx', bits: '64', alias: 'ecx/cx/cl', use: '第4参数，计数器' },
  { name: 'rdx', bits: '64', alias: 'edx/dx/dl', use: '第3参数，扩展返回值' },
  { name: 'rsi', bits: '64', alias: 'esi/si/sil', use: '第2参数' },
  { name: 'rdi', bits: '64', alias: 'edi/di/dil', use: '第1参数' },
  { name: 'rsp', bits: '64', alias: 'esp/sp/spl', use: '栈指针（栈顶）' },
  { name: 'rbp', bits: '64', alias: 'ebp/bp/bpl', use: '基址指针（栈帧底部）' },
  { name: 'r8-r9', bits: '64', alias: 'r8d-r9d', use: '第5~6参数' },
  { name: 'r10-r15', bits: '64', alias: 'r10d-r15d', use: '通用（调用者保存）' },
  { name: 'rip', bits: '64', alias: 'eip', use: '指令指针（PC）' },
  { name: 'rflags', bits: '64', alias: 'eflags', use: 'CF/ZF/SF/OF/DF 标志位' },
]

export default function X86View() {
  const [selExample, setSelExample] = useState(0)
  const [selInstr, setSelInstr] = useState<number | null>(null)
  const [showRegs, setShowRegs] = useState(false)
  const ex = EXAMPLES[selExample]

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: 180, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg-secondary)', padding: '12px 8px', overflowY: 'auto' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 1 }}>示例程序</div>
        {EXAMPLES.map((e, i) => (
          <button key={i} onClick={() => { setSelExample(i); setSelInstr(null) }} style={{
            display: 'block', width: '100%', marginBottom: 4, padding: '8px 10px',
            background: selExample === i ? 'rgba(77,143,255,0.15)' : 'transparent',
            border: selExample === i ? '1px solid #4d8fff' : '1px solid transparent',
            color: selExample === i ? '#4d8fff' : 'var(--text-secondary)',
            borderRadius: 7, cursor: 'pointer', fontSize: 12, textAlign: 'left',
          }}>{e.label}</button>
        ))}

        <div style={{ margin: '16px 0 8px', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <button onClick={() => setShowRegs(r => !r)} style={{
            width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)',
            background: showRegs ? 'rgba(77,143,255,0.15)' : 'transparent',
            color: showRegs ? '#4d8fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 11,
          }}>
            {showRegs ? '▲' : '▼'} 寄存器表
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>指令分类</div>
          {Object.entries(CAT_LABEL).map(([cat, label]) => (
            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: CAT_COLOR[cat], flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* C Code + Notes */}
      <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>C 源码</div>
        <pre style={{ flex: 1, margin: 0, padding: '14px 16px', overflow: 'auto', fontSize: 12, lineHeight: 1.7,
          fontFamily: 'monospace', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
          {ex.c_code}
        </pre>
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>关键说明</div>
          {ex.notes.map((n, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 5, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <span style={{ color: '#4d8fff', flexShrink: 0 }}>▸</span><span>{n}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Assembly listing */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
          x86-64 汇编（AT&T → Intel 语法）
        </div>

        {/* Register table overlay */}
        {showRegs && (
          <div style={{ padding: '12px 16px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>通用寄存器（x86-64）</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {['寄存器', '位宽', '别名（32/16/8位）', '主要用途'].map(h => (
                    <th key={h} style={{ padding: '4px 8px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {REGISTERS.map(r => (
                  <tr key={r.name} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '4px 8px', fontFamily: 'monospace', color: '#4d8fff', fontWeight: 700 }}>{r.name}</td>
                    <td style={{ padding: '4px 8px', color: 'var(--text-muted)' }}>{r.bits}</td>
                    <td style={{ padding: '4px 8px', fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: 10 }}>{r.alias}</td>
                    <td style={{ padding: '4px 8px', color: 'var(--text-secondary)' }}>{r.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Instruction table */}
        <div style={{ overflow: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-secondary)' }}>
              <tr>
                {['偏移', '机器码 (hex)', '助记符', '操作数', '说明'].map(h => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600,
                    borderBottom: '1px solid var(--border)', fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ex.asm.map((ins, i) => {
                const color = CAT_COLOR[ins.category]
                const selected = selInstr === i
                return (
                  <tr key={i} onClick={() => setSelInstr(selected ? null : i)}
                    style={{
                      cursor: 'pointer', borderBottom: '1px solid var(--border)',
                      background: selected ? `${color}18` : i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)',
                      outline: selected ? `1px solid ${color}` : 'none',
                    }}>
                    <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: 11 }}>
                      {ins.offset}
                    </td>
                    <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: 11 }}>
                      {ins.bytes}
                    </td>
                    <td style={{ padding: '6px 10px', fontFamily: 'monospace', color, fontWeight: 700 }}>
                      {ins.mnemonic}
                    </td>
                    <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                      {ins.operands}
                    </td>
                    <td style={{ padding: '6px 10px', color: selected ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: 11 }}>
                      {ins.desc}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Detail panel for selected instruction */}
        {selInstr !== null && (() => {
          const ins = ex.asm[selInstr]
          const color = CAT_COLOR[ins.category]
          return (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: `${color}10`, flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>指令</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color }}>
                    {ins.mnemonic} <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>{ins.operands}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>机器码</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: 4 }}>
                    {ins.bytes}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>分类</div>
                  <div style={{ fontSize: 12, color, padding: '2px 8px', borderRadius: 4, background: `${color}20`, border: `1px solid ${color}60` }}>
                    {CAT_LABEL[ins.category]}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>说明</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>{ins.desc}</div>
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
