import React, { useState } from 'react'
import { useLang } from '../i18n/lang'
import { useMobile } from '../hooks/useMobile'
import CodeBlock from './CodeBlock'

interface Topic {
  id: string; icon: string; color: string
  label_zh: string; label_en: string
  desc_zh: string; desc_en: string
  diagram: string
  code: string; codeTitle_zh: string; codeTitle_en: string
  notes_zh: string; notes_en: string
  concepts_zh: { term: string; def: string }[]
  concepts_en: { term: string; def: string }[]
}

const TOPICS: Topic[] = [
  {
    id: 'intro', icon: '🕸', color: '#58a6ff',
    label_zh: 'WebAssembly 简介', label_en: 'WASM Overview',
    desc_zh: 'WebAssembly 是一种紧凑的二进制指令格式，为栈式虚拟机设计，在浏览器中以接近原生速度运行。可由 C/C++/Rust/Go 编译而来。',
    desc_en: 'WebAssembly is a compact binary instruction format for a stack-based VM that runs near-native speed in browsers. Compiled from C/C++/Rust/Go and more.',
    diagram: `<svg viewBox="0 0 480 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <defs>
    <marker id="arrowW" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="#888"/>
    </marker>
  </defs>
  <!-- Source languages -->
  <rect x="10" y="30" width="90" height="34" rx="6" fill="rgba(88,166,255,0.1)" stroke="#58a6ff" strokeWidth="1.2"/>
  <text x="55" y="52" textAnchor="middle" fill="#58a6ff" fontSize="11">C / C++</text>
  <rect x="10" y="76" width="90" height="34" rx="6" fill="rgba(247,129,102,0.1)" stroke="#f78166" strokeWidth="1.2"/>
  <text x="55" y="98" textAnchor="middle" fill="#f78166" fontSize="11">Rust</text>
  <rect x="10" y="122" width="90" height="34" rx="6" fill="rgba(121,192,255,0.1)" stroke="#79c0ff" strokeWidth="1.2"/>
  <text x="55" y="144" textAnchor="middle" fill="#79c0ff" fontSize="11">Go / Zig</text>
  <!-- arrows to wasm -->
  <line x1="102" y1="47"  x2="175" y2="80"  stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowW)"/>
  <line x1="102" y1="93"  x2="175" y2="93"  stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowW)"/>
  <line x1="102" y1="139" x2="175" y2="106" stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowW)"/>
  <!-- WASM module -->
  <rect x="178" y="60" width="120" height="66" rx="8" fill="rgba(88,166,255,0.08)" stroke="#58a6ff" strokeWidth="1.6"/>
  <text x="238" y="84" textAnchor="middle" fill="#58a6ff" fontSize="12" fontWeight="700">.wasm</text>
  <text x="238" y="100" textAnchor="middle" fill="#888" fontSize="9">binary module</text>
  <text x="238" y="114" textAnchor="middle" fill="#888" fontSize="9">~30% smaller than JS</text>
  <!-- arrow to runtimes -->
  <line x1="300" y1="93" x2="345" y2="60"  stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowW)"/>
  <line x1="300" y1="93" x2="345" y2="93"  stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowW)"/>
  <line x1="300" y1="93" x2="345" y2="126" stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowW)"/>
  <!-- runtimes -->
  <rect x="348" y="40" width="120" height="30" rx="6" fill="rgba(63,185,80,0.08)" stroke="#3fb950" strokeWidth="1.2"/>
  <text x="408" y="59" textAnchor="middle" fill="#3fb950" fontSize="10">Browser (V8/SpiderMonkey)</text>
  <rect x="348" y="80" width="120" height="30" rx="6" fill="rgba(210,168,255,0.08)" stroke="#d2a8ff" strokeWidth="1.2"/>
  <text x="408" y="99" textAnchor="middle" fill="#d2a8ff" fontSize="10">Wasmtime / Wasmer</text>
  <rect x="348" y="120" width="120" height="30" rx="6" fill="rgba(240,136,62,0.08)" stroke="#f0883e" strokeWidth="1.2"/>
  <text x="408" y="139" textAnchor="middle" fill="#f0883e" fontSize="10">Node.js / Deno</text>
  <!-- guarantee badges -->
  <text x="238" y="165" textAnchor="middle" fill="#888" fontSize="9">safe · portable · deterministic · compact</text>
</svg>`,
    code: `# Compile C to WASM (Emscripten)
emcc hello.c -o hello.js      # generates hello.js + hello.wasm
emcc hello.c -o hello.html    # with test harness
emcc -O3 lib.c -o lib.wasm -s STANDALONE_WASM   # bare wasm

# Compile Rust to WASM
rustup target add wasm32-unknown-unknown
cargo build --target wasm32-unknown-unknown --release
# or with wasm-pack:
wasm-pack build --target web

# Use in JavaScript
const { instance } = await WebAssembly.instantiateStreaming(
    fetch('module.wasm'),
    { env: { memory: new WebAssembly.Memory({ initial: 1 }) } }
)
const result = instance.exports.add(1, 2)

# WASM runtime (server-side) — wasmtime CLI
wasmtime module.wasm
wasmtime run --invoke add module.wasm 3 4`,
    codeTitle_zh: '编译与使用命令', codeTitle_en: 'Build & Usage Commands',
    notes_zh: 'WASM 不是 JavaScript 的替代品而是补充——CPU 密集型计算（图像处理、加密、物理引擎）适合 WASM，DOM 操作和网络仍用 JS。WASM 在沙箱中运行，无法直接访问 OS 资源（需通过 WASI 或 JS 桥接）。',
    notes_en: "WASM complements JS, not replaces it — CPU-intensive tasks (image processing, crypto, physics) suit WASM; DOM and networking stay in JS. WASM runs in a sandbox with no OS access (needs WASI or JS bridge).",
    concepts_zh: [
      { term: 'MVP', def: 'Minimum Viable Product — 2017 年 WASM 初始规范：4 种类型、线性内存、导入/导出。' },
      { term: 'WASI', def: 'WebAssembly System Interface — 标准化文件/网络/时钟等 OS 接口，使 WASM 可在浏览器外运行。' },
      { term: 'component model', def: '下一代 WASM 标准：语言无关的类型接口，让不同语言编译的模块互相调用。' },
      { term: 'AOT vs JIT', def: 'Wasmtime 用 Cranelift AOT 编译；浏览器 V8 用 Liftoff (快速 baseline) + TurboFan (优化)。' },
    ],
    concepts_en: [
      { term: 'MVP', def: 'Minimum Viable Product — 2017 initial WASM spec: 4 types, linear memory, imports/exports.' },
      { term: 'WASI', def: 'WebAssembly System Interface — standardizes file/network/clock OS APIs for running WASM outside browsers.' },
      { term: 'component model', def: 'Next-gen WASM: language-agnostic typed interfaces so modules from different languages can call each other.' },
      { term: 'AOT vs JIT', def: 'Wasmtime uses Cranelift AOT; browsers use Liftoff (fast baseline JIT) + TurboFan (optimizing JIT).' },
    ],
  },
  {
    id: 'wat', icon: '📝', color: '#3fb950',
    label_zh: 'WAT 文本格式', label_en: 'WAT Text Format',
    desc_zh: 'WAT（WebAssembly Text Format）是 WASM 二进制的人类可读表示。用 S-表达式语法描述模块、函数、类型、内存。',
    desc_en: 'WAT (WebAssembly Text Format) is the human-readable representation of WASM binary. Uses S-expression syntax to describe modules, functions, types, memory.',
    diagram: `<svg viewBox="0 0 480 180" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <!-- Module structure -->
  <rect x="10" y="10" width="460" height="160" rx="8" fill="rgba(255,255,255,0.02)" stroke="#3fb950" strokeWidth="1.2"/>
  <text x="240" y="32" textAnchor="middle" fill="#3fb950" fontSize="11" fontWeight="700">(module ...)</text>
  <!-- type section -->
  <rect x="20" y="44" width="100" height="50" rx="6" fill="#0d1117" stroke="#58a6ff" strokeWidth="1"/>
  <text x="70" y="62" textAnchor="middle" fill="#58a6ff" fontSize="9" fontWeight="700">type section</text>
  <text x="70" y="76" textAnchor="middle" fill="#888" fontSize="8">(type (func</text>
  <text x="70" y="88" textAnchor="middle" fill="#888" fontSize="8"> (param i32 i32)</text>
  <!-- import section -->
  <rect x="130" y="44" width="100" height="50" rx="6" fill="#0d1117" stroke="#d2a8ff" strokeWidth="1"/>
  <text x="180" y="62" textAnchor="middle" fill="#d2a8ff" fontSize="9" fontWeight="700">import section</text>
  <text x="180" y="76" textAnchor="middle" fill="#888" fontSize="8">(import "env"</text>
  <text x="180" y="88" textAnchor="middle" fill="#888" fontSize="8"> "print" (func ...))</text>
  <!-- func section -->
  <rect x="240" y="44" width="100" height="50" rx="6" fill="#0d1117" stroke="#3fb950" strokeWidth="1"/>
  <text x="290" y="62" textAnchor="middle" fill="#3fb950" fontSize="9" fontWeight="700">func section</text>
  <text x="290" y="76" textAnchor="middle" fill="#888" fontSize="8">(func $add</text>
  <text x="290" y="88" textAnchor="middle" fill="#888" fontSize="8"> i32.add)</text>
  <!-- export section -->
  <rect x="350" y="44" width="110" height="50" rx="6" fill="#0d1117" stroke="#f0883e" strokeWidth="1"/>
  <text x="405" y="62" textAnchor="middle" fill="#f0883e" fontSize="9" fontWeight="700">export section</text>
  <text x="405" y="76" textAnchor="middle" fill="#888" fontSize="8">(export "add"</text>
  <text x="405" y="88" textAnchor="middle" fill="#888" fontSize="8"> (func $add))</text>
  <!-- memory + stack -->
  <rect x="20" y="108" width="210" height="52" rx="6" fill="#0d1117" stroke="#f78166" strokeWidth="1"/>
  <text x="125" y="126" textAnchor="middle" fill="#f78166" fontSize="9" fontWeight="700">memory section</text>
  <text x="125" y="142" textAnchor="middle" fill="#888" fontSize="8">(memory 1) = 64KB page</text>
  <text x="125" y="155" textAnchor="middle" fill="#888" fontSize="8">(data (i32.const 0) "hello")</text>
  <!-- stack machine -->
  <rect x="242" y="108" width="218" height="52" rx="6" fill="#0d1117" stroke="#79c0ff" strokeWidth="1"/>
  <text x="351" y="126" textAnchor="middle" fill="#79c0ff" fontSize="9" fontWeight="700">stack machine execution</text>
  <text x="351" y="142" textAnchor="middle" fill="#888" fontSize="8">i32.const 3  → [3]</text>
  <text x="351" y="155" textAnchor="middle" fill="#888" fontSize="8">i32.const 4  → [3,4]  i32.add → [7]</text>
</svg>`,
    code:`;; WAT — complete example: fibonacci
(module
  (func $fib (export "fib") (param $n i32) (result i32)
    local.get $n
    i32.const 2
    i32.lt_s               ;; n < 2?
    if (result i32)
      local.get $n         ;; return n
    else
      local.get $n
      i32.const 1
      i32.sub
      call $fib            ;; fib(n-1)
      local.get $n
      i32.const 2
      i32.sub
      call $fib            ;; fib(n-2)
      i32.add              ;; fib(n-1) + fib(n-2)
    end
  )
)

;; Compile WAT → WASM binary
wat2wasm fib.wat -o fib.wasm

;; Disassemble WASM back to WAT
wasm2wat fib.wasm -o fib.wat

;; Use in JS
const { exports } = (await WebAssembly.instantiateStreaming(fetch('fib.wasm'))).instance
console.log(exports.fib(10))  // 55`,
    codeTitle_zh: 'WAT 斐波那契示例', codeTitle_en: 'WAT Fibonacci Example',
    notes_zh: 'WAT 和 WASM 是 1:1 等价的——可以互相转换。实际开发不手写 WAT，但理解它对调试和理解 WASM 性能特性很重要。wat2wasm/wasm2wat 来自 WABT（WebAssembly Binary Toolkit）。',
    notes_en: 'WAT and WASM are 1:1 equivalent — convert freely. In practice you don\'t write WAT by hand, but understanding it is crucial for debugging and understanding WASM performance. wat2wasm/wasm2wat come from WABT (WebAssembly Binary Toolkit).',
    concepts_zh: [
      { term: 'S-表达式', def: '(op arg1 arg2) 语法，来自 Lisp。WASM 规范选择它作为文本格式因为简洁。' },
      { term: 'local / param / result', def: '(local $x i32) 声明局部变量。param 是参数，result 是返回类型。' },
      { term: '4 种基本类型', def: 'i32, i64（整数）, f32, f64（浮点）。SIMD 扩展加了 v128。无布尔类型（用 i32 0/1）。' },
      { term: 'WABT 工具链', def: 'wat2wasm, wasm2wat, wasm-validate, wasm-objdump — WASM 开发必备工具。' },
    ],
    concepts_en: [
      { term: 'S-expressions', def: '(op arg1 arg2) syntax from Lisp. Chosen for the WASM spec for its simplicity.' },
      { term: 'local / param / result', def: '(local $x i32) declares a local variable. param = argument, result = return type.' },
      { term: '4 basic types', def: 'i32, i64 (integers), f32, f64 (floats). SIMD extension adds v128. No bool (use i32 0/1).' },
      { term: 'WABT toolkit', def: 'wat2wasm, wasm2wat, wasm-validate, wasm-objdump — essential WASM dev tools.' },
    ],
  },
  {
    id: 'memory', icon: '🧠', color: '#d2a8ff',
    label_zh: 'WASM 线性内存', label_en: 'WASM Linear Memory',
    desc_zh: 'WASM 模块有一块连续的线性内存（linear memory），以 64KB 为页，可动态扩展。C/Rust 的堆分配都在这块内存里。',
    desc_en: 'A WASM module has one contiguous linear memory, paged in 64KB units, growable at runtime. C/Rust heap allocations all happen in this memory.',
    diagram: `<svg viewBox="0 0 480 180" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <!-- linear memory layout -->
  <rect x="10" y="20" width="460" height="140" rx="8" fill="rgba(255,255,255,0.02)" stroke="#d2a8ff" strokeWidth="1.2"/>
  <text x="240" y="42" textAnchor="middle" fill="#d2a8ff" fontSize="11" fontWeight="700">线性内存 Linear Memory (byte-addressable, 0 → max)</text>
  <!-- sections -->
  <rect x="20"  y="56" width="80" height="90" rx="4" fill="rgba(247,129,102,0.1)" stroke="#f78166" strokeWidth="1"/>
  <text x="60"  y="76" textAnchor="middle" fill="#f78166" fontSize="9" fontWeight="700">data</text>
  <text x="60"  y="91" textAnchor="middle" fill="#888" fontSize="8">static strings</text>
  <text x="60"  y="104" textAnchor="middle" fill="#888" fontSize="8">global vars</text>
  <text x="60"  y="117" textAnchor="middle" fill="#888" fontSize="8">addr 0x0...</text>
  <rect x="108" y="56" width="100" height="90" rx="4" fill="rgba(63,185,80,0.1)" stroke="#3fb950" strokeWidth="1"/>
  <text x="158" y="76" textAnchor="middle" fill="#3fb950" fontSize="9" fontWeight="700">stack (shadow)</text>
  <text x="158" y="91" textAnchor="middle" fill="#888" fontSize="8">C local vars</text>
  <text x="158" y="104" textAnchor="middle" fill="#888" fontSize="8">(not WASM stack)</text>
  <rect x="216" y="56" width="160" height="90" rx="4" fill="rgba(88,166,255,0.1)" stroke="#58a6ff" strokeWidth="1"/>
  <text x="296" y="76" textAnchor="middle" fill="#58a6ff" fontSize="9" fontWeight="700">heap</text>
  <text x="296" y="91" textAnchor="middle" fill="#888" fontSize="8">malloc / new</text>
  <text x="296" y="104" textAnchor="middle" fill="#888" fontSize="8">grows upward →</text>
  <text x="296" y="117" textAnchor="middle" fill="#888" fontSize="8">memory.grow to extend</text>
  <rect x="384" y="56" width="76" height="90" rx="4" fill="rgba(255,255,255,0.02)" stroke="#333" strokeWidth="1" strokeDasharray="4,2"/>
  <text x="422" y="76" textAnchor="middle" fill="#555" fontSize="9">free pages</text>
  <text x="422" y="91" textAnchor="middle" fill="#555" fontSize="8">(unallocated)</text>
  <!-- byte address labels -->
  <text x="20" y="158" fill="#888" fontSize="8">0x0</text>
  <text x="384" y="158" fill="#888" fontSize="8">current_pages × 64KB</text>
</svg>`,
    code: `;; WAT — memory access
(module
  (memory (export "memory") 1)   ;; 1 page = 64KB

  ;; store i32 at address 0
  (func (export "store") (param $val i32)
    i32.const 0        ;; address
    local.get $val
    i32.store          ;; mem[0] = val (4 bytes)
  )

  ;; load i32 from address 0
  (func (export "load") (result i32)
    i32.const 0
    i32.load           ;; return mem[0]
  )

  ;; grow memory by 1 page (64KB)
  (func (export "grow") (result i32)
    i32.const 1
    memory.grow        ;; returns prev size (-1 if failed)
  )
)

// JavaScript — access WASM linear memory as typed array
const mem = new Uint8Array(instance.exports.memory.buffer)
mem[0] = 42           // direct byte write
console.log(mem[0])   // 42

const i32 = new Int32Array(instance.exports.memory.buffer)
i32[0] = 12345        // 4-byte write at offset 0`,
    codeTitle_zh: '内存读写 WAT + JS', codeTitle_en: 'Memory Access WAT + JS',
    notes_zh: 'WASM 线性内存与 JS 堆完全隔离，JS 通过 ArrayBuffer 视图读写。memory.grow 失败（内存不足）返回 -1。传统 Emscripten 把 C 的 stack 也放在线性内存里（shadow stack），而 WASM 自己的操作数栈在线性内存之外。',
    notes_en: "WASM linear memory is isolated from JS heap; JS accesses it via ArrayBuffer views. memory.grow returns -1 on failure. Emscripten puts C's call stack in linear memory (shadow stack), while WASM's own operand stack is separate.",
    concepts_zh: [
      { term: '64KB 页', def: 'WASM 内存最小分配单元是 65536 字节（64KB）。memory.grow(n) 增加 n 个页。' },
      { term: 'memory.size', def: '返回当前内存页数。最大页数可在 (memory min max) 中限制。' },
      { term: 'SharedArrayBuffer', def: '配合 Atomics，允许多个 WebWorker 共享同一段 WASM 线性内存（线程安全）。' },
      { term: 'bulk memory', def: 'WASM 扩展：memory.copy, memory.fill — 类似 memcpy/memset，高效批量操作。' },
    ],
    concepts_en: [
      { term: '64KB page', def: 'Minimum WASM memory unit is 65536 bytes. memory.grow(n) adds n pages.' },
      { term: 'memory.size', def: 'Returns current page count. Max pages can be capped in (memory min max).' },
      { term: 'SharedArrayBuffer', def: 'With Atomics, allows multiple WebWorkers to share WASM linear memory (thread-safe).' },
      { term: 'bulk memory', def: 'WASM extension: memory.copy, memory.fill — like memcpy/memset for efficient bulk ops.' },
    ],
  },
  {
    id: 'js', icon: '🌉', color: '#f0883e',
    label_zh: 'JS 互操作', label_en: 'JS Interop',
    desc_zh: 'WASM 只能直接传递数字类型（i32/i64/f32/f64）。传字符串、数组等需要手动通过线性内存传递，或使用 wasm-bindgen 等工具自动生成桥接代码。',
    desc_en: 'WASM can only pass numeric types (i32/i64/f32/f64) directly. Strings/arrays require manual linear memory transfer, or tools like wasm-bindgen to auto-generate bridge code.',
    diagram: `<svg viewBox="0 0 480 170" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <defs>
    <marker id="arrowJ" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="#888"/>
    </marker>
  </defs>
  <!-- JS side -->
  <rect x="10" y="30" width="170" height="120" rx="8" fill="rgba(240,136,62,0.05)" stroke="#f0883e" strokeWidth="1.4"/>
  <text x="95" y="52" textAnchor="middle" fill="#f0883e" fontSize="11" fontWeight="700">JavaScript</text>
  <text x="95" y="70" textAnchor="middle" fill="#888" fontSize="9">string "hello"</text>
  <text x="95" y="84" textAnchor="middle" fill="#888" fontSize="9">Uint8Array [72,101,108...]</text>
  <text x="95" y="98" textAnchor="middle" fill="#888" fontSize="9">import functions</text>
  <text x="95" y="112" textAnchor="middle" fill="#888" fontSize="9">WebAssembly.Memory</text>
  <!-- arrows -->
  <line x1="182" y1="70" x2="245" y2="70" stroke="#f0883e" strokeWidth="1.3" markerEnd="url(#arrowJ)"/>
  <text x="213" y="63" textAnchor="middle" fill="#f0883e" fontSize="8">encode → bytes</text>
  <line x1="245" y1="110" x2="182" y2="110" stroke="#3fb950" strokeWidth="1.3" markerEnd="url(#arrowJ)" strokeDasharray="4,2"/>
  <text x="213" y="128" textAnchor="middle" fill="#3fb950" fontSize="8">decode ← ptr+len</text>
  <!-- linear memory middle -->
  <rect x="248" y="50" width="100" height="80" rx="6" fill="rgba(88,166,255,0.06)" stroke="#58a6ff" strokeWidth="1.4"/>
  <text x="298" y="72" textAnchor="middle" fill="#58a6ff" fontSize="10" fontWeight="700">Linear Memory</text>
  <text x="298" y="88" textAnchor="middle" fill="#888" fontSize="8">[72,101,108,108,111]</text>
  <text x="298" y="102" textAnchor="middle" fill="#888" fontSize="8">ptr=0, len=5</text>
  <!-- WASM side -->
  <line x1="350" y1="80" x2="395" y2="80" stroke="#888" strokeWidth="1.3" markerEnd="url(#arrowJ)"/>
  <rect x="398" y="50" width="74" height="80" rx="6" fill="rgba(63,185,80,0.06)" stroke="#3fb950" strokeWidth="1.4"/>
  <text x="435" y="72" textAnchor="middle" fill="#3fb950" fontSize="10" fontWeight="700">WASM fn</text>
  <text x="435" y="88" textAnchor="middle" fill="#888" fontSize="8">(param i32 i32)</text>
  <text x="435" y="102" textAnchor="middle" fill="#888" fontSize="8">ptr  len</text>
</svg>`,
    code: `// Manual string passing (low-level)
const encoder = new TextEncoder()
const str = "hello WASM"
const bytes = encoder.encode(str)

// Write to WASM memory
const mem = new Uint8Array(instance.exports.memory.buffer)
mem.set(bytes, 0)           // write at offset 0
instance.exports.process_string(0, bytes.length)  // pass ptr+len

// Read string back from WASM
const ptr = instance.exports.get_result_ptr()
const len = instance.exports.get_result_len()
const result = new TextDecoder().decode(mem.slice(ptr, ptr + len))

// ─── wasm-bindgen (Rust — automatic bridge) ───────────────────────────────
// Rust:
#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

// JS (auto-generated bindings):
import init, { greet } from './pkg/mylib.js'
await init()
const msg = greet("World")   // string in, string out — transparent!

// Import JS function into WASM
#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}`,
    codeTitle_zh: 'JS ↔ WASM 数据传递', codeTitle_en: 'JS ↔ WASM Data Passing',
    notes_zh: 'wasm-bindgen 是目前最成熟的自动桥接方案（Rust）。对于 C/C++，Emscripten 提供 Embind/EMSCRIPTEN_BINDINGS。手动内存传递适合性能极端场景，但容易出错。',
    notes_en: 'wasm-bindgen is the most mature auto-bridge solution (Rust). For C/C++, Emscripten provides Embind/EMSCRIPTEN_BINDINGS. Manual memory passing is for extreme performance scenarios but error-prone.',
    concepts_zh: [
      { term: 'import/export', def: 'WASM 通过 import 接受外部函数（JS → WASM），通过 export 暴露自己的函数（WASM → JS）。' },
      { term: 'wasm-bindgen', def: 'Rust 工具，自动生成 JS↔Rust 的类型转换胶水代码，支持字符串、Uint8Array 等复杂类型。' },
      { term: 'JS handles', def: 'wasm-bindgen 可以把 JS 对象作为不透明句柄传给 Rust，避免手动序列化。' },
      { term: 'web-sys / js-sys', def: 'wasm-bindgen 的 Web API 绑定库，让 Rust 代码直接调用 DOM/fetch/WebGL 等。' },
    ],
    concepts_en: [
      { term: 'import/export', def: 'WASM imports external functions (JS → WASM) and exports its own (WASM → JS).' },
      { term: 'wasm-bindgen', def: 'Rust tool that auto-generates JS↔Rust type conversion glue, supporting strings, Uint8Array, etc.' },
      { term: 'JS handles', def: 'wasm-bindgen can pass JS objects as opaque handles to Rust, avoiding manual serialization.' },
      { term: 'web-sys / js-sys', def: 'wasm-bindgen\'s Web API binding crates — lets Rust call DOM/fetch/WebGL directly.' },
    ],
  },
  {
    id: 'rust', icon: '🦀', color: '#f78166',
    label_zh: 'Rust → WASM', label_en: 'Rust to WASM',
    desc_zh: 'Rust 是目前 WASM 开发体验最好的语言：零运行时、精确内存控制、wasm-bindgen 自动桥接、wasm-pack 一键发布 npm 包。',
    desc_en: 'Rust has the best WASM developer experience: zero runtime, precise memory control, wasm-bindgen auto-bridge, wasm-pack one-click npm publish.',
    diagram: `<svg viewBox="0 0 480 160" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <defs>
    <marker id="arrowR2" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="#888"/>
    </marker>
  </defs>
  <rect x="10"  y="40" width="100" height="80" rx="8" fill="rgba(247,129,102,0.08)" stroke="#f78166" strokeWidth="1.4"/>
  <text x="60"  y="68" textAnchor="middle" fill="#f78166" fontSize="11" fontWeight="700">src/lib.rs</text>
  <text x="60"  y="84" textAnchor="middle" fill="#888" fontSize="8">#[wasm_bindgen]</text>
  <text x="60"  y="97" textAnchor="middle" fill="#888" fontSize="8">pub fn greet()</text>
  <line x1="112" y1="80" x2="158" y2="80" stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowR2)"/>
  <text x="135" y="72" textAnchor="middle" fill="#888" fontSize="8">wasm-pack build</text>
  <rect x="162" y="40" width="110" height="80" rx="8" fill="rgba(210,168,255,0.06)" stroke="#d2a8ff" strokeWidth="1.4"/>
  <text x="217" y="68" textAnchor="middle" fill="#d2a8ff" fontSize="11" fontWeight="700">pkg/</text>
  <text x="217" y="84" textAnchor="middle" fill="#888" fontSize="8">mylib.wasm</text>
  <text x="217" y="97" textAnchor="middle" fill="#888" fontSize="8">mylib.js (glue)</text>
  <text x="217" y="110" textAnchor="middle" fill="#888" fontSize="8">mylib.d.ts</text>
  <line x1="274" y1="80" x2="318" y2="80" stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowR2)"/>
  <text x="296" y="72" textAnchor="middle" fill="#888" fontSize="8">npm publish</text>
  <rect x="322" y="40" width="140" height="80" rx="8" fill="rgba(63,185,80,0.06)" stroke="#3fb950" strokeWidth="1.4"/>
  <text x="392" y="68" textAnchor="middle" fill="#3fb950" fontSize="11" fontWeight="700">npm package</text>
  <text x="392" y="84" textAnchor="middle" fill="#888" fontSize="8">import { greet } from 'mylib'</text>
  <text x="392" y="97" textAnchor="middle" fill="#888" fontSize="8">works in any JS env</text>
</svg>`,
    code: `# Setup
rustup target add wasm32-unknown-unknown
cargo install wasm-pack

# Cargo.toml
[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"
js-sys = "0.3"
web-sys = { version = "0.3", features = ["Document", "Window", "HtmlElement"] }

# src/lib.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn add(a: i32, b: i32) -> i32 { a + b }

#[wasm_bindgen]
pub fn fibonacci(n: u32) -> u32 {
    match n { 0 => 0, 1 => 1, _ => fibonacci(n-1) + fibonacci(n-2) }
}

// Access DOM
#[wasm_bindgen]
pub fn set_text(id: &str, text: &str) {
    let doc = web_sys::window().unwrap().document().unwrap();
    let el = doc.get_element_by_id(id).unwrap();
    el.set_inner_html(text);
}

# Build (generates pkg/ directory)
wasm-pack build --target web     # for ES modules
wasm-pack build --target nodejs   # for Node.js
wasm-pack build --target bundler  # for webpack/vite`,
    codeTitle_zh: 'Rust WASM 项目', codeTitle_en: 'Rust WASM Project',
    notes_zh: 'wasm-pack build 生成的 .wasm 文件默认已经过 wasm-opt 优化（-O2）。Rust WASM 文件通常比等价 C 大（因为包含分配器等），但用 wee_alloc + panic=abort 可以缩减到 10KB 以内。',
    notes_en: 'wasm-pack build automatically optimizes the .wasm with wasm-opt (-O2). Rust WASM binaries are larger than C equivalents (includes allocator etc.) but with wee_alloc + panic=abort can shrink to under 10KB.',
    concepts_zh: [
      { term: 'cdylib', def: 'Cargo 库类型。生成动态库（.wasm），无 Rust 测试框架等开销。WASM 必须用此类型。' },
      { term: 'wasm-opt', def: 'Binaryen 优化工具，大幅减小 WASM 体积（通常 20-40%）。wasm-pack 自动调用。' },
      { term: 'console_error_panic_hook', def: '把 Rust panic 信息显示在浏览器控制台，调试必备。' },
      { term: 'wasm-bindgen-futures', def: '让 Rust async fn 与 JS Promise 互操作，使用 spawn_local 驱动 Future。' },
    ],
    concepts_en: [
      { term: 'cdylib', def: 'Cargo library type that generates a dynamic lib (.wasm) without test framework overhead. Required for WASM.' },
      { term: 'wasm-opt', def: 'Binaryen optimizer that shrinks WASM size significantly (typically 20-40%). wasm-pack runs it automatically.' },
      { term: 'console_error_panic_hook', def: 'Pipes Rust panic messages to the browser console — essential for debugging.' },
      { term: 'wasm-bindgen-futures', def: 'Lets Rust async fn interop with JS Promises; use spawn_local to drive Futures.' },
    ],
  },
  {
    id: 'simd', icon: '🚀', color: '#79c0ff',
    label_zh: 'WASM SIMD & 性能', label_en: 'WASM SIMD & Performance',
    desc_zh: 'WASM SIMD（v128 类型）允许一次操作 16 个字节，实现 4×f32 或 2×f64 并行计算。对图像处理、ML 推理等场景有 2-4× 加速。',
    desc_en: 'WASM SIMD (v128 type) processes 16 bytes at once: 4×f32 or 2×f64 in parallel. Delivers 2-4× speedup for image processing, ML inference, and similar workloads.',
    diagram: `<svg viewBox="0 0 480 160" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <!-- Scalar vs SIMD -->
  <text x="100" y="22" textAnchor="middle" fill="#888" fontSize="11" fontWeight="700">Scalar</text>
  <text x="340" y="22" textAnchor="middle" fill="#79c0ff" fontSize="11" fontWeight="700">SIMD (v128 / f32x4)</text>
  <!-- Scalar: 4 sequential ops -->
  <rect x="20"  y="34" width="30" height="30" rx="4" fill="rgba(240,136,62,0.15)" stroke="#f0883e" strokeWidth="1"/>
  <text x="35"  y="54" textAnchor="middle" fill="#f0883e" fontSize="10">a[0]</text>
  <rect x="55"  y="34" width="30" height="30" rx="4" fill="rgba(240,136,62,0.15)" stroke="#f0883e" strokeWidth="1"/>
  <text x="70"  y="54" textAnchor="middle" fill="#f0883e" fontSize="10">a[1]</text>
  <rect x="90"  y="34" width="30" height="30" rx="4" fill="rgba(240,136,62,0.15)" stroke="#f0883e" strokeWidth="1"/>
  <text x="105" y="54" textAnchor="middle" fill="#f0883e" fontSize="10">a[2]</text>
  <rect x="125" y="34" width="30" height="30" rx="4" fill="rgba(240,136,62,0.15)" stroke="#f0883e" strokeWidth="1"/>
  <text x="140" y="54" textAnchor="middle" fill="#f0883e" fontSize="10">a[3]</text>
  <text x="100" y="80" textAnchor="middle" fill="#888" fontSize="9">4 separate f32.add</text>
  <text x="100" y="95" textAnchor="middle" fill="#888" fontSize="9">4 clock cycles</text>
  <!-- SIMD: 1 op on 4 floats -->
  <rect x="220" y="34" width="120" height="30" rx="4" fill="rgba(121,192,255,0.15)" stroke="#79c0ff" strokeWidth="1.6"/>
  <text x="232" y="50" fill="#79c0ff" fontSize="10">a[0]</text>
  <text x="262" y="50" fill="#79c0ff" fontSize="10">a[1]</text>
  <text x="292" y="50" fill="#79c0ff" fontSize="10">a[2]</text>
  <text x="322" y="50" fill="#79c0ff" fontSize="10">a[3]</text>
  <text x="280" y="80" textAnchor="middle" fill="#888" fontSize="9">1 f32x4.add instruction</text>
  <text x="280" y="95" textAnchor="middle" fill="#79c0ff" fontSize="9">1 clock cycle ← 4×faster!</text>
  <!-- v128 bits breakdown -->
  <rect x="20" y="118" width="440" height="34" rx="6" fill="rgba(121,192,255,0.05)" stroke="#79c0ff" strokeWidth="1"/>
  <text x="240" y="134" textAnchor="middle" fill="#79c0ff" fontSize="9">v128 = 128 bits = i8x16 | i16x8 | i32x4 | i64x2 | f32x4 | f64x2</text>
  <text x="240" y="147" textAnchor="middle" fill="#888" fontSize="8">interpret the same 128 bits as different lane types</text>
</svg>`,
    code: `;; WAT SIMD — add two f32x4 vectors
(module
  (func (export "add_f32x4")
    (param $a v128) (param $b v128) (result v128)
    local.get $a
    local.get $b
    f32x4.add
  )
)

;; Rust SIMD (via std::simd or wasm-bindgen)
use std::arch::wasm32::*;   // WASM SIMD intrinsics

unsafe fn dot_product(a: &[f32; 4], b: &[f32; 4]) -> f32 {
    let va = v128_load(a.as_ptr() as *const v128);
    let vb = v128_load(b.as_ptr() as *const v128);
    let prod = f32x4_mul(va, vb);
    // horizontal sum
    f32x4_extract_lane::<0>(prod) + f32x4_extract_lane::<1>(prod) +
    f32x4_extract_lane::<2>(prod) + f32x4_extract_lane::<3>(prod)
}

# Performance tips
# 1. Use --target web (not bundler) for direct ES module loading
# 2. Profile with Chrome DevTools → Performance → WASM
# 3. Use wasm-opt -O3 for production
# 4. Avoid frequent JS↔WASM boundary crossings (batch calls)
# 5. Use SharedArrayBuffer for zero-copy between JS and WASM`,
    codeTitle_zh: 'WASM SIMD 代码', codeTitle_en: 'WASM SIMD Code',
    notes_zh: 'WASM SIMD 已在所有主流浏览器默认开启（Chrome 91+, Firefox 89+, Safari 16.4+）。对于 ML 推理，TensorFlow.js 和 ONNX Runtime Web 都使用 WASM SIMD 后端。每次 JS↔WASM 调用有约 1-10ns 开销，要批量操作减少跨界次数。',
    notes_en: 'WASM SIMD is enabled by default in all major browsers (Chrome 91+, Firefox 89+, Safari 16.4+). TensorFlow.js and ONNX Runtime Web both use WASM SIMD backends. Each JS↔WASM call costs ~1-10ns — batch operations to minimize crossings.',
    concepts_zh: [
      { term: 'v128', def: '128 位 SIMD 寄存器类型。解释为 f32x4 时 = 4 个 float，i8x16 时 = 16 个字节等。' },
      { term: 'relaxed SIMD', def: 'WASM 提案：新增约 70 个 SIMD 指令（如 FMA），允许平台特定行为以换取性能。' },
      { term: 'Threads', def: 'WASM 线程提案：SharedArrayBuffer + Atomics 允许多 WebWorker 共享内存。Rust rayon → WASM。' },
      { term: 'WASM GC', def: '2023 年标准化：原生垃圾回收支持，让 Java/Kotlin/Dart 等 GC 语言直接高效编译到 WASM。' },
    ],
    concepts_en: [
      { term: 'v128', def: '128-bit SIMD register type. As f32x4 = 4 floats, as i8x16 = 16 bytes, etc.' },
      { term: 'relaxed SIMD', def: 'WASM proposal: ~70 new SIMD instructions (e.g., FMA) allowing platform-specific behavior for perf.' },
      { term: 'Threads', def: 'WASM threads proposal: SharedArrayBuffer + Atomics allow multi-WebWorker shared memory. Rust rayon → WASM.' },
      { term: 'WASM GC', def: 'Standardized 2023: native GC support, letting Java/Kotlin/Dart compile efficiently to WASM.' },
    ],
  },
]

export default function WasmView() {
  const { lang } = useLang()
  const isMobile = useMobile()
  const [selected, setSelected] = useState(TOPICS[0].id)
  const [showDetail, setShowDetail] = useState(false)
  const topic = TOPICS.find(t => t.id === selected)!
  const isZh = lang === 'zh'

  const label    = (t: Topic) => isZh ? t.label_zh    : t.label_en
  const desc     = (t: Topic) => isZh ? t.desc_zh     : t.desc_en
  const notes    = (t: Topic) => isZh ? t.notes_zh    : t.notes_en
  const concepts = (t: Topic) => isZh ? t.concepts_zh : t.concepts_en
  const codeTitle= (t: Topic) => isZh ? t.codeTitle_zh: t.codeTitle_en

  const select = (id: string) => { setSelected(id); if (isMobile) setShowDetail(true) }

  const sidebar = (
    <div style={{ width: isMobile ? '100%' : 200, flexShrink: 0, borderRight: isMobile ? 'none' : '1px solid var(--border)', overflowY: 'auto', display: isMobile && showDetail ? 'none' : 'block' }}>
      <div style={{ padding: '12px 10px 6px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.6, textTransform: 'uppercase' }}>WebAssembly</div>
      {TOPICS.map(t => (
        <button key={t.id} onClick={() => select(t.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: 'none', textAlign: 'left', cursor: 'pointer', background: selected === t.id ? 'var(--surface)' : 'transparent', borderLeft: selected === t.id ? `3px solid ${t.color}` : '3px solid transparent', color: selected === t.id ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: 13, fontWeight: selected === t.id ? 600 : 400, transition: 'background 0.15s' }}>
          <span style={{ fontSize: 18 }}>{t.icon}</span><span>{label(t)}</span>
        </button>
      ))}
    </div>
  )

  const detail = (
    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? 16 : 24, display: isMobile && !showDetail ? 'none' : 'block' }}>
      {isMobile && showDetail && (
        <button onClick={() => setShowDetail(false)} style={{ marginBottom: 16, fontSize: 13, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← {isZh ? '返回' : 'Back'}</button>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 28 }}>{topic.icon}</span>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: topic.color }}>{label(topic)}</h2>
      </div>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>{desc(topic)}</p>
      <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '16px 20px', marginBottom: 20, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>{isZh ? '示意图' : 'Diagram'}</div>
        <div dangerouslySetInnerHTML={{ __html: topic.diagram }} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>{isZh ? '关键概念' : 'Key Concepts'}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {concepts(topic).map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 14px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: topic.color, whiteSpace: 'nowrap', minWidth: 120 }}>{c.term}</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.def}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <CodeBlock code={topic.code} title={codeTitle(topic)} />
      </div>
      <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, borderLeft: `3px solid ${topic.color}`, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        <span style={{ fontWeight: 700, color: topic.color }}>{isZh ? '💡 说明' : '💡 Note'}</span>{' '}{notes(topic)}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden' }}>
      {sidebar}{detail}
    </div>
  )
}
