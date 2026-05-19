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

function ChipModule({ name, sub, x, y, w, active, color, state: st, memLayout }: {
  name: string; sub: string; x: number; y: number; w: number; active: boolean; color: string; state?: Record<string, string>; memLayout?: any[]
}) {
  const h = 60
  const se = st ? Object.entries(st) : []
  const useLayout = memLayout && memLayout.length > 0
  const ch = useLayout ? 60 + memLayout!.length * 11 : 60
  return (
    <g>
      <rect x={x} y={y} width={w} height={ch} rx={4} fill="#1a2332" stroke={active ? color : '#334'} strokeWidth={1.5} />
      <path d={`M${x+w/2-20} ${y} L${x+w/2-10} ${y-5} L${x+w/2+10} ${y-5} L${x+w/2+20} ${y} Z`} fill="#1a2332" stroke={active ? color : '#334'} strokeWidth={1} />
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

/* ── Relationship Arrow ──────────────────────────────────────── */

function RelationPath({ from, to, relation, isZh }: {
  from: { x: number; y: number; w: number }
  to: { x: number; y: number; w: number }
  relation: string
  isZh: boolean
}) {
  const rel = relation || 'call'
  const color = REL_COLORS[rel] || '#79c0ff'
  const fromX = from.x + from.w
  const fromY = from.y + 30
  const toX = to.x
  const toY = to.y + 30
  const midX = (fromX + toX) / 2
  const isDashed = REL_STROKE[rel] === 'dashed'
  const label = isZh ? (REL_LABELS_ZH[rel] || rel) : (REL_LABELS_EN[rel] || rel)
  return (
    <g>
      <line x1={fromX} y1={fromY} x2={toX} y2={toY}
        stroke={color} strokeWidth={1.5}
        strokeDasharray={isDashed ? '4 3' : 'none'}
        markerEnd={`url(#arrow-${rel})`} />
      <polygon points={`${toX-6},${toY-4} ${toX},${toY} ${toX-6},${toY+4}`}
        fill={color} opacity={0} />
      <rect x={midX - 40} y={fromY - 16} width={80} height={14} rx={3}
        fill="var(--bg-primary)" stroke={color+'60'} strokeWidth={0.5} />
      <text x={midX} y={fromY - 5} textAnchor="middle" fill={color}
        fontSize={7} fontWeight="bold" fontFamily="monospace">{label}</text>
    </g>
  )
}

/* ── Code Parser ──────────────────────────────────────────────── */

function analyzePastedCode(code: string): ChainCall[] {
  const calls: ChainCall[] = []
  const classes: string[] = []
  const cr = /(?:class|struct|interface|type\s+\w+\s+struct)\s+(\w+)/g; let m: RegExpExecArray | null
  while ((m = cr.exec(code)) !== null) classes.push(m[1])
  const seen = new Set<string>()
  const patterns = [
    /(\w+)\.(\w+)\s*\(([^)]*)\)\s*;/g, /this\.(\w+)\s*\(([^)]*)\)/g, /self\.(\w+)\s*\(([^)]*)\)/g,
    /(\w+)::(\w+)\s*\(([^)]*)\)/g, /(\w+)\s*=\s*(\w+)\.(\w+)\s*\(([^)]*)\)/g,
  ]
  for (const re of patterns) {
    while ((m = re.exec(code)) !== null) {
      const obj = m[1], method = m[2], args = m[3]?.trim() || ''
      let callee = method[0].toUpperCase() + method.slice(1)
      for (const c of classes) { if (c.toLowerCase() === callee.toLowerCase()) { callee = c; break } }
      const key = `${obj}.${method}`
      if (seen.has(key)) continue; seen.add(key)
      if (method === 'main') continue
      const caller = classes.find(c => code.indexOf(`class ${c}`) < (m!.index)) || obj
      calls.push({ caller, callee, method, params: args || 'x', ret: 'void', relation: 'call' })
      if (calls.length >= 5) break
    }
    if (calls.length >= 5) break
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

export default function ObjectBusView() {
  const { lang } = useLang()
  const isZh = lang === 'zh'
  const [exIdx, setExIdx] = useState(-2)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(2)
  const [animProgress, setAnimProgress] = useState(0)
  const [showHex, setShowHex] = useState(false)
  const [showMem, setShowMem] = useState(false)
  const [cuCaller, setCuCaller] = useState('App')
  const [cuCallee, setCuCallee] = useState('Svc')
  const [cuParams, setCuParams] = useState('x=42')
  const [cuReturn, setCuReturn] = useState('void')
  const [cuChain, setCuChain] = useState<ChainCall[]>([{caller:'App',callee:'Svc',method:'exec',params:'x=42',ret:'void',relation:'call'}])
  const [pasteCode, setPasteCode] = useState('')
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

  /* Real-time analysis debounce */
  useEffect(() => {
    if (exIdx !== -2 || !pasteCode.trim()) return
    clearTimeout(debRef.current)
    debRef.current = setTimeout(() => {
      const r = analyzePastedCode(pasteCode)
      if (r.length > 0) setCuChain(r)
    }, 400)
    return () => clearTimeout(debRef.current)
  }, [pasteCode, exIdx])

  const isStatic = exIdx >= 0 && exIdx < STATIC_EXAMPLES.length
  const staticEx = isStatic ? STATIC_EXAMPLES[exIdx] : null
  const chain = isStatic ? staticEx!.chain : cuChain
  const catStr = isStatic ? (isZh ? staticEx!.cat_zh : staticEx!.cat_en) : ''
  const allSteps = useMemo(() => generateSteps(chain), [chain])
  const s = allSteps[step % allSteps.length]
  const conflict = checkConflict(s)
  const movingData = s.movingData || []

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
    if (b) downloadBlob(b, `bus-analysis-${exIdx}.svg`)
  }

  /* Auto Layout: max 5 chips per row */
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
      {/* Toolbar */}
      <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', flexShrink:0 }}>
        <span style={{ fontWeight:700, fontSize:12, color:'var(--text)' }}>{isZh ? '🔌 对象总线分析器' : '🔌 Object Bus Analyzer'}</span>
        <select value={exIdx} onChange={e => { setExIdx(+e.target.value); reset() }} style={{ padding:'3px 6px', borderRadius:4, border:'1px solid var(--border)', background:'var(--bg-primary)', color:'var(--text)', fontSize:11 }}>
          <option value={-1}>{isZh ? '🔧 自定义' : '🔧 Custom'}</option>
          <option value={-2}>{isZh ? '📋 粘贴代码' : '📋 Paste'}</option>
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
        <button onClick={shareUrl} style={{ padding:'3px 8px', borderRadius:4, border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontSize:10 }}>🔗</button>
        <button onClick={exportSvg} style={{ padding:'3px 8px', borderRadius:4, border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontSize:10 }}>⬇ SVG</button>
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
              {chain.map((c, i) => (
                <div key={i} style={{ display:'flex', gap:3, alignItems:'center', fontSize:9, fontFamily:'monospace' }}>
                  <span style={{ color:'#4d8fff' }}>{c.caller}</span>
                  <span style={{ color: REL_COLORS[c.relation||'call'] || '#445', fontSize:7 }}>{isZh ? REL_LABELS_ZH[c.relation||'call'] : REL_LABELS_EN[c.relation||'call']}</span>
                  <span style={{ color:'#d2a8ff' }}>{c.callee}</span>
                  <span style={{ color:'var(--text-secondary)' }}>.{c.method}()</span>
                </div>
              ))}
              <div style={{ display:'flex', flexDirection:'column', gap:5, marginTop:4 }}>
                {[{label:'Caller',v:cuCaller,s:setCuCaller},{label:'Callee',v:cuCallee,s:setCuCallee},{label:'Params',v:cuParams,s:setCuParams},{label:'Return',v:cuReturn,s:setCuReturn}].map(f => (
                  <div key={f.label} style={{ display:'flex', gap:4, alignItems:'center' }}>
                    <span style={{ fontSize:8, color:'var(--text-secondary)', width:36 }}>{f.label}</span>
                    <input value={f.v} onChange={e => { f.s(e.target.value); reset() }} style={{ flex:1, padding:'3px 5px', borderRadius:3, border:'1px solid var(--border)', background:'var(--bg-elevated)', color:'var(--text-primary)', fontSize:10, fontFamily:'monospace', outline:'none' }} />
                  </div>
                ))}
              </div>
            </div>
          ) : exIdx === -2 ? (
            <div style={{ padding:10, display:'flex', flexDirection:'column', gap:6 }}>
              <textarea value={pasteCode} onChange={e => setPasteCode(e.target.value)}
                placeholder={isZh ? '粘贴代码（自动分析）' : 'Paste code (auto-analyze)'}
                style={{ width:'100%', minHeight:160, padding:6, borderRadius:4, border:'1px solid var(--border)', background:'var(--bg-elevated)', color:'var(--text-primary)', fontSize:10.5, fontFamily:'monospace', resize:'vertical', outline:'none', lineHeight:1.5 }} />
              <div style={{ fontSize:8, color:'var(--text-secondary)' }}>{isZh ? '实时分析中...' : 'Auto-analyzing...'} ({detectCalls} {isZh ? '个调用' : 'calls'})</div>
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
          <div style={{ flex:1, borderRadius:6, border:'1px solid var(--border)', background:'var(--bg-primary)', overflow:'hidden', display:'flex' }}>
            <svg ref={svgRef} viewBox={`0 0 ${svgW} ${svgH}`} style={{ width:'100%', height:'100%', display:'block', flex:1 }}>
              <defs>
                <pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--bg-elevated)" strokeWidth="0.5" /></pattern>
                {Object.entries(REL_COLORS).map(([rel, c]) => (
                  <marker key={rel} id={`arrow-${rel}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 Z" fill={c} />
                  </marker>
                ))}
              </defs>
              <rect width={svgW} height={svgH} fill="var(--bg-primary)" /><rect width={svgW} height={svgH} fill="url(#g)" />

              {/* Relationship arrows between adjacent chips */}
              {Array.from({ length: Math.max(0, numChips - 1) }, (_, i) => {
                const p1 = chipPos(i)
                const p2 = chipPos(i + 1)
                if (Math.floor(i / chipsPerRow) !== Math.floor((i + 1) / chipsPerRow)) return null
                const rel = chain[i]?.relation || 'call'
                return <RelationPath key={`rel-${i}`} from={{...p1, w: chipW}} to={{...p2, w: chipW}} relation={rel} isZh={isZh} />
              })}

              {/* Chips */}
              {Array.from({ length: numChips }, (_, i) => {
                const p = chipPos(i)
                const name = i === 0 ? chain[0]?.caller || 'Caller' : chain[i - 1]?.callee || `M${i}`
                return <ChipModule key={i} name={name} sub={i === 0 ? (isZh ? '调用方' : 'Caller') : `#${i}`} x={p.x} y={p.y} w={chipW}
                  active={i === 0 ? movingData.some(d => d.from === 0) : movingData.some(d => d.to === i || d.from === i)}
                  color={i === 0 ? '#4d8fff' : [BUS_COLORS.addr,BUS_COLORS.data,BUS_COLORS.ctrl,'#d2a8ff','#ffa657'][(i-1)%5]}
                  state={s.state} memLayout={showMem && i === numChips - 1 ? memLayout : undefined} />
              })}

              {/* Buses per row */}
              {Array.from({ length: numRows }, (_, row) => (
                (['addr','ctrl','data'] as BusType[]).map(bus => (
                  <g key={`${row}-${bus}`}>
                    <line x1={0} y1={busLineY(row, bus)} x2={svgW} y2={busLineY(row, bus)} stroke={BUS_COLORS[bus]} strokeWidth={2} opacity={s[bus] !== '—' ? 1 : 0.12} />
                    {Array.from({ length: Math.min(chipsPerRow, numChips - row * chipsPerRow) }, (_, ci) => {
                      const idx = row * chipsPerRow + ci
                      const p = chipPos(idx)
                      const cx = idx === 0 ? p.x + chipW : p.x - 8
                      return (<g key={ci}><line x1={cx} y1={p.y + 30} x2={cx} y2={busLineY(row, bus)} stroke={s[bus] !== '—' ? BUS_COLORS[bus] : '#222'} strokeWidth={1} strokeDasharray="3 2" /><circle cx={cx} cy={busLineY(row, bus)} r={3} fill={s[bus] !== '—' ? BUS_COLORS[bus] : '#333'} /></g>)
                    })}
                  </g>
                ))
              ))}

              {/* Bus labels */}
              {Array.from({ length: numRows }, (_, row) => (([['addr','ADDR','#ff7b72'],['ctrl','CTRL','#79c0ff'],['data','DATA','#56d364']] as const).map(([b,n,c]) => (
                <g key={`l-${row}-${n}`} transform={`translate(4, ${busLineY(row, b)-14})`}>
                  <rect x={0} y={0} width={68} height={12} rx={2} fill="var(--bg-primary)" stroke={(c+'40')} strokeWidth={1} />
                  <text x={3} y={9} fill={c} fontSize={7} fontFamily='monospace' fontWeight='bold'>{n} BUS</text>
                </g>
              ))))}

              {/* Value labels */}
              {(['addr','ctrl','data'] as BusType[]).map(b => (
                <g key={b} transform={`translate(${chipW + 40}, ${busLineY(0, b)})`}>
                  <BusValueLabel bus={b.toUpperCase()} label={s[b]} color={BUS_COLORS[b]} active={s[b] !== '—'} />
                </g>
              ))}

              {/* Moving dots */}
              {movingData.map((md, i) => {
                const calleeIdx = md.to === 99 ? numChips - 1 : md.to
                const callerIdx = md.from === 99 ? numChips - 1 : md.from
                const p1 = chipPos(md.from === 0 ? 0 : callerIdx < numChips ? callerIdx : 0)
                const p2 = chipPos(calleeIdx < numChips ? calleeIdx : numChips - 1)
                const cx1 = md.from === 0 ? p1.x + chipW : p1.x
                const cx2 = md.to === 99 ? p2.x + 150 : md.to === 0 ? p2.x + chipW : p2.x
                const fromChipIdx = md.from === 0 ? 0 : (md.from === 99 ? numChips - 1 : md.from)
                const toChipIdx = md.to === 0 ? 0 : (md.to === 99 ? numChips - 1 : md.to)
                const rowFrom = Math.floor(fromChipIdx / chipsPerRow)
                const rowTo = Math.floor(toChipIdx / chipsPerRow)
                const y = md.from < 99 && md.to < 99 && rowFrom === rowTo ? busLineY(rowFrom, md.bus) : busLineY(0, md.bus)
                const fx = cx1 < cx2 ? cx1 : cx2; const tx = cx1 < cx2 ? cx2 : cx1
                return <MovingDot key={i} progress={animProgress} fromX={fx} toX={tx} y={y} color={BUS_COLORS[md.bus]} label={md.label} />
              })}
            </svg>

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

          {/* Conflict + Description + Mini chain map */}
          <div style={{ borderRadius:6, border:'1px solid var(--border)', padding:'4px 8px', fontSize:11, lineHeight:1.5, color:'var(--text-primary)', background:conflict?'#ff7b7215': 'var(--bg-elevated)', flexShrink:0, display:'flex', alignItems:'center', gap:8 }}>
            {conflict && <span style={{ color:'#ff7b72', fontWeight:700 }}>{conflict}</span>}
            <span>{isZh ? s.desc_zh : s.desc_en}</span>
            <span style={{ fontSize:9, color:'#4d8fff', fontFamily:'monospace' }}>
              {chain.map((c, i) => (
                <span key={i}>
                  {i > 0 && <span style={{ color: REL_COLORS[c.relation||'call'], fontSize:7, margin:'0 2px' }}>{isZh ? REL_LABELS_ZH[c.relation||'call'] : REL_LABELS_EN[c.relation||'call']}</span>}
                  {c.callee}
                </span>
              )).reduce((acc, el) => {
                if (acc.length === 0) return [el]
                return [...acc, <>{acc[acc.length-1]}</>]
              }, [] as React.ReactNode[])}
            </span>
          </div>

          {/* Waveform */}
          <div style={{ flexShrink:0 }}>
            <div style={{ fontSize:8, color:'var(--text-secondary)', marginBottom:1, fontFamily:'monospace', paddingLeft:2 }}>{isZh ? '波形' : 'Wave'}</div>
            <Waveform steps={allSteps} curStep={step} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Waveform sub-component ──────────────────────────────────── */

function Waveform({ steps, curStep }: { steps: BusStep[]; curStep: number }) {
  const w = Math.max(50, 300 / steps.length)
  return (
    <div style={{ display:'flex', gap:0, alignItems:'stretch', height:44, borderRadius:4, overflow:'hidden', border:'1px solid var(--border)', background:'var(--bg-primary)' }}>
      {steps.map((st, i) => {
        const isCur = i === curStep
        return (
          <div key={i} style={{ flex:'0 0 '+w+'px', display:'flex', flexDirection:'column', gap:1, borderRight:'1px solid '+(isCur?'#fff':'var(--bg-elevated)'), background:isCur?'#1a2332':'transparent', padding:'1px 1px' }}>
            {(['addr','ctrl','data'] as BusType[]).map(b => {
              const on = st[b] !== '—'
              return <div key={b} style={{ flex:1, borderRadius:1, background:on ? BUS_COLORS[b] : 'transparent', minHeight:on?undefined:0, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 1px', transition:'all 0.3s' }}>
                {on && <span style={{ fontSize:6, color:'#000', fontWeight:'bold', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{st[b]}</span>}
              </div>
            })}
            <div style={{ textAlign:'center', fontSize:6, color:isCur?'#fff':'#445', fontFamily:'monospace' }}>{i+1}</div>
          </div>
        )
      })}
    </div>
  )
}
