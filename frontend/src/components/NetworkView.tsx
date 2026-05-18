import { useState } from 'react'

type Layer = 'app' | 'transport' | 'network' | 'link' | 'physical'

interface Protocol { id: string; name: string; layer: Layer; color: string; fields: { name: string; bits: number; desc: string; value?: string }[]; desc: string }

const PROTOCOLS: Protocol[] = [
  {
    id: 'http', name: 'HTTP/1.1', layer: 'app', color: '#4d8fff',
    desc: '超文本传输协议，无状态请求/响应协议，基于 TCP',
    fields: [
      { name: 'Method', bits: 0, desc: 'GET/POST/PUT/DELETE', value: 'GET' },
      { name: 'URI',    bits: 0, desc: '资源路径', value: '/index.html' },
      { name: 'Version',bits: 0, desc: 'HTTP 版本', value: 'HTTP/1.1' },
      { name: 'Headers',bits: 0, desc: 'Host, Content-Type 等', value: 'Host: example.com' },
      { name: 'Body',   bits: 0, desc: '请求/响应正文', value: '(empty)' },
    ],
  },
  {
    id: 'dns', name: 'DNS', layer: 'app', color: '#4d8fff',
    desc: '域名解析协议，UDP 端口 53，将域名转为 IP 地址',
    fields: [
      { name: 'Transaction ID', bits: 16, desc: '标识请求与响应', value: '0x1A2B' },
      { name: 'Flags',          bits: 16, desc: 'QR/Opcode/AA/TC/RD/RA', value: '0x0100' },
      { name: 'Questions',      bits: 16, desc: '查询记录数', value: '1' },
      { name: 'Answers',        bits: 16, desc: '回答记录数', value: '0' },
      { name: 'QNAME',          bits: 0,  desc: '查询域名', value: 'example.com' },
      { name: 'QTYPE',          bits: 16, desc: 'A/AAAA/MX/CNAME', value: 'A (1)' },
    ],
  },
  {
    id: 'tcp', name: 'TCP', layer: 'transport', color: '#3fb950',
    desc: '传输控制协议，可靠有序，面向连接，三次握手建立',
    fields: [
      { name: 'Src Port',   bits: 16, desc: '源端口',  value: '54321' },
      { name: 'Dst Port',   bits: 16, desc: '目标端口', value: '80' },
      { name: 'Seq Num',    bits: 32, desc: '序列号',  value: '1000' },
      { name: 'Ack Num',    bits: 32, desc: '确认号',  value: '0' },
      { name: 'Data Offset',bits: 4,  desc: '首部长度（×4字节）', value: '5' },
      { name: 'Flags',      bits: 6,  desc: 'SYN/ACK/FIN/RST/PSH/URG', value: 'SYN' },
      { name: 'Window',     bits: 16, desc: '接收窗口大小', value: '65535' },
      { name: 'Checksum',   bits: 16, desc: '校验和', value: '0xA1B2' },
    ],
  },
  {
    id: 'udp', name: 'UDP', layer: 'transport', color: '#3fb950',
    desc: '用户数据报协议，无连接无可靠性，低延迟，适合实时应用',
    fields: [
      { name: 'Src Port',  bits: 16, desc: '源端口',  value: '12345' },
      { name: 'Dst Port',  bits: 16, desc: '目标端口', value: '53' },
      { name: 'Length',    bits: 16, desc: '数据报长度（首部+数据）', value: '28' },
      { name: 'Checksum',  bits: 16, desc: '校验和（可选）', value: '0x0000' },
      { name: 'Data',      bits: 0,  desc: '应用层数据', value: 'DNS query...' },
    ],
  },
  {
    id: 'ipv4', name: 'IPv4', layer: 'network', color: '#ffa657',
    desc: '网际协议第4版，32位地址，分片重组，TTL 防环路',
    fields: [
      { name: 'Version',  bits: 4,  desc: '协议版本', value: '4' },
      { name: 'IHL',      bits: 4,  desc: '首部长度（×4字节）', value: '5' },
      { name: 'DSCP/ECN', bits: 8,  desc: '服务类型/拥塞通知', value: '0x00' },
      { name: 'Total Len',bits: 16, desc: '总长度', value: '60' },
      { name: 'ID',       bits: 16, desc: '分片标识', value: '0x1234' },
      { name: 'Flags',    bits: 3,  desc: 'DF/MF 标志位', value: 'DF' },
      { name: 'Frag Off', bits: 13, desc: '分片偏移', value: '0' },
      { name: 'TTL',      bits: 8,  desc: '生存时间', value: '64' },
      { name: 'Protocol', bits: 8,  desc: '上层协议 (6=TCP, 17=UDP)', value: '6' },
      { name: 'Checksum', bits: 16, desc: '首部校验和', value: '0xB1C2' },
      { name: 'Src IP',   bits: 32, desc: '源 IP 地址', value: '192.168.1.100' },
      { name: 'Dst IP',   bits: 32, desc: '目标 IP 地址', value: '93.184.216.34' },
    ],
  },
  {
    id: 'eth', name: 'Ethernet II', layer: 'link', color: '#e3b341',
    desc: '以太网帧，IEEE 802.3，48位 MAC 地址，MTU 1500字节',
    fields: [
      { name: 'Dst MAC',  bits: 48, desc: '目标 MAC 地址', value: 'aa:bb:cc:dd:ee:ff' },
      { name: 'Src MAC',  bits: 48, desc: '源 MAC 地址', value: '11:22:33:44:55:66' },
      { name: 'EtherType',bits: 16, desc: '上层协议 (0x0800=IPv4, 0x0806=ARP)', value: '0x0800' },
      { name: 'Payload',  bits: 0,  desc: 'IP 数据报（46-1500字节）', value: 'IPv4 packet...' },
      { name: 'FCS',      bits: 32, desc: '帧校验序列 (CRC-32)', value: '0x12345678' },
    ],
  },
]

const LAYER_INFO: Record<Layer, { name: string; color: string; protocols: string[]; role: string }> = {
  app:      { name: '应用层', color: '#4d8fff', protocols: ['HTTP','HTTPS','DNS','FTP','SMTP','SSH'], role: '提供用户服务接口，定义数据格式' },
  transport:{ name: '传输层', color: '#3fb950', protocols: ['TCP','UDP','QUIC','SCTP'],              role: '端到端通信，流量控制，可靠性' },
  network:  { name: '网络层', color: '#ffa657', protocols: ['IPv4','IPv6','ICMP','OSPF','BGP'],      role: '路由选择，IP 寻址，分片' },
  link:     { name: '链路层', color: '#e3b341', protocols: ['Ethernet','WiFi','ARP','PPP'],          role: '相邻节点传输，MAC 寻址，帧封装' },
  physical: { name: '物理层', color: '#ff6b6b', protocols: ['RJ45','光纤','WiFi RF','同轴电缆'],    role: '比特流传输，信号编码，物理介质' },
}

const LAYERS: Layer[] = ['app', 'transport', 'network', 'link', 'physical']

function EncapsulationDiagram({ selected }: { selected: Protocol | null }) {
  const colors = { app: '#4d8fff', transport: '#3fb950', network: '#ffa657', link: '#e3b341', physical: '#ff6b6b' }
  const labels: [Layer, string][] = [
    ['app', 'Data'],
    ['transport', 'TCP Hdr | Data'],
    ['network', 'IP Hdr | TCP Hdr | Data'],
    ['link', 'ETH Hdr | IP Hdr | TCP Hdr | Data | FCS'],
    ['physical', '01001000 01100101 01101100 01101100 01101111...'],
  ]
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>封装过程（从上到下层层包裹）</div>
      {labels.map(([layer, content]) => {
        const c = colors[layer]
        const isActive = selected?.layer === layer
        return (
          <div key={layer} style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4,
            opacity: selected && !isActive ? 0.5 : 1, transition: 'opacity 0.2s',
          }}>
            <div style={{ width: 70, fontSize: 10, color: c, fontWeight: 700, textAlign: 'right', flexShrink: 0 }}>
              {LAYER_INFO[layer].name}
            </div>
            <div style={{
              flex: 1, padding: '5px 10px', borderRadius: 5, fontSize: 11, fontFamily: 'monospace',
              background: isActive ? `${c}25` : `${c}10`,
              border: `1px solid ${isActive ? c : c + '40'}`,
              color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {content}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function NetworkView() {
  const [selLayer, setSelLayer] = useState<Layer>('app')
  const [selProto, setSelProto] = useState<Protocol | null>(PROTOCOLS[0])

  const layerProtos = PROTOCOLS.filter(p => p.layer === selLayer)

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* OSI/TCP-IP Stack */}
      <div style={{ width: 160, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', padding: '12px 8px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: 1 }}>TCP/IP 协议栈</div>
        {LAYERS.map(layer => {
          const info = LAYER_INFO[layer]
          const isActive = selLayer === layer
          return (
            <button key={layer} onClick={() => { setSelLayer(layer); setSelProto(null) }} style={{
              display: 'block', width: '100%', marginBottom: 4, padding: '8px 10px',
              background: isActive ? `${info.color}20` : 'transparent',
              border: isActive ? `1px solid ${info.color}` : '1px solid transparent',
              color: isActive ? info.color : 'var(--text-secondary)',
              borderRadius: 7, cursor: 'pointer', textAlign: 'left',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{info.name}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                {info.protocols.slice(0, 3).join(' · ')}
              </div>
            </button>
          )
        })}
      </div>

      {/* Protocol list */}
      <div style={{ width: 170, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg-secondary)', padding: '12px 8px', overflowY: 'auto' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>{LAYER_INFO[selLayer].name}协议</div>
        {layerProtos.map(p => (
          <button key={p.id} onClick={() => setSelProto(p)} style={{
            display: 'block', width: '100%', marginBottom: 4, padding: '8px 10px',
            background: selProto?.id === p.id ? `${p.color}20` : 'transparent',
            border: selProto?.id === p.id ? `1px solid ${p.color}` : '1px solid transparent',
            color: selProto?.id === p.id ? p.color : 'var(--text-secondary)',
            borderRadius: 6, cursor: 'pointer', fontSize: 12, textAlign: 'left',
          }}>{p.name}</button>
        ))}
        {layerProtos.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {LAYER_INFO[selLayer].protocols.map(p => (
              <div key={p} style={{ padding: '5px 8px', borderRadius: 4, marginBottom: 2, border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 11 }}>{p}</div>
            ))}
          </div>
        )}
      </div>

      {/* Detail */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {/* Layer info */}
        <div style={{ background: `${LAYER_INFO[selLayer].color}15`, borderRadius: 10, padding: 14, marginBottom: 16, border: `1px solid ${LAYER_INFO[selLayer].color}40` }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: LAYER_INFO[selLayer].color }}>{LAYER_INFO[selLayer].name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{LAYER_INFO[selLayer].role}</div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {LAYER_INFO[selLayer].protocols.map(p => (
              <span key={p} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: `${LAYER_INFO[selLayer].color}20`, color: LAYER_INFO[selLayer].color }}>{p}</span>
            ))}
          </div>
        </div>

        {selProto && (
          <>
            <div style={{ fontSize: 14, fontWeight: 700, color: selProto.color, marginBottom: 6 }}>{selProto.name} 报文结构</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>{selProto.desc}</div>

            {/* Packet visualization */}
            <div style={{ display: 'flex', marginBottom: 14, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
              {selProto.fields.map((f, i) => {
                const flex = f.bits ? Math.max(f.bits / 8, 1) : 3
                return (
                  <div key={i} title={f.desc} style={{
                    flex, padding: '6px 4px', textAlign: 'center', borderRight: i < selProto.fields.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                    background: `${selProto.color}${10 + (i % 3) * 10}`,
                    minWidth: 36,
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: selProto.color }}>{f.name}</div>
                    {f.bits > 0 && <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{f.bits}b</div>}
                    {f.value && <div style={{ fontSize: 9, color: 'var(--text-secondary)', marginTop: 2, fontFamily: 'monospace' }}>{f.value}</div>}
                  </div>
                )
              })}
            </div>

            {/* Field table */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)' }}>
                    {['字段', '位数', '值示例', '说明'].map(h => (
                      <th key={h} style={{ padding: '7px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selProto.fields.map((f, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px 12px', color: selProto.color, fontWeight: 600, fontFamily: 'monospace' }}>{f.name}</td>
                      <td style={{ padding: '6px 12px', color: 'var(--text-muted)' }}>{f.bits || '可变'}</td>
                      <td style={{ padding: '6px 12px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 11 }}>{f.value || '—'}</td>
                      <td style={{ padding: '6px 12px', color: 'var(--text-muted)' }}>{f.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <EncapsulationDiagram selected={selProto} />

        {/* Key concepts */}
        <div style={{ marginTop: 20, background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>关键概念</div>
          {[
            ['封装', '每层在数据前加自己的首部（header），接收方逐层剥去首部'],
            ['MTU', '最大传输单元：以太网 1500B，超过需分片（IP）或分段（TCP）'],
            ['三次握手', 'TCP SYN → SYN+ACK → ACK，建立可靠连接'],
            ['ARP', '地址解析：IP → MAC，在同一链路内广播查询'],
            ['NAT', '网络地址转换：多台内网主机共享一个公网 IP'],
          ].map(([k, v]) => (
            <div key={k} style={{ padding: '7px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: LAYER_INFO[selLayer].color, minWidth: 80 }}>{k}</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
