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
    id: 'btree', icon: '🌲', color: '#3fb950',
    label_zh: 'B+ Tree 索引', label_en: 'B+ Tree Index',
    desc_zh: 'B+ Tree 是关系型数据库索引的核心数据结构（InnoDB/PostgreSQL）。所有数据在叶节点，叶节点通过链表连接，支持范围查询。',
    desc_en: 'B+ Tree is the core index data structure in relational databases (InnoDB/PostgreSQL). All data is in leaf nodes linked by a list, enabling efficient range queries.',
    diagram: `<svg viewBox="0 0 480 210" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <defs>
    <marker id="arrowBT" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="#888"/>
    </marker>
  </defs>
  <!-- root -->
  <rect x="170" y="10" width="140" height="32" rx="6" fill="#1a2d1a" stroke="#3fb950" strokeWidth="1.5"/>
  <text x="240" y="31" textAnchor="middle" fill="#3fb950" fontSize="11" fontWeight="700">root: [20 | 40]</text>
  <!-- internal nodes -->
  <rect x="50"  y="68" width="120" height="28" rx="5" fill="#1a1f2d" stroke="#58a6ff" strokeWidth="1.2"/>
  <text x="110" y="86" textAnchor="middle" fill="#58a6ff" fontSize="10">[10 | 15]</text>
  <rect x="190" y="68" width="100" height="28" rx="5" fill="#1a1f2d" stroke="#58a6ff" strokeWidth="1.2"/>
  <text x="240" y="86" textAnchor="middle" fill="#58a6ff" fontSize="10">[25 | 30]</text>
  <rect x="320" y="68" width="140" height="28" rx="5" fill="#1a1f2d" stroke="#58a6ff" strokeWidth="1.2"/>
  <text x="390" y="86" textAnchor="middle" fill="#58a6ff" fontSize="10">[45 | 55]</text>
  <!-- lines root to internal -->
  <line x1="210" y1="42" x2="130" y2="66" stroke="#444" strokeWidth="1.2"/>
  <line x1="240" y1="42" x2="240" y2="66" stroke="#444" strokeWidth="1.2"/>
  <line x1="270" y1="42" x2="360" y2="66" stroke="#444" strokeWidth="1.2"/>
  <!-- leaf nodes -->
  <rect x="10"  y="124" width="96" height="36" rx="5" fill="#0d1117" stroke="#3fb950" strokeWidth="1.2"/>
  <text x="58"  y="140" textAnchor="middle" fill="#3fb950" fontSize="9">5|data  8|data</text>
  <text x="58"  y="155" textAnchor="middle" fill="#888" fontSize="8">10|data</text>
  <rect x="112" y="124" width="96" height="36" rx="5" fill="#0d1117" stroke="#3fb950" strokeWidth="1.2"/>
  <text x="160" y="140" textAnchor="middle" fill="#3fb950" fontSize="9">12|data 15|data</text>
  <text x="160" y="155" textAnchor="middle" fill="#888" fontSize="8">18|data</text>
  <rect x="214" y="124" width="96" height="36" rx="5" fill="#0d1117" stroke="#3fb950" strokeWidth="1.2"/>
  <text x="262" y="140" textAnchor="middle" fill="#3fb950" fontSize="9">20|data 25|data</text>
  <text x="262" y="155" textAnchor="middle" fill="#888" fontSize="8">28|data</text>
  <rect x="316" y="124" width="96" height="36" rx="5" fill="#0d1117" stroke="#3fb950" strokeWidth="1.2"/>
  <text x="364" y="140" textAnchor="middle" fill="#3fb950" fontSize="9">40|data 45|data</text>
  <text x="364" y="155" textAnchor="middle" fill="#888" fontSize="8">50|data</text>
  <!-- leaf chain -->
  <line x1="106" y1="142" x2="110" y2="142" stroke="#3fb950" strokeWidth="1.2" markerEnd="url(#arrowBT)"/>
  <line x1="208" y1="142" x2="212" y2="142" stroke="#3fb950" strokeWidth="1.2" markerEnd="url(#arrowBT)"/>
  <line x1="310" y1="142" x2="314" y2="142" stroke="#3fb950" strokeWidth="1.2" markerEnd="url(#arrowBT)"/>
  <text x="240" y="195" textAnchor="middle" fill="#888" fontSize="9">叶节点通过双向链表连接 → 支持 O(log n) 范围扫描</text>
  <!-- lines internal to leaf -->
  <line x1="80"  y1="96" x2="58"  y2="122" stroke="#333" strokeWidth="1"/>
  <line x1="120" y1="96" x2="160" y2="122" stroke="#333" strokeWidth="1"/>
  <line x1="220" y1="96" x2="262" y2="122" stroke="#333" strokeWidth="1"/>
  <line x1="370" y1="96" x2="364" y2="122" stroke="#333" strokeWidth="1"/>
</svg>`,
    code: `-- PostgreSQL / MySQL index operations

-- Create B+ Tree index (default type)
CREATE INDEX idx_user_email ON users(email);
CREATE UNIQUE INDEX idx_user_email ON users(email);

-- Composite index (order matters for leftmost prefix rule)
CREATE INDEX idx_orders ON orders(user_id, created_at, status);
-- Uses: WHERE user_id=1
-- Uses: WHERE user_id=1 AND created_at > '2024-01-01'
-- NOT:  WHERE created_at > '2024-01-01'  (no leftmost prefix)

-- Explain query plan
EXPLAIN SELECT * FROM users WHERE email = 'a@b.com';
-- Index Scan using idx_user_email  (O(log n))
EXPLAIN SELECT * FROM orders WHERE user_id = 1 ORDER BY created_at;
-- Index Scan using idx_orders      (O(log n) + sequential leaf read)

-- Covering index — all columns in index, no heap fetch
CREATE INDEX idx_cover ON users(email) INCLUDE (name, status);
SELECT name, status FROM users WHERE email = 'a@b.com';
-- Index Only Scan (no table lookup!)

-- InnoDB clustered index: primary key IS the B+ tree leaf data
-- Non-primary indexes store PK value → double lookup if not covering`,
    codeTitle_zh: 'B+ Tree 索引 SQL', codeTitle_en: 'B+ Tree Index SQL',
    notes_zh: 'InnoDB 的聚簇索引（clustered index）把主键和行数据放在同一个 B+ tree 的叶节点——主键查询不需要额外跳转。二级索引的叶节点存的是主键值，所以通过二级索引查询需要回表（index scan + heap fetch），除非是覆盖索引。',
    notes_en: "InnoDB's clustered index puts primary key and row data together in B+ tree leaf nodes — primary key lookup needs no extra jump. Secondary index leaf nodes store the PK value, so secondary index lookups require a table lookup (index scan + heap fetch) unless using a covering index.",
    concepts_zh: [
      { term: '聚簇索引', def: 'B+ tree 叶节点直接存行数据。InnoDB 强制使用 PK 作为聚簇索引。PostgreSQL 叫 heap-based，无聚簇。' },
      { term: 'B vs B+', def: 'B-tree 内部节点也存数据；B+ tree 只在叶节点存数据，内部节点只存键。数据库用 B+ tree（叶节点链表更利于范围查询）。' },
      { term: '页（Page）', def: 'B+ tree 的最小 I/O 单元（InnoDB 默认 16KB）。一页装不下时分裂（split），装得下时合并（merge）。' },
      { term: 'cardinality', def: '索引列的唯一值数量。低基数（如性别）列不适合 B+ tree 索引，位图索引更合适。' },
    ],
    concepts_en: [
      { term: 'clustered index', def: "B+ tree leaf stores actual row data. InnoDB forces PK as clustered index. PostgreSQL is heap-based (no clustering by default)." },
      { term: 'B vs B+', def: 'B-tree stores data in all nodes; B+ tree stores data only in leaf nodes. Databases use B+ tree (leaf linked list enables range scans).' },
      { term: 'Page', def: 'Minimum I/O unit for B+ tree (InnoDB default 16KB). Overflowing a page causes a split; underflowing causes a merge.' },
      { term: 'cardinality', def: 'Number of unique values in the indexed column. Low-cardinality columns (e.g., boolean) suit bitmap indexes better than B+ tree.' },
    ],
  },
  {
    id: 'wal', icon: '📒', color: '#f0883e',
    label_zh: 'WAL 预写日志', label_en: 'Write-Ahead Log (WAL)',
    desc_zh: 'WAL 是数据库持久性（Durability）的核心机制：先写日志再写数据页，崩溃后可通过重放日志恢复到一致状态。',
    desc_en: 'WAL is the core mechanism for database Durability: write to log before writing data pages. After a crash, replay the log to restore a consistent state.',
    diagram: `<svg viewBox="0 0 480 180" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <defs>
    <marker id="arrowW2" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="#888"/>
    </marker>
  </defs>
  <!-- Transaction -->
  <rect x="10" y="30" width="100" height="120" rx="8" fill="rgba(88,166,255,0.06)" stroke="#58a6ff" strokeWidth="1.3"/>
  <text x="60" y="52" textAnchor="middle" fill="#58a6ff" fontSize="10" fontWeight="700">Transaction</text>
  <text x="60" y="70" textAnchor="middle" fill="#888" fontSize="8">UPDATE users</text>
  <text x="60" y="84" textAnchor="middle" fill="#888" fontSize="8">SET balance=90</text>
  <text x="60" y="100" textAnchor="middle" fill="#888" fontSize="8">WHERE id=1</text>
  <!-- arrows: 1. write WAL first -->
  <line x1="112" y1="70" x2="165" y2="70" stroke="#f0883e" strokeWidth="1.5" markerEnd="url(#arrowW2)"/>
  <text x="138" y="62" textAnchor="middle" fill="#f0883e" fontSize="8">① write first</text>
  <!-- WAL / Redo log -->
  <rect x="168" y="10" width="130" height="160" rx="8" fill="rgba(240,136,62,0.06)" stroke="#f0883e" strokeWidth="1.5"/>
  <text x="233" y="32" textAnchor="middle" fill="#f0883e" fontSize="11" fontWeight="700">WAL / Redo Log</text>
  <text x="233" y="50" textAnchor="middle" fill="#888" fontSize="8">(append-only, sequential)</text>
  <rect x="178" y="58" width="110" height="22" rx="4" fill="rgba(240,136,62,0.15)"/>
  <text x="233" y="73" textAnchor="middle" fill="#f0883e" fontSize="9">LSN 1001: BEGIN txn#5</text>
  <rect x="178" y="84" width="110" height="22" rx="4" fill="rgba(240,136,62,0.15)"/>
  <text x="233" y="99" textAnchor="middle" fill="#f0883e" fontSize="9">LSN 1002: page3 off12 90</text>
  <rect x="178" y="110" width="110" height="22" rx="4" fill="rgba(240,136,62,0.2)"/>
  <text x="233" y="125" textAnchor="middle" fill="#f0883e" fontSize="9">LSN 1003: COMMIT txn#5</text>
  <text x="233" y="152" textAnchor="middle" fill="#888" fontSize="7">fsync() before COMMIT ack</text>
  <!-- arrow 2: async write to data pages -->
  <line x1="300" y1="90" x2="340" y2="90" stroke="#888" strokeWidth="1.3" markerEnd="url(#arrowW2)" strokeDasharray="5,3"/>
  <text x="320" y="82" textAnchor="middle" fill="#888" fontSize="8">② async</text>
  <!-- Data pages (buffer pool) -->
  <rect x="343" y="30" width="130" height="120" rx="8" fill="rgba(63,185,80,0.06)" stroke="#3fb950" strokeWidth="1.3"/>
  <text x="408" y="52" textAnchor="middle" fill="#3fb950" fontSize="10" fontWeight="700">Data Pages</text>
  <text x="408" y="68" textAnchor="middle" fill="#888" fontSize="8">(buffer pool)</text>
  <rect x="353" y="78" width="110" height="28" rx="4" fill="rgba(63,185,80,0.12)"/>
  <text x="408" y="94" textAnchor="middle" fill="#3fb950" fontSize="9">page 3 (dirty)</text>
  <text x="408" y="108" textAnchor="middle" fill="#888" fontSize="7">written to disk later</text>
  <text x="408" y="130" textAnchor="middle" fill="#888" fontSize="7">checkpoint flushes dirty pages</text>
</svg>`,
    code: `-- PostgreSQL WAL inspection
SELECT * FROM pg_walfile_name(pg_current_wal_lsn());
SELECT pg_current_wal_lsn();      -- current write position
SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), '0/1000000');

-- WAL-related config (postgresql.conf)
wal_level = replica          -- logical | replica | minimal
synchronous_commit = on      -- off = faster but may lose last txns
checkpoint_completion_target = 0.9
max_wal_size = 1GB

-- PostgreSQL streaming replication uses WAL
-- Primary streams WAL to standbys in real-time

-- MySQL InnoDB redo log
SHOW VARIABLES LIKE 'innodb_log%';
-- innodb_log_file_size, innodb_log_files_in_group
-- binlog (logical) vs redo log (physical)
SET GLOBAL sync_binlog = 1;    -- fsync every commit (safe)
SET GLOBAL innodb_flush_log_at_trx_commit = 1;  -- fsync redo log

-- SQLite WAL mode (default: journal mode DELETE)
PRAGMA journal_mode = WAL;     -- concurrent reads while writing
PRAGMA wal_checkpoint(FULL);   -- flush WAL to main database`,
    codeTitle_zh: 'WAL 配置与检查', codeTitle_en: 'WAL Configuration & Inspection',
    notes_zh: 'WAL 保证原子性和持久性：COMMIT 时只需 fsync WAL 文件（顺序写），数据页可以异步写（随机写）。顺序写比随机写快 10-100×，这是 WAL 大幅提升性能的原因。检查点（checkpoint）定期把脏页刷到磁盘，并截断已不需要的 WAL。',
    notes_en: 'WAL guarantees atomicity and durability: COMMIT only needs to fsync the WAL file (sequential write); data pages are flushed asynchronously (random writes). Sequential writes are 10-100× faster than random — this is why WAL dramatically improves performance. Checkpoints periodically flush dirty pages and truncate old WAL.',
    concepts_zh: [
      { term: 'LSN', def: 'Log Sequence Number——WAL 中每条记录的全局唯一单调递增编号，用于追踪复制进度和崩溃恢复。' },
      { term: 'checkpoint', def: '把内存中所有脏页强制写入磁盘，并记录当前 LSN。崩溃恢复只需从最新 checkpoint 开始重放。' },
      { term: 'redo log vs undo log', def: 'redo log 记录"做了什么"（用于崩溃恢复）；undo log 记录"如何撤销"（用于事务回滚和 MVCC）。' },
      { term: 'fsync', def: 'COMMIT 时必须 fsync WAL 到持久化存储，否则断电丢失。sync_binlog=0 禁用 fsync 性能高但不安全。' },
    ],
    concepts_en: [
      { term: 'LSN', def: 'Log Sequence Number — a globally unique monotonically increasing ID for each WAL record. Tracks replication progress and crash recovery.' },
      { term: 'checkpoint', def: 'Forces all dirty pages to disk and records the current LSN. Crash recovery only replays WAL from the latest checkpoint.' },
      { term: 'redo log vs undo log', def: 'Redo log: "what was done" (for crash recovery). Undo log: "how to reverse" (for rollback and MVCC).' },
      { term: 'fsync', def: 'COMMIT must fsync WAL to durable storage; otherwise power loss causes data loss. sync_binlog=0 disables fsync for speed at the risk of losing data.' },
    ],
  },
  {
    id: 'mvcc', icon: '🔮', color: '#d2a8ff',
    label_zh: 'MVCC 多版本并发', label_en: 'MVCC',
    desc_zh: 'MVCC（多版本并发控制）让读操作不阻塞写操作——每个事务看到数据库在其开始时的一个一致快照。PostgreSQL 和 InnoDB 都用 MVCC 实现快照隔离。',
    desc_en: 'MVCC (Multi-Version Concurrency Control) lets reads never block writes — each transaction sees a consistent snapshot of the database from its start time. Both PostgreSQL and InnoDB use MVCC for snapshot isolation.',
    diagram: `<svg viewBox="0 0 480 190" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <!-- Timeline -->
  <line x1="20" y1="30" x2="460" y2="30" stroke="#333" strokeWidth="1.5"/>
  <text x="240" y="22" textAnchor="middle" fill="#888" fontSize="9">时间轴 →</text>
  <!-- T1 (reader) -->
  <circle cx="60" cy="30" r="5" fill="#58a6ff"/>
  <text x="60" y="50" textAnchor="middle" fill="#58a6ff" fontSize="9">T1 BEGIN</text>
  <circle cx="380" cy="30" r="5" fill="#58a6ff"/>
  <text x="380" y="50" textAnchor="middle" fill="#58a6ff" fontSize="9">T1 SELECT</text>
  <rect x="60" y="55" width="320" height="20" rx="4" fill="rgba(88,166,255,0.08)" stroke="#58a6ff" strokeWidth="1" strokeDasharray="4,2"/>
  <text x="220" y="69" textAnchor="middle" fill="#58a6ff" fontSize="8">T1 snapshot: sees row version from before T2 started</text>
  <!-- T2 (writer) -->
  <circle cx="150" cy="30" r="5" fill="#3fb950"/>
  <text x="150" y="88" textAnchor="middle" fill="#3fb950" fontSize="9">T2 BEGIN</text>
  <circle cx="280" cy="30" r="5" fill="#3fb950"/>
  <text x="280" y="88" textAnchor="middle" fill="#3fb950" fontSize="9">T2 UPDATE → COMMIT</text>
  <!-- Row versions -->
  <rect x="20" y="108" width="420" height="70" rx="8" fill="rgba(255,255,255,0.02)" stroke="#333" strokeWidth="1"/>
  <text x="230" y="125" textAnchor="middle" fill="#ccc" fontSize="10" fontWeight="700">Row versions (tuple heap)</text>
  <rect x="30"  y="134" width="130" height="36" rx="5" fill="rgba(88,166,255,0.08)" stroke="#58a6ff" strokeWidth="1"/>
  <text x="95"  y="150" textAnchor="middle" fill="#58a6ff" fontSize="9">xmin=100 xmax=null</text>
  <text x="95"  y="164" textAnchor="middle" fill="#888" fontSize="8">balance=100 (old)</text>
  <rect x="170" y="134" width="130" height="36" rx="5" fill="rgba(63,185,80,0.08)" stroke="#3fb950" strokeWidth="1"/>
  <text x="235" y="150" textAnchor="middle" fill="#3fb950" fontSize="9">xmin=T2 xmax=null</text>
  <text x="235" y="164" textAnchor="middle" fill="#888" fontSize="8">balance=90 (new)</text>
  <text x="340" y="155" textAnchor="middle" fill="#888" fontSize="8">T1 reads old version → 100</text>
  <text x="340" y="168" textAnchor="middle" fill="#888" fontSize="8">T2 sees new version → 90</text>
</svg>`,
    code: `-- Isolation levels & MVCC behavior (PostgreSQL)
-- READ COMMITTED (default): each statement gets fresh snapshot
-- REPEATABLE READ: snapshot at transaction start
-- SERIALIZABLE: full serializability (SSI algorithm)

BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SELECT balance FROM accounts WHERE id = 1;  -- sees snapshot
-- ... (T2 commits UPDATE balance=90 here) ...
SELECT balance FROM accounts WHERE id = 1;  -- still sees original!
COMMIT;

-- PostgreSQL xmin/xmax inspection
SELECT xmin, xmax, ctid, balance FROM accounts WHERE id = 1;
-- ctid: physical location (page, offset) of row version

-- Vacuum removes dead row versions (MVCC creates garbage)
VACUUM accounts;           -- reclaim dead tuples
VACUUM ANALYZE accounts;   -- + update statistics
AUTOVACUUM handles this automatically

-- Transaction ID (xid) wraparound — critical for PostgreSQL
SELECT age(datfrozenxid), datname FROM pg_database;
-- Must VACUUM before age > 2 billion (xid wraparound = data loss!)

-- InnoDB: undo log stores old versions (not heap like PG)
-- InnoDB purge thread cleans up undo log`,
    codeTitle_zh: 'MVCC 事务隔离 SQL', codeTitle_en: 'MVCC Isolation SQL',
    notes_zh: 'PostgreSQL 把行的旧版本存在 heap 里（dead tuples），需要 VACUUM 定期清理。InnoDB 把旧版本存在 undo log，由 purge 线程清理。两种方式各有优劣：PG 读性能更好（不需要链追），InnoDB vacuum 压力小。',
    notes_en: 'PostgreSQL stores old row versions in the heap (dead tuples) and needs VACUUM to reclaim them. InnoDB stores old versions in the undo log, cleaned by the purge thread. Tradeoffs: PostgreSQL has better read performance (no undo chain traversal); InnoDB has lower vacuum pressure.',
    concepts_zh: [
      { term: 'xmin / xmax', def: 'PostgreSQL 行版本的事务 ID 范围。xmin：创建该版本的 xid；xmax：删除/更新该版本的 xid（null = 当前有效）。' },
      { term: '快照（snapshot）', def: '事务开始时记录当前活跃 xid 集合，读操作只看 xmin < 快照且不在活跃列表中的版本。' },
      { term: 'write skew', def: 'MVCC 快照隔离无法避免的异常：两个事务分别读到旧数据并各自更新，导致约束被打破。需要 SERIALIZABLE 隔离级别解决。' },
      { term: 'VACUUM', def: 'PostgreSQL 专有：清理 heap 中的 dead tuple，更新 visibility map，推进 frozen xid 防止 wraparound。' },
    ],
    concepts_en: [
      { term: 'xmin / xmax', def: "PostgreSQL row version xid range. xmin: transaction that created the version; xmax: that deleted/updated it (null = currently valid)." },
      { term: 'snapshot', def: 'Records the set of active xids at transaction start. Reads only see versions where xmin < snapshot AND not in the active set.' },
      { term: 'write skew', def: 'MVCC anomaly: two transactions read old data and update independently, breaking a constraint. Requires SERIALIZABLE isolation to prevent.' },
      { term: 'VACUUM', def: 'PostgreSQL-specific: reclaims dead tuples in heap, updates visibility map, advances frozen xid to prevent wraparound.' },
    ],
  },
  {
    id: 'query', icon: '⚡', color: '#58a6ff',
    label_zh: '查询执行引擎', label_en: 'Query Execution Engine',
    desc_zh: '查询从 SQL 文本到最终结果经过：词法解析 → AST → 语义分析 → 查询优化（代价估算）→ 物理计划 → 执行。优化器选择最优连接算法和访问路径。',
    desc_en: 'A query goes from SQL text to result through: lex/parse → AST → semantic analysis → optimization (cost estimation) → physical plan → execution. The optimizer selects the best join algorithm and access path.',
    diagram: `<svg viewBox="0 0 480 160" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <defs>
    <marker id="arrowQ" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="#888"/>
    </marker>
  </defs>
  <!-- pipeline -->
  <rect x="5"   y="40" width="68" height="80" rx="6" fill="rgba(88,166,255,0.06)" stroke="#58a6ff" strokeWidth="1.2"/>
  <text x="39"  y="62" textAnchor="middle" fill="#58a6ff" fontSize="8" fontWeight="700">Parser</text>
  <text x="39"  y="76" textAnchor="middle" fill="#888" fontSize="7">SQL → AST</text>
  <text x="39"  y="89" textAnchor="middle" fill="#888" fontSize="7">tokens</text>
  <line x1="75" y1="80" x2="90" y2="80" stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowQ)"/>
  <rect x="93"  y="40" width="72" height="80" rx="6" fill="rgba(88,166,255,0.06)" stroke="#58a6ff" strokeWidth="1.2"/>
  <text x="129" y="62" textAnchor="middle" fill="#58a6ff" fontSize="8" fontWeight="700">Rewriter</text>
  <text x="129" y="76" textAnchor="middle" fill="#888" fontSize="7">views expand</text>
  <text x="129" y="89" textAnchor="middle" fill="#888" fontSize="7">rules apply</text>
  <line x1="167" y1="80" x2="182" y2="80" stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowQ)"/>
  <rect x="185" y="30" width="88" height="100" rx="6" fill="rgba(240,136,62,0.08)" stroke="#f0883e" strokeWidth="1.5"/>
  <text x="229" y="52" textAnchor="middle" fill="#f0883e" fontSize="9" fontWeight="700">Optimizer</text>
  <text x="229" y="68" textAnchor="middle" fill="#888" fontSize="7">statistics-based</text>
  <text x="229" y="82" textAnchor="middle" fill="#888" fontSize="7">join order</text>
  <text x="229" y="96" textAnchor="middle" fill="#888" fontSize="7">access method</text>
  <text x="229" y="110" textAnchor="middle" fill="#888" fontSize="7">cost = rows × I/O</text>
  <line x1="275" y1="80" x2="290" y2="80" stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowQ)"/>
  <rect x="293" y="40" width="76" height="80" rx="6" fill="rgba(63,185,80,0.06)" stroke="#3fb950" strokeWidth="1.2"/>
  <text x="331" y="62" textAnchor="middle" fill="#3fb950" fontSize="8" fontWeight="700">Executor</text>
  <text x="331" y="76" textAnchor="middle" fill="#888" fontSize="7">volcano model</text>
  <text x="331" y="89" textAnchor="middle" fill="#888" fontSize="7">pull-based</text>
  <line x1="371" y1="80" x2="386" y2="80" stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowQ)"/>
  <rect x="389" y="40" width="86" height="80" rx="6" fill="rgba(210,168,255,0.06)" stroke="#d2a8ff" strokeWidth="1.2"/>
  <text x="432" y="62" textAnchor="middle" fill="#d2a8ff" fontSize="8" fontWeight="700">Result</text>
  <text x="432" y="76" textAnchor="middle" fill="#888" fontSize="7">rows → client</text>
  <text x="432" y="89" textAnchor="middle" fill="#888" fontSize="7">streaming</text>
</svg>`,
    code: `-- Query execution analysis (PostgreSQL)
EXPLAIN SELECT u.name, count(o.id)
FROM users u JOIN orders o ON u.id = o.user_id
WHERE u.status = 'active'
GROUP BY u.name;

-- EXPLAIN output (read bottom-up):
-- HashAggregate  (rows=500 width=40)
--   -> Hash Join  (rows=5000)
--       Hash Cond: (o.user_id = u.id)
--       -> Seq Scan on orders
--       -> Hash
--            -> Index Scan on users (idx_status)
--                 Filter: status = 'active'

EXPLAIN (ANALYZE, BUFFERS) SELECT ...;
-- Shows actual rows, actual time, buffer hits/misses

-- Join algorithms
-- Nested Loop: O(n×m) — good when outer small + inner has index
-- Hash Join:   O(n+m) — build hash table on smaller table
-- Merge Join:  O(n log n) — both inputs sorted, good for large tables

-- Force a specific plan (debugging)
SET enable_hashjoin = off;
SET enable_seqscan = off;
EXPLAIN SELECT ...;
RESET ALL;`,
    codeTitle_zh: 'EXPLAIN 查询计划', codeTitle_en: 'EXPLAIN Query Plan',
    notes_zh: '优化器的核心是代价模型：估算每个算子处理的行数 × 每行的 I/O 或 CPU 代价，选择总代价最低的计划。统计信息（pg_statistic）不准确时优化器会选错计划——定期 ANALYZE 更新统计信息。',
    notes_en: "The optimizer's core is a cost model: estimate rows per operator × I/O or CPU cost per row, pick the lowest total cost plan. Stale statistics (pg_statistic) cause bad plans — run ANALYZE regularly to update statistics.",
    concepts_zh: [
      { term: 'Volcano 模型', def: '拉模式（pull-based）执行：每个算子实现 next() 方法，向下游算子拉数据，惰性执行。' },
      { term: '统计信息', def: 'pg_statistic 存列的直方图、唯一值数（n_distinct）、最常见值等，优化器据此估行数。' },
      { term: 'Parallel Query', def: 'PostgreSQL 9.6+：Gather/GatherMerge 算子并行扫描和聚合，充分利用多核。' },
      { term: 'JIT 编译', def: 'PostgreSQL 11+：用 LLVM 把复杂表达式 JIT 编译成机器码，表达式求值加速 2-5×。' },
    ],
    concepts_en: [
      { term: 'Volcano model', def: 'Pull-based execution: each operator implements next(), pulling rows from children lazily.' },
      { term: 'Statistics', def: 'pg_statistic stores column histograms, distinct counts, most-common values — the optimizer uses these to estimate row counts.' },
      { term: 'Parallel Query', def: 'PostgreSQL 9.6+: Gather/GatherMerge operators parallelize scans and aggregations across multiple CPU cores.' },
      { term: 'JIT compilation', def: 'PostgreSQL 11+: LLVM JIT compiles complex expressions to machine code — 2-5× speedup on expression evaluation.' },
    ],
  },
  {
    id: 'acid', icon: '🧪', color: '#f78166',
    label_zh: 'ACID 事务', label_en: 'ACID Transactions',
    desc_zh: 'ACID 是关系型数据库事务的四个保证。分布式系统中 ACID 很难同时满足，BASE（基本可用、软状态、最终一致）是常见的权衡方案。',
    desc_en: 'ACID is the four-property guarantee for relational database transactions. In distributed systems, ACID is hard to achieve simultaneously; BASE (Basically Available, Soft state, Eventually consistent) is a common trade-off.',
    diagram: `<svg viewBox="0 0 480 180" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <rect x="10"  y="20" width="105" height="140" rx="8" fill="rgba(247,129,102,0.06)" stroke="#f78166" strokeWidth="1.4"/>
  <text x="62"  y="44"  textAnchor="middle" fill="#f78166" fontSize="12" fontWeight="700">A</text>
  <text x="62"  y="62"  textAnchor="middle" fill="#f78166" fontSize="10">Atomicity</text>
  <text x="62"  y="80"  textAnchor="middle" fill="#888" fontSize="8">原子性</text>
  <text x="62"  y="96"  textAnchor="middle" fill="#888" fontSize="8">all-or-nothing</text>
  <text x="62"  y="110" textAnchor="middle" fill="#888" fontSize="7">undo log rollback</text>
  <text x="62"  y="124" textAnchor="middle" fill="#888" fontSize="7">2PC for distributed</text>
  <rect x="125" y="20" width="105" height="140" rx="8" fill="rgba(88,166,255,0.06)" stroke="#58a6ff" strokeWidth="1.4"/>
  <text x="177" y="44"  textAnchor="middle" fill="#58a6ff" fontSize="12" fontWeight="700">C</text>
  <text x="177" y="62"  textAnchor="middle" fill="#58a6ff" fontSize="10">Consistency</text>
  <text x="177" y="80"  textAnchor="middle" fill="#888" fontSize="8">一致性</text>
  <text x="177" y="96"  textAnchor="middle" fill="#888" fontSize="8">constraints hold</text>
  <text x="177" y="110" textAnchor="middle" fill="#888" fontSize="7">FK, CHECK, UNIQUE</text>
  <text x="177" y="124" textAnchor="middle" fill="#888" fontSize="7">application invariants</text>
  <rect x="240" y="20" width="105" height="140" rx="8" fill="rgba(63,185,80,0.06)" stroke="#3fb950" strokeWidth="1.4"/>
  <text x="292" y="44"  textAnchor="middle" fill="#3fb950" fontSize="12" fontWeight="700">I</text>
  <text x="292" y="62"  textAnchor="middle" fill="#3fb950" fontSize="10">Isolation</text>
  <text x="292" y="80"  textAnchor="middle" fill="#888" fontSize="8">隔离性</text>
  <text x="292" y="96"  textAnchor="middle" fill="#888" fontSize="8">txns don't interfere</text>
  <text x="292" y="110" textAnchor="middle" fill="#888" fontSize="7">MVCC + locks</text>
  <text x="292" y="124" textAnchor="middle" fill="#888" fontSize="7">4 isolation levels</text>
  <rect x="355" y="20" width="115" height="140" rx="8" fill="rgba(210,168,255,0.06)" stroke="#d2a8ff" strokeWidth="1.4"/>
  <text x="412" y="44"  textAnchor="middle" fill="#d2a8ff" fontSize="12" fontWeight="700">D</text>
  <text x="412" y="62"  textAnchor="middle" fill="#d2a8ff" fontSize="10">Durability</text>
  <text x="412" y="80"  textAnchor="middle" fill="#888" fontSize="8">持久性</text>
  <text x="412" y="96"  textAnchor="middle" fill="#888" fontSize="8">committed = permanent</text>
  <text x="412" y="110" textAnchor="middle" fill="#888" fontSize="7">WAL + fsync</text>
  <text x="412" y="124" textAnchor="middle" fill="#888" fontSize="7">replication for HA</text>
</svg>`,
    code: `-- ACID in practice

-- Atomicity: all steps succeed or all rolled back
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
-- if second fails, first is automatically rolled back
COMMIT;   -- or ROLLBACK;

-- Isolation anomalies and levels:
-- Dirty Read:         READ UNCOMMITTED (SQL Server only)
-- Non-repeatable Read: READ COMMITTED (PostgreSQL default)
-- Phantom Read:       REPEATABLE READ
-- Serialization:      SERIALIZABLE (SSI or 2PL)

SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN;
SELECT qty FROM inventory WHERE id = 1;   -- 10
-- another txn concurrently: UPDATE SET qty=0
UPDATE inventory SET qty = qty - 5 WHERE id = 1;
COMMIT;   -- serializable: either succeeds fully or gets serialization_failure error

-- Savepoints for partial rollback
BEGIN;
INSERT INTO orders VALUES (1, 'pending');
SAVEPOINT before_payment;
UPDATE payments SET status='paid' WHERE order_id=1;
-- if payment fails:
ROLLBACK TO before_payment;
UPDATE orders SET status='failed' WHERE id=1;
COMMIT;`,
    codeTitle_zh: 'ACID 事务 SQL', codeTitle_en: 'ACID Transaction SQL',
    notes_zh: '隔离性是 ACID 中最复杂的。SQL 标准定义 4 个隔离级别，但不同数据库实现差异很大（PostgreSQL 的 REPEATABLE READ 实际上没有幻读，因为用的是 MVCC 而非锁）。SERIALIZABLE 隔离级别最安全但性能最低。',
    notes_en: 'Isolation is the most complex part of ACID. SQL standard defines 4 levels, but implementations differ significantly (PostgreSQL\'s REPEATABLE READ has no phantom reads because it uses MVCC snapshots, not locks). SERIALIZABLE is safest but most expensive.',
    concepts_zh: [
      { term: 'dirty read', def: '读到另一个未提交事务的数据。READ UNCOMMITTED 允许，其他级别禁止。实际很少用。' },
      { term: 'phantom read', def: '同一事务两次查询返回不同行集（另一事务 INSERT/DELETE）。REPEATABLE READ 在 PG 中已防止。' },
      { term: '2PC (两阶段提交)', def: '分布式事务协议：prepare 阶段所有参与者确认可以提交，commit 阶段统一提交。Coordinator 崩溃会阻塞。' },
      { term: 'Sagas', def: '长事务的替代方案：分解为多个本地事务，通过补偿事务（compensating tx）实现最终一致性。' },
    ],
    concepts_en: [
      { term: 'dirty read', def: 'Reading uncommitted data from another transaction. Allowed only at READ UNCOMMITTED. Rarely used in practice.' },
      { term: 'phantom read', def: 'Same query returns different row sets in one transaction (another txn INSERT/DELETE). PostgreSQL REPEATABLE READ prevents this via MVCC.' },
      { term: '2PC (Two-Phase Commit)', def: 'Distributed transaction protocol: prepare phase (all participants confirm), then commit. Coordinator crash blocks all participants.' },
      { term: 'Sagas', def: 'Alternative to long transactions: decompose into local transactions + compensating transactions for eventual consistency.' },
    ],
  },
  {
    id: 'lsm', icon: '📚', color: '#79c0ff',
    label_zh: 'LSM Tree', label_en: 'LSM Tree',
    desc_zh: 'Log-Structured Merge Tree 把所有写入转换为顺序 I/O，写吞吐量极高。RocksDB/LevelDB/Cassandra/ClickHouse 使用此结构。适合写多读少场景。',
    desc_en: 'Log-Structured Merge Tree converts all writes to sequential I/O for extremely high write throughput. Used by RocksDB/LevelDB/Cassandra/ClickHouse. Best for write-heavy workloads.',
    diagram: `<svg viewBox="0 0 480 190" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <defs>
    <marker id="arrowL" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="#888"/>
    </marker>
  </defs>
  <!-- Write path -->
  <rect x="10"  y="10" width="90" height="40" rx="6" fill="rgba(121,192,255,0.1)" stroke="#79c0ff" strokeWidth="1.4"/>
  <text x="55"  y="34" textAnchor="middle" fill="#79c0ff" fontSize="10" fontWeight="700">Write</text>
  <line x1="102" y1="30" x2="130" y2="30" stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowL)"/>
  <!-- WAL -->
  <rect x="133" y="10" width="70" height="40" rx="6" fill="rgba(240,136,62,0.08)" stroke="#f0883e" strokeWidth="1.2"/>
  <text x="168" y="26" textAnchor="middle" fill="#f0883e" fontSize="8">WAL</text>
  <text x="168" y="40" textAnchor="middle" fill="#888" fontSize="7">(sequential)</text>
  <line x1="205" y1="30" x2="230" y2="30" stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowL)"/>
  <!-- Memtable -->
  <rect x="233" y="10" width="90" height="40" rx="6" fill="rgba(63,185,80,0.1)" stroke="#3fb950" strokeWidth="1.4"/>
  <text x="278" y="26" textAnchor="middle" fill="#3fb950" fontSize="9" fontWeight="700">Memtable</text>
  <text x="278" y="40" textAnchor="middle" fill="#888" fontSize="7">in-memory sorted</text>
  <!-- flush -->
  <line x1="278" y1="52" x2="278" y2="75" stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowL)" strokeDasharray="4,2"/>
  <text x="295" y="68" fill="#888" fontSize="7">flush (immutable)</text>
  <!-- L0 SSTables -->
  <rect x="60" y="80" width="360" height="28" rx="5" fill="rgba(88,166,255,0.08)" stroke="#58a6ff" strokeWidth="1.2"/>
  <text x="240" y="98" textAnchor="middle" fill="#58a6ff" fontSize="9" fontWeight="600">L0 SSTables (may overlap)</text>
  <!-- compaction -->
  <line x1="240" y1="110" x2="240" y2="126" stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowL)" strokeDasharray="4,2"/>
  <text x="290" y="122" fill="#888" fontSize="7">compaction</text>
  <!-- L1 -->
  <rect x="40" y="130" width="400" height="22" rx="4" fill="rgba(88,166,255,0.06)" stroke="#58a6ff" strokeWidth="1"/>
  <text x="240" y="145" textAnchor="middle" fill="#58a6ff" fontSize="8">L1 SSTables (sorted, non-overlapping, larger)</text>
  <line x1="240" y1="154" x2="240" y2="168" stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowL)" strokeDasharray="4,2"/>
  <!-- L2 -->
  <rect x="20" y="170" width="440" height="14" rx="3" fill="rgba(88,166,255,0.04)" stroke="#58a6ff" strokeWidth="0.8"/>
  <text x="240" y="181" textAnchor="middle" fill="#888" fontSize="7">L2 (10× larger) ... Lmax (disk)</text>
</svg>`,
    code: `// RocksDB C++ API (used by MySQL MyRocks, TiKV, etc.)
#include "rocksdb/db.h"

rocksdb::DB* db;
rocksdb::Options options;
options.create_if_missing = true;
options.compression = rocksdb::kLZ4Compression;
options.write_buffer_size = 64 << 20;    // 64MB memtable

rocksdb::DB::Open(options, "/data/mydb", &db);

// Write (always O(1) — goes to memtable)
db->Put(rocksdb::WriteOptions(), "key", "value");

// Batch write (atomic)
rocksdb::WriteBatch batch;
batch.Put("k1", "v1");
batch.Delete("k2");
db->Write(rocksdb::WriteOptions(), &batch);

// Read (checks memtable, L0, L1, ... Lmax)
std::string value;
db->Get(rocksdb::ReadOptions(), "key", &value);

// Range scan (merge iterators across all levels)
auto it = db->NewIterator(rocksdb::ReadOptions());
for (it->SeekToFirst(); it->Valid(); it->Next()) {
    std::cout << it->key().ToString() << ": " << it->value().ToString();
}

// Compaction tuning
options.level0_file_num_compaction_trigger = 4;
options.max_bytes_for_level_base = 256 << 20;  // 256MB`,
    codeTitle_zh: 'RocksDB 代码', codeTitle_en: 'RocksDB Code',
    notes_zh: 'LSM tree 的写放大（Write Amplification）是主要缺点：一条数据在 compaction 过程中可能被写入磁盘多次（通常 10-30×）。读放大（Read Amplification）也存在：查找一个键需要检查所有层级。Bloom filter 可大幅减少读放大（不存在的键快速返回）。',
    notes_en: 'LSM tree\'s main downside is write amplification: one record may be written to disk multiple times during compaction (typically 10-30×). Read amplification: finding a key requires checking all levels. Bloom filters greatly reduce read amplification (quickly reject absent keys).',
    concepts_zh: [
      { term: 'SSTable', def: 'Sorted String Table——有序不可变的键值文件，内含数据块、索引块、布隆过滤器、压缩。' },
      { term: 'Compaction', def: '后台合并多个 SSTable，删除过期版本，保持各层大小限制。Level 策略 vs FIFO vs Universal。' },
      { term: 'Bloom Filter', def: '概率型数据结构，判断键"可能存在"或"一定不存在"，误判率可配置（通常 1%）。节省大量 I/O。' },
      { term: 'MANIFEST', def: 'RocksDB 记录所有 SSTable 文件和层级关系的元数据日志。类似 WAL 但用于文件系统状态。' },
    ],
    concepts_en: [
      { term: 'SSTable', def: 'Sorted String Table — sorted immutable key-value file with data blocks, index block, Bloom filter, compression.' },
      { term: 'Compaction', def: 'Background merging of SSTables, removing stale versions, maintaining per-level size limits. Level vs FIFO vs Universal strategies.' },
      { term: 'Bloom Filter', def: 'Probabilistic structure: "definitely absent" or "maybe present." Configurable false positive rate (~1%). Saves massive I/O.' },
      { term: 'MANIFEST', def: 'RocksDB metadata log recording all SSTable files and their level assignments. Like a WAL but for filesystem state.' },
    ],
  },
  {
    id: 'replication', icon: '🔄', color: '#f0883e',
    label_zh: '复制与分片', label_en: 'Replication & Sharding',
    desc_zh: '复制（Replication）提供高可用和读扩展；分片（Sharding）提供写扩展和容量扩展。CAP 定理指出分区容错时，一致性和可用性不可兼得。',
    desc_en: 'Replication provides high availability and read scaling; sharding provides write scaling and capacity scaling. CAP theorem: under network partition, consistency and availability are mutually exclusive.',
    diagram: `<svg viewBox="0 0 480 180" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <defs>
    <marker id="arrowRep" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="#888"/>
    </marker>
  </defs>
  <!-- Replication side -->
  <text x="110" y="18" textAnchor="middle" fill="#ccc" fontSize="10" fontWeight="700">主从复制 (Replication)</text>
  <rect x="50"  y="28" width="120" height="50" rx="7" fill="rgba(240,136,62,0.08)" stroke="#f0883e" strokeWidth="1.5"/>
  <text x="110" y="48" textAnchor="middle" fill="#f0883e" fontSize="10" fontWeight="700">Primary</text>
  <text x="110" y="64" textAnchor="middle" fill="#888" fontSize="8">writes + reads</text>
  <line x1="110" y1="80" x2="60"  y2="108" stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowRep)"/>
  <line x1="110" y1="80" x2="160" y2="108" stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowRep)"/>
  <text x="70"  y="96" fill="#888" fontSize="7">WAL stream</text>
  <rect x="20"  y="110" width="80" height="40" rx="5" fill="rgba(88,166,255,0.06)" stroke="#58a6ff" strokeWidth="1.2"/>
  <text x="60"  y="128" textAnchor="middle" fill="#58a6ff" fontSize="9">Replica 1</text>
  <text x="60"  y="143" textAnchor="middle" fill="#888" fontSize="7">reads only</text>
  <rect x="120" y="110" width="80" height="40" rx="5" fill="rgba(88,166,255,0.06)" stroke="#58a6ff" strokeWidth="1.2"/>
  <text x="160" y="128" textAnchor="middle" fill="#58a6ff" fontSize="9">Replica 2</text>
  <text x="160" y="143" textAnchor="middle" fill="#888" fontSize="7">reads only</text>
  <!-- Sharding side -->
  <line x1="240" y1="10" x2="240" y2="175" stroke="#333" strokeWidth="1" strokeDasharray="4,3"/>
  <text x="360" y="18" textAnchor="middle" fill="#ccc" fontSize="10" fontWeight="700">水平分片 (Sharding)</text>
  <rect x="260" y="28" width="200" height="30" rx="6" fill="rgba(63,185,80,0.06)" stroke="#3fb950" strokeWidth="1.2"/>
  <text x="360" y="47" textAnchor="middle" fill="#3fb950" fontSize="9">Router / Proxy (consistent hash)</text>
  <line x1="310" y1="60" x2="280" y2="88" stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowRep)"/>
  <line x1="360" y1="60" x2="360" y2="88" stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowRep)"/>
  <line x1="410" y1="60" x2="440" y2="88" stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowRep)"/>
  <rect x="250" y="90" width="80" height="50" rx="5" fill="rgba(88,166,255,0.06)" stroke="#58a6ff" strokeWidth="1.2"/>
  <text x="290" y="112" textAnchor="middle" fill="#58a6ff" fontSize="8">Shard 0</text>
  <text x="290" y="127" textAnchor="middle" fill="#888" fontSize="7">uid % 3 == 0</text>
  <rect x="340" y="90" width="80" height="50" rx="5" fill="rgba(88,166,255,0.06)" stroke="#58a6ff" strokeWidth="1.2"/>
  <text x="380" y="112" textAnchor="middle" fill="#58a6ff" fontSize="8">Shard 1</text>
  <text x="380" y="127" textAnchor="middle" fill="#888" fontSize="7">uid % 3 == 1</text>
  <rect x="430" y="90" width="40" height="50" rx="5" fill="rgba(88,166,255,0.06)" stroke="#58a6ff" strokeWidth="1.2"/>
  <text x="450" y="120" textAnchor="middle" fill="#58a6ff" fontSize="8">S2</text>
</svg>`,
    code: `-- PostgreSQL streaming replication setup (primary)
-- postgresql.conf:
wal_level = replica
max_wal_senders = 5
synchronous_standby_names = 'standby1'  -- sync replication

-- pg_hba.conf:
-- host replication replica 192.168.1.0/24 md5

-- Start standby (replica):
pg_basebackup -h primary -U replica -D /var/lib/postgresql/data -P -Xs -R
-- -Xs: stream WAL while copying  -R: write recovery.conf

-- Failover (promote standby):
pg_ctl promote -D /var/lib/postgresql/data
-- or: SELECT pg_promote();

-- MySQL Group Replication (multi-primary, Paxos-based)
INSTALL PLUGIN group_replication SONAME 'group_replication.so';
SET GLOBAL group_replication_bootstrap_group=ON;
START GROUP_REPLICATION;

-- Sharding: application-level (e.g., Go)
func getShard(userID int) *sql.DB {
    return shards[userID % len(shards)]
}

-- Vitess (YouTube) / Citus (PostgreSQL) for transparent sharding`,
    codeTitle_zh: '复制与分片配置', codeTitle_en: 'Replication & Sharding Config',
    notes_zh: 'CAP 定理：P（分区容错）在生产中无法放弃，所以实际上是选 CP（强一致，如 Zookeeper/etcd）还是 AP（高可用，如 Cassandra/DynamoDB）。同步复制（sync）保证强一致但增加写延迟；异步复制（async）延迟低但主库崩溃可能丢数据。',
    notes_en: 'CAP theorem: P (partition tolerance) cannot be abandoned in production, so the real choice is CP (strong consistency, e.g., Zookeeper/etcd) vs AP (high availability, e.g., Cassandra/DynamoDB). Synchronous replication guarantees strong consistency but increases write latency; async replication is fast but may lose data if the primary crashes.',
    concepts_zh: [
      { term: 'Raft / Paxos', def: '分布式共识算法。Raft 更易理解：leader 选举 + 日志复制，超过半数节点确认才 commit。etcd/TiKV 使用。' },
      { term: 'Read-your-writes', def: '用户写入后立即读自己的写入应该能看到。sticky session 或读路由到 primary 可解决。' },
      { term: 'Cross-shard query', def: '跨分片 JOIN/聚合需要在 proxy 层收集所有分片结果再合并，是 sharding 的最大痛点。' },
      { term: 'Consistent Hashing', def: '节点增减时只迁移 1/n 的数据（而非 full rehash）。虚拟节点（vnodes）使分布更均匀。' },
    ],
    concepts_en: [
      { term: 'Raft / Paxos', def: 'Distributed consensus algorithms. Raft is easier to understand: leader election + log replication, commit when majority confirms. Used by etcd/TiKV.' },
      { term: 'Read-your-writes', def: 'After a user writes, they should immediately see their own write. Fix: sticky session or route reads to primary.' },
      { term: 'Cross-shard query', def: 'Cross-shard JOINs/aggregations need proxy-level scatter-gather — the biggest pain point of sharding.' },
      { term: 'Consistent Hashing', def: 'When adding/removing nodes, only 1/n data moves (vs full rehash). Virtual nodes (vnodes) improve balance.' },
    ],
  },
]

export default function DatabaseView() {
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
      <div style={{ padding: '12px 10px 6px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.6, textTransform: 'uppercase' }}>{isZh ? '数据库原理' : 'DB Internals'}</div>
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
