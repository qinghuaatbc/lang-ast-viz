import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useLang } from '../i18n/lang'

/* ── Types ─────────────────────────────────────────────────── */

interface BusStep {
  addr: string; ctrl: string; data: string
  desc_zh: string; desc_en: string; highlightLine: number
  state?: Record<string, string>
  movingData?: { from: number; to: number; label: string; bus: 'addr' | 'ctrl' | 'data' }[]
  stack?: { pc: string; desc: string }[]
}
type BusType = 'addr' | 'ctrl' | 'data'

interface ChainCall {
  caller: string; callee: string; method: string; params: string; ret: string
  relation?: 'syscall' | 'vfs' | 'driver' | 'ipc' | 'mm' | 'glibc'
}
interface LinExample {
  cat_zh: string; cat_en: string; zh: string; en: string; chain: ChainCall[]
}

const BUS_COLORS: Record<BusType, string> = { addr: '#ff7b72', data: '#56d364', ctrl: '#79c0ff' }

const REL_LABELS_ZH: Record<string, string> = {
  syscall: '系统调用', vfs: 'VFS层', driver: '驱动', ipc: 'IPC', mm: '内存管理',
  glibc: 'glibc封装',
}
const REL_LABELS_EN: Record<string, string> = {
  syscall: 'syscall', vfs: 'VFS', driver: 'driver', ipc: 'IPC', mm: 'MM',
  glibc: 'glibc wrap',
}
const REL_COLORS: Record<string, string> = {
  syscall: '#79c0ff', vfs: '#d2a8ff', driver: '#ffa657', ipc: '#56d364', mm: '#ff7b72',
  glibc: '#f778ba',
}
const REL_STROKE: Record<string, string> = {
  syscall: 'solid', vfs: 'solid', driver: 'solid', ipc: 'dashed', mm: 'dashed',
  glibc: 'solid',
}

const CHIP_COLORS = ['#4d8fff','#79c0ff','#56d364','#d2a8ff','#ffa657','#ff7b72','#8b949e','#f778ba']

const KEYWORDS = new Set(['struct','int','void','char','long','size_t','ssize_t','off_t','pid_t','unsigned','const','static','inline','return','if','else','for','while','do','switch','case','break','continue','goto'])
function highlightLine(line: string) {
  const parts: { text: string; color: string }[] = []
  const re = /(\/\/.*)|("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|\b(0x[0-9a-fA-F]+|\d+\.?\d*)\b|\b([a-zA-Z_]\w*)\b|(\S)/g
  let m: RegExpExecArray | null; let last = 0
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) parts.push({ text: line.slice(last, m.index), color: '#e6edf3' })
    if (m[1]) parts.push({ text: m[1], color: '#8b949e' })
    else if (m[2] || m[3]) parts.push({ text: m[2]||m[3], color: '#a5d6ff' })
    else if (m[4]) parts.push({ text: m[4], color: '#79c0ff' })
    else if (m[5]) {
      const w = m[5]
      if (KEYWORDS.has(w)) parts.push({ text: w, color: '#ff7b72' })
      else if (w[0] === w[0]?.toUpperCase() && w[0] !== w[0]?.toLowerCase()) parts.push({ text: w, color: '#d2a8ff' })
      else if (w.endsWith('()') || w === 'sys_read' || w === 'sys_write' || w.startsWith('vfs_')) parts.push({ text: w, color: '#f778ba' })
      else parts.push({ text: w, color: '#e6edf3' })
    } else if (m[6]) parts.push({ text: m[6], color: '#e6edf3' })
    last = re.lastIndex
  }
  if (last < line.length) parts.push({ text: line.slice(last), color: '#e6edf3' })
  return parts
}

/* ── 30 Categorized Examples ──────────────────────────────── */

const CATEGORIES: LinExample[] = [
  // 进程管理 (6)
  { cat_zh:'进程管理', cat_en:'Proc Mgmt', zh:'fork()', en:'fork()', chain:[{caller:'Process',callee:'Kernel',method:'clone',params:'flags=SIGCHLD',ret:'pid_t',relation:'syscall'}] },
  { cat_zh:'进程管理', cat_en:'Proc Mgmt', zh:'exec()', en:'exec()', chain:[{caller:'Process',callee:'Kernel',method:'execve',params:'path,argv,envp',ret:'int',relation:'syscall'}] },
  { cat_zh:'进程管理', cat_en:'Proc Mgmt', zh:'exit()', en:'exit()', chain:[{caller:'Process',callee:'Kernel',method:'exit_group',params:'code=0',ret:'noreturn',relation:'syscall'}] },
  { cat_zh:'进程管理', cat_en:'Proc Mgmt', zh:'wait()', en:'wait()', chain:[{caller:'Parent',callee:'Kernel',method:'wait4',params:'pid,status,opts',ret:'pid_t',relation:'syscall'}] },
  { cat_zh:'进程管理', cat_en:'Proc Mgmt', zh:'getpid()', en:'getpid()', chain:[{caller:'Process',callee:'Kernel',method:'getpid',params:'',ret:'pid_t',relation:'syscall'}] },
  { cat_zh:'进程管理', cat_en:'Proc Mgmt', zh:'进程树遍历', en:'proc tree', chain:[{caller:'Reader',callee:'ProcFS',method:'readdir',params:'/proc',ret:'dent',relation:'vfs'},{caller:'ProcFS',callee:'task_struct',method:'filldir',params:'pid=1',ret:'void',relation:'vfs'}] },

  // 文件 I/O (6)
  { cat_zh:'文件IO', cat_en:'File I/O', zh:'open()', en:'open()', chain:[{caller:'Process',callee:'VFS',method:'path_openat',params:'path=/data,flags=O_RDONLY',ret:'fd',relation:'syscall'},{caller:'VFS',callee:'Dentry',method:'lookup',params:'name=data',ret:'dentry',relation:'vfs'},{caller:'Dentry',callee:'Inode',method:'iget',params:'ino=42',ret:'inode',relation:'vfs'}] },
  { cat_zh:'文件IO', cat_en:'File I/O', zh:'read()', en:'read()', chain:[{caller:'Process',callee:'FDTable',method:'fdget',params:'fd=3',ret:'file',relation:'syscall'},{caller:'FDTable',callee:'File',method:'read_iter',params:'buf,len=4096',ret:'ssize_t',relation:'vfs'},{caller:'File',callee:'BlockDev',method:'submit_bio',params:'sector=100',ret:'void',relation:'driver'}] },
  { cat_zh:'文件IO', cat_en:'File I/O', zh:'write()', en:'write()', chain:[{caller:'Process',callee:'FDTable',method:'fdget',params:'fd=1',ret:'file',relation:'syscall'},{caller:'FDTable',callee:'File',method:'write_iter',params:'buf,len=256',ret:'ssize_t',relation:'vfs'}] },
  { cat_zh:'文件IO', cat_en:'File I/O', zh:'close()', en:'close()', chain:[{caller:'Process',callee:'FDTable',method:'fdput',params:'fd=3',ret:'void',relation:'syscall'}] },
  { cat_zh:'文件IO', cat_en:'File I/O', zh:'lseek()', en:'lseek()', chain:[{caller:'Process',callee:'File',method:'llseek',params:'offset=0,whence=SEEK_END',ret:'off_t',relation:'vfs'}] },
  { cat_zh:'文件IO', cat_en:'File I/O', zh:'pread()', en:'pread()', chain:[{caller:'Process',callee:'FDTable',method:'fdget',params:'fd=3',ret:'file',relation:'syscall'},{caller:'FDTable',callee:'File',method:'read',params:'pos=0x1000',ret:'ssize_t',relation:'vfs'},{caller:'File',callee:'PageCache',method:'readpage',params:'index=1',ret:'page',relation:'mm'}] },

  // 目录与元数据 (4)
  { cat_zh:'目录与元数据', cat_en:'Dir & Meta', zh:'stat()', en:'stat()', chain:[{caller:'Process',callee:'VFS',method:'statx',params:'path=/etc/passwd',ret:'struct kstat',relation:'syscall'}] },
  { cat_zh:'目录与元数据', cat_en:'Dir & Meta', zh:'getdents()', en:'getdents()', chain:[{caller:'Process',callee:'File',method:'iterate_shared',params:'dir_ctx',ret:'int',relation:'vfs'},{caller:'File',callee:'Dentry',method:'readdir',params:'',ret:'dirent',relation:'vfs'}] },
  { cat_zh:'目录与元数据', cat_en:'Dir & Meta', zh:'mkdir()', en:'mkdir()', chain:[{caller:'Process',callee:'VFS',method:'mkdir',params:'path=/new, mode=0755',ret:'int',relation:'syscall'},{caller:'VFS',callee:'Inode',method:'create',params:'umask',ret:'inode',relation:'vfs'}] },
  { cat_zh:'目录与元数据', cat_en:'Dir & Meta', zh:'chdir()', en:'chdir()', chain:[{caller:'Process',callee:'FS',method:'set_fs_pwd',params:'dentry',ret:'void',relation:'syscall'}] },

  // 进程通信 IPC (6)
  { cat_zh:'进程通信', cat_en:'IPC', zh:'pipe()', en:'pipe()', chain:[{caller:'Process',callee:'PipeFS',method:'pipe_create',params:'flags=0',ret:'int[2]',relation:'syscall'}] },
  { cat_zh:'进程通信', cat_en:'IPC', zh:'socket()', en:'socket()', chain:[{caller:'Process',callee:'Socket',method:'socket_create',params:'family=AF_INET,type=SOCK_STREAM',ret:'fd',relation:'syscall'},{caller:'Socket',callee:'TCP',method:'tcp_v4_init',params:'',ret:'sock',relation:'ipc'}] },
  { cat_zh:'进程通信', cat_en:'IPC', zh:'epoll()', en:'epoll()', chain:[{caller:'Process',callee:'Epoll',method:'epoll_create',params:'size=256',ret:'fd',relation:'syscall'},{caller:'Epoll',callee:'File',method:'epoll_ctl',params:'op=ADD,fd=3',ret:'int',relation:'vfs'}] },
  { cat_zh:'进程通信', cat_en:'IPC', zh:'pipe 读写', en:'pipe rw', chain:[{caller:'Process',callee:'PipeFS',method:'pipe_write',params:'buf,len',ret:'ssize_t',relation:'vfs'},{caller:'PipeFS',callee:'PipeBuf',method:'write',params:'data',ret:'int',relation:'driver'}] },
  { cat_zh:'进程通信', cat_en:'IPC', zh:'信号', en:'signal', chain:[{caller:'Kill',callee:'Kernel',method:'kill_pid',params:'pid=1234,sig=SIGTERM',ret:'int',relation:'syscall'}] },
  { cat_zh:'进程通信', cat_en:'IPC', zh:'mmap 共享', en:'mmap shared', chain:[{caller:'Process',callee:'MMU',method:'mmap',params:'addr=0,len=4096,flags=SHARED',ret:'void*',relation:'syscall'},{caller:'MMU',callee:'VMA',method:'insert_vm_struct',params:'mm,area',ret:'int',relation:'mm'}] },

  // VFS 层 (4)
  { cat_zh:'VFS层', cat_en:'VFS Layer', zh:'mount()', en:'mount()', chain:[{caller:'Process',callee:'VFS',method:'do_mount',params:'dev=/dev/sda1,dir=/mnt,type=ext4',ret:'int',relation:'syscall'},{caller:'VFS',callee:'SuperBlock',method:'read_super',params:'dev',ret:'sb',relation:'vfs'}] },
  { cat_zh:'VFS层', cat_en:'VFS Layer', zh:'lookup', en:'dentry lookup', chain:[{caller:'VFS',callee:'Dentry',method:'d_lookup',params:'parent,name=usr',ret:'dentry',relation:'vfs'},{caller:'Dentry',callee:'Inode',method:'iget_locked',params:'sb,ino',ret:'inode',relation:'vfs'}] },
  { cat_zh:'VFS层', cat_en:'VFS Layer', zh:'sync()', en:'sync()', chain:[{caller:'Process',callee:'VFS',method:'sync_filesystems',params:'wait=1',ret:'void',relation:'syscall'},{caller:'VFS',callee:'SuperBlock',method:'sync_fs',params:'wait',ret:'int',relation:'vfs'},{caller:'SuperBlock',callee:'Device',method:'writeback',params:'',ret:'void',relation:'driver'}] },
  { cat_zh:'VFS层', cat_en:'VFS Layer', zh:'readdir', en:'readdir', chain:[{caller:'Process',callee:'File',method:'iterate',params:'ctx',ret:'int',relation:'syscall'},{caller:'File',callee:'Dentry',method:'readdir',params:'filldir',ret:'int',relation:'vfs'}] },

  // 设备与内存 (4)
  { cat_zh:'设备与内存', cat_en:'Device & MM', zh:'ioctl()', en:'ioctl()', chain:[{caller:'Process',callee:'Device',method:'unlocked_ioctl',params:'cmd=LED_ON,arg=0',ret:'int',relation:'driver'},{caller:'Device',callee:'Driver',method:'ioctl_hw',params:'reg=0x3F,val=1',ret:'int',relation:'driver'}] },
  { cat_zh:'设备与内存', cat_en:'Device & MM', zh:'brk()', en:'brk()', chain:[{caller:'Process',callee:'MMU',method:'brk',params:'addr=0x601000',ret:'int',relation:'syscall'},{caller:'MMU',callee:'VMA',method:'vma_merge',params:'mm,brk',ret:'vma',relation:'mm'}] },
  { cat_zh:'设备与内存', cat_en:'Device & MM', zh:'mprotect()', en:'mprotect()', chain:[{caller:'Process',callee:'MMU',method:'mprotect',params:'addr,len,prot=RX',ret:'int',relation:'syscall'},{caller:'MMU',callee:'VMA',method:'mprotect_fixup',params:'vma,prot',ret:'int',relation:'mm'}] },
  { cat_zh:'设备与内存', cat_en:'Device & MM', zh:'DMA 读', en:'DMA read', chain:[{caller:'Driver',callee:'DMA',method:'dma_alloc',params:'size=4096',ret:'dma_addr',relation:'driver'},{caller:'DMA',callee:'Device',method:'dma_read',params:'desc',ret:'void',relation:'driver'}] },
  // GLIBC (10)
  { cat_zh:'GLIBC封装', cat_en:'GLIBC Wrap', zh:'fopen()→open', en:'fopen→open', chain:[
    {caller:'App',callee:'GLIBC',method:'__fopen_internal',params:'path=/data,mode=r',ret:'FILE*',relation:'glibc'},
    {caller:'GLIBC',callee:'VFS',method:'sys_openat',params:'dfd,path,flags=O_RDONLY',ret:'int',relation:'syscall'},
    {caller:'VFS',callee:'Dentry',method:'lookup',params:'name=data',ret:'dentry',relation:'vfs'},
  ]},
  { cat_zh:'GLIBC封装', cat_en:'GLIBC Wrap', zh:'fread()→read', en:'fread→read', chain:[
    {caller:'App',callee:'GLIBC',method:'__fread',params:'buf,size=1,n=256,fp',ret:'size_t',relation:'glibc'},
    {caller:'GLIBC',callee:'Kernel',method:'sys_read',params:'fd=3,buf,count',ret:'ssize_t',relation:'syscall'},
    {caller:'Kernel',callee:'PageCache',method:'readpage',params:'index=1',ret:'page',relation:'mm'},
  ]},
  { cat_zh:'GLIBC封装', cat_en:'GLIBC Wrap', zh:'printf()→write', en:'printf→write', chain:[
    {caller:'App',callee:'GLIBC',method:'__printf',params:'fmt=Hello\n',ret:'int',relation:'glibc'},
    {caller:'GLIBC',callee:'Kernel',method:'sys_write',params:'fd=1,buf,len',ret:'ssize_t',relation:'syscall'},
  ]},
  { cat_zh:'GLIBC封装', cat_en:'GLIBC Wrap', zh:'malloc()→brk', en:'malloc→brk', chain:[
    {caller:'App',callee:'GLIBC',method:'__libc_malloc',params:'size=1024',ret:'void*',relation:'glibc'},
    {caller:'GLIBC',callee:'MMU',method:'sys_brk',params:'addr=0',ret:'int',relation:'syscall'},
    {caller:'MMU',callee:'VMA',method:'vma_alloc',params:'size',ret:'vma',relation:'mm'},
  ]},
  { cat_zh:'GLIBC封装', cat_en:'GLIBC Wrap', zh:'free()→munmap', en:'free→munmap', chain:[
    {caller:'App',callee:'GLIBC',method:'__libc_free',params:'ptr',ret:'void',relation:'glibc'},
    {caller:'GLIBC',callee:'MMU',method:'sys_munmap',params:'addr,len',ret:'int',relation:'syscall'},
  ]},
  { cat_zh:'GLIBC封装', cat_en:'GLIBC Wrap', zh:'fgets()→read', en:'fgets→read', chain:[
    {caller:'App',callee:'GLIBC',method:'__fgets',params:'buf,n=256,fp',ret:'char*',relation:'glibc'},
    {caller:'GLIBC',callee:'Kernel',method:'sys_read',params:'fd=3,buf,n',ret:'ssize_t',relation:'syscall'},
  ]},
  { cat_zh:'GLIBC封装', cat_en:'GLIBC Wrap', zh:'fclose()→close', en:'fclose→close', chain:[
    {caller:'App',callee:'GLIBC',method:'__fclose',params:'fp',ret:'int',relation:'glibc'},
    {caller:'GLIBC',callee:'FDTable',method:'sys_close',params:'fd=3',ret:'int',relation:'syscall'},
  ]},
  { cat_zh:'GLIBC封装', cat_en:'GLIBC Wrap', zh:'fseek()→lseek', en:'fseek→lseek', chain:[
    {caller:'App',callee:'GLIBC',method:'fseek',params:'fp,off=0,SEEK_END',ret:'int',relation:'glibc'},
    {caller:'GLIBC',callee:'File',method:'sys_lseek',params:'fd=3,off,whence',ret:'off_t',relation:'syscall'},
  ]},
  { cat_zh:'GLIBC封装', cat_en:'GLIBC Wrap', zh:'puts()→write', en:'puts→write', chain:[
    {caller:'App',callee:'GLIBC',method:'__IO_puts',params:'str=hello',ret:'int',relation:'glibc'},
    {caller:'GLIBC',callee:'Kernel',method:'sys_write',params:'fd=1,str,len',ret:'ssize_t',relation:'syscall'},
  ]},
  { cat_zh:'GLIBC封装', cat_en:'GLIBC Wrap', zh:'calloc()→mmap', en:'calloc→mmap', chain:[
    {caller:'App',callee:'GLIBC',method:'__libc_calloc',params:'n=100,sz=8',ret:'void*',relation:'glibc'},
    {caller:'GLIBC',callee:'MMU',method:'sys_mmap',params:'addr=0,len=8192',ret:'void*',relation:'syscall'},
    {caller:'MMU',callee:'VMA',method:'alloc_pages',params:'order=1',ret:'page',relation:'mm'},
  ]},
]

/* ── Helpers ────────────────────────────────────────────────── */

function generateCode(chain: ChainCall[]): string {
  const defs = new Map<string, string>()
  for (const c of chain) {
    if (defs.has(c.callee)) continue
    const rel = c.relation || 'syscall'
    defs.set(c.callee, `struct ${c.callee} {\n    ${c.ret} (*${c.method})(${c.params});\n};`)
  }
  const first = chain[0].caller
  if (!defs.has(first)) {
    const fc = chain[0]
    defs.set(first, `struct ${first} {\n    int pid;\n    struct files_struct *files;\n    struct mm_struct *mm;\n};`)
  }
  const code = [...defs.values()].join('\n\n')
  const created = new Set<string>()
  const vars: string[] = []
  const calls: string[] = []
  for (const c of chain) {
    const v = c.callee[0].toLowerCase() + c.callee.slice(1)
    if (!created.has(c.callee)) { created.add(c.callee); vars.push(`    struct ${c.callee} *${v} = kmalloc(sizeof(*${v}), GFP_KERNEL);`) }
  }
  for (const c of chain) {
    const v = c.callee[0].toLowerCase() + c.callee.slice(1)
    calls.push(`    ${v}->${c.method}(${c.params.split('=')[0] || ''});`)
  }
  return `#include <linux/kernel.h>\n#include <linux/sched.h>\n\n${code}\n\nint main(void) {\n${vars.join('\n')}\n${calls.join('\n')}\n    return 0;\n}`
}

function generateSteps(chain: ChainCall[]): BusStep[] {
  const steps: BusStep[] = []
  chain.forEach((call, ci) => {
    const pv = call.params.replace(/^.*=/, '') || 'x'
    steps.push(
      { addr:'—', ctrl:'—', data:'—', desc_zh:`${call.caller} 发起 ${call.relation||'syscall'}`, desc_en:`${call.caller} → ${call.relation||'syscall'}`, highlightLine:-1, movingData:[], state:{phase:'idle'}, stack:[{pc:'0xffffffff81200000',desc:`${call.caller}::${call.method}`}] },
      { addr:`&${call.callee}+off`, ctrl:'REQ', data:'—', desc_zh:`① 地址→${call.callee} (${call.relation||'syscall'})`, desc_en:`① Addr→${call.callee}`, highlightLine:ci*2+1, movingData:[{from:ci===0?0:ci+1,to:99,label:'addr',bus:'addr'}], state:{phase:'addr'} },
      { addr:`&${call.callee}+off`, ctrl:'WR', data:call.params, desc_zh:`② 参数: ${call.params}`, desc_en:`② Args: ${call.params}`, highlightLine:ci*2+1, movingData:[{from:ci===0?0:ci+1,to:99,label:'WR',bus:'ctrl'},{from:ci===0?0:ci+1,to:99,label:pv,bus:'data'}], state:{phase:'write'} },
      { addr:'—', ctrl:'EXEC', data:'—', desc_zh:`③ ${call.callee} 执行`, desc_en:`③ ${call.callee} exec`, highlightLine:ci*2+2, movingData:[{from:99,to:ci+1,label:'ret',bus:'data'}], state:{phase:'exec',result:call.ret!=='void'?'↻':'✓'} },
    )
    if (ci < chain.length - 1) steps.push({ addr:'—', ctrl:'DONE', data:'—', desc_zh:`${call.callee}→${chain[ci+1].callee}`, desc_en:`${call.callee}→${chain[ci+1].callee}`, highlightLine:-1, movingData:[{from:ci+1,to:99,label:'DONE',bus:'ctrl'}], state:{phase:'chain'} })
  })
  const last = chain[chain.length-1]
  steps.push({ addr:'—', ctrl:'DONE', data:last.ret!=='void'?'result':'void', desc_zh:`④ 完成 ${last.ret}`, desc_en:`④ Done ${last.ret}`, highlightLine:-1, movingData:[{from:chain.length,to:99,label:'DONE',bus:'ctrl'}], state:{phase:'done'} })
  return steps
}

const STATIC_EXAMPLES = CATEGORIES.map(e => ({
  label_zh: e.zh, label_en: e.en, cat_zh: e.cat_zh, cat_en: e.cat_en, chain: e.chain,
  code: generateCode(e.chain),
}))

function checkConflict(step: BusStep): string | null {
  const active = ([['addr', step.addr], ['ctrl', step.ctrl], ['data', step.data]] as const).filter(([, v]) => v !== '—')
  if (active.length > 1) {
    const vals = active.map(([k, v]) => `${k}=${v}`)
    if (new Set(vals).size !== vals.length) return `⚡ BUS CONFLICT ${vals.join(' / ')}`
  }
  return null
}

/* ── SVG Components ──────────────────────────────────────────── */

function ChipModule({ name, sub, x, y, w, active, color, state: st, memLayout }: {
  name: string; sub: string; x: number; y: number; w: number; active: boolean; color: string; state?: Record<string, string>; memLayout?: any[]
}) {
  const se = st ? Object.entries(st) : []
  const useLayout = memLayout && memLayout.length > 0
  const ch = useLayout ? 60 + memLayout!.length * 11 : 60
  return (
    <g>
      <rect x={x} y={y} width={w} height={ch} rx={4} fill="var(--bg-elevated)" stroke={active ? color : '#334'} strokeWidth={1.5} />
      <path d={`M${x+w/2-20} ${y} L${x+w/2-10} ${y-5} L${x+w/2+10} ${y-5} L${x+w/2+20} ${y} Z`} fill="var(--bg-elevated)" stroke={active ? color : '#334'} strokeWidth={1} />
      <circle cx={x+12} cy={y+6} r={3} fill={active ? color : '#334'} />
      <text x={x+w/2} y={y+16} textAnchor="middle" fill={active ? 'var(--text-primary)' : 'var(--text-muted)'} fontSize={8} fontWeight="bold" fontFamily="monospace">{name}</text>
      <text x={x+w/2} y={y+27} textAnchor="middle" fill={active ? 'var(--text-secondary)' : 'var(--text-muted)'} fontSize={7} fontFamily="monospace">{sub}</text>
      {useLayout ? (
        <g transform={`translate(${x+4}, ${y+33})`}>
          <line x1={0} y1={0} x2={w-8} y2={0} stroke={active ? color+'40' : '#222'} strokeWidth={0.5} />
          {memLayout!.map((ml, i) => (
            <g key={i} transform={`translate(0, ${3+i*11})`}>
              <rect x={0} y={0} width={w-8} height={10} rx={1} fill={ml.active ? color+'25' : 'transparent'} />
              <text x={3} y={8} fill={ml.active ? color : '#555'} fontSize={6} fontFamily="monospace">{ml.offset}</text>
              <text x={30} y={8} fill={ml.active ? 'var(--text-primary)' : 'var(--text-muted)'} fontSize={6} fontFamily="monospace">{ml.field}</text>
              <text x={w-12} y={8} fill={ml.active ? color : '#333'} fontSize={6} fontFamily="monospace" textAnchor="end">{ml.value}</text>
            </g>
          ))}
        </g>
      ) : se.length > 0 ? (
        <g>
          <line x1={x+4} y1={y+36} x2={x+w-4} y2={y+36} stroke={active ? color+'40' : '#222'} strokeWidth={0.5} />
          {se.slice(0, 3).map(([k, v], i) => (
            <text key={i} x={x+6} y={y+46+i*7} fill={active ? 'var(--text-secondary)' : 'var(--text-muted)'} fontSize={6} fontFamily="monospace">{k}={v}</text>
          ))}
        </g>
      ) : null}
    </g>
  )
}

function BusValueLabel({ bus, label, color, active }: { bus: string; label: string; color: string; active: boolean }) {
  return active ? (
    <g>
      <rect x={100} y={-6} width={Math.min((bus.length+label.length)*6.5+20, 400)} height={14} rx={3} fill="var(--bg-primary)" stroke={color} strokeWidth={1.5} />
      <text x={106} y={5} fill={color} fontSize={8} fontWeight="bold" fontFamily="monospace">{bus}={label}</text>
      <line x1={88} y1={0} x2={100} y2={0} stroke={color} strokeWidth={1} />
      <circle cx={86} cy={0} r={3} fill={color} />
    </g>
  ) : null
}

function MovingDot({ progress, fromX, toX, y, color, label }: { progress: number; fromX: number; toX: number; y: number; color: string; label: string }) {
  const x = fromX + (toX - fromX) * progress
  const a = Math.sin(progress * Math.PI)
  return (
    <g>
      <circle cx={x} cy={y} r={5} fill={color} opacity={a*0.8} />
      <text x={x} y={y-11} textAnchor="middle" fill={color} fontSize={7} fontWeight="bold" fontFamily="monospace" opacity={a}>{label}</text>
      <circle cx={x} cy={y} r={10} fill={color} opacity={a*0.15} />
    </g>
  )
}

function RelationPath({ from, to, relation, isZh }: {
  from: { x: number; y: number; w: number }
  to: { x: number; y: number; w: number }
  relation: string; isZh: boolean
}) {
  const rel = relation || 'syscall'
  const color = REL_COLORS[rel] || '#79c0ff'
  const fromX = from.x + from.w; const fromY = from.y + 30
  const toX = to.x; const toY = to.y + 30
  const midX = (fromX + toX) / 2
  const isDashed = REL_STROKE[rel] === 'dashed'
  const label = isZh ? (REL_LABELS_ZH[rel] || rel) : (REL_LABELS_EN[rel] || rel)
  return (
    <g>
      <line x1={fromX} y1={fromY} x2={toX} y2={toY}
        stroke={color} strokeWidth={1.5}
        strokeDasharray={isDashed ? '4 3' : 'none'} />
      <rect x={midX - 40} y={fromY - 16} width={80} height={14} rx={3}
        fill="var(--bg-primary)" stroke={color+'60'} strokeWidth={0.5} />
      <text x={midX} y={fromY - 5} textAnchor="middle" fill={color}
        fontSize={7} fontWeight="bold" fontFamily="monospace">{label}</text>
    </g>
  )
}

function Waveform({ steps, curStep }: { steps: BusStep[]; curStep: number }) {
  const w = Math.max(50, 300 / steps.length)
  return (
    <div style={{ display:'flex', gap:0, alignItems:'stretch', height:44, borderRadius:4, overflow:'hidden', border:'1px solid var(--border)', background:'var(--bg-secondary)' }}>
      {steps.map((st, i) => (
        <div key={i} style={{ flex:'0 0 '+w+'px', display:'flex', flexDirection:'column', gap:1, borderRight:'1px solid '+(i===curStep?'#fff':'#161b22'), background:i===curStep?'#1a2332':'transparent', padding:'1px 1px' }}>
          {(['addr','ctrl','data'] as BusType[]).map(b => {
            const on = st[b] !== '—'
            return <div key={b} style={{ flex:1, borderRadius:1, background:on ? BUS_COLORS[b] : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 1px' }}>
              {on && <span style={{ fontSize:6, color:'#000', fontWeight:'bold', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{st[b]}</span>}
            </div>
          })}
          <div style={{ textAlign:'center', fontSize:6, color:i===curStep?'#fff':'#445', fontFamily:'monospace' }}>{i+1}</div>
        </div>
      ))}
    </div>
  )
}

/* ── Main Component ──────────────────────────────────────────── */

export default function LinuxBusView() {
  const { lang } = useLang()
  const isZh = lang === 'zh'
  const [exIdx, setExIdx] = useState(0)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(2)
  const [animProgress, setAnimProgress] = useState(0)
  const [showHex, setShowHex] = useState(false)
  const [showMem, setShowMem] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const animRef = useRef<ReturnType<typeof requestAnimationFrame>|null>(null)
  const startRef = useRef(0)

  const isStatic = exIdx >= 0 && exIdx < STATIC_EXAMPLES.length
  const staticEx = isStatic ? STATIC_EXAMPLES[exIdx] : null
  const chain = staticEx!.chain
  const catStr = isStatic ? (isZh ? staticEx!.cat_zh : staticEx!.cat_en) : ''
  const allSteps = useMemo(() => generateSteps(chain), [chain])
  const s = allSteps[step % allSteps.length]
  const conflict = checkConflict(s)
  const movingData = s.movingData || []

  const codeLines = useMemo(() => {
    if (isStatic && staticEx) return staticEx.code.split('\n')
    return []
  }, [isStatic, staticEx])

  const hlLine = useCallback((line: string) => highlightLine(line), [])

  const memLayout = useMemo(() => {
    if (!showMem || chain.length === 0) return []
    return [
      { offset: '0x00', field: 'refcount', value: '1', active: false },
      { offset: '0x08', field: 'f_op', value: '0xffff...', active: true },
      { offset: '0x10', field: 'f_pos', value: `${chain[chain.length-1]?.params.split('=')[1]||'0'}`, active: true },
      { offset: '0x18', field: 'f_dentry', value: '0x...', active: false },
    ]
  }, [showMem, chain])

  const nextStep = useCallback(() => { setStep(s => (s + 1) % allSteps.length); setAnimProgress(0) }, [allSteps.length])
  useEffect(() => {
    if (playing && step < allSteps.length) {
      const anim = (ts: number) => {
        if (!startRef.current) startRef.current = ts
        const p = Math.min((ts - startRef.current) / (1400 / speed), 1)
        setAnimProgress(p)
        if (p < 1) { animRef.current = requestAnimationFrame(anim) }
        else {
          startRef.current = 0; const n = (step + 1) % allSteps.length
          if (n === 0) { setPlaying(false); return }
          setAnimProgress(0); setStep(n)
        }
      }
      animRef.current = requestAnimationFrame(anim)
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [playing, step, allSteps.length, speed])

  const togglePlay = () => {
    if (!playing) { if (step >= allSteps.length - 1) { setStep(0); setAnimProgress(0) }; setPlaying(true); startRef.current = 0 }
    else { setPlaying(false); if (animRef.current) cancelAnimationFrame(animRef.current) }
  }
  const reset = () => { setPlaying(false); setStep(0); setAnimProgress(0); if (animRef.current) cancelAnimationFrame(animRef.current) }

  const exportSvg = () => {
    if (!svgRef.current) return
    const clone = svgRef.current.cloneNode(true) as SVGSVGElement
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `linux-bus-${exIdx}.svg`
    a.click(); URL.revokeObjectURL(url)
  }

  const chipsPerRow = 5
  const numChips = chain.length + 1
  const numRows = Math.ceil(numChips / chipsPerRow)
  const chipW = 100
  const gapX = 30
  const rowH = 200
  const svgW = Math.max(600, chipsPerRow * (chipW + gapX) + 80)
  const svgH = numRows * rowH + 60

  const chipPos = (idx: number) => {
    const row = Math.floor(idx / chipsPerRow)
    const col = idx % chipsPerRow
    return { x: 20 + col * (chipW + gapX), y: 15 + row * rowH }
  }
  const busLineY = (row: number, bus: BusType) => row * rowH + 110 + (bus === 'addr' ? -28 : bus === 'data' ? 28 : 0)

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', padding:'8px 12px', gap:6, overflow:'auto' }}>
      <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', flexShrink:0 }}>
        <span style={{ fontWeight:700, fontSize:12, color:'var(--text-primary)' }}>{isZh ? '🐧 Linux 进程文件树总线' : '🐧 Linux Proc-File Bus Analyzer'}</span>
        <select value={exIdx} onChange={e => { setExIdx(+e.target.value); reset() }} style={{ padding:'3px 6px', borderRadius:4, border:'1px solid var(--border)', background:'var(--bg-primary)', color:'var(--text-primary)', fontSize:11 }}>
          {STATIC_EXAMPLES.map((e, i) => (<option key={i} value={i}>[{isZh ? e.cat_zh : e.cat_en}] {isZh ? e.label_zh : e.label_en}</option>))}
        </select>
        <div style={{ flex:1 }} />
        <label style={{ fontSize:9, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:2, cursor:'pointer' }}>
          <input type="checkbox" checked={showHex} onChange={e => setShowHex(e.target.checked)} /> HEX
        </label>
        <label style={{ fontSize:9, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:2, cursor:'pointer' }}>
          <input type="checkbox" checked={showMem} onChange={e => setShowMem(e.target.checked)} /> MEM
        </label>
        <div style={{ display:'flex', alignItems:'center', gap:3 }}>
          <span style={{ fontSize:9, color:'var(--text-muted)' }}>{speed}x</span>
          <input type="range" min={1} max={5} value={speed} onChange={e => setSpeed(+e.target.value)} style={{ width:40, accentColor:'#4d8fff' }} />
        </div>
        <button onClick={exportSvg} style={{ padding:'3px 8px', borderRadius:4, border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontSize:10 }}>⬇ SVG</button>
        <button onClick={reset} style={{ padding:'4px 10px', borderRadius:4, border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontSize:11 }}>⏹</button>
        <button onClick={nextStep} style={{ padding:'4px 10px', borderRadius:4, border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontSize:11 }}>⏭</button>
        <button onClick={togglePlay} style={{ padding:'4px 14px', borderRadius:4, border:'none', background:playing?'#ff7b72':'#56d364', color:'#000', cursor:'pointer', fontSize:11, fontWeight:700 }}>
          {playing ? '⏸' : '▶'} {isZh ? (playing ? '暂停' : '播放') : (playing ? 'Pause' : 'Play')}
        </button>
        <div style={{ fontSize:10, color:'var(--text-muted)' }}>{step+1}/{allSteps.length}</div>
      </div>

      <div style={{ flex:1, display:'flex', gap:8, minHeight:0 }}>
        <div style={{ flex:'0 0 26%', overflow:'auto', borderRadius:6, border:'1px solid var(--border)', background:'var(--bg-primary)' }}>
          <div style={{ padding:'6px 8px', borderBottom:'1px solid var(--border)', fontSize:10, fontWeight:700, color:'#8b949e', display:'flex', justifyContent:'space-between' }}>
            <span>{isZh ? '内核代码' : 'Kernel Code'}</span>
            <span style={{ fontSize:8, color:'#4d8fff' }}>{catStr}</span>
          </div>
          <pre style={{ margin:0, padding:8, fontSize:10.5, lineHeight:1.55, fontFamily:"'SF Mono','Fira Code',monospace", overflow:'auto' }}>
            {codeLines.map((line, i) => (
              <div key={i} style={{
                background: s.highlightLine === i+1 ? 'rgba(255,123,114,0.12)' : 'transparent',
                borderLeft: s.highlightLine === i+1 ? '3px solid #ff7b72' : '3px solid transparent',
                paddingLeft:6, transition:'all 0.3s',
              }}>
                <span style={{ color:'#484f58', marginRight:8, userSelect:'none', fontSize:9 }}>{i+1}</span>
                {hlLine(line).map((p, j) => <span key={j} style={{ color: p.color }}>{p.text}</span>)}
              </div>
            ))}
          </pre>
        </div>

        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6, minWidth:0 }}>
          <div style={{ flex:1, borderRadius:6, border:'1px solid var(--border)', background:'var(--bg-primary)', overflow:'hidden', display:'flex' }}>
            <svg ref={svgRef} viewBox={`0 0 ${svgW} ${svgH}`} style={{ width:'100%', height:'100%', display:'block', flex:1 }}>
              <defs>
                <pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#161b22" strokeWidth="0.5" /></pattern>
              </defs>
              <rect width={svgW} height={svgH} fill="var(--bg-primary)" /><rect width={svgW} height={svgH} fill="url(#g)" />

              {Array.from({ length: Math.max(0, numChips - 1) }, (_, i) => {
                const p1 = chipPos(i); const p2 = chipPos(i + 1)
                if (Math.floor(i / chipsPerRow) !== Math.floor((i + 1) / chipsPerRow)) return null
                const rel = chain[i]?.relation || 'syscall'
                return <RelationPath key={`rel-${i}`} from={{...p1, w: chipW}} to={{...p2, w: chipW}} relation={rel} isZh={isZh} />
              })}

              {Array.from({ length: numChips }, (_, i) => {
                const p = chipPos(i)
                const name = i === 0 ? chain[0]?.caller || 'Process' : chain[i - 1]?.callee || `M${i}`
                return <ChipModule key={i} name={name} sub={i === 0 ? (isZh ? '发起方' : 'Caller') : `#${i}`} x={p.x} y={p.y} w={chipW}
                  active={i === 0 ? movingData.some(d => d.from === 0) : movingData.some(d => d.to === i || d.from === i)}
                  color={CHIP_COLORS[i % CHIP_COLORS.length]}
                  state={s.state} memLayout={showMem && i === numChips - 1 ? memLayout : undefined} />
              })}

              {Array.from({ length: numRows }, (_, row) => (
                (['addr','ctrl','data'] as BusType[]).map(bus => (
                  <g key={`${row}-${bus}`}>
                    <line x1={0} y1={busLineY(row, bus)} x2={svgW} y2={busLineY(row, bus)} stroke={BUS_COLORS[bus]} strokeWidth={2} opacity={s[bus] !== '—' ? 1 : 0.12} />
                    {Array.from({ length: Math.min(chipsPerRow, numChips - row * chipsPerRow) }, (_, ci) => {
                      const idx = row * chipsPerRow + ci; const p = chipPos(idx)
                      const cx = idx === 0 ? p.x + chipW : p.x - 8
                      return (<g key={ci}><line x1={cx} y1={p.y + 30} x2={cx} y2={busLineY(row, bus)} stroke={s[bus] !== '—' ? BUS_COLORS[bus] : '#222'} strokeWidth={1} strokeDasharray="3 2" /><circle cx={cx} cy={busLineY(row, bus)} r={3} fill={s[bus] !== '—' ? BUS_COLORS[bus] : '#333'} /></g>)
                    })}
                  </g>
                ))
              ))}

              {Array.from({ length: numRows }, (_, row) => (([['addr','ADDR','#ff7b72'],['ctrl','CTRL','#79c0ff'],['data','DATA','#56d364']] as const).map(([b,n,c]) => (
                <g key={`l-${row}-${n}`} transform={`translate(4, ${busLineY(row, b)-14})`}>
                  <rect x={0} y={0} width={68} height={12} rx={2} fill="var(--bg-primary)" stroke={(c+'40')} strokeWidth={1} />
                  <text x={3} y={9} fill={c} fontSize={7} fontFamily='monospace' fontWeight='bold'>{n} BUS</text>
                </g>
              ))))}

              {(['addr','ctrl','data'] as BusType[]).map(b => (
                <g key={b} transform={`translate(${chipW + 40}, ${busLineY(0, b)})`}>
                  <BusValueLabel bus={b.toUpperCase()} label={s[b]} color={BUS_COLORS[b]} active={s[b] !== '—'} />
                </g>
              ))}

              {movingData.map((md, i) => {
                const calleeIdx = md.to === 99 ? numChips - 1 : md.to
                const callerIdx = md.from === 99 ? numChips - 1 : md.from
                const p1 = chipPos(md.from === 0 ? 0 : callerIdx)
                const p2 = chipPos(calleeIdx)
                const cx1 = md.from === 0 ? p1.x + chipW : p1.x
                const cx2 = md.to === 99 ? p2.x + 150 : md.to === 0 ? p2.x + chipW : p2.x
                const fromRow = Math.floor((md.from === 0 ? 0 : callerIdx) / chipsPerRow)
                const toRow = Math.floor(calleeIdx / chipsPerRow)
                const y = fromRow === toRow ? busLineY(fromRow, md.bus) : busLineY(0, md.bus)
                const fx = cx1 < cx2 ? cx1 : cx2; const tx = cx1 < cx2 ? cx2 : cx1
                return <MovingDot key={i} progress={animProgress} fromX={fx} toX={tx} y={y} color={BUS_COLORS[md.bus]} label={md.label} />
              })}
            </svg>

            <div style={{ width:100, flexShrink:0, borderLeft:'1px solid var(--border)', padding:4, background:'var(--bg-primary)', display:'flex', flexDirection:'column', gap:3 }}>
              <div style={{ fontSize:7, color:'#8b949e', fontFamily:'monospace', textAlign:'center' }}>{isZh ? '内核栈' : 'Kernel Stack'}</div>
              {(s?.stack||[]).length === 0 ? <div style={{ fontSize:8, color:'#445', fontFamily:'monospace', padding:4 }}>—</div> :
                (s?.stack||[]).slice().reverse().map((f, i) => (
                  <div key={i} style={{ padding:'3px 4px', borderRadius:2, background:'#1a2332', border:'1px solid #334', borderLeft:'2px solid #4d8fff', fontSize:8, fontFamily:'monospace' }}>
                    <div style={{ color:'#ff7b72' }}>{f.pc}</div>
                    <div style={{ color:'#8b949e', fontSize:7 }}>{f.desc}</div>
                  </div>
                ))
              }
            </div>
          </div>

          <div style={{ borderRadius:6, border:'1px solid var(--border)', padding:'4px 8px', fontSize:11, lineHeight:1.5, color:'#e6edf3', background:conflict?'#ff7b7215': '#161b22', flexShrink:0, display:'flex', alignItems:'center', gap:8 }}>
            {conflict && <span style={{ color:'#ff7b72', fontWeight:700 }}>{conflict}</span>}
            <span>{isZh ? s.desc_zh : s.desc_en}</span>
            <span style={{ fontSize:9, color:'#4d8fff', fontFamily:'monospace' }}>{chain[0]?.caller||'Process'} → {chain.map(c=>c.callee).join('→')}</span>
          </div>

          <div style={{ flexShrink:0 }}>
            <div style={{ fontSize:8, color:'#8b949e', marginBottom:1, fontFamily:'monospace', paddingLeft:2 }}>{isZh ? '波形' : 'Wave'}</div>
            <Waveform steps={allSteps} curStep={step} />
          </div>
        </div>
      </div>
    </div>
  )
}
