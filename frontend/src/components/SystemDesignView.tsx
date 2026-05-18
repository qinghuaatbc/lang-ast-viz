import { useState } from 'react'
import { useMobile } from '../hooks/useMobile'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Topic {
  id: string; icon: string; name: string; category: string
}

// ── Topic list ────────────────────────────────────────────────────────────────
const TOPICS: Topic[] = [
  // 基础组件
  { id: 'url_shortener',   icon: '🔗', name: 'URL 短链',        category: 'classic' },
  { id: 'rate_limiter',    icon: '🚦', name: '限流器',          category: 'classic' },
  { id: 'cache',           icon: '⚡', name: '缓存系统',        category: 'classic' },
  { id: 'mq',              icon: '📨', name: '消息队列',        category: 'classic' },
  { id: 'load_balancer',   icon: '⚖',  name: '负载均衡',        category: 'classic' },
  { id: 'id_gen',          icon: '🆔', name: '分布式 ID',       category: 'classic' },
  { id: 'consistent_hash', icon: '🔄', name: '一致性哈希',      category: 'classic' },
  // 真实系统
  { id: 'twitter',         icon: '🐦', name: 'Twitter Feed',    category: 'real' },
  { id: 'youtube',         icon: '▶',  name: 'YouTube',         category: 'real' },
  { id: 'uber',            icon: '🚗', name: 'Uber 打车',       category: 'real' },
  { id: 'search',          icon: '🔍', name: '搜索引擎',        category: 'real' },
  { id: 'chat',            icon: '💬', name: '即时通讯',        category: 'real' },
  // 技术选型
  { id: 'db_select',       icon: '🗄',  name: 'DB 选型',         category: 'tech' },
  { id: 'cap',             icon: '📐', name: 'CAP 定理',        category: 'tech' },
  { id: 'checklist',       icon: '✅', name: '答题框架',        category: 'tech' },
]

// ── Detail content ─────────────────────────────────────────────────────────────
const DETAILS: Record<string, React.ReactNode> = {

  checklist: <div>
    <h3 style={{color:'#4d8fff',marginTop:0}}>✅ 系统设计答题框架 (45 min)</h3>
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {[
        { time:'0–5 min',  title:'① 澄清需求',    color:'#56d364', points:['DAU / QPS 量级？','读写比例？','一致性要求？（强一致 / 最终一致）','可用性 SLA？（99.9% = 8.7h/y 停机）','功能范围（去掉次要功能）'] },
        { time:'5–10 min', title:'② 容量估算',    color:'#ffa657', points:['存储量 = 数据量 × 副本数','带宽 = QPS × 平均包大小','缓存内存 = 热数据 20% × 数据总量','服务器台数 = QPS / 单机 TPS'] },
        { time:'10–20 min',title:'③ 高层设计',    color:'#79c0ff', points:['画出核心服务 + 数据流','选型：SQL vs NoSQL、MQ 种类、CDN','读写分离、分库分表策略','API 设计（RESTful / gRPC）'] },
        { time:'20–35 min',title:'④ 深入设计',    color:'#d2a8ff', points:['最核心的 1-2 个子系统详细展开','数据模型 / Schema','缓存策略（Cache Aside / Write Through）','一致性方案（分布式锁 / 2PC / Saga）'] },
        { time:'35–45 min',title:'⑤ 瓶颈 & 改进', color:'#ff7b72', points:['单点故障在哪？如何消除？','热点数据如何处理？','监控 / 告警 / 降级方案','未来 10× 流量如何扩展？'] },
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
    <h3 style={{color:'#4d8fff',marginTop:0}}>📐 CAP 定理 & BASE / ACID</h3>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
      {[
        { letter:'C', name:'Consistency',    color:'#56d364', desc:'每次读都能拿到最新写入（或报错）' },
        { letter:'A', name:'Availability',   color:'#ffa657', desc:'每次请求都有响应（不一定最新）' },
        { letter:'P', name:'Partition Tol.', color:'#79c0ff', desc:'网络分区时系统仍能运作' },
      ].map(c=>(
        <div key={c.letter} style={{background:`${c.color}15`,border:`1px solid ${c.color}40`,borderRadius:8,padding:'12px 14px',textAlign:'center'}}>
          <div style={{fontSize:32,fontWeight:900,color:c.color}}>{c.letter}</div>
          <div style={{fontSize:12,fontWeight:700,color:c.color,marginBottom:4}}>{c.name}</div>
          <div style={{fontSize:11,color:'var(--text-muted)'}}>{c.desc}</div>
        </div>
      ))}
    </div>
    <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,marginBottom:12,border:'1px solid var(--border)'}}>
      <div style={{fontWeight:700,marginBottom:8,fontSize:13}}>🗄 系统倾向对比</div>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
        <thead><tr style={{color:'var(--text-muted)'}}>
          <th style={{textAlign:'left',padding:'4px 8px'}}>系统</th>
          <th style={{textAlign:'left',padding:'4px 8px'}}>舍弃</th>
          <th style={{textAlign:'left',padding:'4px 8px'}}>选择</th>
          <th style={{textAlign:'left',padding:'4px 8px'}}>场景</th>
        </tr></thead>
        <tbody>
          {[
            ['MySQL/PostgreSQL','P（单机）','C + A','金融、电商订单'],
            ['Cassandra','C','A + P','日志、IoT、时序数据'],
            ['HBase','A','C + P','离线分析、大数据'],
            ['Zookeeper','A','C + P','分布式协调、配置'],
            ['DynamoDB','C','A + P','购物车、会话'],
          ].map(([sys,lose,keep,scene],i)=>(
            <tr key={i} style={{borderTop:'1px solid var(--border)'}}>
              <td style={{padding:'5px 8px',fontWeight:600,color:'#79c0ff'}}>{sys}</td>
              <td style={{padding:'5px 8px',color:'#ff7b72'}}>舍 {lose}</td>
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
          <div style={{fontWeight:700,color:'#56d364',marginBottom:4}}>ACID（强一致）</div>
          <div style={{fontSize:11,color:'var(--text-muted)',lineHeight:1.8}}>Atomicity 原子性<br/>Consistency 一致性<br/>Isolation 隔离性<br/>Durability 持久性</div>
          <div style={{fontSize:11,color:'var(--text-secondary)',marginTop:6}}>→ MySQL, PostgreSQL</div>
        </div>
        <div style={{background:'#ffa65715',borderRadius:6,padding:10,border:'1px solid #ffa65740'}}>
          <div style={{fontWeight:700,color:'#ffa657',marginBottom:4}}>BASE（最终一致）</div>
          <div style={{fontSize:11,color:'var(--text-muted)',lineHeight:1.8}}>Basically Available<br/>Soft state<br/>Eventually consistent</div>
          <div style={{fontSize:11,color:'var(--text-secondary)',marginTop:6}}>→ Cassandra, DynamoDB</div>
        </div>
      </div>
    </div>
  </div>,

  db_select: <div>
    <h3 style={{color:'#4d8fff',marginTop:0}}>🗄 数据库选型指南</h3>
    {[
      { name:'关系型 SQL',       color:'#4d8fff', examples:'MySQL · PostgreSQL · CockroachDB',
        use:'事务性业务（订单/支付/用户）', avoid:'海量写、无结构数据',
        props:['ACID 事务','外键约束','复杂 JOIN','水平扩展难'] },
      { name:'文档型 NoSQL',     color:'#56d364', examples:'MongoDB · Firestore · CouchDB',
        use:'内容/产品目录、半结构化数据', avoid:'多表 JOIN、强事务',
        props:['灵活 Schema','嵌套文档','水平扩展易','弱事务'] },
      { name:'KV 存储',          color:'#ffa657', examples:'Redis · DynamoDB · etcd',
        use:'缓存、会话、排行榜、分布式锁', avoid:'复杂查询',
        props:['O(1) 读写','TTL 支持','高吞吐','数据结构丰富（Redis）'] },
      { name:'列族 NoSQL',       color:'#d2a8ff', examples:'Cassandra · HBase · Bigtable',
        use:'时序/IoT/日志，超大写入', avoid:'随机读、事务',
        props:['写优化（LSM-Tree）','列压缩','线性扩展','最终一致'] },
      { name:'搜索引擎',         color:'#79c0ff', examples:'Elasticsearch · Meilisearch · Typesense',
        use:'全文检索、日志分析', avoid:'作为主存储',
        props:['倒排索引','分词','聚合分析','准实时'] },
      { name:'时序数据库',       color:'#e3b341', examples:'InfluxDB · TimescaleDB · Prometheus',
        use:'监控指标、金融行情', avoid:'通用业务',
        props:['时间分区','自动降采样','高效压缩','滚动窗口查询'] },
      { name:'图数据库',         color:'#ff7b72', examples:'Neo4j · Neptune · TigerGraph',
        use:'社交关系、推荐系统、知识图谱', avoid:'无图结构业务',
        props:['原生图遍历','深度关系查询','Cypher 语言'] },
    ].map(db=>(
      <div key={db.name} style={{background:'var(--bg-secondary)',borderRadius:8,padding:'12px 14px',marginBottom:10,border:`1px solid ${db.color}30`}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6,flexWrap:'wrap'}}>
          <span style={{fontWeight:700,color:db.color,fontSize:13}}>{db.name}</span>
          <span style={{fontSize:11,color:'var(--text-muted)',background:'var(--bg-elevated)',padding:'2px 8px',borderRadius:4}}>{db.examples}</span>
        </div>
        <div style={{display:'flex',gap:16,fontSize:11,marginBottom:6,flexWrap:'wrap'}}>
          <span><span style={{color:'#56d364'}}>✓ 用于：</span><span style={{color:'var(--text-secondary)'}}>{db.use}</span></span>
          <span><span style={{color:'#ff7b72'}}>✗ 避免：</span><span style={{color:'var(--text-secondary)'}}>{db.avoid}</span></span>
        </div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {db.props.map(p=><span key={p} style={{fontSize:10,padding:'2px 8px',borderRadius:4,background:`${db.color}15`,color:db.color}}>{p}</span>)}
        </div>
      </div>
    ))}
  </div>,

  cache: <div>
    <h3 style={{color:'#4d8fff',marginTop:0}}>⚡ 缓存系统设计</h3>
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>缓存读写策略</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          {[
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
          ].map(s=>(
            <div key={s.name} style={{background:'var(--bg-elevated)',borderRadius:6,padding:10,border:`1px solid ${s.color}40`}}>
              <div style={{fontWeight:700,color:s.color,fontSize:12,marginBottom:6}}>{s.name}</div>
              <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:4}}>读：{s.read}</div>
              <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:4}}>写：{s.write}</div>
              <div style={{fontSize:10,color:'var(--text-secondary)',fontStyle:'italic'}}>{s.note}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>缓存淘汰策略</div>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {[
            { name:'LRU',  color:'#56d364', desc:'最近最少使用，用 HashMap + 双向链表实现，O(1)。最常考' },
            { name:'LFU',  color:'#79c0ff', desc:'最少访问频次，需额外维护频次计数，实现复杂，Redis 4.0+ 支持' },
            { name:'TTL',  color:'#ffa657', desc:'设置过期时间，适合 session/token 等有时效性的数据' },
            { name:'FIFO', color:'#d2a8ff', desc:'先进先出，简单但命中率低，适合顺序访问场景' },
          ].map(p=>(
            <div key={p.name} style={{display:'flex',gap:10,padding:'7px 10px',borderRadius:6,background:'var(--bg-elevated)'}}>
              <span style={{color:p.color,fontWeight:700,minWidth:36,fontSize:12}}>{p.name}</span>
              <span style={{fontSize:11,color:'var(--text-secondary)'}}>{p.desc}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>三大缓存问题</div>
        {[
          { name:'缓存穿透', color:'#ff7b72',
            desc:'查询不存在的 key，每次都打到 DB',
            fix:'① 缓存空值（TTL 短）\n② 布隆过滤器（Bloom Filter）拦截' },
          { name:'缓存击穿', color:'#ffa657',
            desc:'热点 key 过期瞬间，大量请求同时打到 DB',
            fix:'① 互斥锁（只有一个线程重建缓存）\n② 热点 key 永不过期 + 异步更新' },
          { name:'缓存雪崩', color:'#d2a8ff',
            desc:'大量 key 同时过期，或 Redis 宕机',
            fix:'① 过期时间加随机 jitter\n② Redis 集群 / 主从\n③ 降级熔断' },
        ].map(p=>(
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
    <h3 style={{color:'#4d8fff',marginTop:0}}>🚦 限流器设计</h3>
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>四种算法对比</div>
        {[
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
        ].map(alg=>(
          <div key={alg.name} style={{marginBottom:8,padding:'10px 12px',borderRadius:6,background:'var(--bg-elevated)',border:`1px solid ${alg.color}40`}}>
            <div style={{fontWeight:700,color:alg.color,fontSize:12,marginBottom:6}}>{alg.name}</div>
            <div style={{display:'flex',gap:12,fontSize:11,flexWrap:'wrap'}}>
              <span><span style={{color:'#56d364'}}>优：</span><span style={{color:'var(--text-secondary)'}}>{alg.pros}</span></span>
              <span><span style={{color:'#ff7b72'}}>劣：</span><span style={{color:'var(--text-secondary)'}}>{alg.cons}</span></span>
              <span><span style={{color:'#ffa657'}}>用：</span><span style={{color:'var(--text-secondary)'}}>{alg.use}</span></span>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>Redis 分布式限流（令牌桶 Lua 脚本）</div>
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
    <h3 style={{color:'#4d8fff',marginTop:0}}>🔄 一致性哈希</h3>
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>为什么需要一致性哈希？</div>
        <div style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.8}}>
          普通取模哈希 <code style={{color:'#56d364'}}>hash(key) % N</code>：增删节点时 <strong style={{color:'#ff7b72'}}>几乎所有 key 重新映射</strong>，导致大量缓存失效和数据迁移。<br/>
          一致性哈希：增删节点只影响相邻节点，平均只需迁移 <strong style={{color:'#56d364'}}>1/N</strong> 的数据。
        </div>
      </div>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>虚拟节点（Virtual Nodes）</div>
        <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:8,lineHeight:1.8}}>
          真实节点少时，环上分布不均。每个物理节点映射 <strong style={{color:'#ffa657'}}>100-200 个虚拟节点</strong>，使分布更均匀，并可按权重分配。
        </div>
        <pre style={{margin:0,fontSize:11,lineHeight:1.6,color:'#e6edf3',fontFamily:'monospace',overflow:'auto'}}>{`// Java TreeMap 实现
TreeMap<Long, String> ring = new TreeMap<>();
for (String node : nodes) {
    for (int i = 0; i < VNODES; i++) {
        long hash = md5(node + "#" + i);
        ring.put(hash, node);
    }
}
// 查找 key 对应节点
String getNode(String key) {
    long h = md5(key);
    Map.Entry<Long,String> e = ring.ceilingEntry(h);
    return e == null ? ring.firstEntry().getValue() : e.getValue();
}`}</pre>
      </div>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>使用场景</div>
        <div style={{display:'flex',flexDirection:'column',gap:4}}>
          {[
            ['分布式缓存', 'Redis Cluster、Memcached 集群 key 路由'],
            ['负载均衡',   'Nginx upstream、数据库分库'],
            ['CDN',       '边缘节点选择'],
            ['P2P',       'DHT（分布式哈希表）节点发现'],
          ].map(([name,desc],i)=>(
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
    <h3 style={{color:'#4d8fff',marginTop:0}}>🆔 分布式 ID 生成</h3>
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {[
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
          use:'Twitter、微博、分布式主键', },
        { name:'号段模式 (Leaf)', color:'#d2a8ff',
          pros:'DB 压力小（批量取号段）',
          cons:'号段用完前重启会浪费 ID',
          use:'美团 Leaf、滴滴 TinyID' },
        { name:'Redis INCR', color:'#ff7b72',
          pros:'简单、原子、有序',
          cons:'Redis 单点、重启需持久化',
          use:'短链 ID、优惠券流水号' },
      ].map(s=>(
        <div key={s.name} style={{background:'var(--bg-secondary)',borderRadius:8,padding:'12px 14px',border:`1px solid ${s.color}40`}}>
          <div style={{fontWeight:700,color:s.color,fontSize:13,marginBottom:6}}>{s.name}</div>
          <div style={{display:'flex',gap:12,fontSize:11,flexWrap:'wrap',marginBottom:4}}>
            <span><span style={{color:'#56d364'}}>✓ </span><span style={{color:'var(--text-secondary)'}}>{s.pros}</span></span>
            <span><span style={{color:'#ff7b72'}}>✗ </span><span style={{color:'var(--text-secondary)'}}>{s.cons}</span></span>
          </div>
          <div style={{fontSize:11,color:'var(--text-muted)'}}><span style={{color:'#ffa657'}}>用于：</span>{s.use}</div>
        </div>
      ))}
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>Snowflake 64-bit 结构</div>
        <div style={{display:'flex',gap:2,marginBottom:8}}>
          {[{label:'符号位',bits:1,color:'#ff7b72'},{label:'时间戳(ms)',bits:41,color:'#ffa657'},{label:'机器ID',bits:10,color:'#56d364'},{label:'序列号',bits:12,color:'#79c0ff'}].map(f=>(
            <div key={f.label} style={{flex:f.bits,background:f.color,borderRadius:4,padding:'6px 4px',textAlign:'center',minWidth:0}}>
              <div style={{fontSize:10,fontWeight:700,color:'#000'}}>{f.bits}bit</div>
              <div style={{fontSize:9,color:'#000'}}>{f.label}</div>
            </div>
          ))}
        </div>
        <div style={{fontSize:11,color:'var(--text-muted)',lineHeight:1.8}}>
          时间戳 41 bit → 可用 69 年（从 2010 年起）<br/>
          机器 ID 10 bit → 最多 1024 台机器<br/>
          序列号 12 bit → 每毫秒每机器 4096 个 ID
        </div>
      </div>
    </div>
  </div>,

  load_balancer: <div>
    <h3 style={{color:'#4d8fff',marginTop:0}}>⚖ 负载均衡</h3>
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>常见算法</div>
        {[
          { name:'轮询 Round Robin', color:'#56d364', desc:'依次分配，适合同构无状态服务' },
          { name:'加权轮询 Weighted RR', color:'#79c0ff', desc:'按机器权重比例分发，应对异构集群' },
          { name:'最少连接 Least Connections', color:'#ffa657', desc:'发给当前活跃连接最少的节点，适合长连接' },
          { name:'IP Hash', color:'#d2a8ff', desc:'同一 IP 打到同一节点（有状态服务 / 会话保持）' },
          { name:'一致性哈希', color:'#ff7b72', desc:'按请求 key 哈希，缓存类服务首选' },
          { name:'随机 Random', color:'#e3b341', desc:'简单随机，大流量下趋近均匀' },
        ].map(alg=>(
          <div key={alg.name} style={{display:'flex',gap:10,padding:'7px 10px',borderRadius:6,background:'var(--bg-elevated)',marginBottom:4}}>
            <span style={{color:alg.color,fontWeight:700,minWidth:140,fontSize:11,flexShrink:0}}>{alg.name}</span>
            <span style={{fontSize:11,color:'var(--text-secondary)'}}>{alg.desc}</span>
          </div>
        ))}
      </div>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>四层 vs 七层负载均衡</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div style={{background:'#4d8fff15',borderRadius:6,padding:10,border:'1px solid #4d8fff40'}}>
            <div style={{fontWeight:700,color:'#4d8fff',marginBottom:4}}>四层（L4）</div>
            <div style={{fontSize:11,color:'var(--text-muted)',lineHeight:1.8}}>TCP/UDP 层转发<br/>不解析 HTTP 内容<br/>性能极高<br/>代表：LVS、HAProxy（TCP 模式）</div>
          </div>
          <div style={{background:'#56d36415',borderRadius:6,padding:10,border:'1px solid #56d36440'}}>
            <div style={{fontWeight:700,color:'#56d364',marginBottom:4}}>七层（L7）</div>
            <div style={{fontSize:11,color:'var(--text-muted)',lineHeight:1.8}}>HTTP 层转发<br/>可按 URL/Header 路由<br/>支持 SSL 卸载<br/>代表：Nginx、ALB、Envoy</div>
          </div>
        </div>
      </div>
    </div>
  </div>,

  mq: <div>
    <h3 style={{color:'#4d8fff',marginTop:0}}>📨 消息队列</h3>
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>为什么用 MQ？</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {['解耦（服务不直接依赖）','异步（不等响应）','削峰（缓冲突发流量）','广播（一对多通知）'].map(r=>(
            <span key={r} style={{background:'#4d8fff20',color:'#4d8fff',padding:'4px 12px',borderRadius:4,fontSize:12}}>{r}</span>
          ))}
        </div>
      </div>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>主流 MQ 选型</div>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
          <thead><tr style={{color:'var(--text-muted)'}}>
            {['','Kafka','RabbitMQ','RocketMQ','Redis Streams'].map(h=><th key={h} style={{textAlign:'left',padding:'4px 8px',borderBottom:'1px solid var(--border)'}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {[
              ['吞吐量','百万/s','万/s','十万/s','十万/s'],
              ['延迟','ms级','μs级','ms级','μs级'],
              ['消息顺序','分区内有序','队列内有序','全局/分区有序','单流有序'],
              ['持久化','磁盘，高可靠','可选','磁盘','AOF/RDB'],
              ['适合场景','日志/流处理','任务队列/RPC','金融/电商','简单队列'],
            ].map((row,i)=>(
              <tr key={i} style={{borderBottom:'1px solid var(--border)'}}>
                {row.map((cell,j)=><td key={j} style={{padding:'5px 8px',color:j===0?'var(--text-muted)':'var(--text-secondary)',fontWeight:j===0?600:400}}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>消息可靠性三要素</div>
        {[
          { name:'生产者确认', color:'#56d364', desc:'Kafka acks=all：消息写入所有 ISR 副本后才确认；RabbitMQ confirm 模式' },
          { name:'Broker 持久化', color:'#ffa657', desc:'Kafka 分区副本 replication.factor≥3；RabbitMQ durable queue + persistent message' },
          { name:'消费者确认', color:'#79c0ff', desc:'消费成功后手动 ACK；处理失败发到死信队列（DLQ）延迟重试' },
        ].map(p=>(
          <div key={p.name} style={{marginBottom:8,padding:'10px 12px',borderRadius:6,background:'var(--bg-elevated)'}}>
            <span style={{color:p.color,fontWeight:700,fontSize:12}}>{p.name}：</span>
            <span style={{fontSize:11,color:'var(--text-secondary)'}}>{p.desc}</span>
          </div>
        ))}
      </div>
    </div>
  </div>,

  url_shortener: <div>
    <h3 style={{color:'#4d8fff',marginTop:0}}>🔗 URL 短链系统</h3>
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>需求拆解</div>
        <div style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.8}}>
          QPS 写：100/s，读：10,000/s（读写比 100:1）<br/>
          URL 最大长度 2048 字节，短码 7 位（62^7 ≈ 35亿）<br/>
          数据保存 10 年，总量 ≈ 100/s × 86400 × 365 × 10 ≈ 315 亿条<br/>
          存储：315亿 × (100B url + 7B code) ≈ 3.4 TB
        </div>
      </div>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>短码生成方案对比</div>
        {[
          { name:'哈希（MD5/SHA1 取前7位）', color:'#56d364',
            pros:'无需存长链→短码映射（理论）',
            cons:'碰撞需处理，相同长链结果相同（隐私问题）' },
          { name:'自增 ID + Base62 编码', color:'#79c0ff',
            pros:'无碰撞，实现简单',
            cons:'ID 可被枚举，需加盐或随机化' },
          { name:'分布式 ID（Snowflake）+ Base62', color:'#ffa657',
            pros:'无单点，ID 有序，无碰撞',
            cons:'实现复杂度中等' },
        ].map(s=>(
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
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>高层架构</div>
        <pre style={{margin:0,fontSize:11,lineHeight:1.8,color:'#e6edf3',fontFamily:'monospace'}}>{`用户 → CDN / Nginx
        ↓
   短链服务集群（无状态，水平扩展）
   写：生成短码 → 写 MySQL（主） + 写 Redis 缓存
   读：Redis 查短码 → hit→301重定向
                  → miss→查 MySQL → 回填缓存
        ↓
  MySQL（主从）   Redis Cluster（缓存，LRU）
  + 分库分表（短码 hash 分片）`}</pre>
      </div>
    </div>
  </div>,

  twitter: <div>
    <h3 style={{color:'#4d8fff',marginTop:0}}>🐦 Twitter Feed 设计</h3>
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:6}}>核心问题：Fan-out</div>
        <div style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.8}}>
          当用户发推时，如何把这条推文送到所有粉丝的 Feed？<br/>
          关键指标：DAU 3亿，明星用户粉丝数可达 1亿，普通用户几百个粉丝
        </div>
      </div>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>两种 Fan-out 方案</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div style={{background:'#56d36415',borderRadius:6,padding:10,border:'1px solid #56d36440'}}>
            <div style={{fontWeight:700,color:'#56d364',marginBottom:4}}>Fan-out on Write（推）</div>
            <div style={{fontSize:11,color:'var(--text-muted)',lineHeight:1.7}}>发推时立即写入所有粉丝的 Feed 缓存<br/><br/>✓ 读 Feed 极快（O(1)）<br/>✗ 大V发推写放大（1亿次写）<br/>✗ 非活跃用户浪费计算</div>
          </div>
          <div style={{background:'#ffa65715',borderRadius:6,padding:10,border:'1px solid #ffa65740'}}>
            <div style={{fontWeight:700,color:'#ffa657',marginBottom:4}}>Fan-out on Read（拉）</div>
            <div style={{fontSize:11,color:'var(--text-muted)',lineHeight:1.7}}>读 Feed 时合并所有关注者的推文<br/><br/>✓ 写入简单<br/>✗ 读 Feed 慢（聚合 N 个关注者）<br/>✗ 高并发读压力大</div>
          </div>
        </div>
        <div style={{marginTop:10,padding:'10px 12px',borderRadius:6,background:'var(--bg-elevated)',border:'1px solid #79c0ff40'}}>
          <div style={{fontWeight:700,color:'#79c0ff',fontSize:12,marginBottom:4}}>混合策略（Twitter 实际方案）</div>
          <div style={{fontSize:11,color:'var(--text-secondary)',lineHeight:1.8}}>
            普通用户（≤1万粉）→ Fan-out on Write，预填充 Feed Cache<br/>
            大V（&gt;1万粉）→ Fan-out on Read，读时动态合并<br/>
            用户打开 App → 拉取预填充 Feed + 实时合并关注的大V推文
          </div>
        </div>
      </div>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>数据模型</div>
        <pre style={{margin:0,fontSize:11,lineHeight:1.6,color:'#e6edf3',fontFamily:'monospace'}}>{`Tweet:   tweet_id(PK) | user_id | content | created_at | media_ids
User:    user_id(PK)  | name | follower_count | following_count
Follow:  follower_id | followee_id | created_at  (复合索引)
Feed:    user_id | tweet_id | score(时间戳) → Redis Sorted Set`}</pre>
      </div>
    </div>
  </div>,

  youtube: <div>
    <h3 style={{color:'#4d8fff',marginTop:0}}>▶ YouTube 视频系统</h3>
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>上传流程</div>
        <pre style={{margin:0,fontSize:11,lineHeight:1.8,color:'#e6edf3',fontFamily:'monospace'}}>{`① 客户端 → API 网关 → 上传服务
② 原始视频 → 对象存储（S3 / GCS）
③ 上传完成 → 发消息到 MQ（Kafka）
④ 视频处理集群消费消息：
   - 格式转换（FFmpeg：mp4 → HLS）
   - 多分辨率：240p / 480p / 720p / 1080p / 4K
   - 生成缩略图（每秒抽帧）
   - CDN 预热（热门视频提前分发）
⑤ 元数据写 DB（标题/时长/分辨率/状态）
⑥ 通知用户：上传成功`}</pre>
      </div>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>播放流程（自适应码率 HLS）</div>
        <div style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.8}}>
          视频被切割成 2-10 秒的 <code style={{color:'#56d364'}}>.ts</code> 分片 + <code style={{color:'#56d364'}}>.m3u8</code> 播放列表<br/>
          客户端根据网速动态选择分辨率（360p → 720p → 1080p）<br/>
          分片从 <strong style={{color:'#79c0ff'}}>CDN 边缘节点</strong>就近拉取，未命中才回源到 S3
        </div>
      </div>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>存储拆分</div>
        {[
          ['视频文件','S3 / GCS + CDN','对象存储，冷热分层（S3 Standard → Glacier）'],
          ['元数据','MySQL / Spanner','视频信息、用户信息、强一致事务'],
          ['评论','Cassandra','时序写入，按 video_id 分区'],
          ['推荐','图数据库 + 向量库','用户行为图谱、相似视频向量'],
          ['搜索','Elasticsearch','全文索引标题/描述/字幕'],
          ['计数','Redis','播放量/点赞数（批量刷 DB，防止写放大）'],
        ].map(([what,where,why],i)=>(
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
    <h3 style={{color:'#4d8fff',marginTop:0}}>🚗 Uber 打车系统</h3>
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>核心挑战：实时地理位置匹配</div>
        <pre style={{margin:0,fontSize:11,lineHeight:1.8,color:'#e6edf3',fontFamily:'monospace'}}>{`司机位置更新（每 4 秒）→ WebSocket / HTTPS
→ 位置服务 → 写 Redis Geo（GEOADD key lng lat driver_id）
乘客叫车 → GEORADIUS 找 5km 内空闲司机
→ 匹配服务（最近空闲 + 评分）→ 派单`}</pre>
      </div>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>Geohash 空间索引</div>
        <div style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.8}}>
          把地球表面递归切分为网格，每个格子编码为字符串（如 <code style={{color:'#56d364'}}>"wx4g0e"</code>）<br/>
          前缀相同 = 地理上相邻（精度 6 位 ≈ 1.2km × 0.6km）<br/>
          问题：边界跨格时需查8个相邻格，用 <strong style={{color:'#ffa657'}}>Redis Geo</strong>（底层 Geohash）解决
        </div>
      </div>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>行程状态机</div>
        <div style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.8}}>
          叫车 → 匹配中 → 司机接单 → 前往乘客 → 乘客上车 → 行程中 → 到达目的地 → 支付 → 完成<br/><br/>
          每次状态转换发 <strong style={{color:'#79c0ff'}}>Kafka 事件</strong>，下游订阅：计费/通知/风控/数据仓库
        </div>
      </div>
    </div>
  </div>,

  search: <div>
    <h3 style={{color:'#4d8fff',marginTop:0}}>🔍 搜索引擎设计</h3>
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>两大核心系统</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div style={{background:'#4d8fff15',borderRadius:6,padding:10,border:'1px solid #4d8fff40'}}>
            <div style={{fontWeight:700,color:'#4d8fff',marginBottom:4}}>爬虫系统</div>
            <div style={{fontSize:11,color:'var(--text-muted)',lineHeight:1.7}}>URL 队列 → 下载 HTML<br/>→ 解析链接（BFS）<br/>→ 去重（Bloom Filter）<br/>→ 入队待索引<br/>→ 原始内容存对象存储</div>
          </div>
          <div style={{background:'#56d36415',borderRadius:6,padding:10,border:'1px solid #56d36440'}}>
            <div style={{fontWeight:700,color:'#56d364',marginBottom:4}}>索引系统</div>
            <div style={{fontSize:11,color:'var(--text-muted)',lineHeight:1.7}}>分词 → 去停用词<br/>→ 倒排索引构建<br/>→ TF-IDF / BM25 评分<br/>→ PageRank 链接分析<br/>→ 分布式索引分片</div>
          </div>
        </div>
      </div>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:6}}>倒排索引</div>
        <pre style={{margin:0,fontSize:11,lineHeight:1.6,color:'#e6edf3',fontFamily:'monospace'}}>{`"redis" → [doc_3(pos:15,tf:3), doc_7(pos:2,tf:1), doc_12(pos:8,tf:5)]
"cache" → [doc_3(pos:20,tf:2), doc_5(pos:1,tf:8)]

查询 "redis cache":
  取两个 posting list → 合并（AND/OR）→ 按相关性排序`}</pre>
      </div>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:6}}>搜索建议（Typeahead）</div>
        <div style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.8}}>
          前缀树 Trie → 存储热门查询词，按搜索频次排序<br/>
          Trie 按前缀分片（如 a-g / h-p / q-z），存 Redis，定时用离线统计更新<br/>
          前端输入每 300ms 触发一次（debounce），返回 top-5 建议
        </div>
      </div>
    </div>
  </div>,

  chat: <div>
    <h3 style={{color:'#4d8fff',marginTop:0}}>💬 即时通讯系统</h3>
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>连接协议选择</div>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {[
            { name:'WebSocket', color:'#56d364', desc:'全双工长连接，服务端主动推送，现代 IM 首选' },
            { name:'长轮询 Long Polling', color:'#ffa657', desc:'客户端挂起请求等待响应，兼容性好但资源消耗大' },
            { name:'SSE (Server-Sent Events)', color:'#79c0ff', desc:'服务端单向推流，适合通知类场景' },
          ].map(p=>(
            <div key={p.name} style={{display:'flex',gap:10,padding:'7px 10px',borderRadius:6,background:'var(--bg-elevated)'}}>
              <span style={{color:p.color,fontWeight:700,minWidth:130,fontSize:11,flexShrink:0}}>{p.name}</span>
              <span style={{fontSize:11,color:'var(--text-secondary)'}}>{p.desc}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>消息顺序 & 去重</div>
        <pre style={{margin:0,fontSize:11,lineHeight:1.8,color:'#e6edf3',fontFamily:'monospace'}}>{`消息 ID = Snowflake ID（时间戳有序）
消息序号 = 每个会话内自增（seq_id）
客户端用 seq_id 检测消息丢失，主动重拉
去重 Key = (from_user, to_user/group, client_msg_id)
        → Redis SET 24h，防止网络重传导致重复存储`}</pre>
      </div>
      <div style={{background:'var(--bg-secondary)',borderRadius:8,padding:14,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>已读回执 & 离线消息</div>
        <div style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.8}}>
          已读：客户端收到消息后发 ACK → 服务端更新 <code style={{color:'#56d364'}}>last_ack_msg_id</code><br/>
          离线：消息写入 <strong style={{color:'#79c0ff'}}>Cassandra</strong>（按 (user_id, msg_id) 分区），上线时拉取 last_ack 之后的消息<br/>
          群聊：写扩散 vs 读扩散（群成员 &lt;500 写扩散，&gt;500 读扩散）
        </div>
      </div>
    </div>
  </div>,
}

const CAT_LABELS: Record<string, string> = {
  classic: '经典组件',
  real: '真实系统',
  tech: '技术选型',
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SystemDesignView() {
  const [sel, setSel] = useState('checklist')
  const isMobile = useMobile()

  const cats = ['tech', 'classic', 'real'] as const

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
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>🏗 系统设计</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>System Design Interview</div>
        </div>}
        {!isMobile && cats.map(cat => (
          <div key={cat}>
            <div style={{ padding: '6px 14px 3px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, marginTop: 4 }}>
              {CAT_LABELS[cat].toUpperCase()}
            </div>
            {TOPICS.filter(t => t.category === cat).map(topic => (
              <button key={topic.id} onClick={() => setSel(topic.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '8px 14px', border: 'none',
                  borderLeft: sel === topic.id ? '3px solid var(--accent-blue)' : '3px solid transparent',
                  background: sel === topic.id ? 'var(--bg-elevated)' : 'transparent',
                  color: sel === topic.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: 11, fontWeight: sel === topic.id ? 700 : 400, textAlign: 'left' }}>
                <span style={{ fontSize: 14 }}>{topic.icon}</span>
                <span>{topic.name}</span>
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
        {DETAILS[sel] ?? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, paddingTop: 40, textAlign: 'center' }}>
            内容建设中…
          </div>
        )}
      </div>
    </div>
  )
}
