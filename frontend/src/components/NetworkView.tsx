import { useState } from 'react'
import { useMobile } from '../hooks/useMobile'
import { useLang } from '../i18n/lang'

type Layer = 'app' | 'transport' | 'network' | 'link' | 'physical'

interface Protocol {
  id: string; name: string; layer: Layer; color: string
  fields: { name: string; bits: number; desc: string; desc_en: string; value?: string }[]
  desc: string
  desc_en: string
  code?: string
  codeTitle?: string
  codeTitle_en?: string
}

const PROTOCOLS: Protocol[] = [
  {
    id: 'http', name: 'HTTP/1.1', layer: 'app', color: '#4d8fff',
    desc: '超文本传输协议，无状态请求/响应，基于 TCP，端口 80',
    desc_en: 'Hypertext Transfer Protocol, stateless request/response, TCP-based, port 80',
    fields: [
      { name: 'Method',  bits: 0, desc: 'GET/POST/PUT/DELETE', desc_en: 'GET/POST/PUT/DELETE', value: 'GET' },
      { name: 'URI',     bits: 0, desc: '资源路径', desc_en: 'Resource path', value: '/index.html' },
      { name: 'Version', bits: 0, desc: 'HTTP 版本', desc_en: 'HTTP version', value: 'HTTP/1.1' },
      { name: 'Headers', bits: 0, desc: 'Host, Content-Type 等', desc_en: 'Host, Content-Type, etc.', value: 'Host: example.com' },
      { name: 'Body',    bits: 0, desc: '请求/响应正文', desc_en: 'Request/response body', value: '(empty)' },
    ],
    codeTitle: 'HTTP 服务器 (C — POSIX socket)',
    codeTitle_en: 'HTTP Server (C — POSIX socket)',
    code: `/* 极简 HTTP/1.1 服务器 — 返回 "Hello World" */
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>

#define PORT 8080
#define RESP \
  "HTTP/1.1 200 OK\\r\\n" \
  "Content-Type: text/plain\\r\\n" \
  "Content-Length: 11\\r\\n" \
  "Connection: close\\r\\n\\r\\n" \
  "Hello World"

int main(void) {
    int srv = socket(AF_INET, SOCK_STREAM, 0);
    int opt = 1;
    setsockopt(srv, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    struct sockaddr_in addr = {
        .sin_family      = AF_INET,
        .sin_addr.s_addr = INADDR_ANY,
        .sin_port        = htons(PORT),
    };
    bind(srv, (struct sockaddr*)&addr, sizeof(addr));
    listen(srv, 16);
    printf("Listening on http://0.0.0.0:%d\\n", PORT);

    for (;;) {
        int cli = accept(srv, NULL, NULL);
        char buf[4096] = {};
        read(cli, buf, sizeof(buf)-1);
        /* 解析请求行 */
        char method[8], path[256], ver[16];
        sscanf(buf, "%7s %255s %15s", method, path, ver);
        printf("%s %s\\n", method, path);
        /* 发送响应 */
        write(cli, RESP, strlen(RESP));
        close(cli);
    }
}`,
  },
  {
    id: 'dns', name: 'DNS', layer: 'app', color: '#4d8fff',
    desc: '域名解析，UDP 端口 53，将域名转为 IP 地址',
    desc_en: 'Domain name resolution, UDP port 53, resolves domain names to IP addresses',
    fields: [
      { name: 'Transaction ID', bits: 16, desc: '标识请求与响应', desc_en: 'Identifies request and response', value: '0x1A2B' },
      { name: 'Flags',          bits: 16, desc: 'QR/Opcode/AA/TC/RD/RA', desc_en: 'QR/Opcode/AA/TC/RD/RA', value: '0x0100' },
      { name: 'Questions',      bits: 16, desc: '查询记录数', desc_en: 'Number of question entries', value: '1' },
      { name: 'Answers',        bits: 16, desc: '回答记录数', desc_en: 'Number of answer entries', value: '0' },
      { name: 'QNAME',          bits: 0,  desc: '查询域名', desc_en: 'Query domain name', value: 'example.com' },
      { name: 'QTYPE',          bits: 16, desc: 'A/AAAA/MX/CNAME', desc_en: 'A/AAAA/MX/CNAME', value: 'A (1)' },
    ],
    codeTitle: 'DNS A 查询 (C — 原始 UDP)',
    codeTitle_en: 'DNS A Query (C — Raw UDP)',
    code: `/* 手写 DNS A记录查询报文，解析响应 IP */
#include <stdio.h>
#include <string.h>
#include <arpa/inet.h>
#include <unistd.h>

/* 把 "example.com" 编码为 DNS label: \\x07example\\x03com\\x00 */
static int encode_name(const char *host, uint8_t *buf) {
    int pos = 0;
    const char *p = host;
    while (*p) {
        const char *dot = strchr(p, '.');
        int len = dot ? (int)(dot - p) : (int)strlen(p);
        buf[pos++] = (uint8_t)len;
        memcpy(buf + pos, p, len);
        pos += len;
        p = dot ? dot + 1 : p + len;
        if (!dot) break;
    }
    buf[pos++] = 0;   /* 根标签 */
    return pos;
}

int main(void) {
    const char *dns_server = "8.8.8.8";
    const char *host = "example.com";

    int fd = socket(AF_INET, SOCK_DGRAM, 0);
    struct sockaddr_in srv = {
        .sin_family = AF_INET, .sin_port = htons(53),
    };
    inet_pton(AF_INET, dns_server, &srv.sin_addr);

    uint8_t pkt[512] = {};
    /* DNS 首部 */
    pkt[0]=0x12; pkt[1]=0x34; /* ID */
    pkt[2]=0x01; pkt[3]=0x00; /* 标准查询，期望递归 */
    pkt[5]=0x01;               /* QDCOUNT=1 */
    int pos = 12;

    /* 查询名 + QTYPE(A=1) + QCLASS(IN=1) */
    pos += encode_name(host, pkt + pos);
    pkt[pos++]=0; pkt[pos++]=1;  /* QTYPE A */
    pkt[pos++]=0; pkt[pos++]=1;  /* QCLASS IN */

    sendto(fd, pkt, pos, 0, (struct sockaddr*)&srv, sizeof(srv));

    uint8_t resp[512];
    int n = recvfrom(fd, resp, sizeof(resp), 0, NULL, NULL);
    /* ANCOUNT 在偏移6 */
    int ancount = (resp[6]<<8)|resp[7];
    printf("Answers: %d\\n", ancount);
    /* 跳过首部和问题段，简单扫描 RDATA */
    /* 完整解析需跳过压缩标签，此处仅打印最后4字节A记录 */
    for (int i = n-4; i >= 12; i--) {
        if (resp[i-2]==0 && resp[i-1]==4) { /* RDLENGTH=4 */
            printf("%s -> %d.%d.%d.%d\\n", host,
                resp[i], resp[i+1], resp[i+2], resp[i+3]);
            break;
        }
    }
    close(fd);
}`,
  },
  {
    id: 'rtsp', name: 'RTSP', layer: 'app', color: '#4d8fff',
    desc: '实时流传输协议，端口554，控制音视频流（监控/直播），媒体数据由 RTP 传输',
    desc_en: 'Real-Time Streaming Protocol, port 554, controls audio/video streams (surveillance/live), media data transported via RTP',
    fields: [
      { name: 'Method',    bits: 0, desc: 'DESCRIBE/SETUP/PLAY/PAUSE/TEARDOWN', desc_en: 'DESCRIBE/SETUP/PLAY/PAUSE/TEARDOWN', value: 'DESCRIBE' },
      { name: 'URL',       bits: 0, desc: 'rtsp://host:554/live/stream', desc_en: 'rtsp://host:554/live/stream', value: 'rtsp://cam.local/ch0' },
      { name: 'RTSP-Ver',  bits: 0, desc: '协议版本', desc_en: 'Protocol version', value: 'RTSP/1.0' },
      { name: 'CSeq',      bits: 0, desc: '序列号（每请求递增）', desc_en: 'Sequence number (increments per request)', value: 'CSeq: 1' },
      { name: 'Session',   bits: 0, desc: 'SETUP后服务端分配会话ID', desc_en: 'Session ID assigned by server after SETUP', value: 'Session: 12345678' },
      { name: 'Transport', bits: 0, desc: 'RTP传输参数（端口/UDP/TCP）', desc_en: 'RTP transport parameters (port/UDP/TCP)', value: 'RTP/AVP;unicast;client_port=5000-5001' },
    ],
    codeTitle: 'RTSP 客户端 DESCRIBE+PLAY (C — TCP socket)',
    codeTitle_en: 'RTSP Client DESCRIBE+PLAY (C — TCP socket)',
    code: `/* RTSP 完整流程: DESCRIBE → SETUP → PLAY → (接收RTP) → TEARDOWN */
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <arpa/inet.h>

#define RTSP_PORT 554
#define CRLF "\\r\\n"

static int rtsp_connect(const char *host) {
    int fd = socket(AF_INET, SOCK_STREAM, 0);
    struct sockaddr_in srv = { .sin_family=AF_INET, .sin_port=htons(RTSP_PORT) };
    inet_pton(AF_INET, host, &srv.sin_addr);
    if (connect(fd, (struct sockaddr*)&srv, sizeof(srv)) < 0) { perror("connect"); return -1; }
    return fd;
}

static void rtsp_send(int fd, const char *req) {
    send(fd, req, strlen(req), 0);
}

static void rtsp_recv(int fd, char *buf, int sz) {
    int n = recv(fd, buf, sz-1, 0);
    buf[n>0?n:0] = 0;
    printf("<<\\n%s\\n", buf);
}

int main(void) {
    const char *host = "192.168.1.200";
    const char *url  = "rtsp://192.168.1.200/live/ch0";
    char buf[4096];
    char req[1024];

    int fd = rtsp_connect(host);
    if (fd < 0) { printf("使用 ffplay %s 直接播放\\n", url); return 1; }

    /* 1. DESCRIBE — 获取 SDP 媒体描述 */
    snprintf(req, sizeof(req),
        "DESCRIBE %s RTSP/1.0" CRLF
        "CSeq: 1" CRLF
        "Accept: application/sdp" CRLF CRLF, url);
    rtsp_send(fd, req); rtsp_recv(fd, buf, sizeof(buf));
    /* SDP 响应示例:
       v=0
       o=- 0 0 IN IP4 192.168.1.200
       m=video 0 RTP/AVP 96
       a=rtpmap:96 H264/90000 */

    /* 2. SETUP — 建立 RTP 通道，指定客户端端口 */
    snprintf(req, sizeof(req),
        "SETUP %s/trackID=0 RTSP/1.0" CRLF
        "CSeq: 2" CRLF
        "Transport: RTP/AVP;unicast;client_port=5000-5001" CRLF CRLF, url);
    rtsp_send(fd, req); rtsp_recv(fd, buf, sizeof(buf));
    /* 从响应中解析 Session ID */
    char session[64] = {};
    char *p = strstr(buf, "Session: ");
    if (p) sscanf(p, "Session: %63[^;\\r\\n]", session);
    printf("Session: %s\\n", session);

    /* 3. PLAY — 开始播放 */
    snprintf(req, sizeof(req),
        "PLAY %s RTSP/1.0" CRLF
        "CSeq: 3" CRLF
        "Session: %s" CRLF
        "Range: npt=0.000-" CRLF CRLF, url, session);
    rtsp_send(fd, req); rtsp_recv(fd, buf, sizeof(buf));

    printf("RTP 流正在端口 5000 接收，按 Enter 停止...\\n");
    getchar();

    /* 4. TEARDOWN — 结束会话 */
    snprintf(req, sizeof(req),
        "TEARDOWN %s RTSP/1.0" CRLF
        "CSeq: 4" CRLF
        "Session: %s" CRLF CRLF, url, session);
    rtsp_send(fd, req); rtsp_recv(fd, buf, sizeof(buf));
    close(fd);

    /* FFmpeg 工具链: */
    /* ffplay rtsp://192.168.1.200/live/ch0                   播放 */
    /* ffmpeg -i rtsp://... -c copy output.mp4                录制 */
    /* ffmpeg -re -i input.mp4 -f rtsp rtsp://server/live     推流 */
}`,
  },
  {
    id: 'sip', name: 'SIP', layer: 'app', color: '#4d8fff',
    desc: '会话初始化协议，端口5060(UDP/TCP)，用于VoIP/视频通话信令，媒体由RTP传输',
    desc_en: 'Session Initiation Protocol, port 5060 (UDP/TCP), used for VoIP/video call signaling, media transported via RTP',
    fields: [
      { name: 'Request-Line', bits: 0, desc: 'INVITE/REGISTER/BYE/ACK/CANCEL/OPTIONS', desc_en: 'INVITE/REGISTER/BYE/ACK/CANCEL/OPTIONS', value: 'INVITE sip:bob@domain.com SIP/2.0' },
      { name: 'Via',         bits: 0, desc: '路由路径，含Branch参数', desc_en: 'Routing path, includes Branch parameter', value: 'Via: SIP/2.0/UDP 192.168.1.10;branch=z9hG4bK776' },
      { name: 'From',        bits: 0, desc: '主叫，含tag', desc_en: 'Caller, includes tag', value: 'From: <sip:alice@domain.com>;tag=1928301774' },
      { name: 'To',          bits: 0, desc: '被叫', desc_en: 'Callee', value: 'To: <sip:bob@domain.com>' },
      { name: 'Call-ID',     bits: 0, desc: '唯一会话标识', desc_en: 'Unique session identifier', value: 'Call-ID: a84b4c76e66710@pc33.atlanta.com' },
      { name: 'CSeq',        bits: 0, desc: '序列号+方法', desc_en: 'Sequence number + method', value: 'CSeq: 314159 INVITE' },
      { name: 'Content-Type',bits: 0, desc: 'SDP媒体描述', desc_en: 'SDP media description', value: 'Content-Type: application/sdp' },
    ],
    codeTitle: 'SIP REGISTER + INVITE (C — UDP socket)',
    codeTitle_en: 'SIP REGISTER + INVITE (C — UDP socket)',
    code: `/* SIP 信令演示: REGISTER 注册 + INVITE 发起通话 */
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <time.h>

#define SIP_PORT  5060
#define LOCAL_IP  "192.168.1.10"
#define PROXY_IP  "192.168.1.1"
#define CRLF      "\\r\\n"

static int sip_fd;
static struct sockaddr_in proxy_addr;

static void sip_send(const char *msg) {
    sendto(sip_fd, msg, strlen(msg), 0,
           (struct sockaddr*)&proxy_addr, sizeof(proxy_addr));
    printf(">> SEND:\\n%s\\n", msg);
}

static void sip_recv(char *buf, int sz) {
    socklen_t alen = sizeof(proxy_addr);
    int n = recvfrom(sip_fd, buf, sz-1, 0,
                     (struct sockaddr*)&proxy_addr, &alen);
    buf[n>0?n:0]=0;
    printf("<< RECV:\\n%s\\n", buf);
}

int main(void) {
    srand(time(NULL));
    sip_fd = socket(AF_INET, SOCK_DGRAM, 0);

    struct sockaddr_in local = {
        .sin_family=AF_INET, .sin_port=htons(SIP_PORT),
        .sin_addr.s_addr=INADDR_ANY
    };
    bind(sip_fd, (struct sockaddr*)&local, sizeof(local));

    proxy_addr = (struct sockaddr_in){
        .sin_family=AF_INET, .sin_port=htons(SIP_PORT)
    };
    inet_pton(AF_INET, PROXY_IP, &proxy_addr.sin_addr);

    char buf[4096], msg[2048];
    char call_id[64], branch[64];
    snprintf(call_id, sizeof(call_id), "%08x@%s", rand(), LOCAL_IP);
    snprintf(branch, sizeof(branch), "z9hG4bK%08x", rand());

    /* ── 1. REGISTER (注册到SIP代理服务器) ── */
    snprintf(msg, sizeof(msg),
        "REGISTER sip:%s SIP/2.0" CRLF
        "Via: SIP/2.0/UDP %s:5060;branch=%s" CRLF
        "From: <sip:alice@%s>;tag=%08x" CRLF
        "To: <sip:alice@%s>" CRLF
        "Call-ID: %s" CRLF
        "CSeq: 1 REGISTER" CRLF
        "Contact: <sip:alice@%s:5060>" CRLF
        "Max-Forwards: 70" CRLF
        "Expires: 3600" CRLF
        "Content-Length: 0" CRLF CRLF,
        PROXY_IP, LOCAL_IP, branch, PROXY_IP, rand(),
        PROXY_IP, call_id, LOCAL_IP);
    sip_send(msg);
    sip_recv(buf, sizeof(buf));
    /* 正常响应: SIP/2.0 200 OK */

    /* ── 2. INVITE (发起通话，携带SDP) ── */
    snprintf(branch, sizeof(branch), "z9hG4bK%08x", rand());
    const char *sdp =
        "v=0" CRLF
        "o=alice 2890844526 2890844526 IN IP4 " LOCAL_IP CRLF
        "s=SIP Call" CRLF
        "c=IN IP4 " LOCAL_IP CRLF
        "t=0 0" CRLF
        "m=audio 49172 RTP/AVP 0 8" CRLF  /* RTP端口49172 */
        "a=rtpmap:0 PCMU/8000" CRLF        /* G.711 μ-law */
        "a=rtpmap:8 PCMA/8000" CRLF;       /* G.711 A-law */

    snprintf(msg, sizeof(msg),
        "INVITE sip:bob@%s SIP/2.0" CRLF
        "Via: SIP/2.0/UDP %s:5060;branch=%s" CRLF
        "From: <sip:alice@%s>;tag=%08x" CRLF
        "To: <sip:bob@%s>" CRLF
        "Call-ID: %s" CRLF
        "CSeq: 2 INVITE" CRLF
        "Contact: <sip:alice@%s:5060>" CRLF
        "Max-Forwards: 70" CRLF
        "Content-Type: application/sdp" CRLF
        "Content-Length: %zu" CRLF CRLF "%s",
        PROXY_IP, LOCAL_IP, branch, PROXY_IP, rand(),
        PROXY_IP, call_id, LOCAL_IP, strlen(sdp), sdp);
    sip_send(msg);
    sip_recv(buf, sizeof(buf));
    /* 响应序列: 100 Trying → 180 Ringing → 200 OK → 发ACK */
    /* 200 OK 后双方开始 RTP 音频流传输 */

    close(sip_fd);
    /* 工具: linphone-cli, pjsip, Asterisk PBX, Kamailio代理 */
}`,
  },
  {
    id: 'websocket', name: 'WebSocket', layer: 'app', color: '#4d8fff',
    desc: '全双工长连接，基于HTTP升级握手，帧格式紧凑，适合实时推送（聊天/行情/游戏）',
    desc_en: 'Full-duplex persistent connection, based on HTTP upgrade handshake, compact frame format, ideal for real-time push (chat/market data/games)',
    fields: [
      { name: 'FIN',        bits: 1,  desc: '最终帧标志', desc_en: 'Final frame flag', value: '1' },
      { name: 'RSV1-3',     bits: 3,  desc: '扩展保留位', desc_en: 'Extension reserved bits', value: '0' },
      { name: 'Opcode',     bits: 4,  desc: '0x1=文本 0x2=二进制 0x8=关闭 0x9=Ping', desc_en: '0x1=text 0x2=binary 0x8=close 0x9=Ping', value: '0x1' },
      { name: 'MASK',       bits: 1,  desc: '客户端→服务端必须为1（掩码）', desc_en: 'Client→server must be 1 (masking)', value: '1' },
      { name: 'Payload Len',bits: 7,  desc: '0-125直接；126用额外2B；127用额外8B', desc_en: '0-125 direct; 126 uses extra 2B; 127 uses extra 8B', value: '5' },
      { name: 'Masking Key',bits: 32, desc: '4字节掩码（仅客户端发送时有）', desc_en: '4-byte mask key (only present in client frames)', value: '0x37fa213d' },
      { name: 'Payload',    bits: 0,  desc: '经掩码XOR的数据', desc_en: 'Data XOR-masked with masking key', value: 'Hello' },
    ],
    codeTitle: 'WebSocket 服务端 (C — HTTP升级+帧解析)',
    codeTitle_en: 'WebSocket Server (C — HTTP Upgrade + Frame Parsing)',
    code: `/* WebSocket 服务器：HTTP升级握手 + 文本帧收发 */
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <openssl/sha.h>
#include <openssl/bio.h>
#include <openssl/evp.h>

#define WS_GUID "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
#define PORT 8080

/* Base64 编码 */
static void b64_encode(const uint8_t *in, int len, char *out) {
    static const char tbl[] =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    int i=0,j=0;
    while(i<len){
        uint32_t v=(i<len?(uint8_t)in[i++]<<16:0)
                  |(i<len?(uint8_t)in[i++]<<8:0)
                  |(i<len?(uint8_t)in[i++]:0);
        out[j++]=tbl[(v>>18)&63]; out[j++]=tbl[(v>>12)&63];
        out[j++]=tbl[(v>>6)&63];  out[j++]=tbl[v&63];
    }
    for(int k=0;k<(3-len%3)%3;k++) out[j-1-k]='=';
    out[j]=0;
}

/* Sec-WebSocket-Accept 计算 */
static void ws_accept_key(const char *client_key, char *out) {
    char buf[256];
    snprintf(buf, sizeof(buf), "%s%s", client_key, WS_GUID);
    uint8_t sha1[20];
    SHA1((uint8_t*)buf, strlen(buf), sha1);
    b64_encode(sha1, 20, out);
}

/* 解析并打印一帧文本 */
static void ws_recv_frame(int fd) {
    uint8_t hdr[2]; read(fd, hdr, 2);
    int opcode = hdr[0] & 0x0f;
    int masked  = (hdr[1] >> 7) & 1;
    uint64_t plen = hdr[1] & 0x7f;
    if (plen == 126) { uint16_t x; read(fd,&x,2); plen=ntohs(x); }
    else if (plen == 127) { uint64_t x; read(fd,&x,8); plen=__builtin_bswap64(x); }
    uint8_t mask[4]={};
    if (masked) read(fd, mask, 4);
    char payload[4096]={};
    read(fd, payload, plen < 4095 ? plen : 4095);
    if (masked) for(uint64_t i=0;i<plen;i++) payload[i]^=mask[i%4];
    if (opcode==1) printf("Text frame: %.*s\\n", (int)plen, payload);
    if (opcode==8) printf("Close frame\\n");
}

/* 发送文本帧（服务端不加掩码）*/
static void ws_send_text(int fd, const char *text) {
    uint8_t hdr[4]; int hlen=2;
    size_t plen=strlen(text);
    hdr[0]=0x81;  /* FIN + opcode=text */
    if(plen<126){ hdr[1]=(uint8_t)plen; }
    else { hdr[1]=126; hdr[2]=(plen>>8)&0xff; hdr[3]=plen&0xff; hlen=4; }
    write(fd, hdr, hlen);
    write(fd, text, plen);
}

int main(void) {
    int srv = socket(AF_INET, SOCK_STREAM, 0);
    int opt=1; setsockopt(srv,SOL_SOCKET,SO_REUSEADDR,&opt,sizeof(opt));
    struct sockaddr_in addr={.sin_family=AF_INET,.sin_port=htons(PORT),.sin_addr.s_addr=INADDR_ANY};
    bind(srv,(struct sockaddr*)&addr,sizeof(addr)); listen(srv,4);
    printf("ws://0.0.0.0:%d\\n", PORT);

    int cli = accept(srv, NULL, NULL);
    char buf[4096]={}; read(cli, buf, sizeof(buf)-1);

    /* 解析 Sec-WebSocket-Key */
    char *p = strstr(buf, "Sec-WebSocket-Key: ");
    char key[64]={}, accept[64]={};
    if(p) sscanf(p, "Sec-WebSocket-Key: %63s", key);
    ws_accept_key(key, accept);

    /* 发送 101 Switching Protocols */
    char resp[512];
    snprintf(resp, sizeof(resp),
        "HTTP/1.1 101 Switching Protocols\\r\\n"
        "Upgrade: websocket\\r\\n"
        "Connection: Upgrade\\r\\n"
        "Sec-WebSocket-Accept: %s\\r\\n\\r\\n", accept);
    write(cli, resp, strlen(resp));
    printf("WebSocket 已升级\\n");

    ws_send_text(cli, "Hello from C WebSocket server!");
    ws_recv_frame(cli);  /* 等待客户端消息 */
    close(cli); close(srv);
}`,
  },
  {
    id: 'mqtt', name: 'MQTT', layer: 'app', color: '#4d8fff',
    desc: '轻量消息队列遥测传输，发布/订阅模式，端口1883(明文)/8883(TLS)，适合IoT设备',
    desc_en: 'Lightweight Message Queue Telemetry Transport, publish/subscribe pattern, port 1883 (plain)/8883 (TLS), designed for IoT devices',
    fields: [
      { name: 'Fixed Header',  bits: 8,  desc: 'Packet Type(4b)+Flags(4b)', desc_en: 'Packet Type(4b)+Flags(4b)', value: '0x30 (PUBLISH)' },
      { name: 'Remaining Len', bits: 8,  desc: '可变长编码，剩余字节数', desc_en: 'Variable-length encoding, remaining byte count', value: '17' },
      { name: 'Topic Len',     bits: 16, desc: '主题名长度', desc_en: 'Topic name length', value: '9' },
      { name: 'Topic',         bits: 0,  desc: '主题名 (UTF-8)', desc_en: 'Topic name (UTF-8)', value: 'sensor/temp' },
      { name: 'Packet ID',     bits: 16, desc: 'QoS>0时存在', desc_en: 'Present when QoS > 0', value: '—' },
      { name: 'Payload',       bits: 0,  desc: '消息内容', desc_en: 'Message payload', value: '{"t":25.6}' },
    ],
    codeTitle: 'MQTT CONNECT+PUBLISH+SUBSCRIBE (C — 原始TCP)',
    codeTitle_en: 'MQTT CONNECT+PUBLISH+SUBSCRIBE (C — Raw TCP)',
    code: `/* MQTT 3.1.1 手写报文：CONNECT → SUBSCRIBE → PUBLISH */
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>

#define BROKER_IP  "broker.emqx.io"  /* 公共测试 broker */
#define BROKER_PORT 1883

static int mqtt_fd;

static void send_pkt(const uint8_t *pkt, int len) {
    send(mqtt_fd, pkt, len, 0);
}

/* 可变长编码 remaining length */
static int encode_remlen(int len, uint8_t *out) {
    int i=0;
    do { out[i]= len%128; len/=128; if(len>0) out[i]|=0x80; i++; } while(len>0);
    return i;
}

static void mqtt_connect(const char *client_id) {
    /* CONNECT 报文 */
    const char *proto = "MQTT";
    int cid_len = strlen(client_id);
    /* 可变首部: proto_name(6B) + proto_level(1) + conn_flags(1) + keepalive(2) */
    int vhdr = 2+4+1+1+2; /* 10字节 */
    /* payload: clientId长度(2) + clientId */
    int payload = 2 + cid_len;
    int remaining = vhdr + payload;

    uint8_t pkt[256]; int pos=0;
    pkt[pos++]=0x10; /* CONNECT */
    uint8_t remlen[4]; int rlen=encode_remlen(remaining, remlen);
    memcpy(pkt+pos, remlen, rlen); pos+=rlen;
    /* Protocol Name */
    pkt[pos++]=0; pkt[pos++]=4; memcpy(pkt+pos, proto, 4); pos+=4;
    pkt[pos++]=4;    /* Protocol Level: 3.1.1 */
    pkt[pos++]=0x02; /* Connect Flags: CleanSession=1 */
    pkt[pos++]=0; pkt[pos++]=60; /* KeepAlive=60s */
    /* ClientId */
    pkt[pos++]=0; pkt[pos++]=(uint8_t)cid_len;
    memcpy(pkt+pos, client_id, cid_len); pos+=cid_len;
    send_pkt(pkt, pos);

    /* 读 CONNACK */
    uint8_t ack[4]; recv(mqtt_fd, ack, 4, 0);
    printf("CONNACK code: %d (%s)\\n", ack[3], ack[3]==0?"OK":"Error");
}

static void mqtt_subscribe(const char *topic) {
    int tlen=strlen(topic);
    int remaining = 2 + 2+tlen + 1; /* PacketID + TopicLen + Topic + QoS */
    uint8_t pkt[256]; int pos=0;
    pkt[pos++]=0x82; /* SUBSCRIBE */
    uint8_t rl[4]; int rlen=encode_remlen(remaining,rl);
    memcpy(pkt+pos,rl,rlen); pos+=rlen;
    pkt[pos++]=0; pkt[pos++]=1; /* Packet ID=1 */
    pkt[pos++]=0; pkt[pos++]=(uint8_t)tlen;
    memcpy(pkt+pos,topic,tlen); pos+=tlen;
    pkt[pos++]=0; /* QoS=0 */
    send_pkt(pkt, pos);

    uint8_t suback[5]; recv(mqtt_fd, suback, 5, 0);
    printf("SUBACK: %d\\n", suback[4]); /* 0=QoS0成功 */
}

static void mqtt_publish(const char *topic, const char *msg) {
    int tlen=strlen(topic), mlen=strlen(msg);
    int remaining = 2+tlen + mlen; /* QoS0 无PacketID */
    uint8_t pkt[256]; int pos=0;
    pkt[pos++]=0x30; /* PUBLISH QoS0 */
    uint8_t rl[4]; int rlen=encode_remlen(remaining,rl);
    memcpy(pkt+pos,rl,rlen); pos+=rlen;
    pkt[pos++]=0; pkt[pos++]=(uint8_t)tlen;
    memcpy(pkt+pos,topic,tlen); pos+=tlen;
    memcpy(pkt+pos,msg,mlen); pos+=mlen;
    send_pkt(pkt, pos);
    printf("PUBLISH %s: %s\\n", topic, msg);
}

int main(void) {
    /* 注意: broker.emqx.io 需DNS解析，此处用IP演示 */
    mqtt_fd = socket(AF_INET, SOCK_STREAM, 0);
    struct sockaddr_in srv={.sin_family=AF_INET,.sin_port=htons(BROKER_PORT)};
    srv.sin_addr.s_addr=inet_addr("broker.emqx.io"); /* 替换为实际IP */
    if(connect(mqtt_fd,(struct sockaddr*)&srv,sizeof(srv))<0){
        printf("broker连接失败，可用: mosquitto_pub -h broker.emqx.io -t test -m hello\\n");
        return 1;
    }
    mqtt_connect("c-client-demo");
    mqtt_subscribe("sensor/cmd");
    mqtt_publish("sensor/temp", "{\\"t\\":25.6,\\"h\\":60}");

    /* 接收一条消息 */
    uint8_t buf[256]; int n=recv(mqtt_fd,buf,sizeof(buf),0);
    if(n>4){ printf("RECV: %.*s\\n", n-4, buf+4); }
    close(mqtt_fd);
}`,
  },
  {
    id: 'tcp', name: 'TCP', layer: 'transport', color: '#3fb950',
    desc: '传输控制协议，可靠有序，面向连接，三次握手建立',
    desc_en: 'Transmission Control Protocol, reliable and ordered, connection-oriented, established via three-way handshake',
    fields: [
      { name: 'Src Port',    bits: 16, desc: '源端口',  desc_en: 'Source port', value: '54321' },
      { name: 'Dst Port',    bits: 16, desc: '目标端口', desc_en: 'Destination port', value: '80' },
      { name: 'Seq Num',     bits: 32, desc: '序列号',  desc_en: 'Sequence number', value: '1000' },
      { name: 'Ack Num',     bits: 32, desc: '确认号',  desc_en: 'Acknowledgment number', value: '0' },
      { name: 'Data Offset', bits: 4,  desc: '首部长度（×4字节）', desc_en: 'Header length (×4 bytes)', value: '5' },
      { name: 'Flags',       bits: 6,  desc: 'SYN/ACK/FIN/RST/PSH/URG', desc_en: 'SYN/ACK/FIN/RST/PSH/URG', value: 'SYN' },
      { name: 'Window',      bits: 16, desc: '接收窗口大小', desc_en: 'Receive window size', value: '65535' },
      { name: 'Checksum',    bits: 16, desc: '校验和', desc_en: 'Checksum', value: '0xA1B2' },
    ],
    codeTitle: 'TCP Echo 服务器 (C — POSIX socket)',
    codeTitle_en: 'TCP Echo Server (C — POSIX socket)',
    code: `/* TCP Echo 服务器：三次握手 + 接收回显 + 四次挥手 */
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/wait.h>

#define PORT 9000

int main(void) {
    int srv = socket(AF_INET, SOCK_STREAM, 0);
    int opt=1; setsockopt(srv,SOL_SOCKET,SO_REUSEADDR,&opt,sizeof(opt));

    struct sockaddr_in addr={.sin_family=AF_INET,
        .sin_addr.s_addr=INADDR_ANY,.sin_port=htons(PORT)};
    bind(srv,(struct sockaddr*)&addr,sizeof(addr));
    listen(srv, 32);
    printf("TCP echo server on :%d\\n", PORT);

    for (;;) {
        struct sockaddr_in cli_addr; socklen_t cli_len=sizeof(cli_addr);
        int cli = accept(srv,(struct sockaddr*)&cli_addr,&cli_len);
        /* 三次握手由内核完成，accept返回时连接已建立 */
        char ip[INET_ADDRSTRLEN];
        inet_ntop(AF_INET,&cli_addr.sin_addr,ip,sizeof(ip));
        printf("Connected: %s:%d\\n",ip,ntohs(cli_addr.sin_port));

        if (!fork()) { /* 子进程处理连接 */
            close(srv);
            char buf[1024];
            ssize_t n;
            while ((n=read(cli,buf,sizeof(buf)))>0) {
                write(cli,buf,n); /* echo back */
                printf("Echo %zd bytes\\n",n);
            }
            /* n==0: 对端发 FIN（四次挥手第一步）*/
            close(cli); /* 我方发 FIN */
            printf("Connection closed\\n");
            _exit(0);
        }
        close(cli);
        waitpid(-1, NULL, WNOHANG);
    }
}
/* 测试: nc 127.0.0.1 9000
   观察握手: tcpdump -i lo tcp port 9000 -nn */`,
  },
  {
    id: 'udp', name: 'UDP', layer: 'transport', color: '#3fb950',
    desc: '用户数据报协议，无连接无可靠性，低延迟，适合实时应用',
    desc_en: 'User Datagram Protocol, connectionless and unreliable, low latency, suitable for real-time applications',
    fields: [
      { name: 'Src Port', bits: 16, desc: '源端口',  desc_en: 'Source port', value: '12345' },
      { name: 'Dst Port', bits: 16, desc: '目标端口', desc_en: 'Destination port', value: '53' },
      { name: 'Length',   bits: 16, desc: '数据报长度（首部+数据）', desc_en: 'Datagram length (header + data)', value: '28' },
      { name: 'Checksum', bits: 16, desc: '校验和（可选）', desc_en: 'Checksum (optional)', value: '0x0000' },
      { name: 'Data',     bits: 0,  desc: '应用层数据', desc_en: 'Application layer data', value: 'DNS query...' },
    ],
  },
  {
    id: 'ipv4', name: 'IPv4', layer: 'network', color: '#ffa657',
    desc: '网际协议第4版，32位地址，分片重组，TTL 防环路',
    desc_en: 'Internet Protocol version 4, 32-bit addressing, fragmentation/reassembly, TTL prevents routing loops',
    fields: [
      { name: 'Version',  bits: 4,  desc: '协议版本', desc_en: 'Protocol version', value: '4' },
      { name: 'IHL',      bits: 4,  desc: '首部长度（×4字节）', desc_en: 'Header length (×4 bytes)', value: '5' },
      { name: 'DSCP/ECN', bits: 8,  desc: '服务类型/拥塞通知', desc_en: 'Differentiated services / congestion notification', value: '0x00' },
      { name: 'Total Len',bits: 16, desc: '总长度', desc_en: 'Total length', value: '60' },
      { name: 'ID',       bits: 16, desc: '分片标识', desc_en: 'Fragment identifier', value: '0x1234' },
      { name: 'Flags',    bits: 3,  desc: 'DF/MF 标志位', desc_en: 'DF/MF flag bits', value: 'DF' },
      { name: 'Frag Off', bits: 13, desc: '分片偏移', desc_en: 'Fragment offset', value: '0' },
      { name: 'TTL',      bits: 8,  desc: '生存时间', desc_en: 'Time to live', value: '64' },
      { name: 'Protocol', bits: 8,  desc: '上层协议 (6=TCP, 17=UDP)', desc_en: 'Upper-layer protocol (6=TCP, 17=UDP)', value: '6' },
      { name: 'Checksum', bits: 16, desc: '首部校验和', desc_en: 'Header checksum', value: '0xB1C2' },
      { name: 'Src IP',   bits: 32, desc: '源 IP 地址', desc_en: 'Source IP address', value: '192.168.1.100' },
      { name: 'Dst IP',   bits: 32, desc: '目标 IP 地址', desc_en: 'Destination IP address', value: '93.184.216.34' },
    ],
  },
  {
    id: 'eth', name: 'Ethernet II', layer: 'link', color: '#e3b341',
    desc: '以太网帧，IEEE 802.3，48位 MAC 地址，MTU 1500字节',
    desc_en: 'Ethernet frame, IEEE 802.3, 48-bit MAC address, MTU 1500 bytes',
    fields: [
      { name: 'Dst MAC',   bits: 48, desc: '目标 MAC 地址', desc_en: 'Destination MAC address', value: 'aa:bb:cc:dd:ee:ff' },
      { name: 'Src MAC',   bits: 48, desc: '源 MAC 地址', desc_en: 'Source MAC address', value: '11:22:33:44:55:66' },
      { name: 'EtherType', bits: 16, desc: '上层协议 (0x0800=IPv4, 0x0806=ARP)', desc_en: 'Upper-layer protocol (0x0800=IPv4, 0x0806=ARP)', value: '0x0800' },
      { name: 'Payload',   bits: 0,  desc: 'IP 数据报（46-1500字节）', desc_en: 'IP datagram (46-1500 bytes)', value: 'IPv4 packet...' },
      { name: 'FCS',       bits: 32, desc: '帧校验序列 (CRC-32)', desc_en: 'Frame check sequence (CRC-32)', value: '0x12345678' },
    ],
  },
  // ── TLS / HTTPS ──────────────────────────────────────────────────────────────
  {
    id: 'tls', name: 'TLS 1.3', layer: 'app', color: '#56d364',
    desc: 'TLS 1.3 安全传输层：握手→密钥协商→对称加密，HTTPS = HTTP over TLS，端口 443',
    desc_en: 'TLS 1.3 secure transport: handshake → key agreement → symmetric encryption, HTTPS = HTTP over TLS, port 443',
    fields: [
      { name: 'ContentType', bits: 8,  desc: '记录类型: 22=握手 20=ChangeCipherSpec 23=应用数据', desc_en: 'Record type: 22=handshake 20=ChangeCipherSpec 23=app data', value: '22' },
      { name: 'Version',     bits: 16, desc: 'TLS 版本（TLS1.3报文仍写0x0303兼容）', desc_en: 'TLS version (TLS1.3 writes 0x0303 for compatibility)', value: '0x0303' },
      { name: 'Length',      bits: 16, desc: '记录数据长度', desc_en: 'Record data length', value: '512' },
      { name: 'HandshakeType',bits:8,  desc: '1=ClientHello 2=ServerHello 8=EncryptedExtensions 11=Certificate 15=CertVerify 20=Finished', desc_en: '1=ClientHello 2=ServerHello 8=EncryptedExtensions 11=Certificate 15=CertVerify 20=Finished', value: '1' },
      { name: 'CipherSuite', bits: 16, desc: 'TLS_AES_128_GCM_SHA256 / TLS_AES_256_GCM_SHA384', desc_en: 'TLS_AES_128_GCM_SHA256 / TLS_AES_256_GCM_SHA384', value: '0x1301' },
      { name: 'KeyShare',    bits: 0,  desc: 'ECDHE 公钥 (x25519)，TLS1.3 在 ClientHello 直接携带', desc_en: 'ECDHE public key (x25519), carried in ClientHello in TLS1.3', value: 'x25519 pubkey' },
      { name: 'AppData',     bits: 0,  desc: '加密后的应用数据（AEAD: AES-GCM 或 ChaCha20-Poly1305）', desc_en: 'Encrypted application data (AEAD: AES-GCM or ChaCha20-Poly1305)', value: 'encrypted...' },
    ],
    codeTitle: 'TLS 握手流程 (C — OpenSSL)',
    code: `/* TLS 1.3 HTTPS 客户端 — OpenSSL */
#include <stdio.h>
#include <string.h>
#include <openssl/ssl.h>
#include <openssl/err.h>
#include <arpa/inet.h>
#include <unistd.h>

int tcp_connect(const char *host, int port) {
    int fd = socket(AF_INET, SOCK_STREAM, 0);
    struct sockaddr_in addr = { .sin_family = AF_INET, .sin_port = htons(port) };
    inet_pton(AF_INET, host, &addr.sin_addr);
    connect(fd, (struct sockaddr*)&addr, sizeof(addr));
    return fd;
}

int main(void) {
    /* 初始化 OpenSSL */
    SSL_CTX *ctx = SSL_CTX_new(TLS_client_method());
    SSL_CTX_set_min_proto_version(ctx, TLS1_3_VERSION);
    SSL_CTX_set_verify(ctx, SSL_VERIFY_PEER, NULL);
    SSL_CTX_set_default_verify_paths(ctx);   /* 加载系统 CA 根证书 */

    /* TCP 连接 → TLS 握手 */
    int fd = tcp_connect("93.184.216.34", 443);  /* example.com */
    SSL *ssl = SSL_new(ctx);
    SSL_set_fd(ssl, fd);
    SSL_set_tlsext_host_name(ssl, "example.com"); /* SNI */

    if (SSL_connect(ssl) != 1) {
        ERR_print_errors_fp(stderr);
        return 1;
    }

    /* 打印握手信息 */
    printf("TLS 版本: %s\\n",      SSL_get_version(ssl));
    printf("加密套件: %s\\n",      SSL_get_cipher(ssl));
    printf("服务器证书 CN: %s\\n", X509_NAME_oneline(
        X509_get_subject_name(SSL_get_peer_certificate(ssl)), NULL, 0));

    /* 发送 HTTPS 请求 */
    const char *req =
        "GET / HTTP/1.1\\r\\n"
        "Host: example.com\\r\\n"
        "Connection: close\\r\\n\\r\\n";
    SSL_write(ssl, req, strlen(req));

    /* 接收响应 */
    char buf[4096];
    int n;
    while ((n = SSL_read(ssl, buf, sizeof(buf)-1)) > 0) {
        buf[n] = 0;
        printf("%s", buf);
    }

    SSL_shutdown(ssl);
    SSL_free(ssl);
    close(fd);
    SSL_CTX_free(ctx);
    return 0;
}
/* 编译: gcc tls.c -lssl -lcrypto -o tls_client
   TLS1.3 握手只需 1-RTT（TLS1.2 需要 2-RTT）
   握手顺序: ClientHello → ServerHello+Cert+Finished → ClientFinished
   密钥协商: ECDHE x25519, 前向保密(PFS) */`,
  },
  // ── HTTP/2 ──────────────────────────────────────────────────────────────────
  {
    id: 'http2', name: 'HTTP/2', layer: 'app', color: '#a371f7',
    desc: 'HTTP/2 二进制分帧：多路复用、头部压缩(HPACK)、服务器推送，基于 TLS，端口 443',
    desc_en: 'HTTP/2 binary framing: multiplexing, header compression (HPACK), server push, over TLS, port 443',
    fields: [
      { name: 'Length',     bits: 24, desc: '帧 Payload 长度（字节）', desc_en: 'Frame payload length (bytes)', value: '256' },
      { name: 'Type',       bits: 8,  desc: '帧类型: 0=DATA 1=HEADERS 4=SETTINGS 8=WINDOW_UPDATE', desc_en: 'Frame type: 0=DATA 1=HEADERS 4=SETTINGS 8=WINDOW_UPDATE', value: '1' },
      { name: 'Flags',      bits: 8,  desc: 'END_STREAM(0x1) END_HEADERS(0x4) PADDED(0x8)', desc_en: 'END_STREAM(0x1) END_HEADERS(0x4) PADDED(0x8)', value: '0x05' },
      { name: 'Stream ID',  bits: 32, desc: '流标识符（奇数=客户端，偶数=服务端），0=连接级', desc_en: 'Stream ID (odd=client, even=server), 0=connection-level', value: '1' },
      { name: 'Payload',    bits: 0,  desc: 'HEADERS帧: HPACK压缩的头部块; DATA帧: 请求/响应体', desc_en: 'HEADERS: HPACK-compressed headers; DATA: request/response body', value: 'HPACK headers...' },
    ],
    codeTitle: 'HTTP/2 vs HTTP/1.1 对比 (C — nghttp2)',
    code: `/* HTTP/2 客户端 — nghttp2 库
   多路复用演示：在同一连接并发发送多个请求 */
#include <stdio.h>
#include <nghttp2/nghttp2.h>
#include <openssl/ssl.h>

/* HTTP/2 核心改进：
 * 1. 二进制分帧 — 替代 HTTP/1.1 的文本格式，解析更高效
 * 2. 多路复用   — 一个 TCP 连接上并发多个 Stream，消除队头阻塞
 * 3. HPACK 压缩 — 静态/动态表压缩头部，节省 50-90% 头部流量
 * 4. 服务器推送 — 服务端主动推送 CSS/JS 资源
 * 5. 流量控制  — Stream 级 + 连接级 WINDOW_UPDATE */

/* HPACK 静态表（前 61 个高频头部预定义）*/
static const char *HPACK_STATIC[] = {
    ":method GET",       /* index 2  */
    ":method POST",      /* index 3  */
    ":path /",           /* index 4  */
    ":scheme https",     /* index 7  */
    ":status 200",       /* index 8  */
    "content-type application/json", /* index 31 */
};

/* 帧结构示意（9字节固定首部）*/
typedef struct {
    uint8_t  length[3];   /* 24位 payload 长度 */
    uint8_t  type;        /* 帧类型 */
    uint8_t  flags;       /* 标志位 */
    uint32_t stream_id;   /* 31位 stream ID (最高位保留) */
    uint8_t  payload[];   /* 可变长 payload */
} __attribute__((packed)) Http2Frame;

/* Stream 状态机：
   idle → open → half_closed(local) → closed
                → half_closed(remote) → closed */

int main(void) {
    printf("HTTP/2 多路复用演示\\n");
    printf("Stream 1: GET /index.html\\n");
    printf("Stream 3: GET /style.css  (并发，无需等 Stream1 完成)\\n");
    printf("Stream 5: GET /script.js  (并发)\\n");
    printf("→ HTTP/1.1 需要 3 个 TCP 连接或排队等待\\n");
    printf("→ HTTP/2 在 1 个 TLS 连接内并发完成，RTT 减少 2/3\\n");

    /* SETTINGS 帧协商参数 */
    printf("\\n[SETTINGS] HEADER_TABLE_SIZE=4096\\n");
    printf("[SETTINGS] MAX_CONCURRENT_STREAMS=100\\n");
    printf("[SETTINGS] INITIAL_WINDOW_SIZE=65535\\n");
    return 0;
}
/* 编译: gcc http2.c -lnghttp2 -lssl -lcrypto -o http2_client
   实际使用: curl --http2 -v https://example.com
   ALPN 协商: TLS ClientHello 扩展 h2 → 服务端确认 → HTTP/2 */`,
  },
  // ── gRPC ────────────────────────────────────────────────────────────────────
  {
    id: 'grpc', name: 'gRPC', layer: 'app', color: '#f0883e',
    desc: 'Google RPC 框架：Protobuf 序列化 + HTTP/2 传输，强类型接口，跨语言，高性能微服务',
    desc_en: 'Google RPC framework: Protobuf serialization + HTTP/2 transport, strongly typed interfaces, cross-language, high-performance microservices',
    fields: [
      { name: 'HTTP/2 Frame', bits: 0,  desc: 'gRPC 复用 HTTP/2 帧层', desc_en: 'gRPC reuses HTTP/2 frame layer', value: 'HEADERS+DATA' },
      { name: ':method',      bits: 0,  desc: '固定 POST', desc_en: 'Always POST', value: 'POST' },
      { name: ':path',        bits: 0,  desc: '/PackageName.ServiceName/MethodName', desc_en: '/PackageName.ServiceName/MethodName', value: '/helloworld.Greeter/SayHello' },
      { name: 'content-type', bits: 0,  desc: 'gRPC 内容类型', desc_en: 'gRPC content type', value: 'application/grpc' },
      { name: 'Compressed',   bits: 8,  desc: '0=无压缩 1=压缩（grpc-encoding）', desc_en: '0=uncompressed 1=compressed (grpc-encoding)', value: '0' },
      { name: 'Message Len',  bits: 32, desc: 'Protobuf 消息字节长度', desc_en: 'Protobuf message byte length', value: '15' },
      { name: 'Protobuf Msg', bits: 0,  desc: 'Protocol Buffers 二进制编码的请求/响应', desc_en: 'Protocol Buffers binary-encoded request/response', value: '\\x0a\\x0bHello World' },
      { name: 'grpc-status',  bits: 0,  desc: '响应 trailer: 0=OK, 2=UNKNOWN, 12=UNIMPLEMENTED', desc_en: 'Response trailer: 0=OK, 2=UNKNOWN, 12=UNIMPLEMENTED', value: '0' },
    ],
    codeTitle: 'gRPC 定义 & C++ 实现',
    code: `/* gRPC 完整示例：Protobuf 定义 + 服务端 + 客户端 */

/* === 1. helloworld.proto 定义 === */
syntax = "proto3";
package helloworld;

service Greeter {
    rpc SayHello (HelloRequest) returns (HelloReply);
    rpc SayHelloStream (HelloRequest) returns (stream HelloReply); // 服务端流
}
message HelloRequest { string name = 1; }
message HelloReply   { string message = 1; }

/* === 2. 生成代码 === */
// protoc --grpc_out=. --cpp_out=. --plugin=protoc-gen-grpc=grpc_cpp_plugin helloworld.proto

/* === 3. C++ 服务端 === */
#include <grpcpp/grpcpp.h>
#include "helloworld.grpc.pb.h"
using grpc::ServerContext; using grpc::Status;
using helloworld::HelloRequest; using helloworld::HelloReply;

class GreeterServiceImpl final : public helloworld::Greeter::Service {
    Status SayHello(ServerContext*, const HelloRequest* req, HelloReply* reply) override {
        reply->set_message("Hello, " + req->name() + "!");
        return Status::OK;
    }
};

void RunServer() {
    GreeterServiceImpl service;
    grpc::ServerBuilder builder;
    builder.AddListeningPort("0.0.0.0:50051", grpc::InsecureServerCredentials());
    builder.RegisterService(&service);
    auto server = builder.BuildAndStart();
    printf("gRPC server listening on :50051\\n");
    server->Wait();
}

/* === 4. C++ 客户端 === */
#include <grpcpp/grpcpp.h>
class GreeterClient {
    std::unique_ptr<helloworld::Greeter::Stub> stub_;
public:
    GreeterClient(std::shared_ptr<grpc::Channel> ch) : stub_(helloworld::Greeter::NewStub(ch)) {}
    std::string SayHello(const std::string& name) {
        HelloRequest req; req.set_name(name);
        HelloReply   rep;
        grpc::ClientContext ctx;
        Status st = stub_->SayHello(&ctx, req, &rep);
        return st.ok() ? rep.message() : "RPC 失败: " + st.error_message();
    }
};

int main() {
    GreeterClient client(grpc::CreateChannel("localhost:50051", grpc::InsecureChannelCredentials()));
    printf("%s\\n", client.SayHello("World").c_str()); // → Hello, World!
}
/* Protobuf 编码: field_number<<3 | wire_type, 字段1(string): 0x0a
   HTTP/2 Stream: 每个 RPC 调用占一个独立 Stream
   四种模式: Unary / Server Stream / Client Stream / Bidirectional */`,
  },
  // ── DHCP ────────────────────────────────────────────────────────────────────
  {
    id: 'dhcp', name: 'DHCP', layer: 'app', color: '#79c0ff',
    desc: 'DHCP 动态主机配置：4步DORA租约(Discover→Offer→Request→ACK)，UDP 67/68端口',
    desc_en: 'DHCP dynamic host configuration: 4-step DORA lease (Discover→Offer→Request→ACK), UDP ports 67/68',
    fields: [
      { name: 'op',      bits: 8,  desc: '消息类型: 1=BOOTREQUEST 2=BOOTREPLY', desc_en: 'Message type: 1=BOOTREQUEST 2=BOOTREPLY', value: '1' },
      { name: 'htype',   bits: 8,  desc: '硬件类型: 1=Ethernet', desc_en: 'Hardware type: 1=Ethernet', value: '1' },
      { name: 'hlen',    bits: 8,  desc: '硬件地址长度 (MAC=6)', desc_en: 'Hardware address length (MAC=6)', value: '6' },
      { name: 'xid',     bits: 32, desc: '事务ID，客户端随机生成匹配请求响应', desc_en: 'Transaction ID, random client-generated to match responses', value: '0xA1B2C3D4' },
      { name: 'ciaddr',  bits: 32, desc: '客户端当前 IP（无则 0.0.0.0）', desc_en: 'Client current IP (0.0.0.0 if none)', value: '0.0.0.0' },
      { name: 'yiaddr',  bits: 32, desc: '服务器分配给客户端的 IP (Your IP)', desc_en: 'Server-assigned client IP (Your IP)', value: '192.168.1.100' },
      { name: 'siaddr',  bits: 32, desc: '下一跳引导服务器 IP', desc_en: 'Next-hop boot server IP', value: '192.168.1.1' },
      { name: 'chaddr',  bits: 128,desc: '客户端 MAC 地址（16字节，不足补0）', desc_en: 'Client MAC address (16 bytes, zero-padded)', value: 'aa:bb:cc:dd:ee:ff' },
      { name: 'options', bits: 0,  desc: 'Magic Cookie(63825363) + TLV 选项: 53=消息类型 1=子网掩码 3=网关 6=DNS 51=租期', desc_en: 'Magic Cookie(63825363) + TLV options: 53=msg type 1=subnet 3=gateway 6=DNS 51=lease', value: '53:01:01 01:04:ff.. 3:04:c0..' },
    ],
    codeTitle: 'DHCP DORA 流程 (C — 原始 UDP)',
    code: `/* DHCP Discover 报文构造 — 演示 DORA 4步握手 */
#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

/* DHCP 报文 */
typedef struct {
    uint8_t  op, htype, hlen, hops;
    uint32_t xid;
    uint16_t secs, flags;
    uint32_t ciaddr, yiaddr, siaddr, giaddr;
    uint8_t  chaddr[16];
    uint8_t  sname[64];
    uint8_t  file[128];
    uint8_t  options[312];
} DHCPPacket;

#define DHCP_DISCOVER 1
#define DHCP_OFFER    2
#define DHCP_REQUEST  3
#define DHCP_ACK      5

int main(void) {
    int sock = socket(AF_INET, SOCK_DGRAM, 0);
    int bcast = 1;
    setsockopt(sock, SOL_SOCKET, SO_BROADCAST, &bcast, sizeof(bcast));

    /* 绑定到 0.0.0.0:68 */
    struct sockaddr_in local = {AF_INET, htons(68), {INADDR_ANY}};
    bind(sock, (struct sockaddr*)&local, sizeof(local));

    /* === Step 1: DHCP Discover (广播) === */
    DHCPPacket pkt = {0};
    pkt.op    = 1;          /* BOOTREQUEST */
    pkt.htype = 1;          /* Ethernet */
    pkt.hlen  = 6;
    pkt.xid   = htonl(0xA1B2C3D4);  /* 随机事务 ID */
    pkt.flags = htons(0x8000);       /* 广播标志 */
    /* 模拟 MAC 地址 */
    uint8_t mac[] = {0xAA,0xBB,0xCC,0xDD,0xEE,0xFF};
    memcpy(pkt.chaddr, mac, 6);
    /* Options: Magic Cookie + Option 53 (Discover) */
    uint8_t *opt = pkt.options;
    *opt++ = 99; *opt++ = 130; *opt++ = 83; *opt++ = 99; /* Magic Cookie */
    *opt++ = 53; *opt++ = 1; *opt++ = DHCP_DISCOVER;      /* 消息类型 */
    *opt++ = 255;  /* End */

    struct sockaddr_in bcast_addr = {AF_INET, htons(67), {INADDR_BROADCAST}};
    sendto(sock, &pkt, sizeof(pkt), 0, (struct sockaddr*)&bcast_addr, sizeof(bcast_addr));
    printf("[1] DHCP Discover 已广播 (0.0.0.0 → 255.255.255.255:67)\\n");

    /* === Step 2: 接收 DHCP Offer === */
    DHCPPacket offer = {0};
    struct sockaddr_in from; socklen_t flen = sizeof(from);
    recvfrom(sock, &offer, sizeof(offer), 0, (struct sockaddr*)&from, &flen);
    struct in_addr offered_ip = {offer.yiaddr};
    printf("[2] DHCP Offer:  IP=%s\\n", inet_ntoa(offered_ip));

    /* === Step 3: DHCP Request (广播，告知选择哪个服务器) === */
    memset(&pkt, 0, sizeof(pkt));
    pkt.op = 1; pkt.htype = 1; pkt.hlen = 6;
    pkt.xid = htonl(0xA1B2C3D4);
    pkt.flags = htons(0x8000);
    memcpy(pkt.chaddr, mac, 6);
    opt = pkt.options;
    *opt++ = 99; *opt++ = 130; *opt++ = 83; *opt++ = 99;
    *opt++ = 53; *opt++ = 1; *opt++ = DHCP_REQUEST;
    *opt++ = 50; *opt++ = 4; memcpy(opt, &offer.yiaddr, 4); opt += 4; /* 请求的IP */
    *opt++ = 255;
    sendto(sock, &pkt, sizeof(pkt), 0, (struct sockaddr*)&bcast_addr, sizeof(bcast_addr));
    printf("[3] DHCP Request: 请求 IP=%s\\n", inet_ntoa(offered_ip));

    /* === Step 4: 接收 DHCP ACK === */
    recvfrom(sock, &offer, sizeof(offer), 0, (struct sockaddr*)&from, &flen);
    printf("[4] DHCP ACK:    租约确认，IP=%s\\n", inet_ntoa(offered_ip));
    printf("    → 配置网卡: ip addr add %s/24 dev eth0\\n", inet_ntoa(offered_ip));

    close(sock);
    return 0;
}`,
  },
  // ── ICMP ────────────────────────────────────────────────────────────────────
  {
    id: 'icmp', name: 'ICMP', layer: 'network', color: '#ff7b72',
    desc: 'Internet 控制消息协议：ping(Echo)、traceroute(TTL超时)、路由不可达，IP协议号1',
    desc_en: 'Internet Control Message Protocol: ping (Echo), traceroute (TTL exceeded), destination unreachable, IP proto 1',
    fields: [
      { name: 'Type',     bits: 8,  desc: '消息类型: 0=Echo Reply 8=Echo Request 3=Dest Unreachable 11=TTL Exceeded', desc_en: 'Message type: 0=Echo Reply 8=Echo Request 3=Dest Unreachable 11=TTL Exceeded', value: '8' },
      { name: 'Code',     bits: 8,  desc: '子类型: Type=3时 0=Net 1=Host 3=Port Unreachable', desc_en: 'Subtype: when Type=3, 0=Net 1=Host 3=Port Unreachable', value: '0' },
      { name: 'Checksum', bits: 16, desc: 'ICMP 首部+数据校验和', desc_en: 'ICMP header+data checksum', value: '0x4F1E' },
      { name: 'Identifier',bits:16, desc: 'Echo 标识符（进程 ID）', desc_en: 'Echo identifier (process ID)', value: '0x1234' },
      { name: 'Seq Num',  bits: 16, desc: '序列号，每次 ping 递增', desc_en: 'Sequence number, increments per ping', value: '1' },
      { name: 'Data',     bits: 0,  desc: '时间戳 + 填充数据（用于计算 RTT）', desc_en: 'Timestamp + padding (used for RTT calculation)', value: 'timestamp+pad' },
    ],
    codeTitle: 'ping & traceroute 实现 (C — 原始套接字)',
    code: `/* ping + traceroute 原始实现 — 需要 root 权限 */
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <time.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <netinet/ip_icmp.h>
#include <arpa/inet.h>
#include <errno.h>

/* 计算 ICMP 校验和 */
uint16_t checksum(void *buf, int len) {
    uint16_t *p = buf; uint32_t sum = 0;
    for (; len > 1; len -= 2) sum += *p++;
    if (len) sum += *(uint8_t*)p;
    while (sum >> 16) sum = (sum & 0xFFFF) + (sum >> 16);
    return ~sum;
}

/* ping: 发送 ICMP Echo Request，接收 Echo Reply，计算 RTT */
void ping(const char *dest_ip, int count) {
    int sock = socket(AF_INET, SOCK_RAW, IPPROTO_ICMP);
    if (sock < 0) { perror("需要 root 权限"); return; }

    struct sockaddr_in dest = {.sin_family=AF_INET};
    inet_pton(AF_INET, dest_ip, &dest.sin_addr);

    printf("PING %s: 56 bytes of data\\n", dest_ip);
    for (int seq = 1; seq <= count; seq++) {
        /* 构造 ICMP Echo Request */
        struct icmphdr icmp = {0};
        icmp.type = ICMP_ECHO;
        icmp.un.echo.id  = htons(getpid() & 0xFFFF);
        icmp.un.echo.sequence = htons(seq);
        icmp.checksum = checksum(&icmp, sizeof(icmp));

        struct timespec t0, t1;
        clock_gettime(CLOCK_MONOTONIC, &t0);
        sendto(sock, &icmp, sizeof(icmp), 0, (struct sockaddr*)&dest, sizeof(dest));

        /* 接收 ICMP Echo Reply */
        char buf[1024];
        recvfrom(sock, buf, sizeof(buf), 0, NULL, NULL);
        clock_gettime(CLOCK_MONOTONIC, &t1);
        double ms = (t1.tv_sec - t0.tv_sec)*1000.0 + (t1.tv_nsec - t0.tv_nsec)/1e6;
        printf("64 bytes from %s: icmp_seq=%d ttl=64 time=%.3f ms\\n", dest_ip, seq, ms);
        sleep(1);
    }
    close(sock);
}

/* traceroute: 逐步增大 TTL，利用 ICMP TTL Exceeded 定位每跳路由器 */
void traceroute(const char *dest_ip) {
    int send_sock = socket(AF_INET, SOCK_RAW, IPPROTO_ICMP);
    int recv_sock = socket(AF_INET, SOCK_RAW, IPPROTO_ICMP);
    struct sockaddr_in dest = {.sin_family=AF_INET};
    inet_pton(AF_INET, dest_ip, &dest.sin_addr);

    printf("traceroute to %s, max 30 hops\\n", dest_ip);
    for (int ttl = 1; ttl <= 30; ttl++) {
        setsockopt(send_sock, IPPROTO_IP, IP_TTL, &ttl, sizeof(ttl));
        struct icmphdr icmp = {.type=ICMP_ECHO};
        icmp.un.echo.sequence = htons(ttl);
        icmp.checksum = checksum(&icmp, sizeof(icmp));
        sendto(send_sock, &icmp, sizeof(icmp), 0, (struct sockaddr*)&dest, sizeof(dest));

        char buf[1024]; struct sockaddr_in from; socklen_t flen = sizeof(from);
        struct timeval tv = {.tv_sec=1};
        setsockopt(recv_sock, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));
        int r = recvfrom(recv_sock, buf, sizeof(buf), 0, (struct sockaddr*)&from, &flen);
        if (r < 0) { printf("%2d  *\\n", ttl); continue; }

        printf("%2d  %s\\n", ttl, inet_ntoa(from.sin_addr));

        struct icmphdr *rply = (struct icmphdr*)(buf + 20);
        if (rply->type == ICMP_ECHOREPLY) break;  /* 到达目标 */
    }
    close(send_sock); close(recv_sock);
}

int main(void) {
    ping("8.8.8.8", 4);
    printf("\\n");
    traceroute("8.8.8.8");
    return 0;
}`,
  },
  // ── ARP ────────────────────────────────────────────────────────────────────
  {
    id: 'arp', name: 'ARP', layer: 'link', color: '#d2a8ff',
    desc: 'ARP 地址解析协议：广播查询 IP→MAC，EtherType 0x0806，同子网通信必经步骤',
    desc_en: 'ARP address resolution: broadcast query IP→MAC, EtherType 0x0806, required for same-subnet communication',
    fields: [
      { name: 'HW Type',   bits: 16, desc: '硬件类型: 1=Ethernet', desc_en: 'Hardware type: 1=Ethernet', value: '0x0001' },
      { name: 'Proto Type',bits: 16, desc: '协议类型: 0x0800=IPv4', desc_en: 'Protocol type: 0x0800=IPv4', value: '0x0800' },
      { name: 'HW Len',    bits: 8,  desc: '硬件地址长度: 6 (MAC)', desc_en: 'Hardware address length: 6 (MAC)', value: '6' },
      { name: 'Proto Len', bits: 8,  desc: '协议地址长度: 4 (IPv4)', desc_en: 'Protocol address length: 4 (IPv4)', value: '4' },
      { name: 'Operation', bits: 16, desc: '1=Request(广播) 2=Reply(单播)', desc_en: '1=Request(broadcast) 2=Reply(unicast)', value: '1' },
      { name: 'Sender MAC',bits: 48, desc: '发送方 MAC 地址', desc_en: 'Sender MAC address', value: 'aa:bb:cc:11:22:33' },
      { name: 'Sender IP', bits: 32, desc: '发送方 IP 地址', desc_en: 'Sender IP address', value: '192.168.1.100' },
      { name: 'Target MAC',bits: 48, desc: 'Request时全0(未知), Reply时填充', desc_en: 'All-zeros in Request (unknown), filled in Reply', value: '00:00:00:00:00:00' },
      { name: 'Target IP', bits: 32, desc: '目标 IP 地址（要查询的 IP）', desc_en: 'Target IP address (the IP being queried)', value: '192.168.1.1' },
    ],
    codeTitle: 'ARP 请求/响应 (C — AF_PACKET 原始帧)',
    code: `/* ARP 请求发送 + 响应接收 — 原始以太网帧 */
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <sys/ioctl.h>
#include <net/if.h>
#include <net/if_arp.h>
#include <netinet/in.h>
#include <netpacket/packet.h>
#include <net/ethernet.h>
#include <arpa/inet.h>

#pragma pack(1)
typedef struct {
    /* Ethernet 帧头 */
    uint8_t  eth_dst[6];     /* FF:FF:FF:FF:FF:FF (广播) */
    uint8_t  eth_src[6];     /* 本机 MAC */
    uint16_t eth_type;       /* 0x0806 = ARP */
    /* ARP 载荷 */
    uint16_t hw_type;        /* 0x0001 = Ethernet */
    uint16_t proto_type;     /* 0x0800 = IPv4 */
    uint8_t  hw_len;         /* 6 */
    uint8_t  proto_len;      /* 4 */
    uint16_t operation;      /* 1=Request 2=Reply */
    uint8_t  sender_mac[6];
    uint32_t sender_ip;
    uint8_t  target_mac[6];
    uint32_t target_ip;
} ARPFrame;
#pragma pack()

int main(void) {
    const char *iface   = "eth0";
    const char *src_ip  = "192.168.1.100";
    const char *dst_ip  = "192.168.1.1";    /* 要查询的 IP */
    uint8_t src_mac[] = {0xAA,0xBB,0xCC,0xDD,0xEE,0xFF};

    /* 创建原始套接字 */
    int sock = socket(AF_PACKET, SOCK_RAW, htons(ETH_P_ARP));
    if (sock < 0) { perror("需要 root"); return 1; }

    /* 获取网卡索引 */
    struct ifreq ifr = {0};
    strncpy(ifr.ifr_name, iface, IFNAMSIZ);
    ioctl(sock, SIOCGIFINDEX, &ifr);
    int ifindex = ifr.ifr_ifindex;

    /* 构造 ARP Request 帧 */
    ARPFrame frame = {0};
    memset(frame.eth_dst, 0xFF, 6);          /* 广播 */
    memcpy(frame.eth_src, src_mac, 6);
    frame.eth_type   = htons(0x0806);        /* ARP */
    frame.hw_type    = htons(1);             /* Ethernet */
    frame.proto_type = htons(0x0800);        /* IPv4 */
    frame.hw_len     = 6;
    frame.proto_len  = 4;
    frame.operation  = htons(1);             /* Request */
    memcpy(frame.sender_mac, src_mac, 6);
    inet_pton(AF_INET, src_ip, &frame.sender_ip);
    memset(frame.target_mac, 0, 6);          /* 未知 */
    inet_pton(AF_INET, dst_ip, &frame.target_ip);

    /* 发送到指定网卡 */
    struct sockaddr_ll sa = {0};
    sa.sll_ifindex = ifindex;
    sa.sll_halen   = ETH_ALEN;
    memset(sa.sll_addr, 0xFF, 6);
    sendto(sock, &frame, sizeof(frame), 0, (struct sockaddr*)&sa, sizeof(sa));
    printf("ARP Request: Who has %s? Tell %s\\n", dst_ip, src_ip);

    /* 接收 ARP Reply */
    ARPFrame reply = {0};
    recvfrom(sock, &reply, sizeof(reply), 0, NULL, NULL);
    if (ntohs(reply.operation) == 2) {
        printf("ARP Reply:  %s is at %02x:%02x:%02x:%02x:%02x:%02x\\n",
               dst_ip,
               reply.sender_mac[0], reply.sender_mac[1], reply.sender_mac[2],
               reply.sender_mac[3], reply.sender_mac[4], reply.sender_mac[5]);
        printf("→ 缓存到 ARP 表: arp -n\\n");
    }
    close(sock);
    return 0;
}
/* ARP 缓存: arp -n 或 ip neigh
   Gratuitous ARP: 发送方 Sender IP = Target IP，用于宣告自己的 MAC / 检测 IP 冲突
   ARP 欺骗防御: arp -s 192.168.1.1 aa:bb:cc:dd:ee:ff (静态绑定) */`,
  },
]

const LAYER_INFO: Record<Layer, { name: string; color: string; protocols: string[]; role: string }> = {
  app:      { name: '应用层',  color: '#4d8fff', protocols: ['HTTP','HTTP/2','gRPC','RTSP','SIP','WebSocket','MQTT','DNS','DHCP','TLS'], role: '提供用户服务接口，定义数据格式' },
  transport:{ name: '传输层',  color: '#3fb950', protocols: ['TCP','UDP','QUIC','SCTP'], role: '端到端通信，流量控制，可靠性' },
  network:  { name: '网络层',  color: '#ffa657', protocols: ['IPv4','IPv6','ICMP','OSPF','BGP'], role: '路由选择，IP 寻址，分片' },
  link:     { name: '链路层',  color: '#e3b341', protocols: ['Ethernet','WiFi','ARP','PPP'], role: '相邻节点传输，MAC 寻址，帧封装' },
  physical: { name: '物理层',  color: '#ff6b6b', protocols: ['RJ45','光纤','WiFi RF','同轴电缆'], role: '比特流传输，信号编码，物理介质' },
}

const LAYERS: Layer[] = ['app', 'transport', 'network', 'link', 'physical']

function EncapsulationDiagram({ selected }: { selected: Protocol | null }) {
  const colors = { app: '#4d8fff', transport: '#3fb950', network: '#ffa657', link: '#e3b341', physical: '#ff6b6b' }
  const labels: [Layer, string][] = [
    ['app',      'Data'],
    ['transport','TCP Hdr | Data'],
    ['network',  'IP Hdr | TCP Hdr | Data'],
    ['link',     'ETH Hdr | IP Hdr | TCP Hdr | Data | FCS'],
    ['physical', '01001000 01100101 01101100 01101100 01101111...'],
  ]
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>封装过程（从上到下层层包裹）</div>
      {labels.map(([layer, content]) => {
        const c = colors[layer]
        const isActive = selected?.layer === layer
        return (
          <div key={layer} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4,
            opacity: selected && !isActive ? 0.5 : 1, transition: 'opacity 0.2s' }}>
            <div style={{ width: 70, fontSize: 10, color: c, fontWeight: 700, textAlign: 'right', flexShrink: 0 }}>
              {LAYER_INFO[layer].name}
            </div>
            <div style={{ flex: 1, padding: '5px 10px', borderRadius: 5, fontSize: 11, fontFamily: 'monospace',
              background: isActive ? `${c}25` : `${c}10`,
              border: `1px solid ${isActive ? c : c + '40'}`,
              color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
  const [showCode, setShowCode] = useState(false)
  const isMobile = useMobile()

  const layerProtos = PROTOCOLS.filter(p => p.layer === selLayer)

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100%', overflow: 'hidden' }}>
      {/* OSI/TCP-IP Stack */}
      <div style={{
        width: isMobile ? '100%' : 160, flexShrink: 0,
        borderRight: isMobile ? 'none' : '1px solid var(--border)',
        borderBottom: isMobile ? '1px solid var(--border)' : 'none',
        background: 'var(--bg-secondary)', display: 'flex',
        flexDirection: isMobile ? 'row' : 'column',
        padding: isMobile ? '6px 8px' : '12px 8px',
        overflowX: isMobile ? 'auto' : undefined,
        maxHeight: isMobile ? 60 : undefined,
        scrollbarWidth: 'none',
      }}>
        {!isMobile && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: 1 }}>TCP/IP 协议栈</div>}
        {LAYERS.map(layer => {
          const info = LAYER_INFO[layer]
          const isActive = selLayer === layer
          return (
            <button key={layer} onClick={() => { setSelLayer(layer); setSelProto(null); setShowCode(false) }} style={{
              display: 'block', flexShrink: 0,
              width: isMobile ? 'auto' : '100%',
              marginBottom: isMobile ? 0 : 4, marginRight: isMobile ? 4 : 0,
              padding: isMobile ? '5px 10px' : '8px 10px',
              background: isActive ? `${info.color}20` : 'transparent',
              border: isActive ? `1px solid ${info.color}` : '1px solid transparent',
              color: isActive ? info.color : 'var(--text-secondary)',
              borderRadius: 7, cursor: 'pointer', textAlign: 'left', whiteSpace: 'nowrap',
            }}>
              <div style={{ fontSize: isMobile ? 11 : 12, fontWeight: 700 }}>{info.name}</div>
              {!isMobile && <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                {info.protocols.slice(0, 3).join(' · ')}
              </div>}
            </button>
          )
        })}
      </div>

      {/* Protocol list */}
      <div style={{
        width: isMobile ? '100%' : 150, flexShrink: 0,
        borderRight: isMobile ? 'none' : '1px solid var(--border)',
        borderBottom: isMobile ? '1px solid var(--border)' : 'none',
        background: 'var(--bg-secondary)', padding: isMobile ? '6px 8px' : '12px 8px',
        overflowX: isMobile ? 'auto' : undefined,
        overflowY: isMobile ? 'hidden' : 'auto',
        maxHeight: isMobile ? 50 : undefined,
        display: isMobile ? 'flex' : 'block',
        scrollbarWidth: 'none',
      }}>
        {!isMobile && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>{LAYER_INFO[selLayer].name}协议</div>}
        {layerProtos.map(p => (
          <button key={p.id} onClick={() => { setSelProto(p); setShowCode(false) }} style={{
            display: 'block', flexShrink: 0,
            width: isMobile ? 'auto' : '100%',
            marginBottom: isMobile ? 0 : 4, marginRight: isMobile ? 4 : 0,
            padding: isMobile ? '4px 10px' : '8px 10px',
            background: selProto?.id === p.id ? `${p.color}20` : 'transparent',
            border: selProto?.id === p.id ? `1px solid ${p.color}` : '1px solid transparent',
            color: selProto?.id === p.id ? p.color : 'var(--text-secondary)',
            borderRadius: 6, cursor: 'pointer', fontSize: 12, textAlign: 'left', whiteSpace: 'nowrap',
          }}>{p.name}</button>
        ))}
        {layerProtos.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {LAYER_INFO[selLayer].protocols.map(p => (
              <div key={p} style={{ padding: '5px 8px', borderRadius: 4, marginBottom: 2, border: '1px solid var(--border)', fontSize: 11 }}>{p}</div>
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
              <span key={p} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4,
                background: `${LAYER_INFO[selLayer].color}20`, color: LAYER_INFO[selLayer].color }}>{p}</span>
            ))}
          </div>
        </div>

        {selProto && (
          <>
            {/* Protocol header + code toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: selProto.color }}>{selProto.name} 报文结构</div>
              {selProto.code && (
                <button onClick={() => setShowCode(v => !v)} style={{
                  padding: '4px 12px', borderRadius: 6, border: `1px solid ${selProto.color}60`,
                  background: showCode ? `${selProto.color}20` : 'transparent',
                  color: selProto.color, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                }}>
                  {showCode ? '📋 报文结构' : '💻 代码演示'}
                </button>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>{selProto.desc}</div>

            {showCode && selProto.code ? (
              /* Code panel */
              <div style={{ background: 'var(--bg-secondary)', border: `1px solid ${selProto.color}40`,
                borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ padding: '7px 14px', borderBottom: `1px solid ${selProto.color}30`,
                  fontSize: 11, fontWeight: 700, color: selProto.color, background: `${selProto.color}10` }}>
                  💻 {selProto.codeTitle}
                </div>
                <pre style={{ margin: 0, padding: '14px 16px', overflow: 'auto', fontSize: 11,
                  lineHeight: 1.65, fontFamily: 'monospace', color: 'var(--text-primary)',
                  background: 'var(--bg-tertiary)', maxHeight: 560 }}>
                  {selProto.code}
                </pre>
              </div>
            ) : (
              <>
                {/* Packet visualization */}
                <div style={{ display: 'flex', marginBottom: 14, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  {selProto.fields.map((f, i) => {
                    const flex = f.bits ? Math.max(f.bits / 8, 1) : 3
                    return (
                      <div key={i} title={f.desc} style={{
                        flex, padding: '6px 4px', textAlign: 'center',
                        borderRight: i < selProto.fields.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                        background: `${selProto.color}${10 + (i % 3) * 10}`, minWidth: 36,
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
          </>
        )}

        <EncapsulationDiagram selected={selProto} />

        {/* Key concepts */}
        <div style={{ marginTop: 20, background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>关键概念</div>
          {[
            ['封装',   '每层在数据前加自己的首部（header），接收方逐层剥去首部'],
            ['MTU',    '最大传输单元：以太网 1500B，超过需分片（IP）或分段（TCP）'],
            ['三次握手','TCP SYN → SYN+ACK → ACK，建立可靠连接'],
            ['ARP',    '地址解析：IP → MAC，在同一链路内广播查询'],
            ['NAT',    '网络地址转换：多台内网主机共享一个公网 IP'],
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
