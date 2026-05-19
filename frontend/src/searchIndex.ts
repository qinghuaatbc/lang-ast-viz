// Search index — lists all topics across all tabs for global search

export type TopMode = 'ast' | 'ds' | 'linux' | 'tlpi' | 'algo' | 'memory' | 'regex' |
  'ieee754' | 'network' | 'cpu' | 'x86' | 'hw' | 'docker' | 'sysdesign' | 'git' |
  'concurrency' | 'wasm' | 'database' | 'objectbus'

export interface SearchEntry {
  tab: TopMode
  topicId: string
  title_zh: string
  title_en: string
  keywords: string  // space-separated searchable terms
}

export const SEARCH_INDEX: SearchEntry[] = [
  // ─── AST Compiler ──────────────────────────────────────────────────────────
  { tab: 'ast', topicId: '', title_zh: 'AST 编译器', title_en: 'AST Compiler',
    keywords: 'ast abstract syntax tree compiler rust c python llvm ir bytecode assembly compile' },

  // ─── Data Structures ───────────────────────────────────────────────────────
  { tab: 'ds', topicId: '', title_zh: '数组', title_en: 'Array',
    keywords: 'array list dynamic 动态数组 vector random access O(1)' },
  { tab: 'ds', topicId: '', title_zh: '链表', title_en: 'Linked List',
    keywords: 'linked list node pointer 链表 single double circular' },
  { tab: 'ds', topicId: '', title_zh: '栈与队列', title_en: 'Stack & Queue',
    keywords: 'stack queue LIFO FIFO 栈 队列 deque' },
  { tab: 'ds', topicId: '', title_zh: '哈希表', title_en: 'Hash Table',
    keywords: 'hash map hashmap dictionary 哈希 collision chaining probing' },
  { tab: 'ds', topicId: '', title_zh: '二叉树', title_en: 'Binary Tree',
    keywords: 'binary tree BST AVL red-black B-tree 二叉树 traversal' },
  { tab: 'ds', topicId: '', title_zh: '堆', title_en: 'Heap',
    keywords: 'heap priority queue min max 堆 heapify' },
  { tab: 'ds', topicId: '', title_zh: '图', title_en: 'Graph',
    keywords: 'graph BFS DFS 图 adjacency matrix list Dijkstra topological' },

  // ─── Linux OS ──────────────────────────────────────────────────────────────
  { tab: 'linux', topicId: '', title_zh: '进程管理', title_en: 'Process Management',
    keywords: 'process fork exec wait pid 进程 PCB context switch' },
  { tab: 'linux', topicId: '', title_zh: '文件系统', title_en: 'File System',
    keywords: 'filesystem inode ext4 VFS open read write 文件系统' },
  { tab: 'linux', topicId: '', title_zh: '内存管理', title_en: 'Memory Management',
    keywords: 'virtual memory paging page table mmap malloc 内存 虚拟内存' },
  { tab: 'linux', topicId: '', title_zh: '网络 Socket', title_en: 'Network Sockets',
    keywords: 'socket TCP UDP epoll select poll 套接字 syscall' },
  { tab: 'linux', topicId: '', title_zh: '信号', title_en: 'Signals',
    keywords: 'signal SIGTERM SIGKILL kill 信号 handler' },
  { tab: 'linux', topicId: '', title_zh: '管道 IPC', title_en: 'Pipe & IPC',
    keywords: 'pipe IPC shared memory semaphore message queue 管道 进程间通信' },

  // ─── TLPI ──────────────────────────────────────────────────────────────────
  { tab: 'tlpi', topicId: '', title_zh: 'TLPI Linux 系统编程', title_en: 'TLPI Linux Programming Interface',
    keywords: 'tlpi linux programming interface epoll io_uring seccomp ptrace inotify timerfd' },

  // ─── Algorithms ────────────────────────────────────────────────────────────
  { tab: 'algo', topicId: '', title_zh: '冒泡排序', title_en: 'Bubble Sort',
    keywords: 'bubble sort O(n2) swap 冒泡排序' },
  { tab: 'algo', topicId: '', title_zh: '快速排序', title_en: 'Quick Sort',
    keywords: 'quicksort pivot partition O(nlogn) 快速排序' },
  { tab: 'algo', topicId: '', title_zh: '归并排序', title_en: 'Merge Sort',
    keywords: 'merge sort divide conquer O(nlogn) stable 归并排序' },
  { tab: 'algo', topicId: '', title_zh: '堆排序', title_en: 'Heap Sort',
    keywords: 'heap sort O(nlogn) in-place 堆排序' },
  { tab: 'algo', topicId: '', title_zh: '二分查找', title_en: 'Binary Search',
    keywords: 'binary search O(logn) 二分查找' },
  { tab: 'algo', topicId: '', title_zh: 'BFS DFS 图搜索', title_en: 'BFS DFS',
    keywords: 'breadth depth first search BFS DFS graph 图搜索' },

  // ─── Memory Layout ─────────────────────────────────────────────────────────
  { tab: 'memory', topicId: '', title_zh: '内存布局', title_en: 'Memory Layout',
    keywords: 'stack heap data bss text segment ELF memory layout 内存布局 栈 堆' },

  // ─── Regex ─────────────────────────────────────────────────────────────────
  { tab: 'regex', topicId: '', title_zh: '正则表达式', title_en: 'Regular Expressions',
    keywords: 'regex NFA DFA pattern match 正则 greedy lookahead group' },

  // ─── IEEE 754 ──────────────────────────────────────────────────────────────
  { tab: 'ieee754', topicId: '', title_zh: 'IEEE 754 浮点数', title_en: 'IEEE 754 Floating Point',
    keywords: 'ieee754 float double mantissa exponent sign NaN infinity 浮点 精度' },

  // ─── Network ───────────────────────────────────────────────────────────────
  { tab: 'network', topicId: '', title_zh: 'TCP/IP', title_en: 'TCP/IP',
    keywords: 'TCP IP three-way handshake 三次握手 congestion control sliding window' },
  { tab: 'network', topicId: '', title_zh: 'HTTP/2 HTTP/3', title_en: 'HTTP/2 HTTP/3',
    keywords: 'http2 http3 QUIC multiplexing header compression' },
  { tab: 'network', topicId: '', title_zh: 'TLS/SSL', title_en: 'TLS/SSL',
    keywords: 'TLS SSL handshake certificate PKI 加密 HTTPS' },
  { tab: 'network', topicId: '', title_zh: 'DNS', title_en: 'DNS',
    keywords: 'DNS resolution domain nameserver A record CNAME TTL' },
  { tab: 'network', topicId: '', title_zh: 'WebSocket', title_en: 'WebSocket',
    keywords: 'websocket ws upgrade full-duplex real-time' },
  { tab: 'network', topicId: '', title_zh: 'gRPC/Protobuf', title_en: 'gRPC/Protobuf',
    keywords: 'gRPC protobuf protocol buffer RPC streaming' },

  // ─── CPU ───────────────────────────────────────────────────────────────────
  { tab: 'cpu', topicId: '', title_zh: 'CPU 流水线', title_en: 'CPU Pipeline',
    keywords: 'pipeline fetch decode execute writeback branch prediction 流水线 超标量' },
  { tab: 'cpu', topicId: '', title_zh: '缓存层次', title_en: 'Cache Hierarchy',
    keywords: 'cache L1 L2 L3 hit miss eviction 缓存 locality' },
  { tab: 'cpu', topicId: '', title_zh: '指令集', title_en: 'Instruction Set',
    keywords: 'RISC CISC x86 ARM instruction set register 指令集' },

  // ─── x86 Assembly ──────────────────────────────────────────────────────────
  { tab: 'x86', topicId: '', title_zh: 'x86 汇编', title_en: 'x86 Assembly',
    keywords: 'x86 assembly AT&T Intel mov push pop call ret registers RAX RBX RCX' },

  // ─── Hardware I/O ──────────────────────────────────────────────────────────
  { tab: 'hw', topicId: 'rs232', title_zh: 'RS-232 串口', title_en: 'RS-232 Serial',
    keywords: 'RS232 serial UART DB9 termios baud 串口 通信' },
  { tab: 'hw', topicId: 'rs485', title_zh: 'RS-485 Modbus', title_en: 'RS-485 Modbus',
    keywords: 'RS485 Modbus differential bus industrial 工业 总线' },
  { tab: 'hw', topicId: 'spi', title_zh: 'SPI', title_en: 'SPI',
    keywords: 'SPI MOSI MISO SCLK CS clock mode 串行外设' },
  { tab: 'hw', topicId: 'i2c', title_zh: 'I2C/I²C', title_en: 'I2C',
    keywords: 'I2C I2C SDA SCL address 7-bit BME280 二线制' },
  { tab: 'hw', topicId: 'uart', title_zh: 'UART GPS', title_en: 'UART',
    keywords: 'UART async baud parity stop bits GPS NMEA' },
  { tab: 'hw', topicId: 'can', title_zh: 'CAN Bus OBD-II', title_en: 'CAN Bus',
    keywords: 'CAN bus SocketCAN OBD-II automotive 汽车 差分' },
  { tab: 'hw', topicId: 'ethernet', title_zh: '以太网帧', title_en: 'Ethernet Frame',
    keywords: 'ethernet AF_PACKET raw socket MAC frame 原始以太帧' },
  { tab: 'hw', topicId: 'gpio', title_zh: 'GPIO PWM', title_en: 'GPIO PWM',
    keywords: 'GPIO PWM gpiod sysfs raspberry pi 树莓派 舵机' },

  // ─── Docker ────────────────────────────────────────────────────────────────
  { tab: 'docker', topicId: '', title_zh: 'Docker 容器', title_en: 'Docker Containers',
    keywords: 'docker container image layer namespace cgroup overlay fs' },
  { tab: 'docker', topicId: '', title_zh: 'Dockerfile', title_en: 'Dockerfile',
    keywords: 'dockerfile FROM RUN COPY CMD ENTRYPOINT ARG ENV multi-stage' },
  { tab: 'docker', topicId: '', title_zh: 'Docker Compose', title_en: 'Docker Compose',
    keywords: 'docker compose service network volume YAML 编排' },
  { tab: 'docker', topicId: '', title_zh: 'Kubernetes 基础', title_en: 'Kubernetes Basics',
    keywords: 'kubernetes k8s pod deployment service ingress 容器编排' },

  // ─── System Design ─────────────────────────────────────────────────────────
  { tab: 'sysdesign', topicId: '', title_zh: '负载均衡', title_en: 'Load Balancing',
    keywords: 'load balancer round robin consistent hashing 负载均衡' },
  { tab: 'sysdesign', topicId: '', title_zh: '缓存策略', title_en: 'Caching',
    keywords: 'cache Redis CDN LRU TTL 缓存 invalidation' },
  { tab: 'sysdesign', topicId: '', title_zh: '消息队列', title_en: 'Message Queue',
    keywords: 'message queue Kafka RabbitMQ pub/sub 消息队列 异步' },
  { tab: 'sysdesign', topicId: '', title_zh: '分布式数据库', title_en: 'Distributed DB',
    keywords: 'sharding replication CAP theorem ACID BASE 分布式 一致性' },
  { tab: 'sysdesign', topicId: '', title_zh: '微服务', title_en: 'Microservices',
    keywords: 'microservices API gateway service mesh 微服务 gRPC' },

  // ─── Git Internals ─────────────────────────────────────────────────────────
  { tab: 'git', topicId: 'objects', title_zh: 'Git 对象模型', title_en: 'Git Object Model',
    keywords: 'git blob tree commit tag SHA-1 object store content addressable' },
  { tab: 'git', topicId: 'dag', title_zh: 'Git 提交 DAG', title_en: 'Git Commit DAG',
    keywords: 'git DAG commit history branch HEAD ref detached' },
  { tab: 'git', topicId: 'index', title_zh: 'Git 暂存区', title_en: 'Git Staging Area',
    keywords: 'git index staging area add diff stash restore' },
  { tab: 'git', topicId: 'merge', title_zh: 'Merge vs Rebase', title_en: 'Merge vs Rebase',
    keywords: 'git merge rebase cherry-pick squash fast-forward conflict interactive' },
  { tab: 'git', topicId: 'remotes', title_zh: 'Git 远程', title_en: 'Git Remotes',
    keywords: 'git remote origin fetch pull push upstream tracking clone' },
  { tab: 'git', topicId: 'stash', title_zh: 'Git Stash', title_en: 'Git Stash',
    keywords: 'git stash pop apply drop WIP temporary save' },
  { tab: 'git', topicId: 'reset', title_zh: 'Git Reset & Reflog', title_en: 'Git Reset & Reflog',
    keywords: 'git reset hard soft mixed reflog recover undo revert bisect' },
  { tab: 'git', topicId: 'internals', title_zh: '.git 目录', title_en: '.git Directory',
    keywords: 'git .git objects refs pack hooks index gc fsck internals' },

  // ─── Concurrency ───────────────────────────────────────────────────────────
  { tab: 'concurrency', topicId: 'thread', title_zh: '线程与进程', title_en: 'Threads vs Processes',
    keywords: 'thread process pthread goroutine context switch TID PID' },
  { tab: 'concurrency', topicId: 'mutex', title_zh: '互斥锁 Mutex', title_en: 'Mutex & Locks',
    keywords: 'mutex lock spinlock rwlock 互斥锁 临界区 critical section' },
  { tab: 'concurrency', topicId: 'semaphore', title_zh: '信号量', title_en: 'Semaphore',
    keywords: 'semaphore sem_wait sem_post counting binary 信号量' },
  { tab: 'concurrency', topicId: 'deadlock', title_zh: '死锁', title_en: 'Deadlock',
    keywords: 'deadlock livelock starvation Coffman conditions lock ordering 死锁' },
  { tab: 'concurrency', topicId: 'channel', title_zh: '通道 Channel', title_en: 'Channel',
    keywords: 'channel goroutine Go channel CSP select buffered 通道' },
  { tab: 'concurrency', topicId: 'async', title_zh: 'Async/Await', title_en: 'Async/Await',
    keywords: 'async await future promise tokio event loop 异步 协程' },
  { tab: 'concurrency', topicId: 'atomics', title_zh: '原子操作 CAS', title_en: 'Atomics & CAS',
    keywords: 'atomic CAS compare-and-swap memory order lock-free 原子 无锁' },
  { tab: 'concurrency', topicId: 'model', title_zh: '内存模型', title_en: 'Memory Model',
    keywords: 'memory model happens-before volatile sequential consistency 内存模型' },

  // ─── WebAssembly ───────────────────────────────────────────────────────────
  { tab: 'wasm', topicId: 'intro', title_zh: 'WASM 简介', title_en: 'WASM Overview',
    keywords: 'webassembly wasm wat stack machine binary format portable' },
  { tab: 'wasm', topicId: 'wat', title_zh: 'WAT 文本格式', title_en: 'WAT Text Format',
    keywords: 'WAT text format module func i32 i64 f32 f64 local param' },
  { tab: 'wasm', topicId: 'memory', title_zh: 'WASM 内存模型', title_en: 'WASM Memory',
    keywords: 'wasm linear memory 线性内存 grow page 64KB' },
  { tab: 'wasm', topicId: 'js', title_zh: 'JS 互操作', title_en: 'JS Interop',
    keywords: 'wasm javascript import export WebAssembly.instantiate bridge' },
  { tab: 'wasm', topicId: 'rust', title_zh: 'Rust → WASM', title_en: 'Rust to WASM',
    keywords: 'rust wasm-pack wasm-bindgen cargo target wasm32' },
  { tab: 'wasm', topicId: 'simd', title_zh: 'WASM SIMD', title_en: 'WASM SIMD',
    keywords: 'wasm SIMD v128 vector i32x4 f32x4 intrinsics' },

  // ─── Database Internals ────────────────────────────────────────────────────
  { tab: 'database', topicId: 'btree', title_zh: 'B-Tree 索引', title_en: 'B-Tree Index',
    keywords: 'btree B+ tree index page node split 索引 InnoDB' },
  { tab: 'database', topicId: 'wal', title_zh: 'WAL 日志', title_en: 'WAL Write-Ahead Log',
    keywords: 'WAL write ahead log redo undo crash recovery ARIES' },
  { tab: 'database', topicId: 'mvcc', title_zh: 'MVCC 多版本', title_en: 'MVCC',
    keywords: 'MVCC multi-version concurrency control snapshot isolation 事务 版本' },
  { tab: 'database', topicId: 'query', title_zh: '查询执行', title_en: 'Query Execution',
    keywords: 'query plan optimizer join hash nested loop EXPLAIN cost' },
  { tab: 'database', topicId: 'acid', title_zh: 'ACID 事务', title_en: 'ACID Transactions',
    keywords: 'ACID atomicity consistency isolation durability transaction 事务' },
  { tab: 'database', topicId: 'lsm', title_zh: 'LSM Tree', title_en: 'LSM Tree',
    keywords: 'LSM tree SSTable memtable compaction RocksDB LevelDB write-optimized' },
  { tab: 'database', topicId: 'replication', title_zh: '复制与分片', title_en: 'Replication & Sharding',
    keywords: 'replication sharding master replica raft paxos 主从复制 分片' },
  { tab: 'database', topicId: 'index2', title_zh: '索引类型', title_en: 'Index Types',
    keywords: 'clustered nonclustered hash fulltext spatial bitmap primary 二级索引' },
  { tab: 'objectbus', topicId: '', title_zh: '对象总线分析器', title_en: 'Object Bus Analyzer',
    keywords: 'bus address data control 总线 地址 数据 控制 virtual circuit 虚拟电路 module object method call cpp class vtable polymorphism code analysis 分析 caller callee' },
]

export function searchEntries(query: string, lang: 'zh' | 'en'): SearchEntry[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  return SEARCH_INDEX.filter(e => {
    const title = lang === 'zh' ? e.title_zh : e.title_en
    return (
      title.toLowerCase().includes(q) ||
      e.keywords.toLowerCase().includes(q)
    )
  }).slice(0, 12)
}

export const TAB_LABELS: Record<TopMode, { zh: string; en: string; icon: string }> = {
  ast:         { zh: 'AST 编译器', en: 'AST Compiler',      icon: '🔬' },
  ds:          { zh: '数据结构',   en: 'Data Structures',   icon: '🗂' },
  linux:       { zh: 'Linux OS',   en: 'Linux OS',          icon: '🐧' },
  tlpi:        { zh: 'TLPI',       en: 'TLPI',              icon: '📖' },
  algo:        { zh: '排序算法',   en: 'Sorting Algos',     icon: '📊' },
  memory:      { zh: '内存布局',   en: 'Memory Layout',     icon: '🧠' },
  regex:       { zh: '正则表达式', en: 'Regex',             icon: '🔍' },
  ieee754:     { zh: 'IEEE 754',   en: 'IEEE 754',          icon: '🔢' },
  network:     { zh: '网络协议栈', en: 'Network Stack',     icon: '🌐' },
  cpu:         { zh: 'CPU 流水线', en: 'CPU Pipeline',      icon: '⚡' },
  x86:         { zh: 'x86 汇编',   en: 'x86 Assembly',     icon: '🖥' },
  hw:          { zh: '通信接口',   en: 'Hardware I/O',      icon: '🔌' },
  docker:      { zh: 'Docker',     en: 'Docker',            icon: '🐳' },
  sysdesign:   { zh: '系统设计',   en: 'Sys Design',        icon: '🏗' },
  git:         { zh: 'Git 原理',   en: 'Git Internals',     icon: '🔀' },
  concurrency: { zh: '并发原理',   en: 'Concurrency',       icon: '🔄' },
  wasm:        { zh: 'WebAssembly',en: 'WebAssembly',       icon: '🕸' },
  database:    { zh: '数据库原理', en: 'DB Internals',      icon: '🗄' },
  objectbus:   { zh: '三总线',     en: '3-Bus Circuit',     icon: '🔌' },
}
