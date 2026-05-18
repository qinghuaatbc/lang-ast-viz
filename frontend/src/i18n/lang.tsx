import { createContext, useContext, useState, ReactNode } from 'react'

export type Lang = 'zh' | 'en'

const LangContext = createContext<{
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string) => string
}>({ lang: 'zh', setLang: () => {}, t: (k) => k })

const zh: Record<string, string> = {
  'app.title': 'DeepCode',
  'app.subtitle': '编译器 · 数据结构 · 操作系统 · 系统编程 · 算法 · 网络 · 体系结构',
  'tab.ast': 'AST 编译器',
  'tab.ds': '数据结构',
  'tab.linux': 'Linux OS',
  'tab.tlpi': 'TLPI',
  'tab.algo': '排序算法',
  'tab.memory': '内存布局',
  'tab.regex': '正则表达式',
  'tab.ieee754': 'IEEE 754',
  'tab.network': '网络协议栈',
  'tab.cpu': 'CPU 流水线',
  'tab.x86': 'x86 汇编',
  'tab.hw': '通信接口',
  'source.code': '源代码',
  'examples': '示例',
  'compile': '编译',
  'compiling': '编译中...',
  'output': '输出',
  'ast.tree': 'AST 树',
  'ir.code': 'IR 代码',
  'x86.asm': 'x86 汇编',
  'bytecode': '字节码',
  'language': '语言',
  'ctrl.enter': 'Ctrl+Enter 编译',
  'compile.first': '编译代码后查看',
  'no.output': '无输出',
  'registers': '寄存器',
  'memory': '内存',
  'step': '步',
  'error': '错误',
}

const en: Record<string, string> = {
  'app.title': 'DeepCode',
  'app.subtitle': 'Compiler · Data Structures · OS · Systems · Algorithms · Networks · Architecture',
  'tab.ast': 'AST Compiler',
  'tab.ds': 'Data Structures',
  'tab.linux': 'Linux OS',
  'tab.tlpi': 'TLPI',
  'tab.algo': 'Sorting Algos',
  'tab.memory': 'Memory Layout',
  'tab.regex': 'Regex',
  'tab.ieee754': 'IEEE 754',
  'tab.network': 'Network Stack',
  'tab.cpu': 'CPU Pipeline',
  'tab.x86': 'x86 Assembly',
  'tab.hw': 'Hardware I/O',
  'source.code': 'Source Code',
  'examples': 'Examples',
  'compile': 'Compile',
  'compiling': 'Compiling...',
  'output': 'Output',
  'ast.tree': 'AST Tree',
  'ir.code': 'IR Code',
  'x86.asm': 'x86 ASM',
  'bytecode': 'Bytecode',
  'language': 'Language',
  'ctrl.enter': 'Ctrl+Enter to compile',
  'compile.first': 'Compile some code to see',
  'no.output': 'No output',
  'registers': 'Registers',
  'memory': 'Memory',
  'step': 'Step',
  'error': 'Error',
}

const dicts: Record<Lang, Record<string, string>> = { zh, en }

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('zh')
  const t = (key: string) => dicts[lang][key] || key
  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
