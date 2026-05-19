import { useState, useEffect, useRef, useCallback } from 'react'
import { useLang } from '../i18n/lang'

interface BusStep {
  addr: string
  ctrl: string
  data: string
  desc_zh: string
  desc_en: string
  highlightLine: number
  state?: Record<string, string>
  movingData?: { from: number; to: number; label: string; bus: 'addr' | 'ctrl' | 'data' }[]
  stack?: { pc: string; desc: string }[]
}

type BusType = 'addr' | 'ctrl' | 'data'

const BUS_COLORS: Record<BusType, string> = { addr: '#ff7b72', data: '#56d364', ctrl: '#79c0ff' }

interface CatExample { cat_zh: string; cat_en: string; zh: string; en: string; chain: ChainCall[] }
const CATEGORIES: CatExample[] = [
  // ── 1. 基础语法 Basic Syntax ──────────────────────────────────
  { cat_zh: '基础语法', cat_en: 'Basic Syntax',
    zh: '简单方法调用', en: 'Simple Method Call', chain: [{ caller: 'App', callee: 'Logger', method: 'log', params: 'msg=hello', ret: 'void' }] },
  { cat_zh: '基础语法', cat_en: 'Basic Syntax',
    zh: '构造函数调用', en: 'Constructor Call', chain: [{ caller: 'Factory', callee: 'Product', method: 'Product', params: 'id=1,name=A', ret: 'Product' }] },
  { cat_zh: '基础语法', cat_en: 'Basic Syntax',
    zh: 'Getter', en: 'Getter', chain: [{ caller: 'Controller', callee: 'User', method: 'getName', params: '', ret: 'string' }] },
  { cat_zh: '基础语法', cat_en: 'Basic Syntax',
    zh: 'Setter', en: 'Setter', chain: [{ caller: 'Service', callee: 'Config', method: 'setTimeout', params: 'ms=5000', ret: 'void' }] },
  { cat_zh: '基础语法', cat_en: 'Basic Syntax',
    zh: '静态方法', en: 'Static Method', chain: [{ caller: 'App', callee: 'MathUtils', method: 'max', params: 'a=10,b=20', ret: 'int' }] },
  { cat_zh: '基础语法', cat_en: 'Basic Syntax',
    zh: '链式调用', en: 'Fluent Chain', chain: [{ caller: 'App', callee: 'Builder', method: 'setName', params: 'n=foo', ret: 'Builder' }, { caller: 'Builder', callee: 'Builder', method: 'setAge', params: 'a=25', ret: 'Builder' }] },
  { cat_zh: '基础语法', cat_en: 'Basic Syntax',
    zh: '重载方法', en: 'Overloaded', chain: [{ caller: 'View', callee: 'Renderer', method: 'draw', params: 'mode=2d', ret: 'void' }] },
  { cat_zh: '基础语法', cat_en: 'Basic Syntax',
    zh: '运算符重载', en: 'Operator Overload', chain: [{ caller: 'App', callee: 'Vector', method: 'add', params: 'v2', ret: 'Vector' }] },
  { cat_zh: '基础语法', cat_en: 'Basic Syntax',
    zh: '模板方法', en: 'Template Method', chain: [{ caller: 'App', callee: 'Container', method: 'sort', params: 'cmp', ret: 'void' }] },
  { cat_zh: '基础语法', cat_en: 'Basic Syntax',
    zh: '默认参数', en: 'Default Args', chain: [{ caller: 'App', callee: 'Request', method: 'fetch', params: 'url=/,timeout=30', ret: 'Response' }] },

  // ── 2. 继承与多态 Inheritance & Polymorphism ─────────────────
  { cat_zh: '继承与多态', cat_en: 'Inheritance',
    zh: '虚函数调用', en: 'Virtual Call', chain: [{ caller: 'App', callee: 'Dog', method: 'speak', params: '', ret: 'void' }] },
  { cat_zh: '继承与多态', cat_en: 'Inheritance',
    zh: '接口实现', en: 'Interface Impl', chain: [{ caller: 'App', callee: 'MySQL', method: 'query', params: 'sql=SELECT', ret: 'ResultSet' }] },
  { cat_zh: '继承与多态', cat_en: 'Inheritance',
    zh: '抽象类', en: 'Abstract Class', chain: [{ caller: 'App', callee: 'PDFReport', method: 'generate', params: 'data', ret: 'void' }] },
  { cat_zh: '继承与多态', cat_en: 'Inheritance',
    zh: '纯虚函数', en: 'Pure Virtual', chain: [{ caller: 'App', callee: 'Circle', method: 'draw', params: '', ret: 'void' }] },
  { cat_zh: '继承与多态', cat_en: 'Inheritance',
    zh: '多重继承', en: 'Multiple Inherit', chain: [{ caller: 'App', callee: 'AmphibiousCar', method: 'drive', params: 'mode=land', ret: 'void' }] },
  { cat_zh: '继承与多态', cat_en: 'Inheritance',
    zh: '访问基类', en: 'Super Call', chain: [{ caller: 'Derived', callee: 'Base', method: 'init', params: '', ret: 'void' }] },
  { cat_zh: '继承与多态', cat_en: 'Inheritance',
    zh: 'RTTI/dynamic_cast', en: 'Dynamic Cast', chain: [{ caller: 'App', callee: 'TypeInfo', method: 'cast', params: 'ptr', ret: 'Derived*' }] },
  { cat_zh: '继承与多态', cat_en: 'Inheritance',
    zh: 'final 方法', en: 'Final Method', chain: [{ caller: 'App', callee: 'FinalClass', method: 'compute', params: 'n=42', ret: 'int' }] },
  { cat_zh: '继承与多态', cat_en: 'Inheritance',
    zh: '覆盖与隐藏', en: 'Override/Hide', chain: [{ caller: 'App', callee: 'Child', method: 'show', params: '', ret: 'void' }] },
  { cat_zh: '继承与多态', cat_en: 'Inheritance',
    zh: '委托构造', en: 'Delegating Ctor', chain: [{ caller: 'App', callee: 'Employee', method: 'Employee', params: 'name=Bob,id=7', ret: 'Employee' }] },

  // ── 3. 设计模式 Design Patterns ──────────────────────────
  { cat_zh: '设计模式', cat_en: 'Design Patterns',
    zh: '单例模式', en: 'Singleton', chain: [{ caller: 'App', callee: 'ConfigManager', method: 'getInstance', params: '', ret: 'ConfigManager' }] },
  { cat_zh: '设计模式', cat_en: 'Design Patterns',
    zh: '工厂模式', en: 'Factory', chain: [{ caller: 'App', callee: 'ShapeFactory', method: 'create', params: 'type=circle', ret: 'Shape' }] },
  { cat_zh: '设计模式', cat_en: 'Design Patterns',
    zh: '抽象工厂', en: 'AbstractFactory', chain: [{ caller: 'App', callee: 'GUIFactory', method: 'createButton', params: '', ret: 'Button' }] },
  { cat_zh: '设计模式', cat_en: 'Design Patterns',
    zh: '建造者模式', en: 'Builder', chain: [{ caller: 'App', callee: 'PizzaBuilder', method: 'addTopping', params: 't=cheese', ret: 'PizzaBuilder' }] },
  { cat_zh: '设计模式', cat_en: 'Design Patterns',
    zh: '观察者模式', en: 'Observer', chain: [{ caller: 'Subject', callee: 'Listener', method: 'update', params: 'event=click', ret: 'void' }] },
  { cat_zh: '设计模式', cat_en: 'Design Patterns',
    zh: '策略模式', en: 'Strategy', chain: [{ caller: 'Context', callee: 'QuickSort', method: 'sort', params: 'arr', ret: 'void' }] },
  { cat_zh: '设计模式', cat_en: 'Design Patterns',
    zh: '装饰器模式', en: 'Decorator', chain: [{ caller: 'App', callee: 'CompressionDecorator', method: 'write', params: 'data', ret: 'void' }] },
  { cat_zh: '设计模式', cat_en: 'Design Patterns',
    zh: '适配器模式', en: 'Adapter', chain: [{ caller: 'App', callee: 'USBAdapter', method: 'read', params: '', ret: 'byte' }] },
  { cat_zh: '设计模式', cat_en: 'Design Patterns',
    zh: '代理模式', en: 'Proxy', chain: [{ caller: 'App', callee: 'ImageProxy', method: 'display', params: '', ret: 'void' }] },
  { cat_zh: '设计模式', cat_en: 'Design Patterns',
    zh: '模板方法', en: 'Template Method', chain: [{ caller: 'App', callee: 'GameAI', method: 'buildStructures', params: '', ret: 'void' }] },

  // ── 4. 集合与容器 Collections ───────────────────────────
  { cat_zh: '集合与容器', cat_en: 'Collections',
    zh: 'List 添加', en: 'List Add', chain: [{ caller: 'App', callee: 'ArrayList', method: 'add', params: 'item=42', ret: 'bool' }] },
  { cat_zh: '集合与容器', cat_en: 'Collections',
    zh: 'Map 查询', en: 'Map Get', chain: [{ caller: 'App', callee: 'HashMap', method: 'get', params: 'key=user', ret: 'Value' }] },
  { cat_zh: '集合与容器', cat_en: 'Collections',
    zh: 'Set 查找', en: 'Set Contains', chain: [{ caller: 'App', callee: 'HashSet', method: 'contains', params: 'val=test', ret: 'bool' }] },
  { cat_zh: '集合与容器', cat_en: 'Collections',
    zh: '队列入队', en: 'Queue Push', chain: [{ caller: 'App', callee: 'Queue', method: 'enqueue', params: 'task=job1', ret: 'void' }] },
  { cat_zh: '集合与容器', cat_en: 'Collections',
    zh: '栈出栈', en: 'Stack Pop', chain: [{ caller: 'App', callee: 'Stack', method: 'pop', params: '', ret: 'Item' }] },
  { cat_zh: '集合与容器', cat_en: 'Collections',
    zh: '堆操作', en: 'Heap Push', chain: [{ caller: 'App', callee: 'PriorityQueue', method: 'push', params: 'item=5', ret: 'void' }] },
  { cat_zh: '集合与容器', cat_en: 'Collections',
    zh: '迭代器遍历', en: 'Iterator Next', chain: [{ caller: 'App', callee: 'Iterator', method: 'next', params: '', ret: 'Elem' }] },
  { cat_zh: '集合与容器', cat_en: 'Collections',
    zh: '排序容器', en: 'Sorted Insert', chain: [{ caller: 'App', callee: 'TreeSet', method: 'insert', params: 'val=7', ret: 'void' }] },
  { cat_zh: '集合与容器', cat_en: 'Collections',
    zh: '链表操作', en: 'LinkedList', chain: [{ caller: 'App', callee: 'LinkedList', method: 'remove', params: 'index=3', ret: 'Item' }] },
  { cat_zh: '集合与容器', cat_en: 'Collections',
    zh: '并发容器', en: 'ConcurrentMap', chain: [{ caller: 'App', callee: 'ConcurrentHashMap', method: 'putIfAbsent', params: 'k=lock,v=1', ret: 'Value' }] },

  // ── 5. I/O 与文件 IO & Files ──────────────────────────
  { cat_zh: 'I/O 与文件', cat_en: 'IO & Files',
    zh: '文件读取', en: 'File Read', chain: [{ caller: 'App', callee: 'FileReader', method: 'read', params: 'path=./data', ret: 'string' }] },
  { cat_zh: 'I/O 与文件', cat_en: 'IO & Files',
    zh: '文件写入', en: 'File Write', chain: [{ caller: 'App', callee: 'FileWriter', method: 'write', params: 'data=hello', ret: 'void' }] },
  { cat_zh: 'I/O 与文件', cat_en: 'IO & Files',
    zh: '缓冲流', en: 'Buffered Stream', chain: [{ caller: 'App', callee: 'BufferedReader', method: 'readLine', params: '', ret: 'string' }] },
  { cat_zh: 'I/O 与文件', cat_en: 'IO & Files',
    zh: '序列化', en: 'Serialize', chain: [{ caller: 'App', callee: 'ObjectOutputStream', method: 'writeObject', params: 'obj', ret: 'void' }] },
  { cat_zh: 'I/O 与文件', cat_en: 'IO & Files',
    zh: '文件复制', en: 'File Copy', chain: [{ caller: 'App', callee: 'Files', method: 'copy', params: 'from,to', ret: 'void' }] },
  { cat_zh: 'I/O 与文件', cat_en: 'IO & Files',
    zh: '压缩流', en: 'GZip Stream', chain: [{ caller: 'App', callee: 'GZipOutputStream', method: 'write', params: 'bytes', ret: 'void' }] },
  { cat_zh: 'I/O 与文件', cat_en: 'IO & Files',
    zh: 'XML 解析', en: 'XML Parse', chain: [{ caller: 'App', callee: 'XMLParser', method: 'parse', params: 'file=cfg', ret: 'Document' }] },
  { cat_zh: 'I/O 与文件', cat_en: 'IO & Files',
    zh: 'JSON 解析', en: 'JSON Parse', chain: [{ caller: 'App', callee: 'JSONParser', method: 'fromJson', params: 'str', ret: 'Object' }] },
  { cat_zh: 'I/O 与文件', cat_en: 'IO & Files',
    zh: 'CSV 处理', en: 'CSV Process', chain: [{ caller: 'App', callee: 'CSVReader', method: 'readRow', params: '', ret: 'string[]' }] },
  { cat_zh: 'I/O 与文件', cat_en: 'IO & Files',
    zh: '临时文件', en: 'Temp File', chain: [{ caller: 'App', callee: 'File', method: 'createTempFile', params: 'pfx,sfx', ret: 'File' }] },

  // ── 6. 网络编程 Networking ─────────────────────────────
  { cat_zh: '网络编程', cat_en: 'Networking',
    zh: 'HTTP GET', en: 'HTTP GET', chain: [{ caller: 'App', callee: 'HttpClient', method: 'get', params: 'url=/api', ret: 'Response' }] },
  { cat_zh: '网络编程', cat_en: 'Networking',
    zh: 'HTTP POST', en: 'HTTP POST', chain: [{ caller: 'App', callee: 'HttpClient', method: 'post', params: 'body=json', ret: 'Response' }] },
  { cat_zh: '网络编程', cat_en: 'Networking',
    zh: 'WebSocket', en: 'WebSocket', chain: [{ caller: 'App', callee: 'WebSocket', method: 'send', params: 'msg', ret: 'void' }] },
  { cat_zh: '网络编程', cat_en: 'Networking',
    zh: 'TCP Socket', en: 'TCP Socket', chain: [{ caller: 'App', callee: 'Socket', method: 'connect', params: 'host,port', ret: 'void' }] },
  { cat_zh: '网络编程', cat_en: 'Networking',
    zh: 'UDP 发送', en: 'UDP Send', chain: [{ caller: 'App', callee: 'DatagramSocket', method: 'send', params: 'packet', ret: 'void' }] },
  { cat_zh: '网络编程', cat_en: 'Networking',
    zh: 'DNS 解析', en: 'DNS Resolve', chain: [{ caller: 'App', callee: 'InetAddress', method: 'getByName', params: 'host=example', ret: 'InetAddress' }] },
  { cat_zh: '网络编程', cat_en: 'Networking',
    zh: 'SSL 握手', en: 'SSL Handshake', chain: [{ caller: 'App', callee: 'SSLSocket', method: 'startHandshake', params: '', ret: 'void' }] },
  { cat_zh: '网络编程', cat_en: 'Networking',
    zh: 'gRPC 调用', en: 'gRPC Call', chain: [{ caller: 'App', callee: 'GreeterClient', method: 'sayHello', params: 'name=World', ret: 'Reply' }] },
  { cat_zh: '网络编程', cat_en: 'Networking',
    zh: 'REST 客户端', en: 'REST Client', chain: [{ caller: 'App', callee: 'RestTemplate', method: 'exchange', params: 'url,method', ret: 'ResponseEntity' }] },
  { cat_zh: '网络编程', cat_en: 'Networking',
    zh: 'MQ 发送', en: 'MQ Send', chain: [{ caller: 'App', callee: 'MessageQueue', method: 'publish', params: 'topic=order,msg', ret: 'void' }] },

  // ── 7. 并发编程 Concurrency ──────────────────────────
  { cat_zh: '并发编程', cat_en: 'Concurrency',
    zh: '线程启动', en: 'Thread Start', chain: [{ caller: 'App', callee: 'Worker', method: 'start', params: '', ret: 'void' }] },
  { cat_zh: '并发编程', cat_en: 'Concurrency',
    zh: '加锁', en: 'Mutex Lock', chain: [{ caller: 'App', callee: 'Mutex', method: 'lock', params: '', ret: 'void' }] },
  { cat_zh: '并发编程', cat_en: 'Concurrency',
    zh: '条件等待', en: 'Cond Wait', chain: [{ caller: 'App', callee: 'ConditionVariable', method: 'wait', params: 'lock', ret: 'void' }] },
  { cat_zh: '并发编程', cat_en: 'Concurrency',
    zh: '信号量', en: 'Semaphore', chain: [{ caller: 'App', callee: 'Semaphore', method: 'acquire', params: 'permits=1', ret: 'void' }] },
  { cat_zh: '并发编程', cat_en: 'Concurrency',
    zh: 'Future 获取', en: 'Future Get', chain: [{ caller: 'App', callee: 'Future', method: 'get', params: '', ret: 'Result' }] },
  { cat_zh: '并发编程', cat_en: 'Concurrency',
    zh: '线程池提交', en: 'Executor Submit', chain: [{ caller: 'App', callee: 'ThreadPool', method: 'submit', params: 'task', ret: 'Future' }] },
  { cat_zh: '并发编程', cat_en: 'Concurrency',
    zh: '原子操作', en: 'Atomic CAS', chain: [{ caller: 'App', callee: 'AtomicInt', method: 'compareAndSet', params: 'expect=0,update=1', ret: 'bool' }] },
  { cat_zh: '并发编程', cat_en: 'Concurrency',
    zh: '读锁', en: 'Read Lock', chain: [{ caller: 'App', callee: 'RWLock', method: 'readLock', params: '', ret: 'void' }] },
  { cat_zh: '并发编程', cat_en: 'Concurrency',
    zh: '屏障', en: 'Barrier', chain: [{ caller: 'App', callee: 'Barrier', method: 'await', params: '', ret: 'void' }] },
  { cat_zh: '并发编程', cat_en: 'Concurrency',
    zh: '协程启动', en: 'Coroutine Launch', chain: [{ caller: 'App', callee: 'Coroutine', method: 'launch', params: '', ret: 'Job' }] },

  // ── 8. 数据库 Database ──────────────────────────────
  { cat_zh: '数据库', cat_en: 'Database',
    zh: '打开连接', en: 'Open Connection', chain: [{ caller: 'App', callee: 'DriverManager', method: 'getConnection', params: 'url=jdbc:...', ret: 'Connection' }] },
  { cat_zh: '数据库', cat_en: 'Database',
    zh: '执行查询', en: 'Execute Query', chain: [{ caller: 'App', callee: 'Statement', method: 'executeQuery', params: 'sql=SELECT', ret: 'ResultSet' }] },
  { cat_zh: '数据库', cat_en: 'Database',
    zh: '预编译语句', en: 'PreparedStmt', chain: [{ caller: 'App', callee: 'PreparedStatement', method: 'setInt', params: 'idx=1,val=42', ret: 'void' }] },
  { cat_zh: '数据库', cat_en: 'Database',
    zh: '事务提交', en: 'Commit', chain: [{ caller: 'App', callee: 'Connection', method: 'commit', params: '', ret: 'void' }] },
  { cat_zh: '数据库', cat_en: 'Database',
    zh: 'ORM 保存', en: 'ORM Save', chain: [{ caller: 'App', callee: 'EntityManager', method: 'persist', params: 'entity', ret: 'void' }] },
  { cat_zh: '数据库', cat_en: 'Database',
    zh: 'ORM 查询', en: 'ORM Query', chain: [{ caller: 'App', callee: 'EntityManager', method: 'find', params: 'cls,id=1', ret: 'Entity' }] },
  { cat_zh: '数据库', cat_en: 'Database',
    zh: '存储过程', en: 'Stored Proc', chain: [{ caller: 'App', callee: 'CallableStatement', method: 'execute', params: '', ret: 'void' }] },
  { cat_zh: '数据库', cat_en: 'Database',
    zh: '批量插入', en: 'Batch Insert', chain: [{ caller: 'App', callee: 'Statement', method: 'addBatch', params: 'sql', ret: 'void' }] },
  { cat_zh: '数据库', cat_en: 'Database',
    zh: '连接池获取', en: 'Pool GetConn', chain: [{ caller: 'App', callee: 'DataSource', method: 'getConnection', params: '', ret: 'Connection' }] },
  { cat_zh: '数据库', cat_en: 'Database',
    zh: '迁移脚本', en: 'Migration Up', chain: [{ caller: 'App', callee: 'Migrator', method: 'migrate', params: 'version=3', ret: 'void' }] },

  // ── 9. 框架调用 Framework ────────────────────────────
  { cat_zh: '框架调用', cat_en: 'Framework',
    zh: 'React setState', en: 'React setState', chain: [{ caller: 'Component', callee: 'React', method: 'setState', params: 'count=1', ret: 'void' }] },
  { cat_zh: '框架调用', cat_en: 'Framework',
    zh: 'Vue reactive', en: 'Vue reactive', chain: [{ caller: 'App', callee: 'Vue', method: 'reactive', params: 'data', ret: 'Proxy' }] },
  { cat_zh: '框架调用', cat_en: 'Framework',
    zh: 'Spring DI', en: 'Spring DI', chain: [{ caller: 'Container', callee: 'BeanFactory', method: 'getBean', params: 'name=service', ret: 'Object' }] },
  { cat_zh: '框架调用', cat_en: 'Framework',
    zh: 'Express 路由', en: 'Express Route', chain: [{ caller: 'App', callee: 'Router', method: 'get', params: 'path=/', ret: 'void' }] },
  { cat_zh: '框架调用', cat_en: 'Framework',
    zh: 'Flask 渲染', en: 'Flask Render', chain: [{ caller: 'App', callee: 'Flask', method: 'render_template', params: 'tpl=index', ret: 'string' }] },
  { cat_zh: '框架调用', cat_en: 'Framework',
    zh: 'MyBatis Mapper', en: 'MyBatis Mapper', chain: [{ caller: 'App', callee: 'UserMapper', method: 'selectById', params: 'id=1', ret: 'User' }] },
  { cat_zh: '框架调用', cat_en: 'Framework',
    zh: 'Angular inject', en: 'Angular inject', chain: [{ caller: 'App', callee: 'Injector', method: 'get', params: 'token=HttpClient', ret: 'Service' }] },
  { cat_zh: '框架调用', cat_en: 'Framework',
    zh: 'Django ORM', en: 'Django ORM', chain: [{ caller: 'App', callee: 'QuerySet', method: 'filter', params: 'name=alice', ret: 'QuerySet' }] },
  { cat_zh: '框架调用', cat_en: 'Framework',
    zh: 'Redis 缓存', en: 'Redis Cache', chain: [{ caller: 'App', callee: 'RedisClient', method: 'get', params: 'key=cache:user', ret: 'string' }] },
  { cat_zh: '框架调用', cat_en: 'Framework',
    zh: 'gRPC 服务端', en: 'gRPC Server', chain: [{ caller: 'App', callee: 'ServerBuilder', method: 'addService', params: 'svc', ret: 'ServerBuilder' }] },

  // ── 10. 底层系统 Low-Level Systems ───────────────────
  { cat_zh: '底层系统', cat_en: 'Low-Level',
    zh: '系统调用 read', en: 'Syscall read', chain: [{ caller: 'App', callee: 'OS', method: 'read', params: 'fd=3,buf,count=1024', ret: 'ssize_t' }] },
  { cat_zh: '底层系统', cat_en: 'Low-Level',
    zh: '系统调用 write', en: 'Syscall write', chain: [{ caller: 'App', callee: 'OS', method: 'write', params: 'fd=1,msg,len', ret: 'ssize_t' }] },
  { cat_zh: '底层系统', cat_en: 'Low-Level',
    zh: '内存分配 malloc', en: 'malloc', chain: [{ caller: 'App', callee: 'HeapAllocator', method: 'alloc', params: 'size=256', ret: 'void*' }] },
  { cat_zh: '底层系统', cat_en: 'Low-Level',
    zh: '内存释放 free', en: 'free', chain: [{ caller: 'App', callee: 'HeapAllocator', method: 'dealloc', params: 'ptr', ret: 'void' }] },
  { cat_zh: '底层系统', cat_en: 'Low-Level',
    zh: 'mmap 映射', en: 'mmap', chain: [{ caller: 'App', callee: 'OS', method: 'mmap', params: 'addr,len,prot', ret: 'void*' }] },
  { cat_zh: '底层系统', cat_en: 'Low-Level',
    zh: 'ioctl 设备', en: 'ioctl', chain: [{ caller: 'App', callee: 'DeviceDriver', method: 'ioctl', params: 'req=LED_ON', ret: 'int' }] },
  { cat_zh: '底层系统', cat_en: 'Low-Level',
    zh: 'epoll 等待', en: 'epoll wait', chain: [{ caller: 'App', callee: 'Epoll', method: 'wait', params: 'events,timeout=100', ret: 'int' }] },
  { cat_zh: '底层系统', cat_en: 'Low-Level',
    zh: '信号处理', en: 'Signal Handler', chain: [{ caller: 'App', callee: 'Signal', method: 'handle', params: 'sig=SIGINT', ret: 'void' }] },
  { cat_zh: '底层系统', cat_en: 'Low-Level',
    zh: 'DMA 配置', en: 'DMA Config', chain: [{ caller: 'CPU', callee: 'DMA', method: 'configure', params: 'desc', ret: 'void' }] },
  { cat_zh: '底层系统', cat_en: 'Low-Level',
    zh: '中断向量', en: 'Interrupt Vec', chain: [{ caller: 'CPU', callee: 'IDT', method: 'register', params: 'irq=3,handler', ret: 'void' }] },
]

const STATIC_EXAMPLES = CATEGORIES.map((e, i) => ({
  label_zh: e.zh, label_en: e.en, chain: e.chain,
  code: e.chain.map((c, ci) => `// [${e.cat_zh}] ${c.caller} → ${c.callee}.${c.method}(${c.params})
class ${c.callee} {
public:
    ${c.ret} ${c.method}(${c.params}) { /* impl */ }
};
${ci === 0 ? `\nclass ${c.caller} {\n    ${c.callee} impl;\npublic:\n    void run() { impl.${c.method}(${c.params.split('=')[0] || 'val'}); }\n};\n` : ''}`).join('\n'),
}))

interface ChainCall {
  caller: string
  callee: string
  method: string
  params: string
  ret: string
}

function generateCode(chain: ChainCall[]): string {
  return chain.map((c, i) => `// Call ${i + 1}: ${c.caller} → ${c.callee}.${c.method}(${c.params})
${c.callee}::${c.method}() called by ${c.caller}`).join('\n')
}

function generateSteps(chain: ChainCall[], offset: number = 0, isLast: boolean = true): BusStep[] {
  const steps: BusStep[] = []
  chain.forEach((call, ci) => {
    const idx = ci + offset
    const paramVal = call.params.includes('=') ? call.params.split('=')[1].trim() : call.params.split(',')[0].trim() || 'x'
    const paramName = call.params.split('=')[0].trim() || 'x'
    steps.push(
      { addr: '—', ctrl: '—', data: '—', desc_zh: `初始：${call.caller} 准备调用`, desc_en: `Idle: ${call.caller} preparing call`, highlightLine: -1, movingData: [], state: { phase: 'idle' }, stack: [{ pc: '0x4000', desc: `main(): calling ${call.callee}::${call.method}` }] },
      { addr: `&${call.callee}+${call.method}_off`, ctrl: 'REQUEST', data: '—', desc_zh: `① 地址总线选 ${call.callee}::${call.method}`, desc_en: `① Addr bus selects ${call.callee}::${call.method}`, highlightLine: idx * 2 + 1, movingData: [{ from: ci === 0 ? 0 : ci + 1, to: 99, label: `&${call.method}`, bus: 'addr' }], state: { phase: 'addr' }, stack: [{ pc: '0x4004', desc: `-> ${call.callee}::${call.method}` }] },
      { addr: `&${call.callee}+${call.method}_off`, ctrl: 'WRITE', data: `${call.params}`, desc_zh: `② 数据总线写参数 ${call.params}`, desc_en: `② Data bus: ${call.params}`, highlightLine: idx * 2 + 1, movingData: [
        { from: ci === 0 ? 0 : ci + 1, to: 99, label: 'WRITE', bus: 'ctrl' },
        { from: ci === 0 ? 0 : ci + 1, to: 99, label: `${call.params.replace(/^.*=/, '')}`, bus: 'data' },
      ], state: { phase: 'write', [paramName]: paramVal }, stack: [{ pc: '0x4004', desc: `-> ${call.callee}::${call.method}` }] },
      { addr: '—', ctrl: 'EXEC', data: '—', desc_zh: `③ ${call.callee} 内部执行`, desc_en: `③ ${call.callee} executes`, highlightLine: idx * 2 + 2, movingData: [
        { from: 99, to: ci + 1, label: `&${call.method}`, bus: 'addr' },
        { from: 99, to: ci + 1, label: 'WRITE', bus: 'ctrl' },
        { from: 99, to: ci + 1, label: paramVal, bus: 'data' },
      ], state: { phase: 'exec', result: call.ret !== 'void' ? '↻' : '✓' }, stack: [{ pc: '0x4' + (idx + 2).toString(16), desc: `inside ${call.callee}::${call.method}` }] },
    )
    if (ci < chain.length - 1) {
      steps.push(
        { addr: '—', ctrl: 'DONE', data: '—', desc_zh: `${call.callee} 完成 → 调用 ${chain[ci + 1].callee}`, desc_en: `${call.callee} done → calls ${chain[ci + 1].callee}`, highlightLine: -1, movingData: [{ from: ci + 1, to: 99, label: 'DONE', bus: 'ctrl' }], state: { phase: 'done' }, stack: [{ pc: '0x4' + (idx + 3).toString(16), desc: `back to ${call.caller}, now calling ${chain[ci + 1].callee}` }] },
      )
    }
  })
  if (chain.length > 0) {
    const last = chain[chain.length - 1]
    steps.push(
      { addr: '—', ctrl: 'DONE', data: last.ret !== 'void' ? 'result' : 'void', desc_zh: `④ 最终完成，${last.ret !== 'void' ? '返回值通过数据总线返回' : '方法返回'}`, desc_en: `④ Final done${last.ret !== 'void' ? ', return via data bus' : ''}`, highlightLine: -1, movingData: [
        { from: chain.length, to: 99, label: last.ret !== 'void' ? 'result' : 'DONE', bus: 'ctrl' },
        { from: chain.length, to: 0, label: last.ret !== 'void' ? 'result' : '', bus: 'data' },
      ], state: { phase: 'complete' }, stack: [] },
    )
  }
  return steps
}

function ChipModule({ name, sub, x, y, active, color, side, state: chipState, memLayout }: { name: string; sub: string; x: number; y: number; active: boolean; color: string; side: 'caller' | 'callee' | 'mid'; state?: Record<string, string>; memLayout?: { offset: string; field: string; value: string; active: boolean }[] }) {
  const stateEntries = chipState ? Object.entries(chipState) : []
  const useLayout = memLayout && memLayout.length > 0
  const chipH = useLayout ? 80 + memLayout!.length * 12 : 76
  return (
    <g>
      <rect x={x} y={y} width={120} height={chipH} rx={4} fill="#1a2332" stroke={active ? color : '#334'} strokeWidth={1.5} />
      <path d={`M${x+40} ${y} L${x+50} ${y-6} L${x+70} ${y-6} L${x+80} ${y} Z`} fill="#1a2332" stroke={active ? color : '#334'} strokeWidth={1} />
      <circle cx={x+16} cy={y+6} r={3} fill={active ? color : '#334'} />
      <text x={x+60} y={y+18} textAnchor="middle" fill={active ? '#e6edf3' : '#667'} fontSize={10} fontWeight="bold" fontFamily="monospace">{name}</text>
      <text x={x+60} y={y+32} textAnchor="middle" fill={active ? '#8899aa' : '#445'} fontSize={8} fontFamily="monospace">{sub}</text>
      {useLayout ? (
        <g transform={`translate(${x + 4}, ${y + 44})`}>
          <line x1={0} y1={0} x2={112} y2={0} stroke={active ? color + '40' : '#222'} strokeWidth={0.5} />
          {memLayout!.map((ml, i) => (
            <g key={i} transform={`translate(0, ${4 + i * 12})`}>
              <rect x={0} y={0} width={112} height={11} rx={1} fill={ml.active ? color + '25' : 'transparent'} />
              <text x={4} y={9} fill={ml.active ? color : '#555'} fontSize={6.5} fontFamily="monospace">{ml.offset}</text>
              <text x={44} y={9} fill={ml.active ? '#e6edf3' : '#445'} fontSize={6.5} fontFamily="monospace">{ml.field}</text>
              <text x={90} y={9} fill={ml.active ? color : '#333'} fontSize={6.5} fontFamily="monospace" textAnchor="end">{ml.value}</text>
            </g>
          ))}
        </g>
      ) : stateEntries.length > 0 ? (
        <g>
          <line x1={x + 4} y1={y + 46} x2={x + 116} y2={y + 46} stroke={active ? color + '40' : '#222'} strokeWidth={0.5} />
          {stateEntries.slice(0, 4).map(([k, v], i) => (
            <text key={i} x={x + 8} y={y + 58 + i * 8} fill={active ? '#8b949e' : '#334'} fontSize={6.5} fontFamily="monospace">{k}={v}</text>
          ))}
        </g>
      ) : null}
    </g>
  )
}

function BusValueLabel({ bus, label, color, active, hex }: { bus: string; label: string; color: string; active: boolean; hex?: string }) {
  const labelText = `${bus} = ${label}`
  return active ? (
    <g>
      <rect x={100} y={-7} width={Math.min((hex ? labelText.length * 7.5 : labelText.length * 6.5) + 18, 400)} height={16} rx={3} fill="#0d1117" stroke={color} strokeWidth={1.5} />
      <text x={107} y={5} fill={color} fontSize={9} fontWeight="bold" fontFamily="monospace">{labelText}</text>
      {hex && <text x={107} y={15} fill={color} fontSize={6} fontFamily="monospace" opacity={0.6}>{hex}</text>}
      <line x1={90} y1={0} x2={100} y2={0} stroke={color} strokeWidth={1} />
      <circle cx={88} cy={0} r={3} fill={color} />
    </g>
  ) : null
}

function MovingDot({ progress, fromX, toX, y, color, label }: { progress: number; fromX: number; toX: number; y: number; color: string; label: string }) {
  const x = fromX + (toX - fromX) * progress
  const alpha = Math.sin(progress * Math.PI)
  return (
    <g>
      <circle cx={x} cy={y} r={5} fill={color} opacity={alpha * 0.8} />
      <text x={x} y={y - 12} textAnchor="middle" fill={color} fontSize={8} fontWeight="bold" fontFamily="monospace" opacity={alpha}>{label}</text>
      <circle cx={x} cy={y} r={10} fill={color} opacity={alpha * 0.15} />
    </g>
  )
}

function Waveform({ steps, curStep }: { steps: BusStep[]; curStep: number }) {
  const w = Math.max(60, 360 / steps.length)
  return (
    <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', height: 52, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)', background: '#0d1117' }}>
      {steps.map((st, i) => {
        const isCur = i === curStep
        return (
          <div key={i} style={{
            flex: '0 0 ' + w + 'px', display: 'flex', flexDirection: 'column', gap: 1,
            borderRight: '1px solid ' + (isCur ? '#fff' : '#161b22'),
            background: isCur ? '#1a2332' : 'transparent', padding: '2px 1px',
          }}>
            {(['addr', 'ctrl', 'data'] as BusType[]).map(b => {
              const on = st[b] !== '—'
              return (
                <div key={b} style={{ flex: 1, borderRadius: 2, background: on ? BUS_COLORS[b] : 'transparent', minHeight: on ? undefined : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px', transition: 'all 0.3s' }}>
                  {on && <span style={{ fontSize: 6.5, color: '#000', fontWeight: 'bold', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{st[b]}</span>}
                </div>
              )
            })}
            <div style={{ textAlign: 'center', fontSize: 6.5, color: isCur ? '#fff' : '#445', fontFamily: 'monospace', marginTop: 1 }}>{i + 1}</div>
          </div>
        )
      })}
    </div>
  )
}

function CallStack({ frames }: { frames: { pc: string; desc: string }[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 2, minHeight: 60 }}>
      {frames.length === 0 && <div style={{ fontSize: 9, color: '#445', fontFamily: 'monospace', padding: 4 }}>empty</div>}
      {frames.map((f, i) => (
        <div key={i} style={{
          padding: '4px 6px', borderRadius: 3, background: '#1a2332', border: '1px solid #334',
          borderLeft: '3px solid #4d8fff', fontSize: 9, fontFamily: 'monospace',
        }}>
          <div style={{ color: '#ff7b72' }}>{f.pc}</div>
          <div style={{ color: '#8b949e', fontSize: 8 }}>{f.desc}</div>
        </div>
      ))}
    </div>
  )
}

function analyzePastedCode(code: string): ChainCall[] {
  const calls: ChainCall[] = []
  const classNames: string[] = []
  const classRe = /(?:class|struct|interface|type\s+\w+\s+struct)\s+(\w+)/g
  let m: RegExpExecArray | null
  while ((m = classRe.exec(code)) !== null) classNames.push(m[1])

  const patterns = [
    /(\w+)\.(\w+)\s*\(([^)]*)\)\s*;/g,
    /this\.(\w+)\s*\(([^)]*)\)/g,
    /self\.(\w+)\s*\(([^)]*)\)/g,
    /(\w+)::(\w+)\s*\(([^)]*)\)/g,
    /(\w+)\.(\w+)\s*\(([^)]*)\)\s*(?:\.await|$)/g,
    /(\w+)\s*=\s*(\w+)\.(\w+)\s*\(([^)]*)\)/g,
    /(\w+)\.(\w+)\(([^)]*)\)\s*\{/g,
  ]
  const seen = new Set<string>()
  for (const re of patterns) {
    while ((m = re.exec(code)) !== null) {
      const obj = m[1], method = m[2], args = m[3]?.trim() || ''
      let callee = method.charAt(0).toUpperCase() + method.slice(1)
      for (const cls of classNames) { if (cls.toLowerCase() === callee.toLowerCase()) { callee = cls; break } }
      const key = `${obj}.${method}`
      if (seen.has(key)) continue
      seen.add(key)
      let ret = 'void'
      const mr = new RegExp(`(\\w+)\\s+${method}\\s*\\(`, 'g')
      let rm: RegExpExecArray | null
      while ((rm = mr.exec(code)) !== null) { const r = rm[1]; if (!['override', 'virtual', 'static', 'const', 'async'].includes(r)) ret = r; break }
      if (method === 'main') continue
      if (ret !== 'void' && ret === callee) ret = 'auto'
      const caller = classNames.find(c => code.indexOf(`class ${c}`) < (m!.index)) || 'Caller'
      calls.push({ caller: caller === 'Caller' ? obj : caller, callee, method, params: args || 'x', ret })
      if (calls.length >= 5) break
    }
    if (calls.length >= 5) break
  }
  return calls
}

function hexVal(s: string): string { const n = parseInt(s.replace(/[^0-9a-fx]/gi, '')); return isNaN(n) ? '' : `hex=0x${n.toString(16)} bin=0b${n.toString(2)}` }

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
  const animRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null)
  const startTimeRef = useRef<number>(0)

  const [cuCaller, setCuCaller] = useState('App')
  const [cuCallee, setCuCallee] = useState('Service')
  const [cuParams, setCuParams] = useState('x=42')
  const [cuReturn, setCuReturn] = useState('void')
  const [cuChain, setCuChain] = useState<ChainCall[]>([{ caller: 'App', callee: 'Service', method: 'execute', params: 'x=42', ret: 'void' }])

  const [pasteCode, setPasteCode] = useState('')
  const [detectedCalls, setDetectedCalls] = useState<ChainCall[]>([])
  const [selectedDetected, setSelectedDetected] = useState(0)
  const [cuMode, setCuMode] = useState<'form' | 'paste'>('form')

  const [shareUrl, setShareUrl] = useState('')

  useEffect(() => {
    try {
      const h = window.location.hash.slice(1)
      if (h) {
        const d = JSON.parse(decodeURIComponent(h))
        if (d.chain) { setCuChain(d.chain); setExIdx(-1); setCuMode('form') }
      }
    } catch {}
  }, [])

  const isStatic = exIdx >= 0 && exIdx < STATIC_EXAMPLES.length
  const staticEx = isStatic ? STATIC_EXAMPLES[exIdx] : null
  const chain = isStatic ? staticEx!.chain : cuChain
  const codeStr = isStatic ? staticEx!.code : generateCode(chain)
  const allSteps = generateSteps(chain, 0, true)
  const s = allSteps[step % allSteps.length]

  const currentStack = s?.stack || []

  const memLayout = showMem && chain.length > 0 ? chain[chain.length - 1] ? [
    { offset: '+0x00', field: 'vtable_ptr', value: '0x' + (step * 4).toString(16), active: s?.addr?.includes('vtable') || false },
    { offset: '+0x04', field: 'field_a', value: '0x42', active: false },
    { offset: '+0x08', field: 'field_b', value: '0x7f', active: false },
  ] : [] : undefined

  const nextStep = useCallback(() => { setStep(s => (s + 1) % allSteps.length); setAnimProgress(0) }, [allSteps.length])
  useEffect(() => {
    if (playing && step < allSteps.length) {
      const animate = (ts: number) => {
        if (!startTimeRef.current) startTimeRef.current = ts
        const elapsed = ts - startTimeRef.current
        const p = Math.min(elapsed / (1400 / speed), 1)
        setAnimProgress(p)
        if (p < 1) { animRef.current = requestAnimationFrame(animate) }
        else {
          startTimeRef.current = 0
          const next = (step + 1) % allSteps.length
          if (next === 0) { setPlaying(false); return }
          setAnimProgress(0); setStep(next)
        }
      }
      animRef.current = requestAnimationFrame(animate)
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [playing, step, allSteps.length, speed])

  const togglePlay = () => {
    if (!playing) { if (step >= allSteps.length - 1) { setStep(0); setAnimProgress(0) }; setPlaying(true); startTimeRef.current = 0 }
    else { setPlaying(false); if (animRef.current) cancelAnimationFrame(animRef.current) }
  }
  const reset = () => { setPlaying(false); setStep(0); setAnimProgress(0); if (animRef.current) cancelAnimationFrame(animRef.current) }

  const codeLines = codeStr.split('\n')
  const busY = { addr: 200, ctrl: 230, data: 260 }
  const chipSpacing = 140
  const startX = 20
  const numChips = chain.length + 1

  const share = () => {
    const data = JSON.stringify({ chain })
    window.location.hash = encodeURIComponent(data)
    setShareUrl(window.location.href)
    navigator.clipboard.writeText(window.location.href).catch(() => {})
  }

  const updateChain = () => {
    const calls: ChainCall[] = []
    for (let i = 0; i < chain.length; i++) {
      calls.push({ caller: i === 0 ? cuCaller : chain[i - 1].callee, callee: i === chain.length - 1 ? cuCallee : chain[i + 1].caller, method: 'execute', params: cuParams, ret: cuReturn })
    }
    if (calls.length === 0) calls.push({ caller: cuCaller, callee: cuCallee, method: 'execute', params: cuParams, ret: cuReturn })
    setCuChain(calls)
  }

  const movingData = s.movingData || []

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 12, gap: 8, overflow: 'auto' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
          {isZh ? '🔌 对象总线分析器' : '🔌 Object Bus Analyzer'}
        </span>
        <select value={exIdx} onChange={e => { setExIdx(+e.target.value); reset() }}
          style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12 }}>
          <option value={-1}>{isZh ? '🔧 自定义' : '🔧 Custom'}</option>
          <option value={-2}>{isZh ? '📋 粘贴代码' : '📋 Paste Code'}</option>
          {STATIC_EXAMPLES.map((e, i) => (
            <option key={i} value={i}>{isZh ? e.label_zh : e.label_en}</option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
          <input type="checkbox" checked={showHex} onChange={e => setShowHex(e.target.checked)} /> HEX
        </label>
        <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
          <input type="checkbox" checked={showMem} onChange={e => setShowMem(e.target.checked)} /> MEM
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{speed}x</span>
          <input type="range" min={1} max={5} value={speed} onChange={e => setSpeed(+e.target.value)} style={{ width: 50, accentColor: '#4d8fff' }} />
        </div>
        <button onClick={share} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 10 }}>
          🔗 {isZh ? '分享' : 'Share'}
        </button>
        <button onClick={reset} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>
          ⏹ {isZh ? '重置' : 'Reset'}
        </button>
        <button onClick={nextStep} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>
          ⏭ {isZh ? '单步' : 'Step'}
        </button>
        <button onClick={togglePlay} style={{ padding: '6px 18px', borderRadius: 6, border: 'none', background: playing ? '#ff7b72' : '#56d364', color: '#000', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
          {playing ? '⏸ ' + (isZh ? '暂停' : 'Pause') : '▶ ' + (isZh ? '播放' : 'Play')}
        </button>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{step + 1}/{allSteps.length}</div>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 10, minHeight: 0 }}>
        <div style={{ flex: '0 0 28%', overflow: 'auto', borderRadius: 8, border: '1px solid var(--border)', background: '#0d1117' }}>
          {exIdx === -1 ? (
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8b949e' }}>{isZh ? '函数调用链' : 'Call Chain'}</div>
              {chain.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: '#4d8fff', fontFamily: 'monospace' }}>{c.caller}</span>
                  <span style={{ fontSize: 8, color: '#445' }}>→</span>
                  <span style={{ fontSize: 10, color: '#d2a8ff', fontFamily: 'monospace' }}>{c.callee}</span>
                  <span style={{ fontSize: 8, color: '#8b949e', fontFamily: 'monospace' }}>.{c.method}()</span>
                </div>
              ))}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {[
                  { label: isZh ? '调用方' : 'Caller', val: cuCaller, set: setCuCaller },
                  { label: isZh ? '被调用方' : 'Callee', val: cuCallee, set: setCuCallee },
                  { label: isZh ? '参数' : 'Params', val: cuParams, set: setCuParams, hint: 'speed=3000' },
                  { label: isZh ? '返回' : 'Return', val: cuReturn, set: setCuReturn, hint: 'void / int' },
                ].map(f => (
                  <div key={f.label} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: 9, color: '#8b949e', width: 50, flexShrink: 0 }}>{f.label}</span>
                    <input value={f.val} onChange={e => { f.set(e.target.value); setTimeout(updateChain, 0); reset() }}
                      style={{ flex: 1, padding: '4px 6px', borderRadius: 4, border: '1px solid var(--border)', background: '#161b22', color: '#e6edf3', fontSize: 11, fontFamily: 'monospace', outline: 'none' }} />
                  </div>
                ))}
              </div>
            </div>
          ) : exIdx === -2 ? (
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <textarea value={pasteCode} onChange={e => setPasteCode(e.target.value)}
                placeholder={isZh ? '粘贴 C++ / Java / Python / Go / TS 代码...' : 'Paste C++ / Java / Python / Go / TS code...'}
                style={{ width: '100%', minHeight: 180, padding: 8, borderRadius: 4, border: '1px solid var(--border)', background: '#161b22', color: '#e6edf3', fontSize: 11, fontFamily: 'monospace', resize: 'vertical', outline: 'none', lineHeight: 1.5 }} />
              <button onClick={() => { const r = analyzePastedCode(pasteCode); setDetectedCalls(r); setSelectedDetected(0); if (r.length > 0) setCuChain(r); reset() }}
                style={{ padding: '6px 0', borderRadius: 4, border: 'none', background: '#238636', color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                {isZh ? '🔍 分析代码' : '🔍 Analyze'}
              </button>
              {detectedCalls.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 10, color: '#8b949e' }}>{isZh ? '检测到 ' + detectedCalls.length + ' 个调用' : detectedCalls.length + ' calls'}</span>
                  <select value={selectedDetected} onChange={e => { setSelectedDetected(+e.target.value); setCuChain(detectedCalls.slice(+e.target.value)); reset() }}
                    style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)', background: '#161b22', color: '#e6edf3', fontSize: 11 }}>
                    {detectedCalls.map((c, i) => (
                      <option key={i} value={i}>{c.caller}.{c.method}({c.params}) → {c.callee} : {c.ret}</option>
                    ))}
                  </select>
                </div>
              )}
              {detectedCalls.length === 0 && pasteCode.trim() && (
                <div style={{ fontSize: 10, color: '#ff7b72' }}>{isZh ? '未检测到方法调用' : 'No calls detected'}</div>
              )}
            </div>
          ) : (
            <>
              <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: '#8b949e' }}>
                {isZh ? '代码 (Caller 视角)' : 'Code (Caller View)'}
              </div>
              <pre style={{ margin: 0, padding: 10, fontSize: 11.5, lineHeight: 1.6, fontFamily: "'SF Mono','Fira Code',monospace", overflow: 'auto' }}>
                {codeLines.map((line, i) => (
                  <div key={i} style={{ background: s.highlightLine === i + 1 ? 'rgba(255,123,114,0.12)' : 'transparent', borderLeft: s.highlightLine === i + 1 ? '3px solid #ff7b72' : '3px solid transparent', paddingLeft: 8, transition: 'all 0.3s' }}>
                    <span style={{ color: '#484f58', marginRight: 12, userSelect: 'none', fontSize: 10 }}>{i + 1}</span>
                    <span style={{ color: '#e6edf3' }}>{line}</span>
                  </div>
                ))}
              </pre>
            </>
          )}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <div style={{ flex: 1, borderRadius: 8, border: '1px solid var(--border)', background: '#0d1117', overflow: 'hidden', display: 'flex' }}>
            <svg viewBox={`0 0 ${Math.max(600, numChips * chipSpacing + 80)} 340`} style={{ width: '100%', height: '100%', display: 'block', flex: 1 }}>
              <defs>
                <pattern id="pcbGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#161b22" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width={Math.max(600, numChips * chipSpacing + 80)} height={340} fill="#0d1117" />
              <rect width={Math.max(600, numChips * chipSpacing + 80)} height={340} fill="url(#pcbGrid)" />

              {chain.map((c, i) => (
                <ChipModule key={i} name={c.callee} sub={isZh ? `(#${i + 1})` : `(#${i + 1})`}
                  x={startX + (i + 1) * chipSpacing} y={80}
                  active={movingData.some(d => d.to === i + 1 || d.from === i + 1)}
                  color={[BUS_COLORS.addr, BUS_COLORS.data, BUS_COLORS.ctrl, '#d2a8ff', '#ffa657', '#79c0ff', '#56d364'][i % 7]}
                  side="callee" state={s.state} memLayout={i === chain.length - 1 ? memLayout : undefined} />
              ))}
              <ChipModule name={chain[0]?.caller || 'Caller'} sub={isZh ? '(调用方)' : '(Caller)'}
                x={startX} y={80}
                active={movingData.some(d => d.from === 0)} color="#4d8fff" side="caller"
                state={s.state} />

              {(['addr', 'ctrl', 'data'] as BusType[]).map(bus => (
                <g key={bus}>
                  <line x1={0} y1={busY[bus]} x2={Math.max(600, numChips * chipSpacing + 80)} y2={busY[bus]}
                    stroke={BUS_COLORS[bus]} strokeWidth={2} opacity={s[bus] !== '—' ? 1 : 0.12} />
                  {chain.map((_, i) => (
                    <g key={i}>
                      <line x1={startX + (i + 1) * chipSpacing - 8} y1={80 + 38} x2={startX + (i + 1) * chipSpacing - 8} y2={busY[bus]}
                        stroke={s[bus] !== '—' ? BUS_COLORS[bus] : '#222'} strokeWidth={1.5} strokeDasharray="3 2" />
                      <circle cx={startX + (i + 1) * chipSpacing - 8} cy={busY[bus]} r={3} fill={s[bus] !== '—' ? BUS_COLORS[bus] : '#333'} />
                    </g>
                  ))}
                  <line x1={startX + 120} y1={80 + 38} x2={startX + 120} y2={busY[bus]}
                    stroke={s[bus] !== '—' ? BUS_COLORS[bus] : '#222'} strokeWidth={1.5} strokeDasharray="3 2" />
                  <circle cx={startX + 120} cy={busY[bus]} r={3} fill={s[bus] !== '—' ? BUS_COLORS[bus] : '#333'} />
                </g>
              ))}

              {[['ADDR', busY.addr, '#ff7b72'], ['CTRL', busY.ctrl, '#79c0ff'], ['DATA', busY.data, '#56d364']].map(([name, y, c]) => (
                <g key={name} transform={`translate(6, ${+y - 16})`}>
                  <rect x={0} y={0} width={86} height={14} rx={2} fill="#0d1117" stroke={(c + '40')} strokeWidth={1} />
                  <text x={4} y={10} fill={c as string} fontSize={8} fontFamily='monospace' fontWeight='bold'>{name} BUS</text>
                </g>
              ))}

              <g transform={`translate(${startX + chipSpacing + 60}, 0)`}>
                {(['addr', 'ctrl', 'data'] as BusType[]).map(b => (
                  <g key={b} transform={`translate(0, ${busY[b]})`}>
                    <BusValueLabel bus={b.toUpperCase()} label={s[b]} color={BUS_COLORS[b]} active={s[b] !== '—'} hex={showHex && s[b] !== '—' ? hexVal(s[b]) : undefined} />
                  </g>
                ))}
              </g>

              {(s.movingData || []).map((md, i) => {
                const fromX = md.from === 99 ? startX + chipSpacing * (numChips - 1) + 60 : md.from === 0 ? startX + 60 : startX + md.from * chipSpacing + 60
                const toX = md.to === 99 ? startX + chipSpacing * (numChips - 1) + 60 : md.to === 0 ? startX + 60 : startX + md.to * chipSpacing + 60
                return <MovingDot key={i} progress={animProgress} fromX={fromX} toX={toX} y={busY[md.bus]} color={BUS_COLORS[md.bus]} label={md.label} />
              })}
            </svg>
            <div style={{ width: 120, flexShrink: 0, borderLeft: '1px solid var(--border)', padding: 6, background: '#0d1117', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 8, color: '#8b949e', fontFamily: 'monospace', textAlign: 'center' }}>
                {isZh ? '调用栈' : 'Call Stack'}
              </div>
              <CallStack frames={currentStack} />
            </div>
          </div>

          <div style={{ borderRadius: 8, border: '1px solid var(--border)', padding: '5px 10px', fontSize: 12, lineHeight: 1.5, color: '#e6edf3', background: '#161b22', flexShrink: 0 }}>
            {isZh ? s.desc_zh : s.desc_en}
          </div>

          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 9, color: '#8b949e', marginBottom: 2, fontFamily: 'monospace', paddingLeft: 2 }}>
              {isZh ? '时序波形图' : 'Timing Waveform'}
            </div>
            <Waveform steps={allSteps} curStep={step} />
          </div>
        </div>
      </div>
    </div>
  )
}
