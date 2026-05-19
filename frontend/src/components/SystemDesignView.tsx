import { useState, ReactNode } from 'react'
import { useMobile } from '../hooks/useMobile'
import { useLang } from '../i18n/lang'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Topic {
  id: string; icon: string; name_zh: string; name_en: string; category: string
}

// ── Topic list ────────────────────────────────────────────────────────────────
const TOPICS: Topic[] = [
  { id: 'url_shortener',   icon: '🔗', name_zh: 'URL 短链',    name_en: 'URL Shortener',    category: 'classic' },
  { id: 'rate_limiter',    icon: '🚦', name_zh: '限流器',       name_en: 'Rate Limiter',     category: 'classic' },
  { id: 'cache',           icon: '⚡', name_zh: '缓存系统',     name_en: 'Cache System',     category: 'classic' },
  { id: 'mq',              icon: '📨', name_zh: '消息队列',     name_en: 'Message Queue',    category: 'classic' },
  { id: 'load_balancer',   icon: '⚖',  name_zh: '负载均衡',     name_en: 'Load Balancer',    category: 'classic' },
  { id: 'id_gen',          icon: '🆔', name_zh: '分布式 ID',    name_en: 'Distributed ID',   category: 'classic' },
  { id: 'consistent_hash', icon: '🔄', name_zh: '一致性哈希',   name_en: 'Consistent Hash',  category: 'classic' },
  { id: 'twitter',         icon: '🐦', name_zh: 'Twitter Feed', name_en: 'Twitter Feed',     category: 'real' },
  { id: 'youtube',         icon: '▶',  name_zh: 'YouTube',      name_en: 'YouTube',          category: 'real' },
  { id: 'uber',            icon: '🚗', name_zh: 'Uber 打车',    name_en: 'Uber Ride',        category: 'real' },
  { id: 'search',          icon: '🔍', name_zh: '搜索引擎',     name_en: 'Search Engine',    category: 'real' },
  { id: 'chat',            icon: '💬', name_zh: '即时通讯',     name_en: 'Chat System',      category: 'real' },
  { id: 'db_select',       icon: '🗄',  name_zh: 'DB 选型',      name_en: 'DB Selection',     category: 'tech' },
  { id: 'cap',             icon: '📐', name_zh: 'CAP 定理',     name_en: 'CAP Theorem',      category: 'tech' },
  { id: 'checklist',       icon: '✅', name_zh: '答题框架',     name_en: 'Interview Framework', category: 'tech' },
]

const CAT_LABELS_ZH: Record<string, string> = { classic: '经典组件', real: '真实系统', tech: '技术选型' }
const CAT_LABELS_EN: Record<string, string> = { classic: 'Classic', real: 'Real Systems', tech: 'Tech' }

// ── Detail content ─────────────────────────────────────────────────────────────
function getDetails(isZh: boolean): Record<string, React.ReactNode> {
  const t = (zh: ReactNode, en: ReactNode) => isZh ? zh : en

  return {

    checklist: <div>
      <h3 style={{color:'#4d8fff',marginTop:0}}>{t('✅ 系统设计答题框架 (45 min)', '✅ System Design Interview Framework (45 min)')}</h3>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {[
          { time:'0–5 min',  title: t('① 澄清需求', '① Clarify Requirements'),    color:'#56d364',
            points: isZh
              ? ['DAU / QPS 量级？','读写比例？','一致性要求？（强一致 / 最终一致）','可用性 SLA？（99.9% = 8.7h/y 停机）','功能范围（去掉次要功能）']
              : ['DAU / QPS scale?','Read/write ratio?','Consistency: strong vs eventual?','Availability SLA? (99.9% = 8.7h/y downtime)','Feature scope (drop secondary features)'] },
          { time:'5–10 min', title: t('② 容量估算', '② Capacity Estimation'),    color:'#ffa657',
            points: isZh
              ? ['存储量 = 数据量 × 副本数','带宽 = QPS × 平均包大小','缓存内存 = 热数据 20% × 数据总量','服务器台数 = QPS / 单机 TPS']
              : ['Storage = data size × replicas','Bandwidth = QPS × avg packet size','Cache = 20% hot data × total','Server count = QPS / single-machine TPS'] },
          { time:'10–20 min',title: t('③ 高层设计', '③ High-Level Design'),    color:'#79c0ff',
            points: isZh
              ? ['画出核心服务 + 数据流','选型：SQL vs NoSQL、MQ 种类、CDN','读写分离、分库分表策略','API 设计（RESTful / gRPC）']
              : ['Draw core services + data flow','Choose: SQL vs NoSQL, MQ type, CDN','Read/write split, sharding strategy','API design (RESTful / gRPC)'] },
          { time:'20–35 min',title: t('④ 深入设计', '④ Deep Dive'),    color:'#d2a8ff',
            points: isZh
              ? ['最核心的 1-2 个子系统详细展开','数据模型 / Schema','缓存策略（Cache Aside / Write Through）','一致性方案（分布式锁 / 2PC / Saga）']
              : ['Drill into 1-2 core subsystems','Data model / Schema','Cache strategy (Cache Aside / Write Through)','Consistency (distributed lock / 2PC / Saga)'] },
          { time:'35–45 min',title: t('⑤ 瓶颈 & 改进', '⑤ Bottlenecks & Improvements'), color:'#ff7b72',
            points: isZh
              ? ['单点故障在哪？如何消除？','热点数据如何处理？','监控 / 告警 / 降级方案','未来 10× 流量如何扩展？']
              : ['Where is the SPOF? How to eliminate?','How to handle hotspot data?','Monitoring / alerting / graceful degradation','How to scale 10× traffic in the future?'] },
        ].map(step => (
          <div key={step.time} style={{background:'var(--bg-secondary)',borderRadius:8,padding:'12px 14px',border:`1px solid ${step.color}40`}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <span style={{background:step.color,color:'#000',borderRadius:4,padding:'2px 8px',fontSize:11,fontWeight:700}}>{step.time}</span>
              <span style={{fontWeight:700,color:step.color,fontSize:14}}>{step.title}</span>
            </div>
            <ul style={{margin:0,paddingLeft:18}}>
              {step.points.map((p,i)=><li key={i} style={{fontSize:12,color:'var(--text-secondary)',marginBottom:4}}>{p}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>,

    cap: <div>
      <h3 style={{color:'#4d8fff',marginTop:0}}>{t('📐 CAP 定理 & BASE / ACID', '📐 CAP Theorem & BASE / ACID')}</h3>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
        {[
          { letter:'C', name:'Consistency',    color:'#56d364', desc: t('每次读都能拿到最新写入（或报错）', 'Every read gets the most recent write (or error)') },
          { letter:'A', name:'Availability',   color:'#ffa657', desc: t('每次请求都有响应（不一定最新）', 'Every request gets a response (not necessarily latest)') },
          { letter:'P', name:'Partition Tol.', color:'#79c0ff', desc: t('网络分区时系统仍能运作', 'System still functions during network partition') },
        ].map(c=>(
          <div key={c.letter} style={{background:`${c.color}15`,border:`1px solid ${c.color}40`,borderRadius:8,padding:'12px 14px',textAlign:'center'}}>
            <div style={{fontSize:32,fontWeight:900,color:c.color}}>{c.letter}</div>
            <div style={{fontSize:12,fontWeight:700,color:c.color,marginBottom:4}}>{c.name}</div>
            <div style={{fontSize:11,color:'var(--text-muted)'}}>{c.desc}</div>
          </div>
        ))}
      </div>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,marginBottom:12,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,marginBottom:8,fontSize:13}}>🗄 {t('系统倾向对比', 'System Comparison')}</div>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
          <thead><tr style={{color:'var(--text-muted)'}}>
            <th style={{textAlign:'left',padding:'4px 8px'}}>{t('系统', 'System')}</th>
            <th style={{textAlign:'left',padding:'4px 8px'}}>{t('舍弃', 'Sacrifice')}</th>
            <th style={{textAlign:'left',padding:'4px 8px'}}>{t('选择', 'Choose')}</th>
            <th style={{textAlign:'left',padding:'4px 8px'}}>{t('场景', 'Use Case')}</th>
          </tr></thead>
          <tbody>
            {(isZh ? [
              ['MySQL/PostgreSQL','P（单机）','C + A','金融、电商订单'],
              ['Cassandra','C','A + P','日志、IoT、时序数据'],
              ['HBase','A','C + P','离线分析、大数据'],
              ['Zookeeper','A','C + P','分布式协调、配置'],
              ['DynamoDB','C','A + P','购物车、会话'],
            ] : [
              ['MySQL/PostgreSQL','P (single node)','C + A','Finance, e-commerce orders'],
              ['Cassandra','C','A + P','Logs, IoT, time-series'],
              ['HBase','A','C + P','Offline analytics, big data'],
              ['Zookeeper','A','C + P','Distributed coordination, config'],
              ['DynamoDB','C','A + P','Shopping cart, sessions'],
            ]).map(([sys,lose,keep,scene],i)=>(
              <tr key={i} style={{borderTop:'1px solid var(--border)'}}>
                <td style={{padding:'5px 8px',fontWeight:600,color:'#79c0ff'}}>{sys}</td>
                <td style={{padding:'5px 8px',color:'#ff7b72'}}>{t('舍 ', 'Drop ')}{lose}</td>
                <td style={{padding:'5px 8px',color:'#56d364'}}>{keep}</td>
                <td style={{padding:'5px 8px',color:'var(--text-secondary)'}}>{scene}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,marginBottom:8,fontSize:13}}>ACID vs BASE</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div style={{background:'#56d36415',borderRadius:6,padding:10,border:'1px solid #56d36440'}}>
            <div style={{fontWeight:700,color:'#56d364',marginBottom:4}}>{t('ACID（强一致）', 'ACID (Strong Consistency)')}</div>
            <div style={{fontSize:11,color:'var(--text-muted)',lineHeight:1.8}}>Atomicity {t('原子性','')}<br/>Consistency {t('一致性','')}<br/>Isolation {t('隔离性','')}<br/>Durability {t('持久性','')}</div>
            <div style={{fontSize:11,color:'var(--text-secondary)',marginTop:6}}>→ MySQL, PostgreSQL</div>
          </div>
          <div style={{background:'#ffa65715',borderRadius:6,padding:10,border:'1px solid #ffa65740'}}>
            <div style={{fontWeight:700,color:'#ffa657',marginBottom:4}}>{t('BASE（最终一致）', 'BASE (Eventually Consistent)')}</div>
            <div style={{fontSize:11,color:'var(--text-muted)',lineHeight:1.8}}>Basically Available<br/>Soft state<br/>Eventually consistent</div>
            <div style={{fontSize:11,color:'var(--text-secondary)',marginTop:6}}>→ Cassandra, DynamoDB</div>
          </div>
        </div>
      </div>
    </div>,

    db_select: <div>
      <h3 style={{color:'#4d8fff',marginTop:0}}>{t('🗄 数据库选型指南', '🗄 Database Selection Guide')}</h3>
      {(isZh ? [
        { name:'关系型 SQL',   color:'#4d8fff', examples:'MySQL · PostgreSQL · CockroachDB',
          use:'事务性业务（订单/支付/用户）', avoid:'海量写、无结构数据',
          props:['ACID 事务','外键约束','复杂 JOIN','水平扩展难'] },
        { name:'文档型 NoSQL', color:'#56d364', examples:'MongoDB · Firestore · CouchDB',
          use:'内容/产品目录、半结构化数据', avoid:'多表 JOIN、强事务',
          props:['灵活 Schema','嵌套文档','水平扩展易','弱事务'] },
        { name:'KV 存储',      color:'#ffa657', examples:'Redis · DynamoDB · etcd',
          use:'缓存、会话、排行榜、分布式锁', avoid:'复杂查询',
          props:['O(1) 读写','TTL 支持','高吞吐','数据结构丰富（Redis）'] },
        { name:'列族 NoSQL',   color:'#d2a8ff', examples:'Cassandra · HBase · Bigtable',
          use:'时序/IoT/日志，超大写入', avoid:'随机读、事务',
          props:['写优化（LSM-Tree）','列压缩','线性扩展','最终一致'] },
        { name:'搜索引擎',     color:'#79c0ff', examples:'Elasticsearch · Meilisearch · Typesense',
          use:'全文检索、日志分析', avoid:'作为主存储',
          props:['倒排索引','分词','聚合分析','准实时'] },
        { name:'时序数据库',   color:'#e3b341', examples:'InfluxDB · TimescaleDB · Prometheus',
          use:'监控指标、金融行情', avoid:'通用业务',
          props:['时间分区','自动降采样','高效压缩','滚动窗口查询'] },
        { name:'图数据库',     color:'#ff7b72', examples:'Neo4j · Neptune · TigerGraph',
          use:'社交关系、推荐系统、知识图谱', avoid:'无图结构业务',
          props:['原生图遍历','深度关系查询','Cypher 语言'] },
      ] : [
        { name:'Relational SQL', color:'#4d8fff', examples:'MySQL · PostgreSQL · CockroachDB',
          use:'Transactional (orders/payment/users)', avoid:'Massive writes, unstructured data',
          props:['ACID transactions','Foreign key constraints','Complex JOINs','Hard to scale horizontally'] },
        { name:'Document NoSQL', color:'#56d364', examples:'MongoDB · Firestore · CouchDB',
          use:'Content/catalogs, semi-structured data', avoid:'Multi-table JOIN, strong transactions',
          props:['Flexible schema','Nested documents','Easy horizontal scale','Weak transactions'] },
        { name:'Key-Value Store', color:'#ffa657', examples:'Redis · DynamoDB · etcd',
          use:'Cache, sessions, leaderboards, distributed locks', avoid:'Complex queries',
          props:['O(1) read/write','TTL support','High throughput','Rich data types (Redis)'] },
        { name:'Column-Family NoSQL', color:'#d2a8ff', examples:'Cassandra · HBase · Bigtable',
          use:'Time-series/IoT/logs, massive writes', avoid:'Random reads, transactions',
          props:['Write-optimized (LSM-Tree)','Column compression','Linear scale','Eventually consistent'] },
        { name:'Search Engine', color:'#79c0ff', examples:'Elasticsearch · Meilisearch · Typesense',
          use:'Full-text search, log analysis', avoid:'Primary storage',
          props:['Inverted index','Tokenization','Aggregation','Near real-time'] },
        { name:'Time-Series DB', color:'#e3b341', examples:'InfluxDB · TimescaleDB · Prometheus',
          use:'Metrics, financial data', avoid:'General business logic',
          props:['Time partitioning','Auto downsampling','Efficient compression','Rolling window queries'] },
        { name:'Graph DB', color:'#ff7b72', examples:'Neo4j · Neptune · TigerGraph',
          use:'Social graph, recommendations, knowledge graph', avoid:'Non-graph workloads',
          props:['Native graph traversal','Deep relationship queries','Cypher query language'] },
      ]).map(db=>(
        <div key={db.name} style={{background:'var(--bg-secondary)',borderRadius:8,padding:'12px 14px',marginBottom:10,border:`1px solid ${db.color}30`}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6,flexWrap:'wrap'}}>
            <span style={{fontWeight:700,color:db.color,fontSize:13}}>{db.name}</span>
            <span style={{fontSize:11,color:'var(--text-muted)',background:'var(--bg-elevated)',padding:'2px 8px',borderRadius:4}}>{db.examples}</span>
          </div>
          <div style={{display:'flex',gap:16,fontSize:11,marginBottom:6,flexWrap:'wrap'}}>
            <span><span style={{color:'#56d364'}}>{t('✓ 用于：', '✓ Best for: ')}</span><span style={{color:'var(--text-secondary)'}}>{db.use}</span></span>
            <span><span style={{color:'#ff7b72'}}>{t('✗ 避免：', '✗ Avoid: ')}</span><span style={{color:'var(--text-secondary)'}}>{db.avoid}</span></span>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {db.props.map(p=><span key={p} style={{fontSize:10,padding:'2px 8px',borderRadius:4,background:`${db.color}15`,color:db.color}}>{p}</span>)}
          </div>
        </div>
      ))}
    </div>,

    cache: <div>
      <h3 style={{color:'#4d8fff',marginTop:0}}>{t('⚡ 缓存系统设计', '⚡ Cache System Design')}</h3>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('缓存读写策略', 'Cache Read/Write Strategies')}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {(isZh ? [
              { name:'Cache Aside', color:'#56d364',
                read:'1. 读缓存 → hit 直接返回\n2. miss → 读 DB → 写缓存',
                write:'1. 写 DB\n2. 删缓存（避免并发脏数据）',
                note:'最常用；应用控制缓存逻辑' },
              { name:'Write Through', color:'#79c0ff',
                read:'直接读缓存（缓存是主存）',
                write:'同步写缓存 + DB',
                note:'一致性强；写延迟高' },
              { name:'Write Behind', color:'#ffa657',
                read:'读缓存',
                write:'只写缓存，异步批量刷 DB',
                note:'写性能极高；可能丢数据' },
              { name:'Read Through', color:'#d2a8ff',
                read:'缓存 miss 时由缓存层拉 DB',
                write:'写 DB（缓存失效）',
                note:'对应用透明；实现复杂' },
            ] : [
              { name:'Cache Aside', color:'#56d364',
                read:'1. Read cache → hit: return\n2. miss → read DB → write cache',
                write:'1. Write DB\n2. Invalidate cache (avoid dirty data)',
                note:'Most common; app manages cache logic' },
              { name:'Write Through', color:'#79c0ff',
                read:'Read from cache (cache is source of truth)',
                write:'Write cache + DB synchronously',
                note:'Strong consistency; higher write latency' },
              { name:'Write Behind', color:'#ffa657',
                read:'Read from cache',
                write:'Write cache only; flush DB async in batches',
                note:'Highest write performance; risk of data loss' },
              { name:'Read Through', color:'#d2a8ff',
                read:'Cache layer fetches DB on miss',
                write:'Write DB (cache invalidated)',
                note:'Transparent to app; complex to implement' },
            ]).map(s=>(
              <div key={s.name} style={{background:'var(--bg-elevated)',borderRadius:6,padding:10,border:`1px solid ${s.color}40`}}>
                <div style={{fontWeight:700,color:s.color,fontSize:12,marginBottom:6}}>{s.name}</div>
                <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:4}}>{t('读：','Read: ')}{s.read}</div>
                <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:4}}>{t('写：','Write: ')}{s.write}</div>
                <div style={{fontSize:10,color:'var(--text-secondary)',fontStyle:'italic'}}>{s.note}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('缓存淘汰策略', 'Cache Eviction Policies')}</div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {[
              { name:'LRU',  color:'#56d364', desc: t('最近最少使用，用 HashMap + 双向链表实现，O(1)。最常考', 'Least Recently Used — HashMap + doubly linked list, O(1). Most asked in interviews') },
              { name:'LFU',  color:'#79c0ff', desc: t('最少访问频次，需额外维护频次计数，实现复杂，Redis 4.0+ 支持', 'Least Frequently Used — requires frequency counter, complex; Redis 4.0+ supports it') },
              { name:'TTL',  color:'#ffa657', desc: t('设置过期时间，适合 session/token 等有时效性的数据', 'Time-based expiration, ideal for sessions/tokens with a natural lifespan') },
              { name:'FIFO', color:'#d2a8ff', desc: t('先进先出，简单但命中率低，适合顺序访问场景', 'First In First Out — simple but low hit rate, good for sequential access') },
            ].map(p=>(
              <div key={p.name} style={{display:'flex',gap:10,padding:'7px 10px',borderRadius:6,background:'var(--bg-elevated)'}}>
                <span style={{color:p.color,fontWeight:700,minWidth:36,fontSize:12}}>{p.name}</span>
                <span style={{fontSize:11,color:'var(--text-secondary)'}}>{p.desc}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('三大缓存问题', 'Three Classic Cache Problems')}</div>
          {(isZh ? [
            { name:'缓存穿透', color:'#ff7b72',
              desc:'查询不存在的 key，每次都打到 DB',
              fix:'① 缓存空值（TTL 短）\n② 布隆过滤器（Bloom Filter）拦截' },
            { name:'缓存击穿', color:'#ffa657',
              desc:'热点 key 过期瞬间，大量请求同时打到 DB',
              fix:'① 互斥锁（只有一个线程重建缓存）\n② 热点 key 永不过期 + 异步更新' },
            { name:'缓存雪崩', color:'#d2a8ff',
              desc:'大量 key 同时过期，或 Redis 宕机',
              fix:'① 过期时间加随机 jitter\n② Redis 集群 / 主从\n③ 降级熔断' },
          ] : [
            { name:'Cache Penetration', color:'#ff7b72',
              desc:'Queries for non-existent keys bypass cache and hit DB every time',
              fix:'① Cache null values (short TTL)\n② Bloom Filter to block invalid keys' },
            { name:'Cache Stampede', color:'#ffa657',
              desc:'Hot key expires; massive concurrent requests hit DB simultaneously',
              fix:'① Mutex lock (only one thread rebuilds cache)\n② Never-expire hot key + async refresh' },
            { name:'Cache Avalanche', color:'#d2a8ff',
              desc:'Mass expiration of many keys, or Redis goes down',
              fix:'① Add random jitter to expiry times\n② Redis cluster / replication\n③ Circuit breaker / graceful degradation' },
          ]).map(p=>(
            <div key={p.name} style={{marginBottom:10,padding:'10px 12px',borderRadius:6,background:'var(--bg-elevated)',border:`1px solid ${p.color}40`}}>
              <div style={{fontWeight:700,color:p.color,fontSize:12,marginBottom:4}}>{p.name}</div>
              <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:4}}>{p.desc}</div>
              <div style={{fontSize:11,color:'var(--text-secondary)',whiteSpace:'pre-line'}}>{p.fix}</div>
            </div>
          ))}
        </div>
      </div>
    </div>,

    rate_limiter: <div>
      <h3 style={{color:'#4d8fff',marginTop:0}}>{t('🚦 限流器设计', '🚦 Rate Limiter Design')}</h3>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('四种算法对比', 'Four Algorithms Compared')}</div>
          {(isZh ? [
            { name:'固定窗口 Fixed Window', color:'#56d364',
              pros:'实现简单，O(1) 空间',
              cons:'窗口边界可双倍流量（临界问题）',
              use:'低精度限流场景' },
            { name:'滑动窗口 Sliding Window Log', color:'#79c0ff',
              pros:'精确，无临界问题',
              cons:'内存 O(请求数)，高流量时占用大',
              use:'精度要求高，流量不大' },
            { name:'漏桶 Leaky Bucket', color:'#ffa657',
              pros:'输出速率恒定，保护下游',
              cons:'突发流量被压平，延迟增加',
              use:'网络整形，保护 DB' },
            { name:'令牌桶 Token Bucket', color:'#d2a8ff',
              pros:'允许突发（令牌积累），平均速率可控',
              cons:'实现稍复杂',
              use:'API 网关限流（最常用）' },
          ] : [
            { name:'Fixed Window', color:'#56d364',
              pros:'Simple, O(1) space',
              cons:'Double traffic at window boundary (edge problem)',
              use:'Low-precision rate limiting' },
            { name:'Sliding Window Log', color:'#79c0ff',
              pros:'Precise, no edge problem',
              cons:'O(requests) memory, high under heavy traffic',
              use:'High precision, moderate traffic' },
            { name:'Leaky Bucket', color:'#ffa657',
              pros:'Constant output rate, protects downstream',
              cons:'Bursts are flattened, increased latency',
              use:'Traffic shaping, DB protection' },
            { name:'Token Bucket', color:'#d2a8ff',
              pros:'Allows bursts (token accumulation), avg rate controlled',
              cons:'Slightly more complex to implement',
              use:'API gateway rate limiting (most common)' },
          ]).map(alg=>(
            <div key={alg.name} style={{marginBottom:8,padding:'10px 12px',borderRadius:6,background:'var(--bg-elevated)',border:`1px solid ${alg.color}40`}}>
              <div style={{fontWeight:700,color:alg.color,fontSize:12,marginBottom:6}}>{alg.name}</div>
              <div style={{display:'flex',gap:12,fontSize:11,flexWrap:'wrap'}}>
                <span><span style={{color:'#56d364'}}>{t('优：', 'Pros: ')}</span><span style={{color:'var(--text-secondary)'}}>{alg.pros}</span></span>
                <span><span style={{color:'#ff7b72'}}>{t('劣：', 'Cons: ')}</span><span style={{color:'var(--text-secondary)'}}>{alg.cons}</span></span>
                <span><span style={{color:'#ffa657'}}>{t('用：', 'Use: ')}</span><span style={{color:'var(--text-secondary)'}}>{alg.use}</span></span>
              </div>
            </div>
          ))}
        </div>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('Redis 分布式限流（令牌桶 Lua 脚本）', 'Redis Distributed Rate Limiting (Token Bucket Lua Script)')}</div>
          <pre style={{margin:0,fontSize:11,lineHeight:1.6,color:'#e6edf3',fontFamily:'monospace',overflow:'auto'}}>{`-- key: rate_limit:{user_id}
-- ARGV: capacity, refill_rate, now_ms, cost
local tokens = tonumber(redis.call('get', KEYS[1]) or ARGV[1])
local last    = tonumber(redis.call('get', KEYS[1]..':ts') or ARGV[3])
local delta   = math.max(0, tonumber(ARGV[3]) - last)
tokens = math.min(tonumber(ARGV[1]),
         tokens + delta * tonumber(ARGV[2]) / 1000)
if tokens >= tonumber(ARGV[4]) then
  redis.call('set', KEYS[1],        tokens - tonumber(ARGV[4]), 'PX', 60000)
  redis.call('set', KEYS[1]..':ts', ARGV[3],                   'PX', 60000)
  return 1  -- allowed
end
return 0  -- rejected`}</pre>
        </div>
      </div>
    </div>,

    consistent_hash: <div>
      <h3 style={{color:'#4d8fff',marginTop:0}}>{t('🔄 一致性哈希', '🔄 Consistent Hashing')}</h3>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('为什么需要一致性哈希？', 'Why Consistent Hashing?')}</div>
          <div style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.8}}>
            {t(
              <span>普通取模哈希 <code style={{color:'#56d364'}}>hash(key) % N</code>：增删节点时 <strong style={{color:'#ff7b72'}}>几乎所有 key 重新映射</strong>，导致大量缓存失效和数据迁移。<br/>一致性哈希：增删节点只影响相邻节点，平均只需迁移 <strong style={{color:'#56d364'}}>1/N</strong> 的数据。</span>,
              <span>Naive modular hashing <code style={{color:'#56d364'}}>hash(key) % N</code>: adding/removing a node <strong style={{color:'#ff7b72'}}>remaps almost all keys</strong>, causing cache misses and data migration.<br/>Consistent hashing: only the adjacent node is affected — on average only <strong style={{color:'#56d364'}}>1/N</strong> of keys need remapping.</span>
            )}
          </div>
        </div>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('虚拟节点（Virtual Nodes）', 'Virtual Nodes')}</div>
          <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:8,lineHeight:1.8}}>
            {t(
              <span>真实节点少时，环上分布不均。每个物理节点映射 <strong style={{color:'#ffa657'}}>100-200 个虚拟节点</strong>，使分布更均匀，并可按权重分配。</span>,
              <span>Few real nodes cause uneven distribution on the ring. Each physical node maps to <strong style={{color:'#ffa657'}}>100–200 virtual nodes</strong> for uniform distribution and weighted allocation.</span>
            )}
          </div>
          <pre style={{margin:0,fontSize:11,lineHeight:1.6,color:'#e6edf3',fontFamily:'monospace',overflow:'auto'}}>{`// Java TreeMap implementation
TreeMap<Long, String> ring = new TreeMap<>();
for (String node : nodes) {
    for (int i = 0; i < VNODES; i++) {
        long hash = md5(node + "#" + i);
        ring.put(hash, node);
    }
}
// Find node for a key
String getNode(String key) {
    long h = md5(key);
    Map.Entry<Long,String> e = ring.ceilingEntry(h);
    return e == null ? ring.firstEntry().getValue() : e.getValue();
}`}</pre>
        </div>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('使用场景', 'Use Cases')}</div>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            {(isZh ? [
              ['分布式缓存', 'Redis Cluster、Memcached 集群 key 路由'],
              ['负载均衡',   'Nginx upstream、数据库分库'],
              ['CDN',       '边缘节点选择'],
              ['P2P',       'DHT（分布式哈希表）节点发现'],
            ] : [
              ['Distributed Cache', 'Redis Cluster, Memcached key routing'],
              ['Load Balancing',    'Nginx upstream, DB sharding'],
              ['CDN',              'Edge node selection'],
              ['P2P',              'DHT (Distributed Hash Table) node discovery'],
            ]).map(([name,desc],i)=>(
              <div key={i} style={{display:'flex',gap:10,padding:'6px 10px',borderRadius:6,background:'var(--bg-elevated)'}}>
                <span style={{color:'#79c0ff',fontWeight:700,minWidth:70,fontSize:12}}>{name}</span>
                <span style={{fontSize:11,color:'var(--text-secondary)'}}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,

    id_gen: <div>
      <h3 style={{color:'#4d8fff',marginTop:0}}>{t('🆔 分布式 ID 生成', '🆔 Distributed ID Generation')}</h3>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {(isZh ? [
          { name:'UUID', color:'#56d364',
            pros:'无需协调，任意节点生成',
            cons:'128 bit 大、无序（B-tree 插入慢）、不可读',
            use:'非主键场景（追踪 ID）' },
          { name:'数据库自增 ID', color:'#79c0ff',
            pros:'有序、简单',
            cons:'单点瓶颈、分库后冲突',
            use:'小规模单库' },
          { name:'Snowflake', color:'#ffa657',
            pros:'有序、全局唯一、高性能（100k+/s）',
            cons:'依赖时钟（时钟回拨问题）',
            use:'Twitter、微博、分布式主键' },
          { name:'号段模式 (Leaf)', color:'#d2a8ff',
            pros:'DB 压力小（批量取号段）',
            cons:'号段用完前重启会浪费 ID',
            use:'美团 Leaf、滴滴 TinyID' },
          { name:'Redis INCR', color:'#ff7b72',
            pros:'简单、原子、有序',
            cons:'Redis 单点、重启需持久化',
            use:'短链 ID、优惠券流水号' },
        ] : [
          { name:'UUID', color:'#56d364',
            pros:'No coordination needed, any node generates',
            cons:'128-bit large, unordered (slow B-tree inserts), not human-readable',
            use:'Non-PK use cases (trace IDs)' },
          { name:'DB Auto-Increment', color:'#79c0ff',
            pros:'Ordered, simple',
            cons:'Single-point bottleneck, conflicts across shards',
            use:'Small-scale single database' },
          { name:'Snowflake', color:'#ffa657',
            pros:'Ordered, globally unique, high-performance (100k+/s)',
            cons:'Clock-dependent (clock drift problem)',
            use:'Twitter, Weibo, distributed primary keys' },
          { name:'Segment Mode (Leaf)', color:'#d2a8ff',
            pros:'Low DB pressure (fetch IDs in batches)',
            cons:'Restart before segment exhaustion wastes IDs',
            use:'Meituan Leaf, Didi TinyID' },
          { name:'Redis INCR', color:'#ff7b72',
            pros:'Simple, atomic, ordered',
            cons:'Redis single point, requires persistence on restart',
            use:'Short URL IDs, coupon sequence numbers' },
        ]).map(s=>(
          <div key={s.name} style={{background:'var(--bg-secondary)',borderRadius:8,padding:'12px 14px',border:`1px solid ${s.color}40`}}>
            <div style={{fontWeight:700,color:s.color,fontSize:13,marginBottom:6}}>{s.name}</div>
            <div style={{display:'flex',gap:12,fontSize:11,flexWrap:'wrap',marginBottom:4}}>
              <span><span style={{color:'#56d364'}}>✓ </span><span style={{color:'var(--text-secondary)'}}>{s.pros}</span></span>
              <span><span style={{color:'#ff7b72'}}>✗ </span><span style={{color:'var(--text-secondary)'}}>{s.cons}</span></span>
            </div>
            <div style={{fontSize:11,color:'var(--text-muted)'}}><span style={{color:'#ffa657'}}>{t('用于：', 'Used for: ')}</span>{s.use}</div>
          </div>
        ))}
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('Snowflake 64-bit 结构', 'Snowflake 64-bit Layout')}</div>
          <div style={{display:'flex',gap:2,marginBottom:8}}>
            {[
              {label: t('符号位','Sign'),     bits:1,  color:'#ff7b72'},
              {label: t('时间戳(ms)','Timestamp(ms)'), bits:41, color:'#ffa657'},
              {label: t('机器ID','Machine ID'),  bits:10, color:'#56d364'},
              {label: t('序列号','Seq No'),    bits:12, color:'#79c0ff'},
            ].map((f,i)=>(
              <div key={'sf-'+i} style={{flex:f.bits,background:f.color,borderRadius:4,padding:'6px 4px',textAlign:'center',minWidth:0}}>
                <div style={{fontSize:10,fontWeight:700,color:'#000'}}>{f.bits}bit</div>
                <div style={{fontSize:9,color:'#000'}}>{f.label}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:11,color:'var(--text-muted)',lineHeight:1.8}}>
            {t(
              <span>时间戳 41 bit → 可用 69 年（从 2010 年起）<br/>机器 ID 10 bit → 最多 1024 台机器<br/>序列号 12 bit → 每毫秒每机器 4096 个 ID</span>,
              <span>Timestamp 41-bit → 69 years (from epoch 2010)<br/>Machine ID 10-bit → up to 1024 machines<br/>Sequence 12-bit → 4096 IDs per machine per millisecond</span>
            )}
          </div>
        </div>
      </div>
    </div>,

    load_balancer: <div>
      <h3 style={{color:'#4d8fff',marginTop:0}}>{t('⚖ 负载均衡', '⚖ Load Balancer')}</h3>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('常见算法', 'Common Algorithms')}</div>
          {(isZh ? [
            { name:'轮询 Round Robin', color:'#56d364', desc:'依次分配，适合同构无状态服务' },
            { name:'加权轮询 Weighted RR', color:'#79c0ff', desc:'按机器权重比例分发，应对异构集群' },
            { name:'最少连接 Least Connections', color:'#ffa657', desc:'发给当前活跃连接最少的节点，适合长连接' },
            { name:'IP Hash', color:'#d2a8ff', desc:'同一 IP 打到同一节点（有状态服务 / 会话保持）' },
            { name:'一致性哈希', color:'#ff7b72', desc:'按请求 key 哈希，缓存类服务首选' },
            { name:'随机 Random', color:'#e3b341', desc:'简单随机，大流量下趋近均匀' },
          ] : [
            { name:'Round Robin', color:'#56d364', desc:'Cycles through servers in order; ideal for stateless homogeneous services' },
            { name:'Weighted Round Robin', color:'#79c0ff', desc:'Distributes proportionally to server weights; handles heterogeneous clusters' },
            { name:'Least Connections', color:'#ffa657', desc:'Routes to the node with fewest active connections; best for long-lived connections' },
            { name:'IP Hash', color:'#d2a8ff', desc:'Same client IP always hits the same node (sticky sessions / stateful services)' },
            { name:'Consistent Hash', color:'#ff7b72', desc:'Routes by request key hash; preferred for cache-tier services' },
            { name:'Random', color:'#e3b341', desc:'Simple random selection; approaches uniformity at high traffic volume' },
          ]).map(alg=>(
            <div key={alg.name} style={{display:'flex',gap:10,padding:'7px 10px',borderRadius:6,background:'var(--bg-elevated)',marginBottom:4}}>
              <span style={{color:alg.color,fontWeight:700,minWidth:140,fontSize:11,flexShrink:0}}>{alg.name}</span>
              <span style={{fontSize:11,color:'var(--text-secondary)'}}>{alg.desc}</span>
            </div>
          ))}
        </div>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('四层 vs 七层负载均衡', 'L4 vs L7 Load Balancing')}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div style={{background:'#4d8fff15',borderRadius:6,padding:10,border:'1px solid #4d8fff40'}}>
              <div style={{fontWeight:700,color:'#4d8fff',marginBottom:4}}>{t('四层（L4）', 'Layer 4 (L4)')}</div>
              <div style={{fontSize:11,color:'var(--text-muted)',lineHeight:1.8}}>{t(
                <span>TCP/UDP 层转发<br/>不解析 HTTP 内容<br/>性能极高<br/>代表：LVS、HAProxy（TCP 模式）</span>,
                <span>Forwards at TCP/UDP layer<br/>Does not inspect HTTP content<br/>Extremely high performance<br/>Examples: LVS, HAProxy (TCP mode)</span>
              )}</div>
            </div>
            <div style={{background:'#56d36415',borderRadius:6,padding:10,border:'1px solid #56d36440'}}>
              <div style={{fontWeight:700,color:'#56d364',marginBottom:4}}>{t('七层（L7）', 'Layer 7 (L7)')}</div>
              <div style={{fontSize:11,color:'var(--text-muted)',lineHeight:1.8}}>{t(
                <span>HTTP 层转发<br/>可按 URL/Header 路由<br/>支持 SSL 卸载<br/>代表：Nginx、ALB、Envoy</span>,
                <span>Forwards at HTTP layer<br/>Route by URL/Header<br/>SSL termination support<br/>Examples: Nginx, ALB, Envoy</span>
              )}</div>
            </div>
          </div>
        </div>
      </div>
    </div>,

    mq: <div>
      <h3 style={{color:'#4d8fff',marginTop:0}}>{t('📨 消息队列', '📨 Message Queue')}</h3>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('为什么用 MQ？', 'Why Use MQ?')}</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {(isZh
              ? ['解耦（服务不直接依赖）','异步（不等响应）','削峰（缓冲突发流量）','广播（一对多通知）']
              : ['Decoupling (no direct service dependency)','Async (no blocking wait)','Traffic buffering (absorb bursts)','Fan-out (one-to-many notifications)']
            ).map(r=>(
              <span key={r} style={{background:'#4d8fff20',color:'#4d8fff',padding:'4px 12px',borderRadius:4,fontSize:12}}>{r}</span>
            ))}
          </div>
        </div>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('主流 MQ 选型', 'MQ Comparison')}</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead><tr style={{color:'var(--text-muted)'}}>
              {['','Kafka','RabbitMQ','RocketMQ','Redis Streams'].map(h=><th key={h} style={{textAlign:'left',padding:'4px 8px',borderBottom:'1px solid var(--border)'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {(isZh ? [
                ['吞吐量','百万/s','万/s','十万/s','十万/s'],
                ['延迟','ms级','μs级','ms级','μs级'],
                ['消息顺序','分区内有序','队列内有序','全局/分区有序','单流有序'],
                ['持久化','磁盘，高可靠','可选','磁盘','AOF/RDB'],
                ['适合场景','日志/流处理','任务队列/RPC','金融/电商','简单队列'],
              ] : [
                ['Throughput','Millions/s','10k/s','100k/s','100k/s'],
                ['Latency','ms','μs','ms','μs'],
                ['Ordering','Per-partition','Per-queue','Global/Partition','Per-stream'],
                ['Persistence','Disk, highly reliable','Optional','Disk','AOF/RDB'],
                ['Best for','Logs/streaming','Task queues/RPC','Finance/e-commerce','Simple queues'],
              ]).map((row,i)=>(
                <tr key={i} style={{borderBottom:'1px solid var(--border)'}}>
                  {row.map((cell,j)=><td key={j} style={{padding:'5px 8px',color:j===0?'var(--text-muted)':'var(--text-secondary)',fontWeight:j===0?600:400}}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('消息可靠性三要素', 'Message Reliability')}</div>
          {(isZh ? [
            { name:'生产者确认', color:'#56d364', desc:'Kafka acks=all：消息写入所有 ISR 副本后才确认；RabbitMQ confirm 模式' },
            { name:'Broker 持久化', color:'#ffa657', desc:'Kafka 分区副本 replication.factor≥3；RabbitMQ durable queue + persistent message' },
            { name:'消费者确认', color:'#79c0ff', desc:'消费成功后手动 ACK；处理失败发到死信队列（DLQ）延迟重试' },
          ] : [
            { name:'Producer Ack', color:'#56d364', desc:'Kafka acks=all: confirmed only after all ISR replicas write; RabbitMQ publisher confirms' },
            { name:'Broker Persistence', color:'#ffa657', desc:'Kafka replication.factor≥3; RabbitMQ durable queue + persistent messages' },
            { name:'Consumer Ack', color:'#79c0ff', desc:'Manual ACK after successful processing; failures go to Dead Letter Queue (DLQ) for retry' },
          ]).map(p=>(
            <div key={p.name} style={{marginBottom:8,padding:'10px 12px',borderRadius:6,background:'var(--bg-elevated)'}}>
              <span style={{color:p.color,fontWeight:700,fontSize:12}}>{p.name}：</span>
              <span style={{fontSize:11,color:'var(--text-secondary)'}}>{p.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>,

    url_shortener: <div>
      <h3 style={{color:'#4d8fff',marginTop:0}}>{t('🔗 URL 短链系统', '🔗 URL Shortener System')}</h3>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('需求拆解', 'Requirements')}</div>
          <div style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.8}}>
            {t(
              <span>QPS 写：100/s，读：10,000/s（读写比 100:1）<br/>URL 最大长度 2048 字节，短码 7 位（62^7 ≈ 35亿）<br/>数据保存 10 年，总量 ≈ 100/s × 86400 × 365 × 10 ≈ 315 亿条<br/>存储：315亿 × (100B url + 7B code) ≈ 3.4 TB</span>,
              <span>Write QPS: 100/s, Read QPS: 10,000/s (100:1 read/write ratio)<br/>Max URL length 2048 bytes, short code 7 chars (62^7 ≈ 3.5B)<br/>Data retained 10 years: 100/s × 86400 × 365 × 10 ≈ 31.5B records<br/>Storage: 31.5B × (100B url + 7B code) ≈ 3.4 TB</span>
            )}
          </div>
        </div>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('短码生成方案对比', 'Short Code Generation Approaches')}</div>
          {(isZh ? [
            { name:'哈希（MD5/SHA1 取前7位）', color:'#56d364',
              pros:'无需存长链→短码映射（理论）',
              cons:'碰撞需处理，相同长链结果相同（隐私问题）' },
            { name:'自增 ID + Base62 编码', color:'#79c0ff',
              pros:'无碰撞，实现简单',
              cons:'ID 可被枚举，需加盐或随机化' },
            { name:'分布式 ID（Snowflake）+ Base62', color:'#ffa657',
              pros:'无单点，ID 有序，无碰撞',
              cons:'实现复杂度中等' },
          ] : [
            { name:'Hash (MD5/SHA1 first 7 chars)', color:'#56d364',
              pros:'No need to store long→short mapping (in theory)',
              cons:'Collision handling needed; same URL yields same code (privacy risk)' },
            { name:'Auto-increment ID + Base62', color:'#79c0ff',
              pros:'No collisions, simple to implement',
              cons:'IDs are enumerable — need salting or randomization' },
            { name:'Snowflake ID + Base62', color:'#ffa657',
              pros:'No SPOF, ordered IDs, no collisions',
              cons:'Medium implementation complexity' },
          ]).map(s=>(
            <div key={s.name} style={{marginBottom:8,padding:'10px 12px',borderRadius:6,background:'var(--bg-elevated)',border:`1px solid ${s.color}40`}}>
              <div style={{fontWeight:700,color:s.color,fontSize:12,marginBottom:4}}>{s.name}</div>
              <div style={{fontSize:11,color:'var(--text-secondary)'}}>
                <span style={{color:'#56d364'}}>✓ </span>{s.pros}<br/>
                <span style={{color:'#ff7b72'}}>✗ </span>{s.cons}
              </div>
            </div>
          ))}
        </div>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('高层架构', 'High-Level Architecture')}</div>
          <pre style={{margin:0,fontSize:11,lineHeight:1.8,color:'#e6edf3',fontFamily:'monospace'}}>{t(
            `用户 → CDN / Nginx
        ↓
   短链服务集群（无状态，水平扩展）
   写：生成短码 → 写 MySQL（主） + 写 Redis 缓存
   读：Redis 查短码 → hit→301重定向
                  → miss→查 MySQL → 回填缓存
        ↓
  MySQL（主从）   Redis Cluster（缓存，LRU）
  + 分库分表（短码 hash 分片）`,
            `Client → CDN / Nginx
        ↓
   Shortener cluster (stateless, horizontally scalable)
   Write: generate code → write MySQL (primary) + write Redis cache
   Read:  Redis lookup → hit → 301 redirect
                       → miss → query MySQL → backfill cache
        ↓
  MySQL (primary/replica)   Redis Cluster (LRU cache)
  + sharding by short code hash`
          )}</pre>
        </div>
      </div>
    </div>,

    twitter: <div>
      <h3 style={{color:'#4d8fff',marginTop:0}}>{t('🐦 Twitter Feed 设计', '🐦 Twitter Feed Design')}</h3>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:6}}>{t('核心问题：Fan-out', 'Core Problem: Fan-out')}</div>
          <div style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.8}}>
            {t(
              <span>当用户发推时，如何把这条推文送到所有粉丝的 Feed？<br/>关键指标：DAU 3亿，明星用户粉丝数可达 1亿，普通用户几百个粉丝</span>,
              <span>When a user tweets, how do we deliver it to all followers' feeds?<br/>Key metrics: 300M DAU, celebrities with 100M followers, typical users with hundreds</span>
            )}
          </div>
        </div>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('两种 Fan-out 方案', 'Two Fan-out Approaches')}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div style={{background:'#56d36415',borderRadius:6,padding:10,border:'1px solid #56d36440'}}>
              <div style={{fontWeight:700,color:'#56d364',marginBottom:4}}>{t('Fan-out on Write（推）', 'Fan-out on Write (Push)')}</div>
              <div style={{fontSize:11,color:'var(--text-muted)',lineHeight:1.7}}>{t(
                <span>发推时立即写入所有粉丝的 Feed 缓存<br/><br/>✓ 读 Feed 极快（O(1)）<br/>✗ 大V发推写放大（1亿次写）<br/>✗ 非活跃用户浪费计算</span>,
                <span>On tweet: immediately write to all followers' feed caches<br/><br/>✓ Feed reads are O(1)<br/>✗ Celebrities cause write amplification (100M writes)<br/>✗ Wastes computation for inactive users</span>
              )}</div>
            </div>
            <div style={{background:'#ffa65715',borderRadius:6,padding:10,border:'1px solid #ffa65740'}}>
              <div style={{fontWeight:700,color:'#ffa657',marginBottom:4}}>{t('Fan-out on Read（拉）', 'Fan-out on Read (Pull)')}</div>
              <div style={{fontSize:11,color:'var(--text-muted)',lineHeight:1.7}}>{t(
                <span>读 Feed 时合并所有关注者的推文<br/><br/>✓ 写入简单<br/>✗ 读 Feed 慢（聚合 N 个关注者）<br/>✗ 高并发读压力大</span>,
                <span>On read: merge tweets from all followees<br/><br/>✓ Simple writes<br/>✗ Slow feed reads (aggregate N followees)<br/>✗ High read pressure under concurrency</span>
              )}</div>
            </div>
          </div>
          <div style={{marginTop:10,padding:'10px 12px',borderRadius:6,background:'var(--bg-elevated)',border:'1px solid #79c0ff40'}}>
            <div style={{fontWeight:700,color:'#79c0ff',fontSize:12,marginBottom:4}}>{t('混合策略（Twitter 实际方案）', 'Hybrid Strategy (Twitter\'s Actual Approach)')}</div>
            <div style={{fontSize:11,color:'var(--text-secondary)',lineHeight:1.8}}>
              {t(
                <span>普通用户（≤1万粉）→ Fan-out on Write，预填充 Feed Cache<br/>大V（&gt;1万粉）→ Fan-out on Read，读时动态合并<br/>用户打开 App → 拉取预填充 Feed + 实时合并关注的大V推文</span>,
                <span>Regular users (≤10k followers) → Fan-out on Write, pre-populate feed cache<br/>Celebrities (&gt;10k followers) → Fan-out on Read, merge dynamically on read<br/>App open → fetch pre-populated feed + merge celebrity tweets in real time</span>
              )}
            </div>
          </div>
        </div>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('数据模型', 'Data Model')}</div>
          <pre style={{margin:0,fontSize:11,lineHeight:1.6,color:'#e6edf3',fontFamily:'monospace'}}>{`Tweet:   tweet_id(PK) | user_id | content | created_at | media_ids
User:    user_id(PK)  | name | follower_count | following_count
Follow:  follower_id | followee_id | created_at  (composite index)
Feed:    user_id | tweet_id | score(timestamp) → Redis Sorted Set`}</pre>
        </div>
      </div>
    </div>,

    youtube: <div>
      <h3 style={{color:'#4d8fff',marginTop:0}}>{t('▶ YouTube 视频系统', '▶ YouTube Video System')}</h3>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('上传流程', 'Upload Flow')}</div>
          <pre style={{margin:0,fontSize:11,lineHeight:1.8,color:'#e6edf3',fontFamily:'monospace'}}>{t(
            `① 客户端 → API 网关 → 上传服务
② 原始视频 → 对象存储（S3 / GCS）
③ 上传完成 → 发消息到 MQ（Kafka）
④ 视频处理集群消费消息：
   - 格式转换（FFmpeg：mp4 → HLS）
   - 多分辨率：240p / 480p / 720p / 1080p / 4K
   - 生成缩略图（每秒抽帧）
   - CDN 预热（热门视频提前分发）
⑤ 元数据写 DB（标题/时长/分辨率/状态）
⑥ 通知用户：上传成功`,
            `① Client → API Gateway → Upload Service
② Raw video → Object Storage (S3 / GCS)
③ Upload complete → publish message to MQ (Kafka)
④ Video processing cluster consumes messages:
   - Transcode (FFmpeg: mp4 → HLS)
   - Multi-resolution: 240p / 480p / 720p / 1080p / 4K
   - Generate thumbnails (sample frames per second)
   - CDN warm-up (pre-distribute popular videos)
⑤ Write metadata to DB (title/duration/resolution/status)
⑥ Notify user: upload successful`
          )}</pre>
        </div>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('播放流程（自适应码率 HLS）', 'Playback (Adaptive Bitrate HLS)')}</div>
          <div style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.8}}>
            {t(
              <span>视频被切割成 2-10 秒的 <code style={{color:'#56d364'}}>.ts</code> 分片 + <code style={{color:'#56d364'}}>.m3u8</code> 播放列表<br/>客户端根据网速动态选择分辨率（360p → 720p → 1080p）<br/>分片从 <strong style={{color:'#79c0ff'}}>CDN 边缘节点</strong>就近拉取，未命中才回源到 S3</span>,
              <span>Video split into 2–10 sec <code style={{color:'#56d364'}}>.ts</code> segments + <code style={{color:'#56d364'}}>.m3u8</code> playlist<br/>Client dynamically selects resolution based on bandwidth (360p → 720p → 1080p)<br/>Segments served from <strong style={{color:'#79c0ff'}}>CDN edge nodes</strong>; cache miss falls back to S3</span>
            )}
          </div>
        </div>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('存储拆分', 'Storage Breakdown')}</div>
          {(isZh ? [
            ['视频文件','S3 / GCS + CDN','对象存储，冷热分层（S3 Standard → Glacier）'],
            ['元数据','MySQL / Spanner','视频信息、用户信息、强一致事务'],
            ['评论','Cassandra','时序写入，按 video_id 分区'],
            ['推荐','图数据库 + 向量库','用户行为图谱、相似视频向量'],
            ['搜索','Elasticsearch','全文索引标题/描述/字幕'],
            ['计数','Redis','播放量/点赞数（批量刷 DB，防止写放大）'],
          ] : [
            ['Video files','S3 / GCS + CDN','Object storage, hot/cold tiering (S3 Standard → Glacier)'],
            ['Metadata','MySQL / Spanner','Video info, user info, strong-consistency transactions'],
            ['Comments','Cassandra','Time-series writes, partitioned by video_id'],
            ['Recommendations','Graph DB + Vector DB','User behavior graph, similar video embeddings'],
            ['Search','Elasticsearch','Full-text index on title/description/captions'],
            ['Counters','Redis','View/like counts (batch flush to DB, avoid write amplification)'],
          ]).map(([what,where,why],i)=>(
            <div key={i} style={{display:'flex',gap:8,padding:'6px 8px',borderRadius:6,background:'var(--bg-elevated)',marginBottom:4,flexWrap:'wrap'}}>
              <span style={{color:'#ffa657',fontWeight:700,minWidth:56,fontSize:11}}>{what}</span>
              <span style={{color:'#56d364',fontSize:11,minWidth:120}}>{where}</span>
              <span style={{color:'var(--text-muted)',fontSize:11}}>{why}</span>
            </div>
          ))}
        </div>
      </div>
    </div>,

    uber: <div>
      <h3 style={{color:'#4d8fff',marginTop:0}}>{t('🚗 Uber 打车系统', '🚗 Uber Ride System')}</h3>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('核心挑战：实时地理位置匹配', 'Core Challenge: Real-Time Location Matching')}</div>
          <pre style={{margin:0,fontSize:11,lineHeight:1.8,color:'#e6edf3',fontFamily:'monospace'}}>{t(
            `司机位置更新（每 4 秒）→ WebSocket / HTTPS
→ 位置服务 → 写 Redis Geo（GEOADD key lng lat driver_id）
乘客叫车 → GEORADIUS 找 5km 内空闲司机
→ 匹配服务（最近空闲 + 评分）→ 派单`,
            `Driver location update (every 4s) → WebSocket / HTTPS
→ Location service → write Redis Geo (GEOADD key lng lat driver_id)
Passenger requests ride → GEORADIUS to find idle drivers within 5km
→ Matching service (nearest idle + rating) → dispatch`
          )}</pre>
        </div>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('Geohash 空间索引', 'Geohash Spatial Index')}</div>
          <div style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.8}}>
            {t(
              <span>把地球表面递归切分为网格，每个格子编码为字符串（如 <code style={{color:'#56d364'}}>"wx4g0e"</code>）<br/>前缀相同 = 地理上相邻（精度 6 位 ≈ 1.2km × 0.6km）<br/>问题：边界跨格时需查8个相邻格，用 <strong style={{color:'#ffa657'}}>Redis Geo</strong>（底层 Geohash）解决</span>,
              <span>Earth surface recursively divided into grid cells, each encoded as a string (e.g. <code style={{color:'#56d364'}}>"wx4g0e"</code>)<br/>Same prefix = geographically adjacent (6-char precision ≈ 1.2km × 0.6km)<br/>Edge case: boundary crossing requires checking 8 neighbors — <strong style={{color:'#ffa657'}}>Redis Geo</strong> (built on Geohash) handles this</span>
            )}
          </div>
        </div>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('行程状态机', 'Trip State Machine')}</div>
          <div style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.8}}>
            {t(
              <span>叫车 → 匹配中 → 司机接单 → 前往乘客 → 乘客上车 → 行程中 → 到达目的地 → 支付 → 完成<br/><br/>每次状态转换发 <strong style={{color:'#79c0ff'}}>Kafka 事件</strong>，下游订阅：计费/通知/风控/数据仓库</span>,
              <span>Requested → Matching → Driver accepted → En route → Passenger picked up → In trip → Arrived → Payment → Completed<br/><br/>Each state transition emits a <strong style={{color:'#79c0ff'}}>Kafka event</strong>; downstream consumers: billing / notifications / fraud / data warehouse</span>
            )}
          </div>
        </div>
      </div>
    </div>,

    search: <div>
      <h3 style={{color:'#4d8fff',marginTop:0}}>{t('🔍 搜索引擎设计', '🔍 Search Engine Design')}</h3>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('两大核心系统', 'Two Core Subsystems')}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div style={{background:'#4d8fff15',borderRadius:6,padding:10,border:'1px solid #4d8fff40'}}>
              <div style={{fontWeight:700,color:'#4d8fff',marginBottom:4}}>{t('爬虫系统', 'Crawler')}</div>
              <div style={{fontSize:11,color:'var(--text-muted)',lineHeight:1.7}}>{t(
                <span>URL 队列 → 下载 HTML<br/>→ 解析链接（BFS）<br/>→ 去重（Bloom Filter）<br/>→ 入队待索引<br/>→ 原始内容存对象存储</span>,
                <span>URL queue → download HTML<br/>→ parse links (BFS)<br/>→ dedup (Bloom Filter)<br/>→ enqueue for indexing<br/>→ store raw content in object storage</span>
              )}</div>
            </div>
            <div style={{background:'#56d36415',borderRadius:6,padding:10,border:'1px solid #56d36440'}}>
              <div style={{fontWeight:700,color:'#56d364',marginBottom:4}}>{t('索引系统', 'Indexing System')}</div>
              <div style={{fontSize:11,color:'var(--text-muted)',lineHeight:1.7}}>{t(
                <span>分词 → 去停用词<br/>→ 倒排索引构建<br/>→ TF-IDF / BM25 评分<br/>→ PageRank 链接分析<br/>→ 分布式索引分片</span>,
                <span>Tokenize → remove stop words<br/>→ build inverted index<br/>→ TF-IDF / BM25 scoring<br/>→ PageRank link analysis<br/>→ distributed index sharding</span>
              )}</div>
            </div>
          </div>
        </div>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:6}}>{t('倒排索引', 'Inverted Index')}</div>
          <pre style={{margin:0,fontSize:11,lineHeight:1.6,color:'#e6edf3',fontFamily:'monospace'}}>{`"redis" → [doc_3(pos:15,tf:3), doc_7(pos:2,tf:1), doc_12(pos:8,tf:5)]
"cache" → [doc_3(pos:20,tf:2), doc_5(pos:1,tf:8)]

${t('查询 "redis cache":','Query "redis cache":' )}
  ${t('取两个 posting list → 合并（AND/OR）→ 按相关性排序', 'Fetch two posting lists → merge (AND/OR) → rank by relevance')}`}</pre>
        </div>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:6}}>{t('搜索建议（Typeahead）', 'Search Suggestions (Typeahead)')}</div>
          <div style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.8}}>
            {t(
              <span>前缀树 Trie → 存储热门查询词，按搜索频次排序<br/>Trie 按前缀分片（如 a-g / h-p / q-z），存 Redis，定时用离线统计更新<br/>前端输入每 300ms 触发一次（debounce），返回 top-5 建议</span>,
              <span>Trie → stores popular search terms ranked by frequency<br/>Trie sharded by prefix (a-g / h-p / q-z), cached in Redis, refreshed by offline batch jobs<br/>Frontend debounces 300ms per keystroke, returns top-5 suggestions</span>
            )}
          </div>
        </div>
      </div>
    </div>,

    chat: <div>
      <h3 style={{color:'#4d8fff',marginTop:0}}>{t('💬 即时通讯系统', '💬 Chat System')}</h3>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('连接协议选择', 'Connection Protocol')}</div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {(isZh ? [
              { name:'WebSocket', color:'#56d364', desc:'全双工长连接，服务端主动推送，现代 IM 首选' },
              { name:'长轮询 Long Polling', color:'#ffa657', desc:'客户端挂起请求等待响应，兼容性好但资源消耗大' },
              { name:'SSE (Server-Sent Events)', color:'#79c0ff', desc:'服务端单向推流，适合通知类场景' },
            ] : [
              { name:'WebSocket', color:'#56d364', desc:'Full-duplex persistent connection, server can push; preferred for modern chat apps' },
              { name:'Long Polling', color:'#ffa657', desc:'Client hangs request until server responds; good compatibility but resource-heavy' },
              { name:'SSE (Server-Sent Events)', color:'#79c0ff', desc:'One-way server push stream; suitable for notification-only scenarios' },
            ]).map(p=>(
              <div key={p.name} style={{display:'flex',gap:10,padding:'7px 10px',borderRadius:6,background:'var(--bg-elevated)'}}>
                <span style={{color:p.color,fontWeight:700,minWidth:130,fontSize:11,flexShrink:0}}>{p.name}</span>
                <span style={{fontSize:11,color:'var(--text-secondary)'}}>{p.desc}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('消息顺序 & 去重', 'Message Order & Deduplication')}</div>
          <pre style={{margin:0,fontSize:11,lineHeight:1.8,color:'#e6edf3',fontFamily:'monospace'}}>{t(
            `消息 ID = Snowflake ID（时间戳有序）
消息序号 = 每个会话内自增（seq_id）
客户端用 seq_id 检测消息丢失，主动重拉
去重 Key = (from_user, to_user/group, client_msg_id)
        → Redis SET 24h，防止网络重传导致重复存储`,
            `Message ID = Snowflake ID (timestamp-ordered)
Seq number = per-conversation auto-increment (seq_id)
Client uses seq_id to detect gaps and re-fetch missing messages
Dedup key = (from_user, to_user/group, client_msg_id)
         → Redis SET TTL 24h, prevents duplicate storage from retries`
          )}</pre>
        </div>
        <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{t('已读回执 & 离线消息', 'Read Receipts & Offline Messages')}</div>
          <div style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.8}}>
            {t(
              <span>已读：客户端收到消息后发 ACK → 服务端更新 <code style={{color:'#56d364'}}>last_ack_msg_id</code><br/>离线：消息写入 <strong style={{color:'#79c0ff'}}>Cassandra</strong>（按 (user_id, msg_id) 分区），上线时拉取 last_ack 之后的消息<br/>群聊：写扩散 vs 读扩散（群成员 &lt;500 写扩散，&gt;500 读扩散）</span>,
              <span>Read receipt: client ACKs → server updates <code style={{color:'#56d364'}}>last_ack_msg_id</code><br/>Offline: messages stored in <strong style={{color:'#79c0ff'}}>Cassandra</strong> (partitioned by (user_id, msg_id)); on reconnect, pull messages after last_ack<br/>Group chat: write fanout vs read fanout (groups &lt;500 use write fanout, &gt;500 use read fanout)</span>
            )}
          </div>
        </div>
      </div>
    </div>,
  }
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SystemDesignView() {
  const [sel, setSel] = useState('checklist')
  const isMobile = useMobile()
  const { lang } = useLang()
  const isZh = lang === 'zh'

  const cats = ['tech', 'classic', 'real'] as const
  const CAT_LABELS = isZh ? CAT_LABELS_ZH : CAT_LABELS_EN
  const details = getDetails(isZh)

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{
        width: isMobile ? '100%' : 210, flexShrink: 0,
        borderRight: isMobile ? 'none' : '1px solid var(--border)',
        borderBottom: isMobile ? '1px solid var(--border)' : 'none',
        background: 'var(--bg-secondary)',
        overflowX: isMobile ? 'auto' : undefined,
        overflowY: isMobile ? 'hidden' : 'auto',
        maxHeight: isMobile ? 56 : undefined,
        display: isMobile ? 'flex' : 'block',
        scrollbarWidth: 'none',
      }}>
        {!isMobile && <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>🏗 {isZh ? '系统设计' : 'System Design'}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>System Design Interview</div>
        </div>}
        {!isMobile && cats.map(cat => (
          <div key={cat}>
            <div style={{ padding: '6px 14px 3px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, marginTop: 4 }}>
              {CAT_LABELS[cat].toUpperCase()}
            </div>
            {TOPICS.filter(topic => topic.category === cat).map(topic => (
              <button key={topic.id} onClick={() => setSel(topic.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '8px 14px', border: 'none',
                  borderLeft: sel === topic.id ? '3px solid var(--accent-blue)' : '3px solid transparent',
                  background: sel === topic.id ? 'var(--bg-elevated)' : 'transparent',
                  color: sel === topic.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: 11, fontWeight: sel === topic.id ? 700 : 400, textAlign: 'left' }}>
                <span style={{ fontSize: 14 }}>{topic.icon}</span>
                <span>{isZh ? topic.name_zh : topic.name_en}</span>
              </button>
            ))}
          </div>
        ))}
        {isMobile && TOPICS.map(topic => (
          <button key={topic.id} onClick={() => setSel(topic.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
              padding: '6px 10px', border: 'none',
              borderBottom: sel === topic.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
              background: sel === topic.id ? 'var(--bg-elevated)' : 'transparent',
              color: sel === topic.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap' }}>
            {topic.icon}
          </button>
        ))}
      </div>

      {/* Detail */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        {details[sel] ?? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, paddingTop: 40, textAlign: 'center' }}>
            {isZh ? '内容建设中…' : 'Content coming soon…'}
          </div>
        )}
      </div>
    </div>
  )
}
