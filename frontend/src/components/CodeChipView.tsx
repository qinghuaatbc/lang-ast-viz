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
  relation?: 'call' | 'compose' | 'aggregate' | 'inherit' | 'depend'
}
interface CatExample {
  cat_zh: string; cat_en: string; zh: string; en: string; chain: ChainCall[]
}

const BUS_COLORS: Record<BusType, string> = { addr: '#ff7b72', data: '#56d364', ctrl: '#79c0ff' }

/* ── Relation display ────────────────────────────────────── */

const REL_LABELS_ZH: Record<string, string> = {
  call: '→ 调用', compose: '◆→ 组合', aggregate: '◇→ 聚合', inherit: '⊳ 继承', depend: '-→ 依赖',
}
const REL_LABELS_EN: Record<string, string> = {
  call: '→ call', compose: '◆→ compose', aggregate: '◇→ aggregate', inherit: '⊳ inherit', depend: '-→ depend',
}
const REL_COLORS: Record<string, string> = {
  call: '#79c0ff', compose: '#ff7b72', aggregate: '#ffa657', inherit: '#d2a8ff', depend: '#8b949e',
}
const REL_STROKE: Record<string, string> = {
  call: 'solid', compose: 'solid', aggregate: 'solid', inherit: 'solid', depend: 'dashed',
}

/* ── Syntax Highlighting ──────────────────────────────────── */

const KEYWORDS = new Set(['class','struct','public','private','protected','virtual','override','static','const','void','int','bool','char','float','double','string','auto','return','if','else','for','while','do','switch','case','break','continue','new','delete','template','typename','namespace','using','import','export','def','fn','let','var','val','fun','async','await','yield','fun','impl','trait','pub','self'])
function highlightLine(line: string) {
  const parts: { text: string; color: string }[] = []
  const re = /(\/\/.*)|("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|\b(0x[0-9a-fA-F]+|\d+\.?\d*)\b|\b([a-zA-Z_]\w*)\b|(\S)/g
  let m: RegExpExecArray | null
  let last = 0
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) parts.push({ text: line.slice(last, m.index), color: 'var(--text-primary)' })
    if (m[1]) parts.push({ text: m[1], color: 'var(--text-secondary)' })
    else if (m[2]) parts.push({ text: m[2], color: '#a5d6ff' })
    else if (m[3]) parts.push({ text: m[3], color: '#a5d6ff' })
    else if (m[4]) parts.push({ text: m[4], color: '#79c0ff' })
    else if (m[5]) {
      const w = m[5]
      if (KEYWORDS.has(w)) parts.push({ text: w, color: '#ff7b72' })
      else if (w[0] === w[0]?.toUpperCase() && w[0] !== w[0]?.toLowerCase()) parts.push({ text: w, color: '#d2a8ff' })
      else parts.push({ text: w, color: 'var(--text-primary)' })
    } else if (m[6]) parts.push({ text: m[6], color: 'var(--text-primary)' })
    last = re.lastIndex
  }
  if (last < line.length) parts.push({ text: line.slice(last), color: 'var(--text-primary)' })
  return parts
}

/* ── 100 Categorized Examples ──────────────────────────────── */

const CATEGORIES: CatExample[] = [
  // Basic Syntax (10)
  { cat_zh:'基础语法', cat_en:'Basic Syntax', zh:'简单方法调用', en:'Simple Method Call', chain:[
    {caller:'App',callee:'Logger',method:'log',params:'msg=hello',ret:'void',relation:'call'},
    {caller:'Logger',callee:'Formatter',method:'format',params:'level=info',ret:'string',relation:'call'},
  ]},
  { cat_zh:'基础语法', cat_en:'Basic Syntax', zh:'构造函数', en:'Constructor', chain:[
    {caller:'Factory',callee:'Product',method:'Product',params:'id=1',ret:'Product',relation:'compose'},
    {caller:'Product',callee:'Builder',method:'build',params:'cfg',ret:'void',relation:'depend'},
  ]},
  { cat_zh:'基础语法', cat_en:'Basic Syntax', zh:'Getter连查', en:'Getter Chain', chain:[
    {caller:'Ctrl',callee:'User',method:'getProfile',params:'uid=5',ret:'Profile',relation:'call'},
    {caller:'User',callee:'Profile',method:'getName',params:'',ret:'string',relation:'call'},
  ]},
  { cat_zh:'基础语法', cat_en:'Basic Syntax', zh:'Setter', en:'Setter', chain:[{caller:'Svc',callee:'Config',method:'setTimeout',params:'ms=5000',ret:'void',relation:'call'}] },
  { cat_zh:'基础语法', cat_en:'Basic Syntax', zh:'静态方法', en:'Static', chain:[{caller:'App',callee:'Math',method:'max',params:'a=10,b=20',ret:'int',relation:'call'}] },
  { cat_zh:'基础语法', cat_en:'Basic Syntax', zh:'链式调用', en:'Fluent', chain:[
    {caller:'App',callee:'Builder',method:'setName',params:'n=foo',ret:'Builder',relation:'call'},
    {caller:'Builder',callee:'Product',method:'build',params:'',ret:'Product',relation:'compose'},
  ]},
  { cat_zh:'基础语法', cat_en:'Basic Syntax', zh:'重载', en:'Overload', chain:[{caller:'View',callee:'Rdr',method:'draw',params:'mode=2d',ret:'void',relation:'call'}] },
  { cat_zh:'基础语法', cat_en:'Basic Syntax', zh:'运算符重载', en:'OpOverload', chain:[{caller:'App',callee:'Vec3',method:'add',params:'v2',ret:'Vec3',relation:'call'}] },
  { cat_zh:'基础语法', cat_en:'Basic Syntax', zh:'模板函数', en:'Template', chain:[{caller:'App',callee:'Container',method:'sort',params:'cmp',ret:'void',relation:'call'}] },
  { cat_zh:'基础语法', cat_en:'Basic Syntax', zh:'默认参数', en:'DefaultArg', chain:[{caller:'App',callee:'Req',method:'fetch',params:'url=/,timeout=30',ret:'Resp',relation:'depend'}] },

  // Inheritance (10)
  { cat_zh:'继承与多态', cat_en:'Inheritance', zh:'虚函数', en:'Virtual', chain:[
    {caller:'App',callee:'Animal',method:'speak',params:'',ret:'void',relation:'call'},
    {caller:'Animal',callee:'Dog',method:'bark',params:'',ret:'void',relation:'inherit'},
  ]},
  { cat_zh:'继承与多态', cat_en:'Inheritance', zh:'接口实现', en:'Interface', chain:[
    {caller:'App',callee:'Database',method:'connect',params:'url=jdbc:',ret:'Conn',relation:'call'},
    {caller:'Database',callee:'MySQL',method:'query',params:'sql',ret:'Rows',relation:'inherit'},
  ]},
  { cat_zh:'继承与多态', cat_en:'Inheritance', zh:'抽象类', en:'Abstract', chain:[
    {caller:'App',callee:'Document',method:'open',params:'path',ret:'void',relation:'call'},
    {caller:'Document',callee:'PDFReport',method:'generate',params:'data',ret:'void',relation:'inherit'},
  ]},
  { cat_zh:'继承与多态', cat_en:'Inheritance', zh:'纯虚函数', en:'PureVirtual', chain:[{caller:'App',callee:'Circle',method:'draw',params:'',ret:'void',relation:'inherit'}] },
  { cat_zh:'继承与多态', cat_en:'Inheritance', zh:'多重继承', en:'MultiInherit', chain:[
    {caller:'App',callee:'AmphCar',method:'drive',params:'mode=land',ret:'void',relation:'call'},
    {caller:'AmphCar',callee:'Engine',method:'start',params:'',ret:'void',relation:'compose'},
  ]},
  { cat_zh:'继承与多态', cat_en:'Inheritance', zh:'访问基类', en:'SuperCall', chain:[{caller:'Derived',callee:'Base',method:'init',params:'',ret:'void',relation:'inherit'}] },
  { cat_zh:'继承与多态', cat_en:'Inheritance', zh:'dynamic_cast', en:'DynamicCast', chain:[{caller:'App',callee:'TypeInfo',method:'cast',params:'ptr',ret:'D*',relation:'depend'}] },
  { cat_zh:'继承与多态', cat_en:'Inheritance', zh:'final 方法', en:'FinalMethod', chain:[{caller:'App',callee:'Final',method:'compute',params:'n=42',ret:'int',relation:'inherit'}] },
  { cat_zh:'继承与多态', cat_en:'Inheritance', zh:'覆盖与隐藏', en:'Override', chain:[{caller:'App',callee:'Parent',method:'show',params:'',ret:'void',relation:'call'},{caller:'Parent',callee:'Child',method:'display',params:'',ret:'void',relation:'inherit'}] },
  { cat_zh:'继承与多态', cat_en:'Inheritance', zh:'委托构造', en:'DelegCtor', chain:[{caller:'App',callee:'Emp',method:'Emp',params:'name=Bob,id=7',ret:'Emp',relation:'compose'}] },

  // Design Patterns (10)
  { cat_zh:'设计模式', cat_en:'Patterns', zh:'单例', en:'Singleton', chain:[{caller:'App',callee:'CfgMgr',method:'getInst',params:'',ret:'CfgMgr',relation:'call'}] },
  { cat_zh:'设计模式', cat_en:'Patterns', zh:'工厂', en:'Factory', chain:[
    {caller:'App',callee:'ShapeFac',method:'create',params:'type=circle',ret:'Shape',relation:'compose'},
    {caller:'ShapeFac',callee:'Circle',method:'draw',params:'',ret:'void',relation:'compose'},
  ]},
  { cat_zh:'设计模式', cat_en:'Patterns', zh:'抽象工厂', en:'AbsFactory', chain:[{caller:'App',callee:'GUIFac',method:'createBtn',params:'',ret:'Btn',relation:'compose'}] },
  { cat_zh:'设计模式', cat_en:'Patterns', zh:'建造者', en:'Builder', chain:[
    {caller:'App',callee:'PizzaBld',method:'addTop',params:'t=cheese',ret:'PizzaBld',relation:'call'},
    {caller:'PizzaBld',callee:'Pizza',method:'bake',params:'',ret:'Pizza',relation:'compose'},
  ]},
  { cat_zh:'设计模式', cat_en:'Patterns', zh:'观察者', en:'Observer', chain:[
    {caller:'Subject',callee:'Listener',method:'update',params:'ev=click',ret:'void',relation:'aggregate'},
    {caller:'Listener',callee:'Handler',method:'handle',params:'ev',ret:'void',relation:'depend'},
  ]},
  { cat_zh:'设计模式', cat_en:'Patterns', zh:'策略', en:'Strategy', chain:[
    {caller:'Context',callee:'Sorter',method:'sort',params:'arr',ret:'void',relation:'aggregate'},
    {caller:'Sorter',callee:'QuickSort',method:'exec',params:'arr',ret:'void',relation:'inherit'},
  ]},
  { cat_zh:'设计模式', cat_en:'Patterns', zh:'装饰器', en:'Decorator', chain:[
    {caller:'App',callee:'Stream',method:'write',params:'data',ret:'void',relation:'call'},
    {caller:'Stream',callee:'ZipStream',method:'compress',params:'data',ret:'void',relation:'compose'},
    {caller:'ZipStream',callee:'CryptoStream',method:'encrypt',params:'data',ret:'void',relation:'compose'},
  ]},
  { cat_zh:'设计模式', cat_en:'Patterns', zh:'适配器', en:'Adapter', chain:[
    {caller:'App',callee:'USBAdapter',method:'read',params:'',ret:'byte',relation:'depend'},
    {caller:'USBAdapter',callee:'LegacyPort',method:'transfer',params:'',ret:'byte',relation:'aggregate'},
  ]},
  { cat_zh:'设计模式', cat_en:'Patterns', zh:'代理', en:'Proxy', chain:[
    {caller:'App',callee:'ImgProxy',method:'display',params:'',ret:'void',relation:'call'},
    {caller:'ImgProxy',callee:'RealImage',method:'load',params:'url',ret:'void',relation:'aggregate'},
  ]},
  { cat_zh:'设计模式', cat_en:'Patterns', zh:'模板方法', en:'TemplateMtd', chain:[{caller:'App',callee:'GameAI',method:'buildStr',params:'',ret:'void',relation:'inherit'}] },

  // Collections (10)
  { cat_zh:'集合', cat_en:'Collections', zh:'List 添加', en:'ListAdd', chain:[{caller:'App',callee:'ArrayList',method:'add',params:'item=42',ret:'bool',relation:'call'}] },
  { cat_zh:'集合', cat_en:'Collections', zh:'Map 查询', en:'MapGet', chain:[{caller:'App',callee:'HashMap',method:'get',params:'key=user',ret:'Val',relation:'call'}] },
  { cat_zh:'集合', cat_en:'Collections', zh:'Set 查找', en:'SetHas', chain:[{caller:'App',callee:'HashSet',method:'has',params:'val=test',ret:'bool',relation:'call'}] },
  { cat_zh:'集合', cat_en:'Collections', zh:'队列入队', en:'QueuePush', chain:[{caller:'App',callee:'Queue',method:'push',params:'task=job1',ret:'void',relation:'call'}] },
  { cat_zh:'集合', cat_en:'Collections', zh:'栈出栈', en:'StackPop', chain:[{caller:'App',callee:'Stack',method:'pop',params:'',ret:'Item',relation:'call'}] },
  { cat_zh:'集合', cat_en:'Collections', zh:'堆入堆', en:'HeapPush', chain:[{caller:'App',callee:'Heap',method:'push',params:'item=5',ret:'void',relation:'call'}] },
  { cat_zh:'集合', cat_en:'Collections', zh:'迭代器', en:'Iterator', chain:[
    {caller:'App',callee:'Collection',method:'iter',params:'',ret:'Iterator',relation:'compose'},
    {caller:'Collection',callee:'Iterator',method:'next',params:'',ret:'Elem',relation:'call'},
  ]},
  { cat_zh:'集合', cat_en:'Collections', zh:'有序插入', en:'Sorted', chain:[{caller:'App',callee:'TreeSet',method:'ins',params:'val=7',ret:'void',relation:'call'}] },
  { cat_zh:'集合', cat_en:'Collections', zh:'链表删除', en:'LinkedList', chain:[
    {caller:'App',callee:'List',method:'remove',params:'idx=3',ret:'Item',relation:'call'},
    {caller:'List',callee:'Node',method:'unlink',params:'',ret:'void',relation:'aggregate'},
  ]},
  { cat_zh:'集合', cat_en:'Collections', zh:'并发 Map', en:'ConcMap', chain:[{caller:'App',callee:'CHashMap',method:'putIfAbsent',params:'k=lock,v=1',ret:'Val',relation:'call'}] },

  // I/O (10)
  { cat_zh:'I/O', cat_en:'IO', zh:'文件读取', en:'FileRead', chain:[
    {caller:'App',callee:'FileReader',method:'open',params:'path=./data',ret:'void',relation:'call'},
    {caller:'FileReader',callee:'BufReader',method:'readLine',params:'',ret:'str',relation:'compose'},
  ]},
  { cat_zh:'I/O', cat_en:'IO', zh:'文件写入', en:'FileWrite', chain:[{caller:'App',callee:'FileWriter',method:'write',params:'data=hello',ret:'void',relation:'call'}] },
  { cat_zh:'I/O', cat_en:'IO', zh:'缓冲流', en:'Buffered', chain:[{caller:'App',callee:'BufReader',method:'readLine',params:'',ret:'str',relation:'call'}] },
  { cat_zh:'I/O', cat_en:'IO', zh:'序列化', en:'Serialize', chain:[
    {caller:'App',callee:'ObjOut',method:'writeObj',params:'obj',ret:'void',relation:'call'},
    {caller:'ObjOut',callee:'BufStream',method:'flush',params:'',ret:'void',relation:'compose'},
  ]},
  { cat_zh:'I/O', cat_en:'IO', zh:'文件复制', en:'FileCopy', chain:[{caller:'App',callee:'Files',method:'copy',params:'from,to',ret:'void',relation:'call'}] },
  { cat_zh:'I/O', cat_en:'IO', zh:'GZip 压缩', en:'GZip', chain:[{caller:'App',callee:'GZipOut',method:'write',params:'bytes',ret:'void',relation:'call'}] },
  { cat_zh:'I/O', cat_en:'IO', zh:'XML 解析', en:'XMLParse', chain:[
    {caller:'App',callee:'XMLParser',method:'parse',params:'file=cfg',ret:'Doc',relation:'call'},
    {caller:'XMLParser',callee:'DOMBuilder',method:'build',params:'',ret:'Node',relation:'compose'},
  ]},
  { cat_zh:'I/O', cat_en:'IO', zh:'JSON 解析', en:'JSONParse', chain:[{caller:'App',callee:'JSONParser',method:'fromJson',params:'str',ret:'Obj',relation:'call'}] },
  { cat_zh:'I/O', cat_en:'IO', zh:'CSV 处理', en:'CSV', chain:[{caller:'App',callee:'CSVReader',method:'readRow',params:'',ret:'str[]',relation:'call'}] },
  { cat_zh:'I/O', cat_en:'IO', zh:'临时文件', en:'TempFile', chain:[{caller:'App',callee:'File',method:'createTemp',params:'pfx,sfx',ret:'File',relation:'call'}] },

  // Networking (10)
  { cat_zh:'网络', cat_en:'Networking', zh:'HTTP GET', en:'HTTP GET', chain:[
    {caller:'App',callee:'HttpClient',method:'get',params:'url=/api',ret:'Resp',relation:'call'},
    {caller:'HttpClient',callee:'Connection',method:'send',params:'req',ret:'Resp',relation:'depend'},
    {caller:'Connection',callee:'Socket',method:'write',params:'bytes',ret:'void',relation:'aggregate'},
  ]},
  { cat_zh:'网络', cat_en:'Networking', zh:'HTTP POST', en:'HTTP POST', chain:[{caller:'App',callee:'HttpClient',method:'post',params:'body=json',ret:'Resp',relation:'call'}] },
  { cat_zh:'网络', cat_en:'Networking', zh:'WebSocket 发消息', en:'WS Send', chain:[{caller:'App',callee:'WebSocket',method:'send',params:'msg',ret:'void',relation:'call'}] },
  { cat_zh:'网络', cat_en:'Networking', zh:'TCP 连接', en:'TCP Connect', chain:[
    {caller:'App',callee:'TcpClient',method:'connect',params:'host,port',ret:'void',relation:'call'},
    {caller:'TcpClient',callee:'Socket',method:'handshake',params:'',ret:'void',relation:'compose'},
  ]},
  { cat_zh:'网络', cat_en:'Networking', zh:'UDP 发送', en:'UDP Send', chain:[{caller:'App',callee:'Datagram',method:'send',params:'pkt',ret:'void',relation:'call'}] },
  { cat_zh:'网络', cat_en:'Networking', zh:'DNS 解析', en:'DNS', chain:[{caller:'App',callee:'DNS',method:'resolve',params:'host=ex.com',ret:'Addr',relation:'call'}] },
  { cat_zh:'网络', cat_en:'Networking', zh:'SSL 握手', en:'SSL', chain:[{caller:'App',callee:'SSL',method:'handshake',params:'',ret:'void',relation:'depend'}] },
  { cat_zh:'网络', cat_en:'Networking', zh:'gRPC', en:'gRPC', chain:[
    {caller:'App',callee:'GreeterClient',method:'sayHello',params:'name=W',ret:'Reply',relation:'call'},
    {caller:'GreeterClient',callee:'Channel',method:'sendMsg',params:'req',ret:'Reply',relation:'depend'},
  ]},
  { cat_zh:'网络', cat_en:'Networking', zh:'REST 调用', en:'REST', chain:[{caller:'App',callee:'RestTmpl',method:'exchange',params:'url,method',ret:'Entity',relation:'call'}] },
  { cat_zh:'网络', cat_en:'Networking', zh:'MQ 发布', en:'MQ Pub', chain:[{caller:'App',callee:'MQ',method:'publish',params:'topic=ord,msg',ret:'void',relation:'call'}] },

  // Concurrency (10)
  { cat_zh:'并发', cat_en:'Concurrency', zh:'线程启动', en:'Thread Start', chain:[{caller:'App',callee:'Worker',method:'start',params:'',ret:'void',relation:'call'}] },
  { cat_zh:'并发', cat_en:'Concurrency', zh:'互斥锁', en:'Mutex', chain:[{caller:'App',callee:'Mutex',method:'lock',params:'',ret:'void',relation:'depend'}] },
  { cat_zh:'并发', cat_en:'Concurrency', zh:'条件变量', en:'CondVar', chain:[{caller:'App',callee:'CondVar',method:'wait',params:'lk',ret:'void',relation:'depend'}] },
  { cat_zh:'并发', cat_en:'Concurrency', zh:'信号量', en:'Semaphore', chain:[{caller:'App',callee:'Sem',method:'acquire',params:'n=1',ret:'void',relation:'call'}] },
  { cat_zh:'并发', cat_en:'Concurrency', zh:'Future & Promise', en:'Future & Promise', chain:[
    {caller:'App',callee:'Future',method:'submit',params:'task',ret:'Future',relation:'call'},
    {caller:'Future',callee:'Promise',method:'then',params:'cb',ret:'void',relation:'aggregate'},
  ]},
  { cat_zh:'并发', cat_en:'Concurrency', zh:'线程池', en:'ThreadPool', chain:[
    {caller:'App',callee:'Pool',method:'submit',params:'task',ret:'Future',relation:'call'},
    {caller:'Pool',callee:'Worker',method:'execute',params:'task',ret:'void',relation:'compose'},
    {caller:'Worker',callee:'Task',method:'run',params:'',ret:'void',relation:'call'},
  ]},
  { cat_zh:'并发', cat_en:'Concurrency', zh:'原子 CAS', en:'Atomic CAS', chain:[{caller:'App',callee:'AtomicInt',method:'cas',params:'e=0,u=1',ret:'bool',relation:'call'}] },
  { cat_zh:'并发', cat_en:'Concurrency', zh:'读写锁', en:'RWLock', chain:[{caller:'App',callee:'RWLock',method:'rLock',params:'',ret:'void',relation:'call'}] },
  { cat_zh:'并发', cat_en:'Concurrency', zh:'屏障', en:'Barrier', chain:[{caller:'App',callee:'Barrier',method:'await',params:'',ret:'void',relation:'call'}] },
  { cat_zh:'并发', cat_en:'Concurrency', zh:'协程启动', en:'Coroutine', chain:[
    {caller:'App',callee:'Coroutine',method:'launch',params:'',ret:'Job',relation:'call'},
    {caller:'Coroutine',callee:'Scheduler',method:'yield',params:'',ret:'void',relation:'depend'},
  ]},

  // Database (10)
  { cat_zh:'数据库', cat_en:'Database', zh:'打开连接', en:'Open Conn', chain:[
    {caller:'App',callee:'DriverMgr',method:'getConn',params:'url=jdbc:',ret:'Conn',relation:'call'},
    {caller:'DriverMgr',callee:'Conn',method:'setAutoCommit',params:'val=false',ret:'void',relation:'compose'},
  ]},
  { cat_zh:'数据库', cat_en:'Database', zh:'执行查询', en:'Query', chain:[{caller:'App',callee:'Stmt',method:'execute',params:'sql=SELECT',ret:'Rows',relation:'call'}] },
  { cat_zh:'数据库', cat_en:'Database', zh:'预编译', en:'PrepStmt', chain:[{caller:'App',callee:'PrepStmt',method:'setInt',params:'idx=1,val=42',ret:'void',relation:'call'}] },
  { cat_zh:'数据库', cat_en:'Database', zh:'事务提交', en:'Commit', chain:[{caller:'App',callee:'Conn',method:'commit',params:'',ret:'void',relation:'call'}] },
  { cat_zh:'数据库', cat_en:'Database', zh:'ORM 保存', en:'ORM Save', chain:[
    {caller:'App',callee:'Session',method:'save',params:'ent',ret:'void',relation:'call'},
    {caller:'Session',callee:'Transaction',method:'commit',params:'',ret:'void',relation:'compose'},
    {caller:'Transaction',callee:'Database',method:'write',params:'sql',ret:'void',relation:'depend'},
  ]},
  { cat_zh:'数据库', cat_en:'Database', zh:'ORM 查询', en:'ORM Find', chain:[{caller:'App',callee:'EM',method:'find',params:'cls,id=1',ret:'Ent',relation:'call'}] },
  { cat_zh:'数据库', cat_en:'Database', zh:'存储过程', en:'StoredProc', chain:[{caller:'App',callee:'CallStmt',method:'exec',params:'',ret:'void',relation:'call'}] },
  { cat_zh:'数据库', cat_en:'Database', zh:'批量插入', en:'Batch', chain:[{caller:'App',callee:'Stmt',method:'addBatch',params:'sql',ret:'void',relation:'call'}] },
  { cat_zh:'数据库', cat_en:'Database', zh:'连接池', en:'Pool', chain:[{caller:'App',callee:'DataSource',method:'getConn',params:'',ret:'Conn',relation:'call'}] },
  { cat_zh:'数据库', cat_en:'Database', zh:'迁移', en:'Migrate', chain:[{caller:'App',callee:'Migrator',method:'up',params:'ver=3',ret:'void',relation:'call'}] },

  // Framework (10)
  { cat_zh:'框架', cat_en:'Framework', zh:'React 渲染', en:'React Render', chain:[
    {caller:'App',callee:'Component',method:'render',params:'props',ret:'VNode',relation:'call'},
    {caller:'Component',callee:'DOM',method:'patch',params:'vnode',ret:'void',relation:'depend'},
  ]},
  { cat_zh:'框架', cat_en:'Framework', zh:'Vue reactive', en:'Vue reactive', chain:[{caller:'App',callee:'Vue',method:'reactive',params:'data',ret:'Proxy',relation:'call'}] },
  { cat_zh:'框架', cat_en:'Framework', zh:'Spring 注入', en:'Spring DI', chain:[
    {caller:'App',callee:'Context',method:'refresh',params:'',ret:'void',relation:'call'},
    {caller:'Context',callee:'BeanFactory',method:'getBean',params:'name=svc',ret:'Obj',relation:'compose'},
    {caller:'BeanFactory',callee:'Bean',method:'init',params:'',ret:'void',relation:'compose'},
  ]},
  { cat_zh:'框架', cat_en:'Framework', zh:'Express 路由', en:'Express Route', chain:[
    {caller:'App',callee:'Server',method:'listen',params:'port=3000',ret:'void',relation:'call'},
    {caller:'Server',callee:'Router',method:'get',params:'path=/',ret:'void',relation:'compose'},
    {caller:'Router',callee:'Handler',method:'handleReq',params:'req',ret:'void',relation:'call'},
  ]},
  { cat_zh:'框架', cat_en:'Framework', zh:'Flask 渲染', en:'Flask', chain:[{caller:'App',callee:'Flask',method:'render',params:'tpl=index',ret:'str',relation:'call'}] },
  { cat_zh:'框架', cat_en:'Framework', zh:'MyBatis', en:'MyBatis', chain:[{caller:'App',callee:'UserMapper',method:'selById',params:'id=1',ret:'User',relation:'call'}] },
  { cat_zh:'框架', cat_en:'Framework', zh:'Angular inject', en:'Angular', chain:[{caller:'App',callee:'Injector',method:'get',params:'tok=Http',ret:'Svc',relation:'call'}] },
  { cat_zh:'框架', cat_en:'Framework', zh:'Django ORM', en:'Django', chain:[{caller:'App',callee:'QuerySet',method:'filter',params:'name=alice',ret:'QS',relation:'call'}] },
  { cat_zh:'框架', cat_en:'Framework', zh:'Redis 缓存', en:'Redis', chain:[{caller:'App',callee:'Redis',method:'get',params:'key=cache:u',ret:'str',relation:'call'}] },
  { cat_zh:'框架', cat_en:'Framework', zh:'gRPC 服务端', en:'gRPC Server', chain:[{caller:'App',callee:'SrvBuilder',method:'addSvc',params:'svc',ret:'SrvB',relation:'call'}] },

  // Low-Level (10)
  { cat_zh:'底层', cat_en:'Low-Level', zh:'syscall read', en:'Syscall read', chain:[
    {caller:'App',callee:'VFS',method:'read',params:'fd=3,buf,len',ret:'ssize_t',relation:'call'},
    {caller:'VFS',callee:'Driver',method:'readBlock',params:'blk=42',ret:'void',relation:'depend'},
  ]},
  { cat_zh:'底层', cat_en:'Low-Level', zh:'syscall write', en:'Syscall write', chain:[{caller:'App',callee:'OS',method:'write',params:'fd=1,msg,len',ret:'ssize_t',relation:'call'}] },
  { cat_zh:'底层', cat_en:'Low-Level', zh:'malloc', en:'malloc', chain:[{caller:'App',callee:'Heap',method:'alloc',params:'sz=256',ret:'void*',relation:'call'}] },
  { cat_zh:'底层', cat_en:'Low-Level', zh:'free', en:'free', chain:[{caller:'App',callee:'Heap',method:'dealloc',params:'ptr',ret:'void',relation:'call'}] },
  { cat_zh:'底层', cat_en:'Low-Level', zh:'mmap', en:'mmap', chain:[{caller:'App',callee:'OS',method:'mmap',params:'addr,len,prot',ret:'void*',relation:'call'}] },
  { cat_zh:'底层', cat_en:'Low-Level', zh:'ioctl', en:'ioctl', chain:[{caller:'App',callee:'DevDrv',method:'ioctl',params:'req=LED_ON',ret:'int',relation:'call'}] },
  { cat_zh:'底层', cat_en:'Low-Level', zh:'epoll 等待', en:'epoll', chain:[
    {caller:'App',callee:'Epoll',method:'wait',params:'ev,tm=100',ret:'int',relation:'call'},
    {caller:'Epoll',callee:'Event',method:'dispatch',params:'ev',ret:'void',relation:'compose'},
  ]},
  { cat_zh:'底层', cat_en:'Low-Level', zh:'signal', en:'signal', chain:[{caller:'App',callee:'Sig',method:'handle',params:'sig=INT',ret:'void',relation:'call'}] },
  { cat_zh:'底层', cat_en:'Low-Level', zh:'DMA 配置', en:'DMA', chain:[
    {caller:'CPU',callee:'DMA',method:'config',params:'desc',ret:'void',relation:'call'},
    {caller:'DMA',callee:'Memory',method:'transfer',params:'addr,len',ret:'void',relation:'depend'},
  ]},
  { cat_zh:'底层', cat_en:'Low-Level', zh:'中断注册', en:'IRQ', chain:[
    {caller:'CPU',callee:'PIC',method:'registerIRQ',params:'irq=3',ret:'void',relation:'call'},
    {caller:'PIC',callee:'Handler',method:'handleIRQ',params:'irq',ret:'void',relation:'depend'},
  ]},

  // Architecture (10)
  { cat_zh:'架构', cat_en:'Architecture', zh:'整洁架构', en:'Clean Arch', chain:[
    {caller:'Controller',callee:'UseCase',method:'execute',params:'req',ret:'Resp',relation:'call'},
    {caller:'UseCase',callee:'Repository',method:'findById',params:'id=1',ret:'Entity',relation:'depend'},
    {caller:'Repository',callee:'DB',method:'query',params:'sql',ret:'Row',relation:'call'},
  ]},
  { cat_zh:'架构', cat_en:'Architecture', zh:'六边形架构', en:'Hexagonal', chain:[
    {caller:'HttpAdapter',callee:'Port',method:'handle',params:'req',ret:'Resp',relation:'call'},
    {caller:'Port',callee:'DomainSvc',method:'process',params:'cmd',ret:'Result',relation:'depend'},
    {caller:'DomainSvc',callee:'RepoPort',method:'save',params:'entity',ret:'void',relation:'depend'},
  ]},
  { cat_zh:'架构', cat_en:'Architecture', zh:'CQRS', en:'CQRS', chain:[
    {caller:'App',callee:'CommandBus',method:'send',params:'cmd=Create',ret:'void',relation:'call'},
    {caller:'App',callee:'QueryBus',method:'ask',params:'qry=GetAll',ret:'List',relation:'call'},
    {caller:'CommandBus',callee:'WriteRepo',method:'save',params:'entity',ret:'void',relation:'depend'},
    {caller:'QueryBus',callee:'ReadRepo',method:'findAll',params:'',ret:'List',relation:'depend'},
  ]},
  { cat_zh:'架构', cat_en:'Architecture', zh:'事件溯源', en:'Event Sourcing', chain:[
    {caller:'App',callee:'EventStore',method:'append',params:'evt=Created',ret:'void',relation:'call'},
    {caller:'EventStore',callee:'EventBus',method:'publish',params:'evt',ret:'void',relation:'compose'},
    {caller:'EventBus',callee:'Projection',method:'on',params:'evt',ret:'void',relation:'aggregate'},
  ]},
  { cat_zh:'架构', cat_en:'Architecture', zh:'微服务调用', en:'Microservice', chain:[
    {caller:'Client',callee:'ApiGateway',method:'route',params:'path=/order',ret:'Resp',relation:'call'},
    {caller:'ApiGateway',callee:'OrderSvc',method:'create',params:'item',ret:'Order',relation:'call'},
    {caller:'OrderSvc',callee:'InventorySvc',method:'reserve',params:'sku,qty',ret:'bool',relation:'depend'},
    {caller:'OrderSvc',callee:'EventBus',method:'publish',params:'evt=ordered',ret:'void',relation:'call'},
  ]},
  { cat_zh:'架构', cat_en:'Architecture', zh:'Saga 编排', en:'Saga', chain:[
    {caller:'SagaOrch',callee:'PaySvc',method:'debit',params:'amt=100',ret:'bool',relation:'call'},
    {caller:'SagaOrch',callee:'InvSvc',method:'reserve',params:'sku=A',ret:'bool',relation:'call'},
    {caller:'SagaOrch',callee:'ShipSvc',method:'dispatch',params:'addr',ret:'void',relation:'call'},
  ]},
  { cat_zh:'架构', cat_en:'Architecture', zh:'熔断器', en:'Circuit Breaker', chain:[
    {caller:'App',callee:'CircuitBreaker',method:'call',params:'req',ret:'Resp',relation:'call'},
    {caller:'CircuitBreaker',callee:'RemoteSvc',method:'invoke',params:'req',ret:'Resp',relation:'depend'},
    {caller:'CircuitBreaker',callee:'Fallback',method:'handle',params:'err',ret:'Resp',relation:'call'},
  ]},
  { cat_zh:'架构', cat_en:'Architecture', zh:'DDD 聚合根', en:'DDD Aggregate', chain:[
    {caller:'App',callee:'OrderAgg',method:'placeOrder',params:'items',ret:'void',relation:'call'},
    {caller:'OrderAgg',callee:'OrderItem',method:'validate',params:'qty',ret:'bool',relation:'compose'},
    {caller:'OrderAgg',callee:'DomainEvent',method:'raise',params:'evt=Placed',ret:'void',relation:'compose'},
  ]},
  { cat_zh:'架构', cat_en:'Architecture', zh:'MVC 请求', en:'MVC', chain:[
    {caller:'Router',callee:'Controller',method:'handle',params:'req',ret:'void',relation:'call'},
    {caller:'Controller',callee:'Model',method:'findAll',params:'filter',ret:'List',relation:'call'},
    {caller:'Controller',callee:'View',method:'render',params:'data',ret:'HTML',relation:'call'},
  ]},
  { cat_zh:'架构', cat_en:'Architecture', zh:'仓储模式', en:'Repository', chain:[
    {caller:'UseCase',callee:'UserRepo',method:'findById',params:'id=42',ret:'User',relation:'depend'},
    {caller:'UserRepo',callee:'ORM',method:'query',params:'id=42',ret:'Row',relation:'call'},
    {caller:'UserRepo',callee:'Cache',method:'set',params:'key,val',ret:'void',relation:'call'},
  ]},

  // ── Complex Real-World Systems ──────────────────────────────
  { cat_zh:'复杂系统', cat_en:'Complex', zh:'Web框架全栈', en:'Web Framework', chain:[
    {caller:'Client',callee:'Router',method:'route',params:'GET /users',ret:'Handler',relation:'call'},
    {caller:'Router',callee:'AuthMiddleware',method:'verify',params:'token',ret:'Claims',relation:'call'},
    {caller:'AuthMiddleware',callee:'JWTService',method:'parse',params:'token',ret:'Claims',relation:'depend'},
    {caller:'AuthMiddleware',callee:'UserController',method:'handle',params:'req',ret:'Resp',relation:'call'},
    {caller:'UserController',callee:'UserService',method:'getUser',params:'id',ret:'User',relation:'call'},
    {caller:'UserService',callee:'UserRepository',method:'findById',params:'id',ret:'User',relation:'depend'},
    {caller:'UserRepository',callee:'PostgresDB',method:'query',params:'sql',ret:'Row',relation:'call'},
    {caller:'UserService',callee:'CacheService',method:'get',params:'key',ret:'User',relation:'call'},
    {caller:'CacheService',callee:'Redis',method:'hget',params:'key',ret:'bytes',relation:'call'},
    {caller:'UserController',callee:'Logger',method:'info',params:'msg',ret:'void',relation:'call'},
    {caller:'Logger',callee:'Formatter',method:'format',params:'msg',ret:'string',relation:'compose'},
  ]},

  { cat_zh:'复杂系统', cat_en:'Complex', zh:'游戏引擎', en:'Game Engine', chain:[
    {caller:'GameLoop',callee:'World',method:'update',params:'dt',ret:'void',relation:'call'},
    {caller:'World',callee:'EntityManager',method:'getEntities',params:'',ret:'Entity[]',relation:'compose'},
    {caller:'World',callee:'PhysicsSystem',method:'step',params:'dt',ret:'void',relation:'call'},
    {caller:'PhysicsSystem',callee:'CollisionDetector',method:'detect',params:'bodies',ret:'Hit[]',relation:'compose'},
    {caller:'World',callee:'RenderSystem',method:'draw',params:'entities',ret:'void',relation:'call'},
    {caller:'RenderSystem',callee:'GPU',method:'submit',params:'drawcalls',ret:'void',relation:'depend'},
    {caller:'World',callee:'AudioSystem',method:'tick',params:'dt',ret:'void',relation:'call'},
    {caller:'GameLoop',callee:'InputHandler',method:'poll',params:'',ret:'Events',relation:'call'},
    {caller:'InputHandler',callee:'EventBus',method:'publish',params:'event',ret:'void',relation:'call'},
    {caller:'EventBus',callee:'ScriptEngine',method:'dispatch',params:'event',ret:'void',relation:'call'},
  ]},

  { cat_zh:'复杂系统', cat_en:'Complex', zh:'编译器流水线', en:'Compiler Pipeline', chain:[
    {caller:'Driver',callee:'Lexer',method:'tokenize',params:'src',ret:'Token[]',relation:'call'},
    {caller:'Driver',callee:'Parser',method:'parse',params:'tokens',ret:'AST',relation:'call'},
    {caller:'Parser',callee:'ASTBuilder',method:'build',params:'tokens',ret:'AST',relation:'compose'},
    {caller:'Driver',callee:'TypeChecker',method:'check',params:'ast',ret:'TypedAST',relation:'call'},
    {caller:'TypeChecker',callee:'SymbolTable',method:'resolve',params:'name',ret:'Type',relation:'compose'},
    {caller:'Driver',callee:'IRGen',method:'lower',params:'typed',ret:'IR',relation:'call'},
    {caller:'Driver',callee:'Optimizer',method:'optimize',params:'ir',ret:'IR',relation:'call'},
    {caller:'Optimizer',callee:'DeadCodeElim',method:'run',params:'ir',ret:'IR',relation:'compose'},
    {caller:'Driver',callee:'CodeGen',method:'emit',params:'ir',ret:'Asm',relation:'call'},
    {caller:'CodeGen',callee:'Linker',method:'link',params:'objs',ret:'Binary',relation:'call'},
  ]},

  { cat_zh:'复杂系统', cat_en:'Complex', zh:'微服务网格', en:'Microservice Mesh', chain:[
    {caller:'Client',callee:'APIGateway',method:'request',params:'route',ret:'Resp',relation:'call'},
    {caller:'APIGateway',callee:'AuthService',method:'verify',params:'token',ret:'bool',relation:'call'},
    {caller:'APIGateway',callee:'LoadBalancer',method:'pick',params:'svc',ret:'Addr',relation:'call'},
    {caller:'LoadBalancer',callee:'ServiceRegistry',method:'lookup',params:'svc',ret:'Addr[]',relation:'call'},
    {caller:'APIGateway',callee:'OrderService',method:'createOrder',params:'items',ret:'Order',relation:'call'},
    {caller:'OrderService',callee:'InventoryService',method:'reserve',params:'sku',ret:'bool',relation:'call'},
    {caller:'OrderService',callee:'PaymentService',method:'charge',params:'amt',ret:'Receipt',relation:'call'},
    {caller:'PaymentService',callee:'MessageBroker',method:'publish',params:'event',ret:'void',relation:'call'},
    {caller:'MessageBroker',callee:'NotificationService',method:'consume',params:'event',ret:'void',relation:'call'},
    {caller:'OrderService',callee:'CircuitBreaker',method:'call',params:'fn',ret:'Resp',relation:'compose'},
    {caller:'CircuitBreaker',callee:'Fallback',method:'handle',params:'err',ret:'Resp',relation:'call'},
  ]},

  { cat_zh:'复杂系统', cat_en:'Complex', zh:'操作系统内核', en:'OS Kernel', chain:[
    {caller:'UserProcess',callee:'Syscall',method:'write',params:'fd,buf',ret:'int',relation:'call'},
    {caller:'Syscall',callee:'VFS',method:'write',params:'inode,buf',ret:'int',relation:'call'},
    {caller:'VFS',callee:'Ext4FS',method:'write',params:'block,data',ret:'int',relation:'depend'},
    {caller:'Ext4FS',callee:'BlockDevice',method:'writeSector',params:'lba,buf',ret:'void',relation:'call'},
    {caller:'Syscall',callee:'Scheduler',method:'yield',params:'',ret:'void',relation:'call'},
    {caller:'Scheduler',callee:'RunQueue',method:'nextTask',params:'cpu',ret:'Task',relation:'compose'},
    {caller:'Scheduler',callee:'MMU',method:'switchContext',params:'pgdir',ret:'void',relation:'call'},
    {caller:'MMU',callee:'TLB',method:'flush',params:'',ret:'void',relation:'compose'},
    {caller:'UserProcess',callee:'MemoryManager',method:'mmap',params:'size',ret:'addr',relation:'call'},
    {caller:'MemoryManager',callee:'PageAllocator',method:'alloc',params:'pages',ret:'Frame',relation:'call'},
  ]},
]

/* ── Helpers ────────────────────────────────────────────────── */

function generateCode(chain: ChainCall[]): string {
  const defs = new Map<string, string>()
  for (const c of chain) {
    if (defs.has(c.callee)) continue
    const rel = c.relation || 'call'
    if (rel === 'inherit') {
      defs.set(c.callee, `class ${c.callee} : public ${c.caller} {\npublic:\n    ${c.ret} ${c.method}(${c.params}) override { /* ${c.callee} */ }\n};`)
    } else {
      defs.set(c.callee, `class ${c.callee} {\npublic:\n    ${c.ret} ${c.method}(${c.params}) { /* ${c.callee} */ }\n};`)
    }
  }
  const first = chain[0].caller
  if (!defs.has(first)) {
    const fc = chain[0]
    const fv = fc.callee[0].toLowerCase() + fc.callee.slice(1)
    defs.set(first, `class ${first} {\n    ${fc.callee} ${fv};\npublic:\n    void run() { ${fv}.${fc.method}(${fc.params.split('=')[0] || ''}); }\n};`)
  }
  const code = [...defs.values()].join('\n\n')
  const created = new Set<string>()
  const vars: string[] = []
  const calls: string[] = []
  for (const c of chain) {
    const v = c.callee[0].toLowerCase() + c.callee.slice(1)
    if (!created.has(c.callee)) { created.add(c.callee); vars.push(`    ${c.callee} ${v};`) }
  }
  for (const c of chain) {
    const v = c.callee[0].toLowerCase() + c.callee.slice(1)
    calls.push(`    ${v}.${c.method}(${c.params.split('=')[0] || ''});`)
  }
  return `${code}\n\nint main() {\n${vars.join('\n')}\n${calls.join('\n')}\n    return 0;\n}`
}

/* ── Multi-language Code Generation ─────────────────────────── */

function generateCodeGo(chain: ChainCall[]): string {
  const structs = new Map<string, string>()
  const ifaces = new Map<string, string>()
  for (const c of chain) {
    const rel = c.relation || 'call'
    const paramNames = c.params.split(',').map(p => p.split('=')[0].trim()).filter(Boolean)
    const paramStr = paramNames.map(p => `${p} interface{}`).join(', ')
    const retStr = c.ret === 'void' ? '' : ' interface{}'
    if (rel === 'inherit') {
      if (!ifaces.has(c.callee)) ifaces.set(c.callee, `type ${c.callee} interface {\n\t${c.method}(${paramStr})${retStr}\n}`)
    } else {
      if (!structs.has(c.callee)) structs.set(c.callee, `type ${c.callee} struct{}\n\nfunc (x *${c.callee}) ${c.method}(${paramStr})${retStr} {\n\t// ${c.callee}.${c.method}\n}`)
    }
  }
  const decls = [...ifaces.values(), ...structs.values()]
  const created = new Set<string>()
  const vars: string[] = []; const calls: string[] = []
  for (const c of chain) {
    const v = c.callee[0].toLowerCase() + c.callee.slice(1)
    if (!created.has(c.callee)) { created.add(c.callee); vars.push(`\t${v} := &${c.callee}{}`) }
    const args = c.params.split(',').map(p => { const v = p.split('='); return v[1] ? JSON.stringify(v[1].trim()) : 'nil' }).join(', ')
    const retPart = c.ret !== 'void' ? `_ = ` : ''
    calls.push(`\t${retPart}${v}.${c.method}(${args})`)
  }
  return `package main\n\nimport "fmt"\n\n${decls.join('\n\n')}\n\nfunc main() {\n${vars.join('\n')}\n${calls.join('\n')}\n\t_ = fmt.Sprintf // suppress import\n}`
}

function generateCodePy(chain: ChainCall[]): string {
  const defs = new Map<string, string[]>()
  for (const c of chain) {
    const paramNames = c.params.split(',').map(p => p.split('=')[0].trim()).filter(Boolean)
    const sig = ['self', ...paramNames].join(', ')
    const retHint = c.ret !== 'void' ? ` -> '${c.ret}'` : ''
    const body = `    def ${c.method}(${sig})${retHint}:\n        pass  # implement ${c.callee}`
    if (!defs.has(c.callee)) defs.set(c.callee, [])
    if (!defs.get(c.callee)!.some(b => b.includes(`def ${c.method}(`))) defs.get(c.callee)!.push(body)
  }
  const classes = [...defs.entries()].map(([name, methods]) => `class ${name}:\n${methods.join('\n\n')}`)
  const created = new Set<string>(); const vars: string[] = []; const calls: string[] = []
  for (const c of chain) {
    const v = c.callee[0].toLowerCase() + c.callee.slice(1)
    if (!created.has(c.callee)) { created.add(c.callee); vars.push(`    ${v} = ${c.callee}()`) }
    const args = c.params.split(',').map(p => { const kv = p.split('='); return kv[1] ? kv[1].trim() : 'None' }).join(', ')
    calls.push(`    ${v}.${c.method}(${args})`)
  }
  return `${classes.join('\n\n')}\n\n\nif __name__ == '__main__':\n${[...vars, ...calls].join('\n')}`
}

function generateCodeJava(chain: ChainCall[]): string {
  const defs = new Map<string, { kind: string; methods: string[] }>()
  for (const c of chain) {
    const rel = c.relation || 'call'
    const paramStr = c.params.split(',').map(p => `Object ${p.split('=')[0].trim() || 'arg'}`).join(', ')
    const ret = c.ret === 'void' ? 'void' : 'Object'
    if (!defs.has(c.callee)) defs.set(c.callee, { kind: rel === 'inherit' ? 'interface' : 'class', methods: [] })
    const entry = defs.get(c.callee)!
    const body = entry.kind === 'interface'
      ? `    ${ret} ${c.method}(${paramStr});`
      : `    public ${ret} ${c.method}(${paramStr}) {\n        // ${c.callee}.${c.method}\n    }`
    if (!entry.methods.some(m => m.includes(`${c.method}(`))) entry.methods.push(body)
  }
  const classDecls = [...defs.entries()].map(([name, e]) => `${e.kind} ${name} {\n${e.methods.join('\n\n')}\n}`)
  const created = new Set<string>(); const vars: string[] = []; const calls: string[] = []
  for (const c of chain) {
    const v = c.callee[0].toLowerCase() + c.callee.slice(1)
    if (!created.has(c.callee)) { created.add(c.callee); vars.push(`        ${c.callee} ${v} = new ${c.callee}();`) }
    const args = c.params.split(',').map(p => { const kv = p.split('='); return kv[1] ? `"${kv[1].trim()}"` : 'null' }).join(', ')
    calls.push(`        ${v}.${c.method}(${args});`)
  }
  return `${classDecls.join('\n\n')}\n\npublic class Main {\n    public static void main(String[] args) {\n${vars.join('\n')}\n${calls.join('\n')}\n    }\n}`
}

type CodeLang = 'cpp' | 'go' | 'py' | 'java'

function generateCodeLang(chain: ChainCall[], lang: CodeLang): string {
  if (chain.length === 0) return ''
  if (lang === 'go') return generateCodeGo(chain)
  if (lang === 'py') return generateCodePy(chain)
  if (lang === 'java') return generateCodeJava(chain)
  return generateCode(chain)
}

/* ── Pattern Detector ────────────────────────────────────────── */

type PatternMatch = { name_zh: string; name_en: string; desc_zh: string; desc_en: string; icon: string }

function detectPattern(chain: ChainCall[]): PatternMatch | null {
  if (chain.length === 0) return null
  const methods = chain.map(c => c.method.toLowerCase())
  const callees = chain.map(c => c.callee.toLowerCase())
  const rels = chain.map(c => c.relation || 'call')

  if (chain.length === 1 && (methods[0].includes('inst') || methods[0].includes('instance') || methods[0].includes('getinst')))
    return { icon:'♟', name_zh:'单例', name_en:'Singleton', desc_zh:'全局唯一实例', desc_en:'Single global instance' }

  if (methods.some(m => m.includes('subscribe') || m.includes('addlistener') || m.includes('attach')) &&
      methods.some(m => m.includes('notify') || m.includes('emit') || m.includes('fire') || m.includes('broadcast')))
    return { icon:'👁', name_zh:'观察者', name_en:'Observer', desc_zh:'被观察者通知所有观察者', desc_en:'Subject notifies all observers' }

  if (methods[methods.length - 1] === 'build' && rels.some(r => r === 'compose'))
    return { icon:'🔨', name_zh:'建造者', name_en:'Builder', desc_zh:'分步构建复杂对象', desc_en:'Build complex objects step-by-step' }

  if (methods.some(m => m.includes('create') || m.startsWith('make') || m.startsWith('new')) && rels.some(r => r === 'compose'))
    return { icon:'🏭', name_zh:'工厂', name_en:'Factory', desc_zh:'由工厂决定实例化哪个类', desc_en:'Factory decides which class to instantiate' }

  if (callees.some(c => c.includes('decorator') || c.includes('wrapper') || c.includes('logger')) && rels.some(r => r === 'compose'))
    return { icon:'🎀', name_zh:'装饰器', name_en:'Decorator', desc_zh:'包装对象，动态添加行为', desc_en:'Wrap objects to add behavior dynamically' }

  if (callees.some(c => c.includes('proxy') || c.includes('stub')) && rels.some(r => r === 'compose'))
    return { icon:'🔁', name_zh:'代理', name_en:'Proxy', desc_zh:'代理控制对真实对象的访问', desc_en:'Proxy controls access to the real object' }

  if (methods.some(m => m.includes('setstrategy') || m.includes('setpolicy') || m.includes('setalgo')) || callees.some(c => c.includes('strategy') || c.includes('policy')))
    return { icon:'🎯', name_zh:'策略', name_en:'Strategy', desc_zh:'运行时切换算法实现', desc_en:'Switch algorithm implementation at runtime' }

  if (chain.length >= 3 && methods.every(m => m.includes('handle') || m.includes('process') || m.includes('filter')))
    return { icon:'⛓', name_zh:'责任链', name_en:'Chain of Resp.', desc_zh:'请求沿处理链传递', desc_en:'Request passes along handler chain' }

  if (methods.some(m => m === 'execute' || m === 'invoke' || m === 'exec') && (callees.some(c => c.includes('cmd') || c.includes('command')) || methods.some(m => m === 'undo' || m === 'redo')))
    return { icon:'📋', name_zh:'命令', name_en:'Command', desc_zh:'将请求封装为对象，支持撤销', desc_en:'Encapsulate requests as objects with undo' }

  if (callees.some(c => c.includes('query') || c.includes('read')) && callees.some(c => c.includes('command') || c.includes('write') || c.includes('cmd')))
    return { icon:'↔', name_zh:'CQRS', name_en:'CQRS', desc_zh:'读写分离', desc_en:'Separate read/write responsibilities' }

  if (callees.some(c => c.includes('eventstore') || c.includes('evtstore') || c.includes('eventbus')))
    return { icon:'📜', name_zh:'事件溯源', name_en:'Event Sourcing', desc_zh:'状态由事件日志重建', desc_en:'State rebuilt from event log' }

  if (callees.some(c => c.includes('port') || c.includes('adapter')) && callees.some(c => c.includes('domain') || c.includes('usecase')))
    return { icon:'⬡', name_zh:'六边形架构', name_en:'Hexagonal', desc_zh:'领域与外部通过端口适配器隔离', desc_en:'Domain isolated by ports and adapters' }

  if (rels.some(r => r === 'inherit') && chain.length >= 2)
    return { icon:'🌳', name_zh:'继承', name_en:'Inheritance', desc_zh:'子类继承父类行为', desc_en:'Subclass inherits parent behavior' }

  return null
}

function generateSteps(chain: ChainCall[]): BusStep[] {
  const steps: BusStep[] = []
  chain.forEach((call, ci) => {
    const pv = call.params.replace(/^.*=/, '') || 'x'
    steps.push(
      { addr:'—', ctrl:'—', data:'—', desc_zh:`${call.caller} 准备调用`, desc_en:`${call.caller} ready`, highlightLine:-1, movingData:[], state:{phase:'idle'}, stack:[{pc:'0x4000',desc:`main: call ${call.callee}::${call.method}`}] },
      { addr:`&${call.callee}+off`, ctrl:'REQ', data:'—', desc_zh:`① 地址总线→${call.callee}::${call.method}(${call.relation||'call'})`, desc_en:`① Addr→${call.callee}::${call.method} (${call.relation||'call'})`, highlightLine:ci*2+1, movingData:[{from:ci===0?0:ci+1,to:99,label:'addr',bus:'addr'}], state:{phase:'addr'} },
      { addr:`&${call.callee}+off`, ctrl:'WR', data:`${call.params}`, desc_zh:`② 数据总线写参数 (${call.relation||'call'})`, desc_en:`② Data bus: ${call.params} (${call.relation||'call'})`, highlightLine:ci*2+1, movingData:[{from:ci===0?0:ci+1,to:99,label:'WR',bus:'ctrl'},{from:ci===0?0:ci+1,to:99,label:pv,bus:'data'}], state:{phase:'write'} },
      { addr:'—', ctrl:'EXEC', data:'—', desc_zh:`③ ${call.callee} 执行`, desc_en:`③ ${call.callee} exec`, highlightLine:ci*2+2, movingData:[{from:99,to:ci+1,label:'exec',bus:'addr'},{from:99,to:ci+1,label:pv,bus:'data'}], state:{phase:'exec',result:call.ret!=='void'?'↻':'✓'} },
    )
    if (ci < chain.length - 1) steps.push({ addr:'—', ctrl:'DONE', data:'—', desc_zh:`${call.callee}→${chain[ci+1].callee}`, desc_en:`${call.callee}→${chain[ci+1].callee}`, highlightLine:-1, movingData:[{from:ci+1,to:99,label:'DONE',bus:'ctrl'}], state:{phase:'chain'} })
  })
  const last = chain[chain.length-1]
  steps.push({ addr:'—', ctrl:'DONE', data:last.ret!=='void'?'result':'void', desc_zh:`④ 完成${last.ret!=='void'?'，返回':'，结束'}`, desc_en:`④ Done${last.ret!=='void'?', return':''}`, highlightLine:-1, movingData:[{from:chain.length,to:99,label:'DONE',bus:'ctrl'}], state:{phase:'done'} })
  return steps
}

const STATIC_EXAMPLES = CATEGORIES.map(e => ({
  label_zh: e.zh, label_en: e.en, cat_zh: e.cat_zh, cat_en: e.cat_en, chain: e.chain,
  code: generateCode(e.chain),
}))

/* ── Bus Conflict Detection ──────────────────────────────────── */

function checkConflict(step: BusStep): string | null {
  const active = ([['addr', step.addr], ['ctrl', step.ctrl], ['data', step.data]] as const).filter(([, v]) => v !== '—')
  if (active.length > 1) {
    const vals = active.map(([k, v]) => `${k}=${v}`)
    if (new Set(vals).size !== vals.length) return `⚡ BUS CONFLICT ${vals.join(' / ')}`
  }
  return null
}

/* ── SVG Components ──────────────────────────────────────────── */

/* ── Chip type detection ─────────────────────────────────────── */
type ChipType = 'interface' | 'service' | 'controller' | 'repository' | 'factory' | 'infra' | 'default'

function detectChipType(name: string): ChipType {
  const n = name.toLowerCase()
  if (/interface|abstract|trait|protocol/.test(n)) return 'interface'
  if (/service|manager|engine|orchestr|saga|usecase/.test(n)) return 'service'
  if (/controller|handler|router|gateway|api|middleware/.test(n)) return 'controller'
  if (/repo|store|cache|db|database|orm|redis|postgres|mysql|mongo/.test(n)) return 'repository'
  if (/factory|builder|provider|registry|loader/.test(n)) return 'factory'
  if (/gpu|cpu|mmu|tlb|disk|net|driver|device|block|syscall|vfs/.test(n)) return 'infra'
  return 'default'
}

const CHIP_TYPE_COLOR: Record<ChipType, string> = {
  interface:  '#56d364',
  service:    '#d2a8ff',
  controller: '#79c0ff',
  repository: '#ffa657',
  factory:    '#ff7b72',
  infra:      '#f0883e',
  default:    '#58a6ff',
}

const CHIP_TYPE_LABEL: Record<ChipType, string> = {
  interface:  'IF',
  service:    'SVC',
  controller: 'CTL',
  repository: 'REPO',
  factory:    'FAC',
  infra:      'HW',
  default:    'MOD',
}

function ChipModule({ name, sub, x, y, w, active, color, state: st, memLayout, inMethods, outMethods }: {
  name: string; sub: string; x: number; y: number; w: number; active: boolean; color: string; state?: Record<string, string>; memLayout?: any[]; inMethods?: string[]; outMethods?: string[]
}) {
  const se = st ? Object.entries(st) : []
  const useLayout = memLayout && memLayout.length > 0
  const ch = useLayout ? 80 + memLayout!.length * 11 : 80
  const chipType = detectChipType(name)
  const typeColor = active ? CHIP_TYPE_COLOR[chipType] : CHIP_TYPE_COLOR[chipType] + '60'
  const effectiveColor = active ? typeColor : '#334'
  const pinPositions = [14, 28, 42, 56, 70]
  const pinLen = 7
  const pinColor = active ? typeColor + '99' : '#2d3748'
  return (
    <g>
      {/* Glow behind active chip */}
      {active && <rect x={x-4} y={y-4} width={w+8} height={ch+8} rx={6} fill={typeColor} opacity={0.08} />}
      {/* IC pin stubs — left side */}
      {pinPositions.map((py, pi) => (
        <g key={`pl-${pi}`}>
          <rect x={x - pinLen - 2} y={y + py - 2} width={4} height={4} rx={0.5} fill={pinColor} />
          <line x1={x - pinLen + 2} y1={y + py} x2={x} y2={y + py} stroke={pinColor} strokeWidth={1.2} />
          <text x={x + 4} y={y + py + 3} fill={active ? typeColor + '80' : '#252f3a'} fontSize={5} fontFamily="monospace">{pi + 1}</text>
        </g>
      ))}
      {/* IC pin stubs — right side */}
      {pinPositions.map((py, pi) => (
        <g key={`pr-${pi}`}>
          <line x1={x + w} y1={y + py} x2={x + w + pinLen - 2} y2={y + py} stroke={pinColor} strokeWidth={1.2} />
          <rect x={x + w + pinLen - 2} y={y + py - 2} width={4} height={4} rx={0.5} fill={pinColor} />
          <text x={x + w - 4} y={y + py + 3} fill={active ? typeColor + '80' : '#252f3a'} fontSize={5} fontFamily="monospace" textAnchor="end">{10 - pi}</text>
        </g>
      ))}
      {/* Chip body */}
      <rect x={x} y={y} width={w} height={ch} rx={3} fill="#111a24" stroke={effectiveColor} strokeWidth={active ? 2 : 1} />
      {/* Top color stripe by chip type */}
      <rect x={x} y={y} width={w} height={6} rx={2} fill={typeColor} opacity={active ? 0.5 : 0.15} />
      {/* IC identification notch */}
      <path d={`M${x+w/2-14} ${y} L${x+w/2-6} ${y-4} L${x+w/2+6} ${y-4} L${x+w/2+14} ${y} Z`} fill="#111a24" stroke={effectiveColor} strokeWidth={1} />
      {/* Status LED */}
      <circle cx={x+10} cy={y+13} r={2.5} fill={active ? typeColor : '#334'} />
      {active && <circle cx={x+10} cy={y+13} r={5} fill={typeColor} opacity={0.3} />}
      {/* Type badge */}
      <rect x={x+w-28} y={y+8} width={24} height={9} rx={2} fill={typeColor} opacity={active ? 0.25 : 0.1} />
      <text x={x+w-16} y={y+15} textAnchor="middle" fill={typeColor} fontSize={5} fontWeight="bold" fontFamily="monospace">{CHIP_TYPE_LABEL[chipType]}</text>
      {/* Chip name and sub-label */}
      <text x={x+w/2} y={y+30} textAnchor="middle" fill={active ? 'var(--text-primary)' : 'var(--text-muted)'} fontSize={9} fontWeight="bold" fontFamily="monospace">{name}</text>
      <text x={x+w/2} y={y+41} textAnchor="middle" fill={active ? typeColor : 'var(--text-muted)'} fontSize={7} fontFamily="monospace">{sub}</text>
      {/* Divider */}
      <line x1={x+4} y1={y+48} x2={x+w-4} y2={y+48} stroke={active ? typeColor + '40' : '#222'} strokeWidth={0.5} />
      {useLayout ? (
        <g transform={`translate(${x+4}, ${y+51})`}>
          {memLayout!.map((ml, i) => (
            <g key={i} transform={`translate(0, ${i*11})`}>
              <rect x={0} y={0} width={w-8} height={10} rx={1} fill={ml.active ? color+'25' : 'transparent'} />
              <text x={3} y={8} fill={ml.active ? color : '#555'} fontSize={6} fontFamily="monospace">{ml.offset}</text>
              <text x={30} y={8} fill={ml.active ? 'var(--text-primary)' : 'var(--text-muted)'} fontSize={6} fontFamily="monospace">{ml.field}</text>
              <text x={w-12} y={8} fill={ml.active ? color : '#333'} fontSize={6} fontFamily="monospace" textAnchor="end">{ml.value}</text>
            </g>
          ))}
        </g>
      ) : se.length > 0 ? (
        <g>
          {se.slice(0, 3).map(([k, v], i) => (
            <text key={i} x={x+6} y={y+58+i*8} fill={active ? 'var(--text-secondary)' : 'var(--text-muted)'} fontSize={6} fontFamily="monospace">{k}={v}</text>
          ))}
        </g>
      ) : (inMethods && inMethods.length > 0) || (outMethods && outMethods.length > 0) ? (
        <g>
          {(inMethods || []).slice(0, 3).map((m, i) => (
            <text key={`in-${i}`} x={x+4} y={y+56+i*9}
              fill={active ? '#79c0ff70' : '#1e3050'} fontSize={5.5} fontFamily="monospace">←{m.slice(0, 8)}</text>
          ))}
          {(outMethods || []).slice(0, 3).map((m, i) => (
            <text key={`out-${i}`} x={x+w-4} y={y+56+i*9} textAnchor="end"
              fill={active ? '#56d36470' : '#1e3050'} fontSize={5.5} fontFamily="monospace">{m.slice(0, 8)}→</text>
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

/* ── Relationship Arrow ──────────────────────────────────────── */

function RelationGlyph({ x, y, rel, color, atSource }: { x: number; y: number; rel: string; color: string; atSource: boolean }) {
  const s = 7
  if (rel === 'compose') {
    // Filled diamond at source
    if (!atSource) return null
    return <polygon points={`${x},${y-s} ${x+s*0.6},${y} ${x},${y+s} ${x-s*0.6},${y}`} fill={color} />
  }
  if (rel === 'aggregate') {
    // Open diamond at source
    if (!atSource) return null
    return <polygon points={`${x},${y-s} ${x+s*0.6},${y} ${x},${y+s} ${x-s*0.6},${y}`} fill="var(--bg-primary)" stroke={color} strokeWidth={1.2} />
  }
  if (rel === 'inherit') {
    // Open triangle at destination
    if (atSource) return null
    return <polygon points={`${x},${y} ${x-s},${y-s*0.6} ${x-s},${y+s*0.6}`} fill="var(--bg-primary)" stroke={color} strokeWidth={1.2} />
  }
  return null
}

function RelationPath({ from, to, relation, method, isZh, active, animPct }: {
  from: { x: number; y: number; w: number }
  to: { x: number; y: number; w: number }
  relation: string
  method?: string
  isZh: boolean
  active?: boolean
  animPct?: number
}) {
  const rel = relation || 'call'
  const color = REL_COLORS[rel] || '#79c0ff'
  const fromX = from.x + from.w
  const fromY = from.y + 40
  const toX = to.x
  const toY = to.y + 40
  const midX = (fromX + toX) / 2
  const midY = (fromY + toY) / 2
  const isDashed = REL_STROKE[rel] === 'dashed'
  const relLabel = isZh ? (REL_LABELS_ZH[rel] || rel) : (REL_LABELS_EN[rel] || rel)
  // Show method name on path, with relation glyph as prefix
  const labelText = method ? `.${method}()` : relLabel
  const labelW = Math.min(Math.max(labelText.length * 6 + 8, 44), 110)
  const lineStart = rel === 'compose' || rel === 'aggregate' ? fromX + 8 : fromX
  const lineEnd = rel === 'inherit' ? toX - 8 : toX

  const sameRow = Math.abs(fromY - toY) < 5
  const pathD = sameRow
    ? `M${lineStart} ${fromY} L${lineEnd} ${toY}`
    : `M${lineStart} ${fromY} L${midX} ${fromY} L${midX} ${toY} L${lineEnd} ${toY}`

  let dotX = midX, dotY = midY
  if (animPct !== undefined) {
    const t = animPct
    if (sameRow) {
      dotX = lineStart + (lineEnd - lineStart) * t
      dotY = fromY
    } else {
      const seg1 = Math.abs(midX - lineStart)
      const seg2 = Math.abs(toY - fromY)
      const seg3 = Math.abs(lineEnd - midX)
      const total = seg1 + seg2 + seg3
      const dist = t * total
      if (dist <= seg1) { dotX = lineStart + dist; dotY = fromY }
      else if (dist <= seg1 + seg2) { dotX = midX; dotY = fromY + (dist - seg1) * Math.sign(toY - fromY) }
      else { dotX = midX + (dist - seg1 - seg2) * Math.sign(lineEnd - midX); dotY = toY }
    }
  }

  const labelX = sameRow ? midX : midX
  const labelY = sameRow ? fromY - 14 : midY - 7

  return (
    <g>
      <RelationGlyph x={fromX + 7} y={fromY} rel={rel} color={color} atSource={true} />
      {active && <path d={pathD} stroke={color} strokeWidth={4} strokeOpacity={0.15} fill="none" />}
      <path d={pathD} stroke={active ? color : color + '50'} strokeWidth={active ? 1.8 : 1}
        strokeDasharray={isDashed ? '4 3' : 'none'} fill="none"
        markerEnd={rel === 'inherit' ? 'none' : `url(#arrow-${rel})`} />
      <RelationGlyph x={toX - 7} y={toY} rel={rel} color={color} atSource={false} />
      {active && animPct !== undefined && (
        <g>
          <circle cx={dotX} cy={dotY} r={4} fill={color} opacity={0.9} />
          <circle cx={dotX} cy={dotY} r={8} fill={color} opacity={0.2} />
        </g>
      )}
      {/* Method label on path */}
      <rect x={labelX - labelW / 2} y={labelY} width={labelW} height={11} rx={3}
        fill="var(--bg-primary)" stroke={active ? color + '90' : color + '28'} strokeWidth={0.6} />
      <text x={labelX} y={labelY + 8} textAnchor="middle" fill={active ? color : color + '80'}
        fontSize={6.5} fontWeight="bold" fontFamily="monospace">{labelText}</text>
    </g>
  )
}

/* ── Generated Code Preview ─────────────────────────────────── */

function GeneratedCodeBlock({ chain, hlLine, isZh }: {
  chain: ChainCall[]
  hlLine: (line: string) => { text: string; color: string }[]
  isZh: boolean
}) {
  const [codeLang, setCodeLang] = useState<CodeLang>('cpp')
  if (chain.length === 0) return null
  const code = generateCodeLang(chain, codeLang)
  const lines = code.split('\n')
  const langLabels: Record<CodeLang, string> = { cpp:'C++', go:'Go', py:'Python', java:'Java' }
  return (
    <div style={{ marginTop:4, borderRadius:4, border:'1px solid var(--border)', background:'var(--bg-elevated)', overflow:'hidden' }}>
      <div style={{ padding:'4px 8px', fontSize:9, fontWeight:700, color:'var(--text-secondary)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:6 }}>
        <span>{isZh ? '生成代码' : 'Generated Code'}</span>
        <div style={{ marginLeft:'auto', display:'flex', gap:2 }}>
          {(['cpp','go','py','java'] as CodeLang[]).map(l => (
            <button key={l} onClick={() => setCodeLang(l)} style={{
              padding:'1px 6px', borderRadius:3, border:'none', cursor:'pointer', fontSize:8, fontWeight:700,
              background: codeLang === l ? '#4d8fff' : 'transparent',
              color: codeLang === l ? '#fff' : 'var(--text-muted)',
            }}>{langLabels[l]}</button>
          ))}
        </div>
      </div>
      <pre style={{ margin:0, padding:'6px 8px', fontSize:9.5, lineHeight:1.5, fontFamily:"'SF Mono','Fira Code',monospace", overflow:'auto', maxHeight:220 }}>
        {lines.map((line, i) => (
          <div key={i}>
            <span style={{ color:'#484f58', marginRight:8, userSelect:'none', fontSize:8 }}>{i+1}</span>
            {hlLine(line).map((p, j) => <span key={j} style={{ color: p.color }}>{p.text}</span>)}
          </div>
        ))}
      </pre>
    </div>
  )
}

/* ── Mermaid Export ────────────────────────────────────────────── */

function generateMermaid(chain: ChainCall[]): string {
  if (chain.length === 0) return ''
  const participants = [...new Set([chain[0].caller, ...chain.map(c => c.callee)])]
  const lines = ['sequenceDiagram']
  for (const p of participants) lines.push(`  participant ${p}`)
  for (const c of chain) {
    const rel = c.relation || 'call'
    const arrow = rel === 'depend' ? '-->>' : rel === 'inherit' ? '-->' : '->>'
    lines.push(`  ${c.caller}${arrow}${c.callee}: ${c.method}(${c.params})`)
    if (c.ret && c.ret !== 'void') lines.push(`  ${c.callee}-->>${c.caller}: ${c.ret}`)
  }
  return lines.join('\n')
}

/* ── AST Result → ChainCall[] ─────────────────────────────────── */

function astResultToChain(
  chips: { name: string; methods: string[]; fields: string[] }[],
  calls: { from: string; to: string; method: string; params: string; ret: string; relation: string }[]
): ChainCall[] {
  if (calls.length === 0) return []

  // Filter out self-loops and noisy calls, map relation strings
  const relMap: Record<string, ChainCall['relation']> = {
    call: 'call', compose: 'compose', aggregate: 'aggregate',
    inherit: 'inherit', depend: 'depend',
  }
  const chipNames = new Set(chips.map(c => c.name))

  return calls
    .filter(c => c.from !== c.to && c.from && c.to)
    .filter(c => c.method !== 'has' || chipNames.has(c.to))
    .map(c => ({
      caller: c.from,
      callee: c.to,
      method: c.method || 'call',
      params: c.params || '',
      ret: c.ret || 'void',
      relation: relMap[c.relation] ?? 'call',
    }))
    .slice(0, 20) // cap for display
}

/* ── Code Parser (fallback / local) ───────────────────────────── */

function analyzePastedCode(code: string): ChainCall[] {
  const calls: ChainCall[] = []
  const classes: string[] = []
  // Extract class/struct/interface/type names
  const cr = /(?:class|struct|interface|type\s+\w+\s+struct|trait|protocol)\s+(\w+)/g
  let m: RegExpExecArray | null
  while ((m = cr.exec(code)) !== null) classes.push(m[1])

  const seen = new Set<string>()
  type RawCall = { caller: string; callee: string; method: string; args: string; rel: ChainCall['relation'] }
  const raw: RawCall[] = []

  // Pattern 1: obj.method(args) or obj.method(args); — standard method call
  const p1 = /\b(\w+)\.(\w+)\s*\(([^)]{0,80})\)/g
  while ((m = p1.exec(code)) !== null) {
    const [, obj, method, args] = m
    if (['main','this','self','super','console','fmt','log','print','println','len','cap','make','new','append'].includes(obj)) continue
    if (['toString','valueOf','hashCode','equals','length','size'].includes(method)) continue
    const key = `${obj}.${method}`
    if (seen.has(key)) continue; seen.add(key)
    // Determine callee: prefer class name match over method name
    let callee = classes.find(c => obj.toLowerCase() === c.toLowerCase()) || obj
    // Detect relation from context
    const lineStart = code.lastIndexOf('\n', m.index)
    const lineText = code.slice(lineStart, m.index + m[0].length)
    let rel: ChainCall['relation'] = 'call'
    if (/new\s+\w+/.test(lineText) || /compose|contain|has/.test(method.toLowerCase())) rel = 'compose'
    if (/subscribe|listen|attach|addObserver|addEventListener/.test(method)) rel = 'aggregate'
    raw.push({ caller: obj, callee, method, args: args.trim().slice(0, 30), rel })
  }

  // Pattern 2: ClassName::method(args) — C++ static / scope resolution
  const p2 = /\b(\w+)::(\w+)\s*\(([^)]{0,80})\)/g
  while ((m = p2.exec(code)) !== null) {
    const [, obj, method, args] = m
    const key = `${obj}::${method}`
    if (seen.has(key)) continue; seen.add(key)
    raw.push({ caller: obj, callee: obj, method, args: args.trim().slice(0, 30), rel: 'call' })
  }

  // Pattern 3: extends / implements — inheritance
  const p3 = /class\s+(\w+)\s+(?:extends|implements)\s+(\w+)/g
  while ((m = p3.exec(code)) !== null) {
    const [, child, parent] = m
    const key = `${child}:${parent}`
    if (seen.has(key)) continue; seen.add(key)
    raw.push({ caller: child, callee: parent, method: 'extends', args: '', rel: 'inherit' })
  }

  // Pattern 4: new ClassName(args) — construction / composition
  const p4 = /new\s+(\w+)\s*\(([^)]{0,60})\)/g
  while ((m = p4.exec(code)) !== null) {
    const [, cls, args] = m
    if (seen.has(`new:${cls}`)) continue; seen.add(`new:${cls}`)
    const caller = classes[0] || 'App'
    raw.push({ caller, callee: cls, method: cls, args: args.trim().slice(0, 30), rel: 'compose' })
  }

  // Build chain: use first caller as anchor, link subsequent calls
  let prevCallee = raw[0]?.caller || 'App'
  for (const r of raw.slice(0, 6)) {
    calls.push({ caller: prevCallee, callee: r.callee, method: r.method, params: r.args || 'x', ret: 'void', relation: r.rel })
    prevCallee = r.callee
  }
  return calls
}

/* ── SVG Export ───────────────────────────────────────────────── */

function svgToBlob(svgEl: SVGSVGElement | null): Blob | null {
  if (!svgEl) return null
  const clone = svgEl.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  let s = new XMLSerializer().serializeToString(clone)
  const d = document.documentElement
  const cs = getComputedStyle(d)
  const bg = cs.getPropertyValue('--bg-primary').trim() || '#0d1117'
  const be = cs.getPropertyValue('--bg-elevated').trim() || '#21262d'
  const tp = cs.getPropertyValue('--text-primary').trim() || '#e6edf3'
  const ts = cs.getPropertyValue('--text-secondary').trim() || '#8b949e'
  const tm = cs.getPropertyValue('--text-muted').trim() || '#484f58'
  s = s.replace(/var\(--bg-primary\)/g, bg)
  s = s.replace(/var\(--bg-elevated\)/g, be)
  s = s.replace(/var\(--text-primary\)/g, tp)
  s = s.replace(/var\(--text-secondary\)/g, ts)
  s = s.replace(/var\(--text-muted\)/g, tm)
  return new Blob([s], { type: 'image/svg+xml' })
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = name
  a.click(); URL.revokeObjectURL(url)
}

/* ── Main Component ──────────────────────────────────────────── */

export default function CodeChipView() {
  const { lang } = useLang()
  const isZh = lang === 'zh'
  const [exIdx, setExIdx] = useState(-2)
  const [exSearch, setExSearch] = useState('')
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(2)
  const [animProgress, setAnimProgress] = useState(0)
  const [showHex, setShowHex] = useState(false)
  const [showMem, setShowMem] = useState(false)
  const [selectedChip, setSelectedChip] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [panning, setPanning] = useState(false)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 })
  const [cuCaller, setCuCaller] = useState('App')
  const [cuCallee, setCuCallee] = useState('Svc')
  const [cuMethod, setCuMethod] = useState('exec')
  const [cuParams, setCuParams] = useState('x=42')
  const [cuReturn, setCuReturn] = useState('void')
  const [cuRelation, setCuRelation] = useState<ChainCall['relation']>('call')
  const [cuChain, setCuChain] = useState<ChainCall[]>(() => {
    try { const s = localStorage.getItem('codechip-chain'); if (s) return JSON.parse(s) } catch {}
    return [{caller:'App',callee:'Svc',method:'exec',params:'x=42',ret:'void',relation:'call'}]
  })
  const [pasteCode, setPasteCode] = useState('')
  const [pasteLang, setPasteLang] = useState('auto')
  const [parseLoading, setParseLoading] = useState(false)
  const [parseError, setParseError] = useState('')
  const [cuMode, setCuMode] = useState<'form'|'paste'>('form')
  const svgRef = useRef<SVGSVGElement>(null)
  const animRef = useRef<ReturnType<typeof requestAnimationFrame>|null>(null)
  const startRef = useRef(0)
  const debRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  /* URL restore */
  useEffect(() => {
    try {
      const h = window.location.hash.slice(1)
      if (h) { const d = JSON.parse(decodeURIComponent(h)); if (d.chain) { setCuChain(d.chain); setExIdx(-1) }; if (d.code) { setPasteCode(d.code); setCuMode('paste') } }
    } catch {}
  }, [])

  /* Persist custom chain */
  useEffect(() => {
    try { localStorage.setItem('codechip-chain', JSON.stringify(cuChain)) } catch {}
  }, [cuChain])

  /* AST parse via Go backend */
  useEffect(() => {
    if (exIdx !== -2 || !pasteCode.trim()) return
    clearTimeout(debRef.current)
    debRef.current = setTimeout(async () => {
      setParseLoading(true)
      setParseError('')
      try {
        const res = await fetch('/api/codechip/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: pasteCode, lang: pasteLang }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: { chips: {name:string,methods:string[],fields:string[]}[], calls: {from:string,to:string,method:string,params:string,ret:string,relation:string}[], lang: string } = await res.json()
        const chain = astResultToChain(data.chips, data.calls)
        if (chain.length > 0) setCuChain(chain)
        else setParseError(isZh ? '未识别到结构' : 'No structure found')
      } catch (e) {
        setParseError(isZh ? '解析失败' : 'Parse failed')
      } finally {
        setParseLoading(false)
      }
    }, 600)
    return () => clearTimeout(debRef.current)
  }, [pasteCode, pasteLang, exIdx, isZh])

  const isStatic = exIdx >= 0 && exIdx < STATIC_EXAMPLES.length
  const staticEx = isStatic ? STATIC_EXAMPLES[exIdx] : null
  const chain = isStatic ? staticEx!.chain : cuChain
  const catStr = isStatic ? (isZh ? staticEx!.cat_zh : staticEx!.cat_en) : ''
  const allSteps = useMemo(() => generateSteps(chain), [chain])
  const s = allSteps[step % allSteps.length]
  const conflict = checkConflict(s)

  /* ── Fix: compute codeLines, hlLine, memLayout, detectCalls inside component ── */
  const codeLines = useMemo(() => {
    if (isStatic && staticEx) return staticEx.code.split('\n')
    return []
  }, [isStatic, staticEx])

  const hlLine = useCallback((line: string) => highlightLine(line), [])

  const memLayout = useMemo(() => {
    if (!showMem || chain.length === 0) return []
    const last = chain[chain.length - 1]
    return [
      { offset: '0x00', field: 'vtable', value: '0x4d8000', active: false },
      { offset: '0x08', field: 'data', value: `${last.params.split('=')[1] || '0'}`, active: true },
      { offset: '0x10', field: 'flags', value: '0x01', active: false },
      { offset: '0x18', field: 'refs', value: '2', active: false },
    ]
  }, [showMem, chain])

  const detectCalls = useMemo(() => {
    if (exIdx === -2 && pasteCode.trim()) return analyzePastedCode(pasteCode).length
    return 0
  }, [pasteCode, exIdx])

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

  const shareUrl = () => {
    const data = JSON.stringify({ chain, code: pasteCode || undefined })
    window.location.hash = encodeURIComponent(data)
    navigator.clipboard.writeText(window.location.href).catch(() => {})
  }

  const exportSvg = () => {
    const b = svgToBlob(svgRef.current)
    if (b) downloadBlob(b, `bus-analysis-${Date.now()}.svg`)
  }

  const exportMermaid = () => {
    const text = generateMermaid(chain)
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('mermaid-btn')
      if (btn) { btn.textContent = '✓ Copied'; setTimeout(() => { btn.textContent = '⬇ Mermaid' }, 1500) }
    }).catch(() => {
      downloadBlob(new Blob([text], { type: 'text/plain' }), `codechip-${Date.now()}.mmd`)
    })
  }

  /* ── Hierarchical layout ──────────────────────────────────── */
  const chipW = 120
  const chipH = 80
  const gapX = 50
  const gapY = 70

  // Collect unique chip names in order
  const chipNames = useMemo(() => {
    const seen = new Set<string>()
    const list: string[] = []
    for (const c of chain) {
      if (!seen.has(c.caller)) { seen.add(c.caller); list.push(c.caller) }
      if (!seen.has(c.callee)) { seen.add(c.callee); list.push(c.callee) }
    }
    return list
  }, [chain])

  // Assign layers via longest-path DAG layering
  const chipLayer = useMemo(() => {
    const layer: Record<string, number> = {}
    const inEdges: Record<string, string[]> = {}
    for (const n of chipNames) { layer[n] = 0; inEdges[n] = [] }
    for (const c of chain) { if (c.caller !== c.callee) inEdges[c.callee]?.push(c.caller) }
    // topological propagation
    for (let pass = 0; pass < chipNames.length; pass++) {
      for (const n of chipNames) {
        for (const p of (inEdges[n] || [])) {
          layer[n] = Math.max(layer[n], (layer[p] ?? 0) + 1)
        }
      }
    }
    return layer
  }, [chain, chipNames])

  // Group by layer
  const layers = useMemo(() => {
    const m: Record<number, string[]> = {}
    for (const n of chipNames) {
      const l = chipLayer[n] ?? 0
      if (!m[l]) m[l] = []
      m[l].push(n)
    }
    return m
  }, [chipNames, chipLayer])

  const numCols = Object.keys(layers).length
  const maxPerCol = Math.max(...Object.values(layers).map(a => a.length), 1)

  const svgW = Math.max(600, numCols * (chipW + gapX) + 80)
  const chipAreaH = Math.max(220, maxPerCol * (chipH + gapY) + 60)
  const svgH = chipAreaH + 90  // chip area + system bus zone

  const chipPosMap = useMemo(() => {
    const aH = Math.max(220, maxPerCol * (chipH + gapY) + 60)
    const m: Record<string, { x: number; y: number }> = {}
    const sortedLayers = Object.keys(layers).map(Number).sort((a, b) => a - b)
    sortedLayers.forEach((l, li) => {
      const col = layers[l]
      const colH = col.length * (chipH + gapY) - gapY
      const startY = (aH - colH) / 2
      col.forEach((name, ri) => {
        m[name] = {
          x: 30 + li * (chipW + gapX),
          y: startY + ri * (chipH + gapY),
        }
      })
    })
    return m
  }, [layers, chipH, gapY, maxPerCol, svgW])

  const numChips = chipNames.length

  // Active connection index for animation
  const activeToIdx = s.highlightLine ? s.highlightLine - 1 : -1

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', padding:'8px 12px', gap:6, overflow:'auto' }}>
      {/* Toolbar */}
      <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', flexShrink:0 }}>
        <span style={{ fontWeight:700, fontSize:12, color:'var(--text)' }}>{isZh ? '🔌 CodeChip · 代码电路模拟器' : '🔌 CodeChip · Code Circuit Simulator'}</span>
        <input value={exSearch} onChange={e => setExSearch(e.target.value)} placeholder={isZh ? '🔍 搜索示例...' : '🔍 Search examples...'}
          style={{ padding:'3px 7px', borderRadius:4, border:'1px solid var(--border)', background:'var(--bg-elevated)', color:'var(--text-primary)', fontSize:10, width:130, outline:'none' }} />
        <select value={exIdx} onChange={e => { setExIdx(+e.target.value); setExSearch(''); reset() }} style={{ padding:'3px 6px', borderRadius:4, border:'1px solid var(--border)', background:'var(--bg-primary)', color:'var(--text)', fontSize:11, maxWidth:220 }}>
          <option value={-1}>{isZh ? '🔧 自定义' : '🔧 Custom'}</option>
          <option value={-2}>{isZh ? '📋 粘贴代码' : '📋 Paste'}</option>
          {STATIC_EXAMPLES.map((e, i) => {
            const q = exSearch.toLowerCase()
            if (q && !e.label_en.toLowerCase().includes(q) && !e.cat_en.toLowerCase().includes(q) && !e.label_zh.includes(q) && !e.cat_zh.includes(q)) return null
            return <option key={i} value={i}>[{isZh ? e.cat_zh : e.cat_en}] {isZh ? e.label_zh : e.label_en}</option>
          })}
        </select>
        <button title={isZh ? '随机示例' : 'Random example'} onClick={() => { const i = Math.floor(Math.random() * STATIC_EXAMPLES.length); setExIdx(i); setExSearch(''); reset() }}
          style={{ padding:'3px 7px', borderRadius:4, border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontSize:12 }}>🎲</button>
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
        <button onClick={shareUrl} style={{ padding:'3px 8px', borderRadius:4, border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontSize:10 }}>🔗</button>
        <button onClick={exportSvg} style={{ padding:'3px 8px', borderRadius:4, border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontSize:10 }}>⬇ SVG</button>
        <button id="mermaid-btn" onClick={exportMermaid} style={{ padding:'3px 8px', borderRadius:4, border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontSize:10 }}>⬇ Mermaid</button>
        <button onClick={reset} style={{ padding:'4px 10px', borderRadius:4, border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontSize:11 }}>⏹</button>
        <button onClick={nextStep} style={{ padding:'4px 10px', borderRadius:4, border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontSize:11 }}>⏭</button>
        <button onClick={togglePlay} style={{ padding:'4px 14px', borderRadius:4, border:'none', background:playing?'#ff7b72':'#56d364', color:'#000', cursor:'pointer', fontSize:11, fontWeight:700 }}>
          {playing ? '⏸' : '▶'} {isZh ? (playing ? '暂停' : '播放') : (playing ? 'Pause' : 'Play')}
        </button>
        <div style={{ fontSize:10, color:'var(--text-muted)' }}>{step+1}/{allSteps.length}</div>
      </div>

      <div style={{ flex:1, display:'flex', gap:8, minHeight:0 }}>
        {/* Left: Code / Config Panel */}
        <div style={{ flex:'0 0 26%', overflow:'auto', borderRadius:6, border:'1px solid var(--border)', background:'var(--bg-primary)' }}>
          {exIdx === -1 ? (
            <div style={{ padding:10, display:'flex', flexDirection:'column', gap:6 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-secondary)', marginBottom:2 }}>{isZh ? '自定义调用链' : 'Custom Chain'}</div>
              {cuChain.map((c, i) => (
                <div key={i} style={{ display:'flex', gap:3, alignItems:'center', fontSize:9, fontFamily:'monospace', background:'var(--bg-elevated)', borderRadius:4, padding:'3px 5px' }}>
                  <span style={{ color:'#4d8fff' }}>{c.caller}</span>
                  <span style={{ color: REL_COLORS[c.relation||'call'] || '#445', fontSize:7 }}>{isZh ? REL_LABELS_ZH[c.relation||'call'] : REL_LABELS_EN[c.relation||'call']}</span>
                  <span style={{ color:'#d2a8ff' }}>{c.callee}</span>
                  <span style={{ color:'var(--text-secondary)' }}>.{c.method}({c.params})</span>
                  <button onClick={() => { const n = cuChain.filter((_,j) => j !== i); if (n.length > 0) { setCuChain(n); reset() } }}
                    style={{ marginLeft:'auto', padding:'0 4px', border:'none', background:'transparent', color:'#ff7b72', cursor:'pointer', fontSize:10 }}>✕</button>
                </div>
              ))}
              <div style={{ display:'flex', flexDirection:'column', gap:4, marginTop:4, padding:'6px 8px', borderRadius:4, border:'1px solid var(--border)', background:'var(--bg-elevated)' }}>
                <div style={{ fontSize:8, color:'var(--text-muted)', fontWeight:700 }}>{isZh ? '+ 新增调用' : '+ Add Call'}</div>
                {([{label:'Caller',v:cuCaller,s:setCuCaller},{label:'Method',v:cuMethod,s:setCuMethod},{label:'Callee',v:cuCallee,s:setCuCallee},{label:'Params',v:cuParams,s:setCuParams},{label:'Return',v:cuReturn,s:setCuReturn}] as const).map(f => (
                  <div key={f.label} style={{ display:'flex', gap:4, alignItems:'center' }}>
                    <span style={{ fontSize:8, color:'var(--text-secondary)', width:38 }}>{f.label}</span>
                    <input value={f.v} onChange={e => f.s(e.target.value as never)} style={{ flex:1, padding:'2px 5px', borderRadius:3, border:'1px solid var(--border)', background:'var(--bg-primary)', color:'var(--text-primary)', fontSize:10, fontFamily:'monospace', outline:'none' }} />
                  </div>
                ))}
                <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                  <span style={{ fontSize:8, color:'var(--text-secondary)', width:38 }}>Relation</span>
                  <select value={cuRelation} onChange={e => setCuRelation(e.target.value as ChainCall['relation'])}
                    style={{ flex:1, padding:'2px 4px', borderRadius:3, border:'1px solid var(--border)', background:'var(--bg-primary)', color:'var(--text-primary)', fontSize:10 }}>
                    {Object.keys(REL_LABELS_EN).map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div style={{ display:'flex', gap:4, marginTop:2 }}>
                  <button onClick={() => { setCuChain(prev => [...prev, {caller:cuCaller,callee:cuCallee,method:cuMethod,params:cuParams,ret:cuReturn,relation:cuRelation}]); reset() }}
                    style={{ flex:1, padding:'3px 0', borderRadius:3, border:'none', background:'#56d364', color:'#000', cursor:'pointer', fontSize:10, fontWeight:700 }}>
                    {isZh ? '+ 添加' : '+ Add'}
                  </button>
                  <button onClick={() => { setCuChain([{caller:'App',callee:'Svc',method:'exec',params:'x=42',ret:'void',relation:'call'}]); reset() }}
                    style={{ padding:'3px 8px', borderRadius:3, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:10 }}>
                    {isZh ? '清空' : 'Clear'}
                  </button>
                </div>
              </div>
              <GeneratedCodeBlock chain={chain} hlLine={hlLine} isZh={isZh} />
            </div>
          ) : exIdx === -2 ? (
            <div style={{ padding:10, display:'flex', flexDirection:'column', gap:6 }}>
              <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                <span style={{ fontSize:9, color:'var(--text-secondary)', flexShrink:0 }}>{isZh ? '语言' : 'Lang'}</span>
                <select value={pasteLang} onChange={e => setPasteLang(e.target.value)}
                  style={{ flex:1, padding:'2px 4px', borderRadius:3, border:'1px solid var(--border)', background:'var(--bg-elevated)', color:'var(--text-primary)', fontSize:10, outline:'none' }}>
                  <option value="auto">{isZh ? '自动检测' : 'Auto'}</option>
                  <option value="go">Go</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="typescript">TypeScript</option>
                </select>
              </div>
              <textarea value={pasteCode} onChange={e => setPasteCode(e.target.value)}
                placeholder={isZh ? '粘贴代码 → 自动生成芯片电路' : 'Paste code → generates chip circuit'}
                style={{ width:'100%', minHeight:180, padding:6, borderRadius:4, border:'1px solid var(--border)', background:'var(--bg-elevated)', color:'var(--text-primary)', fontSize:10.5, fontFamily:'monospace', resize:'vertical', outline:'none', lineHeight:1.5 }} />
              <div style={{ fontSize:8, color: parseError ? '#ff7b72' : 'var(--text-secondary)', minHeight:12 }}>
                {parseLoading
                  ? (isZh ? '⟳ AST 解析中...' : '⟳ Parsing AST...')
                  : parseError || (chain.length > 0 ? `✓ ${chain.length} ${isZh ? '条连接' : 'edges'}` : '')}
              </div>
              {chain.length > 0 && <GeneratedCodeBlock chain={chain} hlLine={hlLine} isZh={isZh} />}
            </div>
          ) : (
            <>
              <div style={{ padding:'6px 8px', borderBottom:'1px solid var(--border)', fontSize:10, fontWeight:700, color:'var(--text-secondary)', display:'flex', justifyContent:'space-between' }}>
                <span>{isZh ? '代码' : 'Code'}</span>
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
            </>
          )}
        </div>

        {/* Right: Circuit + Description + Waveform + Stack */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6, minWidth:0 }}>
          {/* SVG */}
          <div style={{ flex:1, borderRadius:6, border:'1px solid var(--border)', background:'var(--bg-primary)', overflow:'hidden', display:'flex', position:'relative' }}>
            {/* Zoom controls */}
            <div style={{ position:'absolute', top:6, right:6, display:'flex', flexDirection:'column', gap:2, zIndex:10 }}>
              {[['＋',0.2],['－',-0.2],['↺',0]].map(([label, delta]) => (
                <button key={String(label)} onClick={() => {
                  if (delta === 0) { setZoom(1); setPan({ x:0, y:0 }) }
                  else setZoom(z => Math.max(0.3, Math.min(3, z + Number(delta))))
                }} style={{ width:22, height:22, borderRadius:4, border:'1px solid var(--border)', background:'var(--bg-elevated)', color:'var(--text-secondary)', cursor:'pointer', fontSize:12, lineHeight:'1', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {label}
                </button>
              ))}
              <div style={{ fontSize:8, color:'var(--text-muted)', textAlign:'center' }}>{Math.round(zoom*100)}%</div>
            </div>
            {/* Minimap — shown when circuit has 4+ chips */}
            {chipNames.length >= 4 && (() => {
              const mW = 130, mH = 84
              const sc = Math.min(mW / svgW, mH / svgH) * 0.92
              const vpX = (-pan.x / zoom) * sc
              const vpY = (-pan.y / zoom) * sc
              const vpW = (svgW / zoom) * sc
              const vpH = (svgH / zoom) * sc
              return (
                <div style={{ position:'absolute', bottom:6, left:6, zIndex:10, background:'rgba(13,17,23,0.92)', border:'1px solid var(--border)', borderRadius:4, padding:3 }}>
                  <svg width={mW} height={mH} style={{ display:'block' }}>
                    {chain.map((c, i) => {
                      const p1 = chipPosMap[c.caller], p2 = chipPosMap[c.callee]
                      if (!p1 || !p2 || c.caller === c.callee) return null
                      const color = REL_COLORS[c.relation || 'call'] || '#79c0ff'
                      const isActive = i === activeToIdx
                      return (
                        <line key={i}
                          x1={(p1.x + chipW/2) * sc} y1={(p1.y + 40) * sc}
                          x2={(p2.x + chipW/2) * sc} y2={(p2.y + 40) * sc}
                          stroke={isActive ? color : color + '55'} strokeWidth={isActive ? 1.5 : 0.8} />
                      )
                    })}
                    {chipNames.map(name => {
                      const p = chipPosMap[name]
                      if (!p) return null
                      const chipType = detectChipType(name)
                      const typeColor = CHIP_TYPE_COLOR[chipType]
                      const isActiveChip = chain.some((c, ci) => (c.caller === name || c.callee === name) && ci === activeToIdx)
                      const isSel = selectedChip === name
                      return (
                        <rect key={name}
                          x={p.x * sc} y={p.y * sc}
                          width={chipW * sc} height={chipH * sc} rx={2}
                          fill={isActiveChip ? typeColor + '28' : '#111a24'}
                          stroke={isSel ? typeColor : (isActiveChip ? typeColor : typeColor + '55')}
                          strokeWidth={isSel || isActiveChip ? 1.5 : 0.7} />
                      )
                    })}
                    {/* Viewport indicator */}
                    <rect x={Math.max(0, vpX)} y={Math.max(0, vpY)}
                      width={Math.min(mW, vpW)} height={Math.min(mH, vpH)}
                      fill="rgba(100,180,255,0.05)" stroke="#4d8fff" strokeWidth={1}
                      strokeDasharray="3 2" rx={2} />
                  </svg>
                </div>
              )
            })()}
            <svg ref={svgRef}
              viewBox={`${-pan.x/zoom} ${-pan.y/zoom} ${svgW/zoom} ${svgH/zoom}`}
              style={{ width:'100%', height:'100%', display:'block', flex:1, cursor: panning ? 'grabbing' : 'grab' }}
              onWheel={e => { e.preventDefault(); setZoom(z => Math.max(0.3, Math.min(3, z * (e.deltaY < 0 ? 1.12 : 0.9)))) }}
              onMouseDown={e => { isPanning.current = true; setPanning(true); panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y } }}
              onMouseMove={e => { if (!isPanning.current) return; setPan({ x: panStart.current.px + (e.clientX - panStart.current.x), y: panStart.current.py + (e.clientY - panStart.current.y) }) }}
              onMouseUp={() => { isPanning.current = false; setPanning(false) }}
              onMouseLeave={() => { isPanning.current = false; setPanning(false) }}
            >
              <defs>
                <pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--bg-elevated)" strokeWidth="0.5" /></pattern>
                {Object.entries(REL_COLORS).map(([rel, c]) => (
                  <marker key={rel} id={`arrow-${rel}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 Z" fill={c} />
                  </marker>
                ))}
              </defs>
              <rect width={svgW} height={svgH} fill="var(--bg-primary)" /><rect width={svgW} height={svgH} fill="url(#g)" />

              {/* Connection arrows — use chipPosMap for all connections */}
              {chain.map((c, i) => {
                const p1 = chipPosMap[c.caller]
                const p2 = chipPosMap[c.callee]
                if (!p1 || !p2 || c.caller === c.callee) return null
                const isActive = i === activeToIdx
                return <RelationPath key={`rel-${i}`}
                  from={{...p1, w: chipW}} to={{...p2, w: chipW}}
                  relation={c.relation || 'call'} method={c.method} isZh={isZh}
                  active={isActive} animPct={isActive ? animProgress : undefined}
                />
              })}

              {/* Chips — positioned by hierarchical layout */}
              {chipNames.map((name, i) => {
                const p = chipPosMap[name] ?? { x: 18, y: 16 }
                const chipType = detectChipType(name)
                const typeColor = CHIP_TYPE_COLOR[chipType]
                const isActiveChip = chain.some((c, ci) => (c.caller === name || c.callee === name) && ci === activeToIdx)
                const isSelected = selectedChip === name
                const inMethods = [...new Set(chain.filter(c => c.callee === name).map(c => c.method))]
                const outMethods = [...new Set(chain.filter(c => c.caller === name).map(c => c.method))]
                return (
                  <g key={name} onClick={() => setSelectedChip(selectedChip === name ? null : name)} style={{ cursor:'pointer' }}>
                    {isSelected && <rect x={p.x-6} y={p.y-6} width={chipW+12} height={chipH+12} rx={8}
                      fill="none" stroke={typeColor} strokeWidth={2} strokeDasharray="4 2" opacity={0.7} />}
                    <ChipModule name={name}
                      sub={CHIP_TYPE_LABEL[chipType]}
                      x={p.x} y={p.y} w={chipW}
                      active={isActiveChip}
                      color={typeColor}
                      state={s.state}
                      memLayout={showMem && i === numChips - 1 ? memLayout : undefined}
                      inMethods={inMethods} outMethods={outMethods} />
                  </g>
                )
              })}

              {/* System Bus — three horizontal rails below all chips */}
              {(() => {
                const busBaseY = chipAreaH + 12
                const busOffs: Record<BusType, number> = { addr: 0, ctrl: 26, data: 52 }
                const activeCaller = activeToIdx >= 0 && activeToIdx < chain.length ? chain[activeToIdx].caller : ''
                const activeCallee = activeToIdx >= 0 && activeToIdx < chain.length ? chain[activeToIdx].callee : ''
                return (
                  <g>
                    {/* Per-chip wires to bus */}
                    {chipNames.map(name => {
                      const p = chipPosMap[name]
                      if (!p) return null
                      const isActive = name === activeCaller || name === activeCallee
                      const cx = p.x + chipW / 2
                      const chipBottomY = p.y + chipH
                      return (
                        <g key={`bw-${name}`}>
                          {(['addr', 'ctrl', 'data'] as BusType[]).map((bus, bi) => {
                            const bx = cx + (bi - 1) * 5
                            const busY = busBaseY + busOffs[bus]
                            const active = isActive && s[bus] !== '—'
                            return (
                              <g key={bus}>
                                <line x1={bx} y1={chipBottomY + 3} x2={bx} y2={busY}
                                  stroke={active ? BUS_COLORS[bus] : '#1c2940'}
                                  strokeWidth={active ? 1.5 : 0.8}
                                  strokeDasharray={active ? 'none' : '3 3'} />
                                <circle cx={bx} cy={busY} r={2.5} fill={active ? BUS_COLORS[bus] : '#243050'} />
                              </g>
                            )
                          })}
                        </g>
                      )
                    })}
                    {/* Bus rails */}
                    {(['addr', 'ctrl', 'data'] as BusType[]).map(bus => {
                      const busY = busBaseY + busOffs[bus]
                      const active = s[bus] !== '—'
                      return (
                        <g key={`bl-${bus}`}>
                          {active && <line x1={0} y1={busY} x2={svgW} y2={busY} stroke={BUS_COLORS[bus]} strokeWidth={5} opacity={0.07} />}
                          <line x1={0} y1={busY} x2={svgW} y2={busY}
                            stroke={BUS_COLORS[bus]} strokeWidth={active ? 1.8 : 1} opacity={active ? 0.85 : 0.12} />
                          <rect x={4} y={busY - 9} width={46} height={10} rx={2}
                            fill="var(--bg-primary)" stroke={BUS_COLORS[bus] + '50'} strokeWidth={0.8} />
                          <text x={7} y={busY - 1} fill={BUS_COLORS[bus]} fontSize={6}
                            fontWeight="bold" fontFamily="monospace">{bus.toUpperCase()} BUS</text>
                          {active && (
                            <g>
                              <rect x={55} y={busY - 7} width={Math.min(s[bus].length * 6.5 + 10, 180)} height={12} rx={3}
                                fill="var(--bg-primary)" stroke={BUS_COLORS[bus]} strokeWidth={1.2} />
                              <text x={61} y={busY + 2} fill={BUS_COLORS[bus]} fontSize={7.5}
                                fontWeight="bold" fontFamily="monospace">{s[bus]}</text>
                            </g>
                          )}
                        </g>
                      )
                    })}
                    {/* Signal pulses on bus rails */}
                    {activeToIdx >= 0 && activeToIdx < chain.length && animProgress > 0 && (
                      (['addr', 'ctrl', 'data'] as BusType[]).map(bus => {
                        if (s[bus] === '—') return null
                        const pFrom = chipPosMap[activeCaller]
                        const pTo = chipPosMap[activeCallee]
                        if (!pFrom || !pTo) return null
                        const busY = busBaseY + busOffs[bus]
                        const fx = pFrom.x + chipW / 2
                        const tx = pTo.x + chipW / 2
                        const cx = fx + (tx - fx) * animProgress
                        return (
                          <g key={`bp-${bus}`}>
                            <circle cx={cx} cy={busY} r={5} fill={BUS_COLORS[bus]} opacity={0.9} />
                            <circle cx={cx} cy={busY} r={10} fill={BUS_COLORS[bus]} opacity={0.15} />
                          </g>
                        )
                      })
                    )}
                  </g>
                )
              })()}
            </svg>

            {/* Chip Inspector Panel */}
            {selectedChip && (() => {
              const chipType = detectChipType(selectedChip)
              const typeColor = CHIP_TYPE_COLOR[chipType]
              const incoming = chain.filter(c => c.callee === selectedChip)
              const outgoing = chain.filter(c => c.caller === selectedChip)
              return (
                <div style={{ width:130, flexShrink:0, borderLeft:'1px solid var(--border)', padding:6, background:'var(--bg-primary)', display:'flex', flexDirection:'column', gap:4, overflowY:'auto' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:9, fontWeight:700, color:typeColor, fontFamily:'monospace' }}>{selectedChip}</span>
                    <button onClick={() => setSelectedChip(null)} style={{ border:'none', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:10, padding:0 }}>✕</button>
                  </div>
                  <div style={{ fontSize:8, color:typeColor, background:typeColor+'18', borderRadius:3, padding:'1px 5px', alignSelf:'flex-start' }}>{CHIP_TYPE_LABEL[chipType]}</div>
                  {incoming.length > 0 && <>
                    <div style={{ fontSize:8, color:'var(--text-muted)', fontWeight:700 }}>{isZh ? '接收' : 'Receives'}</div>
                    {incoming.map((c, i) => (
                      <div key={i} style={{ fontSize:8, fontFamily:'monospace', color:'var(--text-secondary)', background:'var(--bg-elevated)', borderRadius:3, padding:'2px 4px' }}>
                        <span style={{ color:REL_COLORS[c.relation||'call'] }}>←</span> {c.caller}.{c.method}
                      </div>
                    ))}
                  </>}
                  {outgoing.length > 0 && <>
                    <div style={{ fontSize:8, color:'var(--text-muted)', fontWeight:700 }}>{isZh ? '发出' : 'Calls'}</div>
                    {outgoing.map((c, i) => (
                      <div key={i} style={{ fontSize:8, fontFamily:'monospace', color:'var(--text-secondary)', background:'var(--bg-elevated)', borderRadius:3, padding:'2px 4px' }}>
                        <span style={{ color:REL_COLORS[c.relation||'call'] }}>→</span> {c.callee}.{c.method}
                      </div>
                    ))}
                  </>}
                </div>
              )
            })()}

            {/* Stack Panel */}
            <div style={{ width:100, flexShrink:0, borderLeft:'1px solid var(--border)', padding:4, background:'var(--bg-primary)', display:'flex', flexDirection:'column', gap:3 }}>
              <div style={{ fontSize:7, color:'var(--text-secondary)', fontFamily:'monospace', textAlign:'center' }}>{isZh ? '栈' : 'Stack'}</div>
              {(s?.stack||[]).length === 0 ? <div style={{ fontSize:8, color:'#445', fontFamily:'monospace', padding:4 }}>—</div> :
                (s?.stack||[]).slice().reverse().map((f, i) => (
                  <div key={i} style={{ padding:'3px 4px', borderRadius:2, background:'#1a2332', border:'1px solid #334', borderLeft:'2px solid #4d8fff', fontSize:8, fontFamily:'monospace' }}>
                    <div style={{ color:'#ff7b72' }}>{f.pc}</div>
                    <div style={{ color:'var(--text-secondary)', fontSize:7 }}>{f.desc}</div>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Conflict + Description + Pattern badge + Mini chain map */}
          <div style={{ borderRadius:6, border:'1px solid var(--border)', padding:'4px 8px', fontSize:11, lineHeight:1.5, color:'var(--text-primary)', background:conflict?'#ff7b7215': 'var(--bg-elevated)', flexShrink:0, display:'flex', alignItems:'center', gap:8 }}>
            {conflict && <span style={{ color:'#ff7b72', fontWeight:700 }}>{conflict}</span>}
            <span>{isZh ? s.desc_zh : s.desc_en}</span>
            {(() => {
              const p = detectPattern(chain)
              return p ? (
                <span title={isZh ? p.desc_zh : p.desc_en} style={{ marginLeft:4, padding:'1px 7px', borderRadius:10, fontSize:9, fontWeight:700, background:'rgba(100,180,255,0.12)', border:'1px solid rgba(100,180,255,0.25)', color:'#79c0ff', cursor:'help', whiteSpace:'nowrap' }}>
                  {p.icon} {isZh ? p.name_zh : p.name_en}
                </span>
              ) : null
            })()}
            <span style={{ fontSize:9, color:'#4d8fff', fontFamily:'monospace', marginLeft:'auto' }}>
              {chain[0]?.caller}
              {chain.map((c, i) => (
                <span key={i}>
                  <span style={{ color: REL_COLORS[c.relation||'call'], fontSize:7, margin:'0 2px' }}>{isZh ? REL_LABELS_ZH[c.relation||'call'] : REL_LABELS_EN[c.relation||'call']}</span>
                  {c.callee}
                </span>
              ))}
            </span>
          </div>

          {/* Waveform */}
          <div style={{ flexShrink:0 }}>
            <div style={{ fontSize:8, color:'var(--text-secondary)', marginBottom:1, fontFamily:'monospace', paddingLeft:2 }}>{isZh ? '波形' : 'Wave'}</div>
            <div style={{ overflowX:'auto' }}>
              <Waveform steps={allSteps} curStep={step} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Oscilloscope Waveform ───────────────────────────────────── */

function Waveform({ steps, curStep }: { steps: BusStep[]; curStep: number }) {
  const n = steps.length
  if (n === 0) return null
  const labelW = 40
  const stepW = 32  // fixed width per step — enables scroll for long sequences
  const W = Math.max(520, labelW + n * stepW + 4)
  const chH = 26
  const sigA = 9
  const topPad = 8
  const numRows = 4  // CLK + ADDR + CTRL + DATA
  const H = topPad + numRows * chH + 16

  type Ch = { name: string; color: string; vals: (0|1)[]; texts?: string[] }
  const channels: Ch[] = [
    { name: 'CLK',  color: '#00ff41', vals: steps.map((_, i) => (i % 2) as 0|1) },
    { name: 'ADDR', color: '#ff7b72', vals: steps.map(s => (s.addr !== '—' ? 1 : 0) as 0|1), texts: steps.map(s => s.addr) },
    { name: 'CTRL', color: '#79c0ff', vals: steps.map(s => (s.ctrl !== '—' ? 1 : 0) as 0|1), texts: steps.map(s => s.ctrl) },
    { name: 'DATA', color: '#56d364', vals: steps.map(s => (s.data !== '—' ? 1 : 0) as 0|1), texts: steps.map(s => s.data) },
  ]

  const midY = (ci: number) => topPad + ci * chH + chH / 2

  const buildPath = (vals: (0|1)[], ci: number) => {
    const cy = midY(ci), hi = cy - sigA, lo = cy + sigA
    let d = ''
    for (let i = 0; i < vals.length; i++) {
      const x0 = labelW + i * stepW, x1 = labelW + (i + 1) * stepW
      const y = vals[i] ? hi : lo
      if (i === 0) { d += `M ${x0} ${y}` }
      else {
        const py = vals[i-1] ? hi : lo
        if (y !== py) d += ` L ${x0} ${py} L ${x0} ${y}`
      }
      d += ` L ${x1} ${y}`
    }
    return d
  }

  return (
    <div style={{ borderRadius:4, overflow:'hidden', border:'1px solid #00ff4128', background:'#020c08' }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display:'block', minWidth: W }}>
        {/* Graticule grid */}
        {Array.from({ length: n + 1 }, (_, i) => (
          <line key={`vg${i}`} x1={labelW + i * stepW} y1={topPad} x2={labelW + i * stepW} y2={H - 14}
            stroke="rgba(0,255,65,0.07)" strokeWidth={0.5} />
        ))}
        {channels.map((_, ci) => (
          <line key={`hg${ci}`} x1={labelW} y1={midY(ci)} x2={W} y2={midY(ci)}
            stroke="rgba(0,255,65,0.05)" strokeWidth={0.5} />
        ))}
        {/* Active step cursor */}
        <rect x={labelW + curStep * stepW} y={topPad} width={stepW} height={H - 14 - topPad}
          fill="rgba(255,255,255,0.025)" />
        <line x1={labelW + curStep * stepW + stepW / 2} y1={topPad}
          x2={labelW + curStep * stepW + stepW / 2} y2={H - 14}
          stroke="rgba(200,255,220,0.3)" strokeWidth={0.8} strokeDasharray="2 2" />
        {/* Channels */}
        {channels.map((ch, ci) => {
          const val = ch.texts?.[curStep]
          const showLabel = val && val !== '—'
          const cx = labelW + curStep * stepW + stepW / 2
          const cy = midY(ci)
          return (
            <g key={ch.name}>
              <rect x={0} y={midY(ci) - chH / 2} width={labelW - 2} height={chH} fill="#020c08" />
              <text x={labelW - 5} y={midY(ci) + 3} textAnchor="end"
                fill={ch.color} fontSize={7} fontWeight="bold" fontFamily="monospace">{ch.name}</text>
              {/* Phosphor glow */}
              <path d={buildPath(ch.vals, ci)} stroke={ch.color} strokeWidth={3.5} fill="none" opacity={0.1} />
              {/* Signal line */}
              <path d={buildPath(ch.vals, ci)} stroke={ch.color} strokeWidth={1.2} fill="none" opacity={0.92} />
              {/* Value annotation at cursor */}
              {showLabel && (
                <g>
                  <rect x={cx - 20} y={cy - sigA - 14} width={40} height={11} rx={2}
                    fill={ch.color + '22'} stroke={ch.color + '80'} strokeWidth={0.5} />
                  <text x={cx} y={cy - sigA - 5} textAnchor="middle"
                    fill={ch.color} fontSize={6} fontFamily="monospace" fontWeight="bold">{val}</text>
                </g>
              )}
            </g>
          )
        })}
        {/* Bottom step numbers */}
        <line x1={labelW} y1={H - 14} x2={W} y2={H - 14} stroke="rgba(0,255,65,0.1)" strokeWidth={0.5} />
        {steps.map((_, i) => (
          <text key={i} x={labelW + i * stepW + stepW / 2} y={H - 3}
            textAnchor="middle" fill={i === curStep ? '#88ffaa' : '#1a3322'} fontSize={6} fontFamily="monospace">{i + 1}</text>
        ))}
      </svg>
    </div>
  )
}
