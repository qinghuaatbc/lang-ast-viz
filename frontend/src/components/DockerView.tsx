import { useState } from 'react'
import { useMobile } from '../hooks/useMobile'

// ─── Shared style helpers ──────────────────────────────────────────────────────
const CODE: React.CSSProperties = {
  background: '#0d1117', border: '1px solid #30363d', borderRadius: 8,
  padding: '14px 16px', fontFamily: 'monospace', fontSize: 12.5,
  lineHeight: 1.7, overflowX: 'auto', color: '#e6edf3', whiteSpace: 'pre',
}
const CARD: React.CSSProperties = {
  background: 'var(--bg-secondary,#161b22)', border: '1px solid var(--border,#30363d)',
  borderRadius: 10, padding: '14px 16px', marginBottom: 12,
}
const H2: React.CSSProperties = { margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#e6edf3' }
const BADGE = (bg: string): React.CSSProperties => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: 4,
  background: bg, color: '#fff', fontSize: 11, fontWeight: 600, marginRight: 4,
})

// ─── Architecture Tab ──────────────────────────────────────────────────────────
function ArchTab() {
  const [hover, setHover] = useState<string | null>(null)

  const boxes = [
    { id: 'cli',      x: 40,  y: 60,  w: 160, h: 50, color: '#4d8fff', label: 'Docker CLI',        sub: 'docker run / build / push' },
    { id: 'daemon',   x: 40,  y: 170, w: 160, h: 50, color: '#3fb950', label: 'dockerd',            sub: 'REST API + gRPC' },
    { id: 'ctrd',     x: 40,  y: 280, w: 160, h: 50, color: '#a371f7', label: 'containerd',         sub: 'image/snapshot/task mgmt' },
    { id: 'shim',     x: 40,  y: 390, w: 160, h: 50, color: '#f0883e', label: 'containerd-shim',    sub: 'per-container process' },
    { id: 'runc',     x: 40,  y: 500, w: 160, h: 50, color: '#ff7b72', label: 'runc',               sub: 'OCI runtime: clone()+exec()' },
    { id: 'ctr',      x: 40,  y: 610, w: 160, h: 50, color: '#56d364', label: '🐳 Container',       sub: 'PID 1 in new namespaces' },
    { id: 'reg',      x: 280, y: 170, w: 160, h: 50, color: '#79c0ff', label: 'Registry',            sub: 'Docker Hub / private' },
    { id: 'overlay',  x: 280, y: 280, w: 160, h: 50, color: '#d2a8ff', label: 'OverlayFS',          sub: 'layer union mount' },
    { id: 'cgroup',   x: 280, y: 390, w: 160, h: 50, color: '#ffa657', label: 'cgroup v2',          sub: 'cpu.max / memory.max' },
    { id: 'ns',       x: 280, y: 500, w: 160, h: 50, color: '#e3b341', label: '8 Namespaces',       sub: 'pid/net/mnt/uts/ipc/user/cgroup/time' },
  ]

  const arrows = [
    { x1: 120, y1: 110, x2: 120, y2: 170, label: '/var/run/docker.sock' },
    { x1: 120, y1: 220, x2: 120, y2: 280, label: 'gRPC (containerd API)' },
    { x1: 120, y1: 330, x2: 120, y2: 390, label: 'fork/exec shim' },
    { x1: 120, y1: 440, x2: 120, y2: 500, label: 'exec runc' },
    { x1: 120, y1: 550, x2: 120, y2: 610, label: 'clone() + execv()' },
    { x1: 200, y1: 195, x2: 280, y2: 195, label: 'pull/push images' },
    { x1: 200, y1: 305, x2: 280, y2: 305, label: 'snapshot driver' },
    { x1: 200, y1: 415, x2: 280, y2: 415, label: 'cgroupfs write' },
    { x1: 200, y1: 525, x2: 280, y2: 525, label: 'unshare flags' },
  ]

  const info: Record<string, { title: string; detail: string; code: string }> = {
    cli: {
      title: 'Docker CLI',
      detail: 'docker 命令通过 Unix domain socket 与 dockerd 通信，发送 HTTP REST 请求。',
      code: `// docker run 实际发送的 HTTP 请求
POST /v1.43/containers/create HTTP/1.1
Host: localhost
Content-Type: application/json

{
  "Image": "nginx:latest",
  "Cmd": ["nginx", "-g", "daemon off;"],
  "HostConfig": {
    "PortBindings": { "80/tcp": [{"HostPort": "8080"}] },
    "Memory": 268435456,
    "NanoCpus": 1000000000
  }
}

// 然后
POST /v1.43/containers/{id}/start`
    },
    daemon: {
      title: 'dockerd — Docker Daemon',
      detail: 'dockerd 是主进程，监听 /var/run/docker.sock，管理镜像、网络、卷，并调用 containerd。',
      code: `// dockerd 内部伪代码 (Go)
func (d *Daemon) ContainerStart(ctx context.Context, name string) error {
    ctr, err := d.GetContainer(name)

    // 1. 通过 containerd gRPC 创建任务
    task, err := d.containerd.Create(ctx, &api.ContainerConfig{
        ID:    ctr.ID,
        Image: ctr.Image,
        Spec:  generateOCISpec(ctr),  // 生成 OCI runtime spec
    })

    // 2. 设置网络 (创建 veth pair, 接入 docker0 bridge)
    if err := d.netController.Connect(ctr.ID, "bridge"); err != nil { ... }

    // 3. 启动任务
    return task.Start(ctx)
}`
    },
    ctrd: {
      title: 'containerd',
      detail: 'CNCF 项目。负责镜像拉取/存储、快照管理、任务生命周期，通过 gRPC 暴露 API。',
      code: `// containerd 任务创建 (Go gRPC)
// protobuf 定义
service Tasks {
    rpc Create(CreateTaskRequest) returns (CreateTaskResponse);
    rpc Start(StartRequest) returns (google.protobuf.Empty);
    rpc Delete(DeleteTaskRequest) returns (DeleteResponse);
    rpc Kill(KillRequest) returns (google.protobuf.Empty);
}

// containerd 内部: 准备快照(snapshot)
func (s *service) prepareSnapshot(ctx context.Context, id, parent string) error {
    // overlay2: 创建 upperdir + workdir
    snapshotter := s.getSnapshotter("overlayfs")
    return snapshotter.Prepare(ctx, id, parent)
    // → /var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/
}`
    },
    shim: {
      title: 'containerd-shim',
      detail: '每个容器一个 shim 进程。containerd 重启时容器不受影响。shim 持有 runc 退出后的 stdio/exit-code。',
      code: `// containerd-shim-runc-v2 核心逻辑 (Go)
func (s *service) Start(ctx context.Context, r *taskAPI.StartRequest) (*taskAPI.StartResponse, error) {
    // exec runc 创建容器
    cmd := exec.Command("runc", "create",
        "--bundle", s.bundle,   // OCI bundle 目录
        "--pid-file", s.pidFile,
        s.id,
    )
    if err := cmd.Run(); err != nil { ... }

    // 读取 runc 设置好的 PID
    pid, _ := readPidFile(s.pidFile)

    // exec runc start
    exec.Command("runc", "start", s.id).Run()
    return &taskAPI.StartResponse{Pid: uint32(pid)}, nil
}`
    },
    runc: {
      title: 'runc — OCI Runtime',
      detail: '实际调用 Linux 内核 API 创建容器：clone() 建立 namespace，pivot_root() 换根，exec() 启动进程。',
      code: `// runc 核心: libcontainer (Go 调用 C)
// 1. 读取 OCI spec (config.json)
spec, _ := loadSpec("config.json")

// 2. 初始化容器 (fork + clone)
// nsenter: 使用 /proc/self/exe 重新执行自身进入 namespace
// 等价于以下 C 代码:

#define _GNU_SOURCE
#include <sched.h>
#include <unistd.h>
#include <sys/mount.h>
#include <sys/wait.h>

int clone_flags = CLONE_NEWPID   // 新 PID namespace
                | CLONE_NEWNS    // 新 Mount namespace
                | CLONE_NEWNET   // 新 Network namespace
                | CLONE_NEWUTS   // 新 UTS (hostname) namespace
                | CLONE_NEWIPC   // 新 IPC namespace
                | CLONE_NEWUSER  // 新 User namespace
                | CLONE_NEWCGROUP; // 新 Cgroup namespace

pid_t child = clone(container_init, stack_top,
                    clone_flags | SIGCHLD, &args);

// 3. 在子进程 container_init() 中:
static int container_init(void *arg) {
    container_args *args = arg;

    // pivot_root: 切换文件系统根
    mount("overlay", args->rootfs, "overlay", MS_RDONLY|MS_REC,
          "lowerdir=/layers/3:/layers/2:/layers/1,"
          "upperdir=/containers/abc/upper,"
          "workdir=/containers/abc/work");

    chdir(args->rootfs);
    mkdir(".put_old", 0700);
    syscall(SYS_pivot_root, ".", ".put_old");
    chdir("/");
    umount2("/.put_old", MNT_DETACH);
    rmdir("/.put_old");

    // 挂载 /proc /sys /dev
    mount("proc", "/proc", "proc", 0, NULL);
    mount("sysfs", "/sys", "sysfs", MS_RDONLY, NULL);
    mount("devtmpfs", "/dev", "devtmpfs", 0, NULL);

    // 设置 hostname
    sethostname(args->hostname, strlen(args->hostname));

    // 删除能力 (drop capabilities)
    prctl(PR_SET_KEEPCAPS, 0);

    // 应用 seccomp 过滤器
    prctl(PR_SET_SECCOMP, SECCOMP_MODE_FILTER, &args->seccomp_prog);

    // 执行容器进程
    execv(args->argv[0], args->argv);
    return 1; // unreachable
}`
    },
    ctr: {
      title: 'Container Process',
      detail: '容器内的进程以为自己是系统唯一的进程(PID=1)，看到独立的网络栈、文件系统、主机名。',
      code: `// 容器内视角对比宿主机

// 宿主机: ls /proc/$(docker inspect --format={{.State.Pid}} nginx)/ns/
lrwxrwxrwx cgroup -> cgroup:[4026532456]
lrwxrwxrwx ipc    -> ipc:[4026532457]
lrwxrwxrwx mnt    -> mnt:[4026532455]
lrwxrwxrwx net    -> net:[4026532459]
lrwxrwxrwx pid    -> pid:[4026532458]
lrwxrwxrwx uts    -> uts:[4026532454]
lrwxrwxrwx user   -> user:[4026531837]  // shared with host

// 容器内: cat /proc/1/status
Name:   nginx
Pid:    1          // 容器内 PID=1 (宿主机实际是 23456)
NSpid:  1          // namespace 内的 PID
...

// 容器内: ip link show
1: lo: <LOOPBACK,UP>
2: eth0@if8: <BROADCAST,UP>  // veth pair 的一端
   inet 172.17.0.2/16`
    },
    reg: {
      title: 'Container Registry',
      detail: '镜像以 OCI Image Format 存储在 Registry，每层是一个 tar.gz，用 SHA256 内容寻址。',
      code: `// OCI Image Manifest (JSON)
{
  "schemaVersion": 2,
  "mediaType": "application/vnd.oci.image.manifest.v1+json",
  "config": {
    "mediaType": "application/vnd.oci.image.config.v1+json",
    "digest": "sha256:a27a1c4a...",
    "size": 7682
  },
  "layers": [
    {
      "mediaType": "application/vnd.oci.image.layer.v1.tar+gzip",
      "digest": "sha256:2f140462...",  // base layer
      "size": 31379476
    },
    {
      "mediaType": "application/vnd.oci.image.layer.v1.tar+gzip",
      "digest": "sha256:9d5a5d69...",  // RUN apt-get install
      "size": 127803
    }
  ]
}

// 拉取协议: HTTP Range 请求 + Content-Addressable Storage
// GET /v2/nginx/blobs/sha256:2f140462...
// Content-Length: 31379476
// docker 验证 sha256 后存入 /var/lib/docker/overlay2/`
    },
    overlay: {
      title: 'OverlayFS — 联合文件系统',
      detail: 'overlay2 把多个镜像层叠加为一个统一视图。写操作 Copy-on-Write 到 upperdir。',
      code: `// OverlayFS 挂载 (等价于 docker 内部操作)
// lowerdir: 只读镜像层 (从上到下: 最新→最旧)
// upperdir: 可写容器层 (CoW)
// workdir:  overlay 内部工作目录
// merged:   最终挂载点 (容器看到的 /)

mount("overlay", "/var/lib/docker/overlay2/abc123/merged",
      "overlay", 0,
      "lowerdir=/var/lib/docker/overlay2/layer3/diff"
      ":/var/lib/docker/overlay2/layer2/diff"
      ":/var/lib/docker/overlay2/layer1/diff,"
      "upperdir=/var/lib/docker/overlay2/abc123/diff,"
      "workdir=/var/lib/docker/overlay2/abc123/work");

// 目录结构
/var/lib/docker/overlay2/
├── <layer-sha>/diff/      # 每层的文件内容 (只读)
├── <container-id>/
│   ├── diff/              # upperdir: 容器写入的文件
│   ├── work/              # workdir: overlay 内部使用
│   ├── merged/            # 最终视图 → 容器的 /
│   └── lower              # 记录 lowerdir 路径

// Copy-on-Write 触发:
// 容器 write("/etc/nginx/nginx.conf") →
//   1. 内核在 upperdir/etc/nginx/ 创建目录
//   2. 从 lowerdir 复制 nginx.conf 到 upperdir
//   3. 修改 upperdir 中的副本
//   4. merged 视图自动更新`
    },
    cgroup: {
      title: 'cgroup v2 — 资源隔离',
      detail: '通过 cgroupfs 虚拟文件系统控制 CPU/内存/IO 限制，docker 写入对应文件实现限制。',
      code: `// docker run --memory=256m --cpus=1.5 实际操作:

// 1. 在 cgroup v2 层级下创建容器 cgroup
mkdir /sys/fs/cgroup/system.slice/docker-<id>.scope/

// 2. 写入资源限制
// 内存上限 256MB
echo 268435456 > /sys/fs/cgroup/system.slice/docker-<id>.scope/memory.max
// 内存+swap 上限
echo 268435456 > /sys/fs/cgroup/system.slice/docker-<id>.scope/memory.swap.max
// CPU: 每 100ms 周期中允许使用 150ms (1.5 CPU)
echo "150000 100000" > /sys/fs/cgroup/system.slice/docker-<id>.scope/cpu.max
// IO 限速 (blkio)
echo "8:0 rbps=10485760" > /sys/fs/cgroup/system.slice/docker-<id>.scope/io.max

// 3. 将容器 PID 加入 cgroup
echo <container-pid> > /sys/fs/cgroup/system.slice/docker-<id>.scope/cgroup.procs

// 4. 实时监控
cat /sys/fs/cgroup/system.slice/docker-<id>.scope/memory.current
cat /sys/fs/cgroup/system.slice/docker-<id>.scope/cpu.stat
# usage_usec 2400000
# user_usec  1800000
# system_usec 600000

// C 代码等价实现
#include <fcntl.h>
void setup_cgroup(const char *cgroup_path, pid_t pid) {
    char path[256], val[64];

    // memory.max
    snprintf(path, sizeof(path), "%s/memory.max", cgroup_path);
    int fd = open(path, O_WRONLY);
    write(fd, "268435456", 9); close(fd);

    // cpu.max
    snprintf(path, sizeof(path), "%s/cpu.max", cgroup_path);
    fd = open(path, O_WRONLY);
    write(fd, "150000 100000", 13); close(fd);

    // 加入进程
    snprintf(path, sizeof(path), "%s/cgroup.procs", cgroup_path);
    fd = open(path, O_WRONLY);
    snprintf(val, sizeof(val), "%d", pid);
    write(fd, val, strlen(val)); close(fd);
}`
    },
    ns: {
      title: 'Linux 8 种 Namespace',
      detail: 'Namespace 是内核的资源隔离机制，每种 namespace 隔离一类全局资源，通过 clone()/unshare()/setns() 操作。',
      code: `// 8 种 namespace 与对应 clone() flag

#include <sched.h>

// PID namespace: 进程 ID 隔离 (容器内 PID=1)
CLONE_NEWPID    // 子进程在新 PID ns 中
// /proc/sys/kernel/pid_max 在 ns 内独立

// Mount namespace: 文件系统挂载点隔离
CLONE_NEWNS     // 最古老的 namespace (1999)
// clone 后调用 mount() 不影响宿主机

// Network namespace: 网络栈隔离
CLONE_NEWNET    // 独立的 lo/eth0/路由表/iptables
// ip netns add myns 等价于 unshare(CLONE_NEWNET)

// UTS namespace: 主机名/域名隔离
CLONE_NEWUTS    // sethostname() 不影响宿主机

// IPC namespace: System V IPC / POSIX mq 隔离
CLONE_NEWIPC    // 共享内存段/信号量独立

// User namespace: UID/GID 映射 (rootless docker)
CLONE_NEWUSER   // 容器 root(0) → 宿主机 uid 100000
// /proc/<pid>/uid_map: "0 100000 65536"

// Cgroup namespace: cgroup 根路径隔离
CLONE_NEWCGROUP // 容器看到自己的 cgroup 为根

// Time namespace (Linux 5.6+): 时钟隔离
CLONE_NEWTIME   // CLOCK_MONOTONIC 偏移独立

// ── 完整示例: 创建所有 namespace ──
int flags = CLONE_NEWPID | CLONE_NEWNS | CLONE_NEWNET
          | CLONE_NEWUTS | CLONE_NEWIPC | CLONE_NEWUSER
          | CLONE_NEWCGROUP;

// 方式1: clone() - 创建子进程进入新 ns
pid_t pid = clone(child_fn, stack, flags | SIGCHLD, arg);

// 方式2: unshare() - 当前进程进入新 ns
unshare(CLONE_NEWNS | CLONE_NEWUTS);

// 方式3: setns() - 加入已有 ns
int fd = open("/proc/12345/ns/net", O_RDONLY);
setns(fd, CLONE_NEWNET);  // 进入 PID 12345 的 net ns
close(fd);

// 查看进程的 namespace
// ls -la /proc/<pid>/ns/
// lrwxrwxrwx pid -> pid:[4026532458]
// 相同 inode 号 = 相同 namespace`
    },
  }

  const sel = hover && info[hover] ? info[hover] : null

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%', overflow: 'hidden' }}>
      {/* SVG diagram */}
      <div style={{ flex: '0 0 480px', overflowY: 'auto', padding: '8px 0' }}>
        <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 8, paddingLeft: 4 }}>
          点击任意组件查看底层实现
        </div>
        <svg width="480" height="680" style={{ display: 'block' }}>
          {/* grid */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#21262d" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="480" height="680" fill="url(#grid)"/>

          {/* section labels */}
          <text x="120" y="20" textAnchor="middle" fill="#8b949e" fontSize="11">Docker Stack</text>
          <text x="360" y="20" textAnchor="middle" fill="#8b949e" fontSize="11">Kernel Primitives</text>
          <line x1="240" y1="0" x2="240" y2="680" stroke="#21262d" strokeWidth="1" strokeDasharray="4,4"/>

          {/* arrows between boxes */}
          {arrows.map((a, i) => (
            <g key={i}>
              <line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
                stroke="#30363d" strokeWidth="1.5" markerEnd="url(#arr)"/>
              <text x={(a.x1 + a.x2) / 2 + 4} y={(a.y1 + a.y2) / 2 - 3}
                fill="#6e7681" fontSize="9" textAnchor="middle">{a.label}</text>
            </g>
          ))}

          <defs>
            <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#4d8fff"/>
            </marker>
          </defs>

          {/* boxes */}
          {boxes.map(b => (
            <g key={b.id} style={{ cursor: 'pointer' }}
               onClick={() => setHover(hover === b.id ? null : b.id)}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={8}
                fill={hover === b.id ? b.color + '40' : '#161b22'}
                stroke={hover === b.id ? b.color : b.color + '80'}
                strokeWidth={hover === b.id ? 2 : 1}/>
              <text x={b.x + b.w / 2} y={b.y + 20} textAnchor="middle"
                fill={b.color} fontSize="13" fontWeight="700">{b.label}</text>
              <text x={b.x + b.w / 2} y={b.y + 36} textAnchor="middle"
                fill="#8b949e" fontSize="10">{b.sub}</text>
            </g>
          ))}
        </svg>
      </div>

      {/* Detail panel */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 4px 8px 0' }}>
        {sel ? (
          <>
            <div style={{ ...CARD, borderColor: '#4d8fff' }}>
              <div style={H2}>{sel.title}</div>
              <div style={{ fontSize: 13, color: '#8b949e', lineHeight: 1.6 }}>{sel.detail}</div>
            </div>
            <div style={CODE}>{sel.code}</div>
          </>
        ) : (
          <div style={{ color: '#4d8fff', fontSize: 13, padding: '20px 8px', lineHeight: 1.8 }}>
            <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>🐳 Docker 底层调用链</div>
            <div style={{ color: '#8b949e' }}>
              <code>docker run nginx</code> 触发的完整调用链：<br/><br/>
              1. <span style={{ color: '#4d8fff' }}>Docker CLI</span> → HTTP POST /var/run/docker.sock<br/>
              2. <span style={{ color: '#3fb950' }}>dockerd</span> → gRPC → containerd<br/>
              3. <span style={{ color: '#a371f7' }}>containerd</span> → fork → containerd-shim<br/>
              4. <span style={{ color: '#f0883e' }}>shim</span> → exec → runc create<br/>
              5. <span style={{ color: '#ff7b72' }}>runc</span> → <code>clone(CLONE_NEWPID|CLONE_NEWNS|...)</code><br/>
              6. 子进程: <code>pivot_root() → mount() → execv()</code><br/>
              7. <span style={{ color: '#56d364' }}>Container</span> 以 PID 1 运行在独立 namespace<br/><br/>
              <span style={{ color: '#4d8fff' }}>← 点击左侧组件查看详细代码</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Image Layers Tab ──────────────────────────────────────────────────────────
function LayersTab() {
  const [sel, setSel] = useState(0)

  const layers = [
    { label: 'Layer 0: scratch / debian:slim', color: '#4d8fff', sha: 'sha256:2f140462', size: '29.9 MB',
      cmd: 'FROM debian:12-slim',
      files: ['/bin/', '/lib/', '/usr/', '/etc/'],
      note: '基础 OS 层，包含 libc、基础命令。只读。' },
    { label: 'Layer 1: RUN apt-get install', color: '#3fb950', sha: 'sha256:9d5a5d69', size: '12.3 MB',
      cmd: 'RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*',
      files: ['/usr/sbin/nginx', '/etc/nginx/', '/var/log/nginx/'],
      note: '安装 nginx。注意 rm -rf 在同一 RUN 中执行，否则删除不会减小镜像大小。' },
    { label: 'Layer 2: COPY config', color: '#a371f7', sha: 'sha256:c3d1e2f0', size: '4 KB',
      cmd: 'COPY nginx.conf /etc/nginx/nginx.conf',
      files: ['/etc/nginx/nginx.conf'],
      note: '每个 COPY/ADD 指令创建一层。小文件也是独立一层。' },
    { label: 'Layer 3: RUN chown', color: '#f0883e', sha: 'sha256:a1b2c3d4', size: '0 B (meta)',
      cmd: 'RUN chown -R nginx:nginx /var/log/nginx',
      files: ['.wh. (whiteout: 标记文件所有权变化)'],
      note: '权限修改在 overlay 上层记录 whiteout 条目。' },
    { label: '✏ Container Layer (rw)', color: '#56d364', sha: '(非内容寻址)', size: 'CoW 写入',
      cmd: '← 运行时写入 (docker run 后)',
      files: ['/var/log/nginx/access.log', '/tmp/...', '/etc/nginx/nginx.conf (CoW 副本)'],
      note: 'upperdir: 容器唯一的可写层。停止容器后丢失（除非 docker commit）。' },
  ]

  const l = layers[sel]

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%', overflow: 'hidden' }}>
      {/* Layer stack visualization */}
      <div style={{ flex: '0 0 300px', overflowY: 'auto', paddingTop: 8 }}>
        <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 10 }}>
          OverlayFS 层叠结构 (从上到下)
        </div>
        {[...layers].reverse().map((layer, ri) => {
          const i = layers.length - 1 - ri
          return (
            <div key={i}
              onClick={() => setSel(i)}
              style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 6,
                background: sel === i ? layer.color + '22' : '#161b22',
                border: `1px solid ${sel === i ? layer.color : layer.color + '40'}`,
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
              <div style={{ fontSize: 11, color: layer.color, fontWeight: 700 }}>{layer.label}</div>
              <div style={{ fontSize: 10, color: '#8b949e', marginTop: 2 }}>
                {layer.sha} · {layer.size}
              </div>
            </div>
          )
        })}
        <div style={{ marginTop: 8, padding: '8px 12px', background: '#0d1117', borderRadius: 8,
          border: '1px dashed #30363d', fontSize: 11, color: '#8b949e', lineHeight: 1.6 }}>
          <strong style={{ color: '#e6edf3' }}>merged (容器看到的 /)</strong><br/>
          upperdir 覆盖 lowerdir，<br/>
          whiteout 文件隐藏下层文件。
        </div>
      </div>

      {/* Layer detail */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 4px' }}>
        <div style={{ ...CARD, borderColor: l.color }}>
          <div style={H2}>{l.label}</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <span style={BADGE('#1f2937')}>📦 {l.size}</span>
            <span style={{ ...BADGE('#1f2937'), color: '#8b949e', fontFamily: 'monospace', fontSize: 10 }}>{l.sha}</span>
          </div>
          <div style={{ fontSize: 13, color: '#8b949e', lineHeight: 1.6 }}>{l.note}</div>
        </div>
        <div style={{ ...CARD }}>
          <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6 }}>Dockerfile 指令</div>
          <div style={{ fontFamily: 'monospace', fontSize: 13, color: l.color }}>{l.cmd}</div>
        </div>
        <div style={{ ...CARD }}>
          <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6 }}>该层包含的文件</div>
          {l.files.map(f => (
            <div key={f} style={{ fontFamily: 'monospace', fontSize: 12, color: '#e6edf3',
              padding: '3px 0', borderBottom: '1px solid #21262d' }}>{f}</div>
          ))}
        </div>
        <div style={CODE}>{`# OverlayFS 完整挂载命令 (docker 内部)
mount -t overlay overlay \\
  -o lowerdir=/var/lib/docker/overlay2/${layers[3].sha.slice(7,15)}/diff:\\
           /var/lib/docker/overlay2/${layers[2].sha.slice(7,15)}/diff:\\
           /var/lib/docker/overlay2/${layers[1].sha.slice(7,15)}/diff:\\
           /var/lib/docker/overlay2/${layers[0].sha.slice(7,15)}/diff,\\
     upperdir=/var/lib/docker/overlay2/<container-id>/diff,\\
     workdir=/var/lib/docker/overlay2/<container-id>/work \\
  /var/lib/docker/overlay2/<container-id>/merged

# 验证挂载
mount | grep overlay
# overlay on /var/lib/docker/overlay2/.../merged type overlay
#   (rw,relatime,lowerdir=..,upperdir=..,workdir=..)

# 查看层内容差异
ls /var/lib/docker/overlay2/<layer-sha>/diff/

# whiteout 文件 (标记删除)
# .wh.<filename>  → 隐藏下层同名文件
# .wh..wh..opq   → opaque whiteout: 隐藏下层同名目录所有内容`}
        </div>
      </div>
    </div>
  )
}

// ─── Runtime Tab ──────────────────────────────────────────────────────────────
function RuntimeTab() {
  const sections = [
    {
      title: '完整的 minicontainer.c — 从零实现容器', color: '#ff7b72',
      code: `/* minicontainer.c — 用 500 行 C 实现 Docker 核心
 * 演示: namespace + cgroup + pivot_root + overlay mount
 * 编译: gcc -O2 -o minicontainer minicontainer.c
 * 运行: sudo ./minicontainer nginx:latest /usr/sbin/nginx -g 'daemon off;'
 */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>
#include <sched.h>         // clone(), CLONE_NEW*
#include <signal.h>
#include <sys/mount.h>     // mount(), umount2()
#include <sys/stat.h>
#include <sys/syscall.h>   // SYS_pivot_root
#include <sys/wait.h>
#include <linux/capability.h>
#include <sys/prctl.h>

#define STACK_SIZE (1024 * 1024)  // 子进程栈 1MB
#define CGROUP_ROOT "/sys/fs/cgroup/minicontainer"

typedef struct {
    char  rootfs[512];   // overlay merged 目录
    char *argv[64];      // 容器命令行
    int   uid_map[3];    // user namespace UID 映射
    long  mem_limit;     // bytes
    float cpu_quota;     // 0.0~N.0
} ContainerConfig;

/* ── Step 1: 写文件辅助函数 ── */
static void write_file(const char *path, const char *val) {
    int fd = open(path, O_WRONLY | O_CREAT | O_TRUNC, 0644);
    if (fd < 0) { perror(path); exit(1); }
    if (write(fd, val, strlen(val)) < 0) { perror("write"); exit(1); }
    close(fd);
}

/* ── Step 2: 设置 cgroup v2 资源限制 ── */
static void setup_cgroup(pid_t pid, const ContainerConfig *cfg) {
    char path[512], val[128];

    mkdir(CGROUP_ROOT, 0755);

    // 内存上限
    if (cfg->mem_limit > 0) {
        snprintf(path, sizeof(path), "%s/memory.max", CGROUP_ROOT);
        snprintf(val,  sizeof(val),  "%ld", cfg->mem_limit);
        write_file(path, val);
    }

    // CPU 配额 (每 100ms 周期中可用 quota ms)
    if (cfg->cpu_quota > 0) {
        snprintf(path, sizeof(path), "%s/cpu.max", CGROUP_ROOT);
        snprintf(val,  sizeof(val),  "%d 100000",
                 (int)(cfg->cpu_quota * 100000));
        write_file(path, val);
    }

    // 将进程加入 cgroup
    snprintf(path, sizeof(path), "%s/cgroup.procs", CGROUP_ROOT);
    snprintf(val,  sizeof(val),  "%d", pid);
    write_file(path, val);
}

/* ── Step 3: 设置 overlay 文件系统 ── */
static void setup_overlay(const char *image_dir, const char *ctr_dir,
                           char *merged_out) {
    char lower[512], upper[512], work[512], opts[2048];

    snprintf(lower,  sizeof(lower),  "%s/layers",  image_dir);
    snprintf(upper,  sizeof(upper),  "%s/upper",   ctr_dir);
    snprintf(work,   sizeof(work),   "%s/work",    ctr_dir);
    snprintf(merged_out, 512,        "%s/merged",  ctr_dir);

    mkdir(upper, 0755); mkdir(work, 0755); mkdir(merged_out, 0755);

    snprintf(opts, sizeof(opts),
             "lowerdir=%s,upperdir=%s,workdir=%s", lower, upper, work);

    if (mount("overlay", merged_out, "overlay", 0, opts) != 0) {
        perror("mount overlay"); exit(1);
    }
}

/* ── Step 4: 容器内初始化函数 (clone 后在新 namespace 运行) ── */
static int container_init(void *arg) {
    ContainerConfig *cfg = (ContainerConfig *)arg;

    /* 4a. pivot_root: 切换文件系统根 */
    char put_old[512];
    snprintf(put_old, sizeof(put_old), "%s/.old_root", cfg->rootfs);
    mkdir(put_old, 0700);

    if (chdir(cfg->rootfs) != 0) { perror("chdir"); return 1; }

    // pivot_root(new_root, put_old) — 直接 syscall 因为 glibc 无封装
    if (syscall(SYS_pivot_root, ".", ".old_root") != 0) {
        perror("pivot_root"); return 1;
    }
    chdir("/");

    // 卸载旧根 (detach)
    if (umount2("/.old_root", MNT_DETACH) != 0) {
        perror("umount2"); return 1;
    }
    rmdir("/.old_root");

    /* 4b. 挂载虚拟文件系统 */
    mount("proc",    "/proc", "proc",     0,          NULL);
    mount("sysfs",   "/sys",  "sysfs",    MS_RDONLY,  NULL);
    mount("devtmpfs","/dev",  "devtmpfs", 0,          NULL);
    mount("tmpfs",   "/tmp",  "tmpfs",    0,          "size=64m");

    // /dev/pts (伪终端)
    mkdir("/dev/pts", 0755);
    mount("devpts", "/dev/pts", "devpts", 0, "newinstance,ptmxmode=0666");

    /* 4c. 设置主机名 */
    sethostname("container", 9);

    /* 4d. 删除危险 capabilities */
    // 保留: NET_BIND_SERVICE, SETUID, SETGID, CHOWN, ...
    // 删除: SYS_MODULE, SYS_RAWIO, SYS_PTRACE, SYS_ADMIN, ...
    struct __user_cap_header_struct hdr = {
        .version = _LINUX_CAPABILITY_VERSION_3, .pid = 0
    };
    struct __user_cap_data_struct data[2] = {
        { .effective = 0x00000000a80425fb, .permitted = 0x00000000a80425fb, .inheritable = 0 },
        { .effective = 0, .permitted = 0, .inheritable = 0 },
    };
    if (capset(&hdr, data) != 0) perror("capset"); // 非致命

    /* 4e. 设置 PR_SET_NO_NEW_PRIVS (禁止 setuid 提权) */
    prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0);

    /* 4f. exec 容器进程 */
    execv(cfg->argv[0], cfg->argv);
    perror("execv"); return 1;
}

/* ── Step 5: 主函数 ── */
int main(int argc, char *argv[]) {
    if (getuid() != 0) { fprintf(stderr, "need root\\n"); return 1; }

    ContainerConfig cfg = {
        .mem_limit  = 256 * 1024 * 1024,  // 256MB
        .cpu_quota  = 1.5,                 // 1.5 CPU
        .argv       = { argv[1], NULL },
    };

    // 1. 准备 overlay 文件系统
    setup_overlay("/var/lib/minicontainer/images/nginx",
                  "/var/lib/minicontainer/containers/c001",
                  cfg.rootfs);

    // 2. 分配子进程栈
    char *stack = malloc(STACK_SIZE);
    char *stack_top = stack + STACK_SIZE;

    // 3. clone: 创建所有 namespace
    int ns_flags = CLONE_NEWPID     // 新 PID namespace
                 | CLONE_NEWNS      // 新 Mount namespace
                 | CLONE_NEWNET     // 新 Network namespace
                 | CLONE_NEWUTS     // 新 UTS namespace
                 | CLONE_NEWIPC     // 新 IPC namespace
                 | CLONE_NEWCGROUP; // 新 Cgroup namespace
                 // CLONE_NEWUSER 需要额外的 uid_map 配置

    pid_t child = clone(container_init, stack_top,
                        ns_flags | SIGCHLD, &cfg);
    if (child < 0) { perror("clone"); return 1; }

    // 4. 在父进程中: 设置 cgroup (必须在 clone 之后)
    setup_cgroup(child, &cfg);

    // 5. 配置容器网络 (创建 veth pair)
    //    见下方 setup_network() 函数

    // 6. 等待容器退出
    int status;
    waitpid(child, &status, 0);
    printf("container exited: %d\\n", WEXITSTATUS(status));

    // 7. 清理: umount overlay, 删除 cgroup
    umount2(cfg.rootfs, MNT_DETACH);
    rmdir(CGROUP_ROOT);
    free(stack);
    return 0;
}`
    },
    {
      title: 'Network namespace + veth pair 配置', color: '#4d8fff',
      code: `/* setup_network.c — 容器网络配置
 * 使用 netlink socket 创建 veth pair 并配置 IP
 * (docker 使用 libnetwork / CNI 完成此步骤)
 */
#include <sys/socket.h>
#include <linux/netlink.h>
#include <linux/rtnetlink.h>
#include <net/if.h>
#include <arpa/inet.h>

// 等价的 shell 命令 (ip 命令底层也是 netlink):
static void setup_network_shell(pid_t container_pid) {
    char cmd[512];

    // 1. 创建 veth pair (veth0 在宿主机, eth0 在容器)
    system("ip link add veth0 type veth peer name eth0");

    // 2. 将 eth0 移入容器的 network namespace
    snprintf(cmd, sizeof(cmd),
             "ip link set eth0 netns %d", container_pid);
    system(cmd);

    // 3. 宿主机端: 接入 docker0 bridge, 启动接口
    system("ip link set veth0 up");
    system("ip link set veth0 master docker0");

    // 4. 容器内: 配置 IP, 路由 (需要 nsenter 进入 net ns)
    snprintf(cmd, sizeof(cmd),
             "nsenter --net=/proc/%d/ns/net -- sh -c '"
             "ip link set lo up && "
             "ip link set eth0 up && "
             "ip addr add 172.17.0.2/16 dev eth0 && "
             "ip route add default via 172.17.0.1'",
             container_pid);
    system(cmd);
}

// ── iptables 规则 (docker 启动时设置) ──
static void setup_iptables() {
    // 允许容器访问外网 (MASQUERADE = SNAT)
    system("iptables -t nat -A POSTROUTING "
           "-s 172.17.0.0/16 ! -o docker0 "
           "-j MASQUERADE");

    // 端口映射: 宿主机 8080 → 容器 172.17.0.2:80
    system("iptables -t nat -A DOCKER "
           "-p tcp --dport 8080 "
           "-j DNAT --to-destination 172.17.0.2:80");

    system("iptables -t nat -A PREROUTING "
           "-p tcp --dport 8080 "
           "-j DOCKER");

    // 允许 bridge 间转发
    system("iptables -A FORWARD "
           "-i docker0 -o docker0 "
           "-j ACCEPT");

    // 开启 IP 转发
    system("echo 1 > /proc/sys/net/ipv4/ip_forward");
}

// ── Netlink socket 直接创建 veth (libnetwork 方式) ──
int create_veth_netlink(const char *veth_host, const char *veth_ctr) {
    // NLMSG_NEWLINK + IFLA_INFO_KIND = "veth" + IFLA_INFO_DATA
    int sock = socket(AF_NETLINK, SOCK_RAW, NETLINK_ROUTE);

    struct {
        struct nlmsghdr  nlh;
        struct ifinfomsg ifi;
        char             attrs[512];
    } req = {
        .nlh = {
            .nlmsg_len   = NLMSG_LENGTH(sizeof(struct ifinfomsg)),
            .nlmsg_type  = RTM_NEWLINK,
            .nlmsg_flags = NLM_F_REQUEST | NLM_F_CREATE | NLM_F_EXCL | NLM_F_ACK,
        },
        .ifi = { .ifi_family = AF_UNSPEC },
    };

    // 添加 IFLA_IFNAME, IFLA_LINKINFO (kind=veth), IFLA_INFO_DATA...
    // (完整实现见 iproute2/lib/ll_map.c)

    send(sock, &req, req.nlh.nlmsg_len, 0);
    // 接收 ACK
    close(sock);
    return 0;
}`
    },
    {
      title: 'seccomp-BPF 系统调用过滤', color: '#a371f7',
      code: `/* seccomp_filter.c — Docker 默认 seccomp profile 实现
 * 阻止危险系统调用: kexec_load, perf_event_open, ptrace...
 */
#include <linux/seccomp.h>
#include <linux/filter.h>
#include <linux/audit.h>
#include <sys/prctl.h>
#include <sys/syscall.h>

// BPF 程序: 检查 arch 然后过滤 syscall 号
static struct sock_filter filter[] = {
    /* 验证架构 (防止 32/64 位混用攻击) */
    BPF_STMT(BPF_LD | BPF_W | BPF_ABS,
             offsetof(struct seccomp_data, arch)),
    BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K,
             AUDIT_ARCH_X86_64, 1, 0),
    BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_KILL_PROCESS),

    /* 加载 syscall 号 */
    BPF_STMT(BPF_LD | BPF_W | BPF_ABS,
             offsetof(struct seccomp_data, nr)),

    /* 阻止 kexec_load (防止替换内核) */
    BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_kexec_load, 0, 1),
    BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ERRNO | EPERM),

    /* 阻止 perf_event_open (防止侧信道攻击) */
    BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_perf_event_open, 0, 1),
    BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ERRNO | EPERM),

    /* 阻止 ptrace (防止容器逃逸) */
    BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_ptrace, 0, 1),
    BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ERRNO | EPERM),

    /* 阻止 mount (防止挂载宿主机文件系统) */
    BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_mount, 0, 1),
    BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ERRNO | EPERM),

    /* 阻止 reboot */
    BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_reboot, 0, 1),
    BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ERRNO | EPERM),

    /* 允许其他所有 syscall */
    BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ALLOW),
};

static struct sock_fprog prog = {
    .len    = sizeof(filter) / sizeof(filter[0]),
    .filter = filter,
};

void apply_seccomp() {
    // 必须先设置 PR_SET_NO_NEW_PRIVS
    prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0);

    // 加载 BPF 过滤器到内核
    if (prctl(PR_SET_SECCOMP, SECCOMP_MODE_FILTER, &prog) != 0) {
        perror("seccomp"); exit(1);
    }
    // 此后任何违禁 syscall → EPERM 或 SIGSYS (kill)
}

// Docker 默认 seccomp profile 阻止约 44 个 syscall
// 完整列表见: moby/profiles/seccomp/default.json
// 共 ~300 个 syscall 中允许约 256 个

// ── 用 seccomp-tools 查看容器内 syscall ──
// strace -f -e trace=all docker run --rm alpine ls
// docker run --security-opt seccomp=unconfined alpine  # 禁用 seccomp`
    },
  ]

  const [sel, setSel] = useState(0)

  return (
    <div style={{ display: 'flex', gap: 12, height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: '0 0 200px', overflowY: 'auto', paddingTop: 8 }}>
        {sections.map((s, i) => (
          <div key={i} onClick={() => setSel(i)}
            style={{ padding: '10px 12px', borderRadius: 8, marginBottom: 6, cursor: 'pointer',
              background: sel === i ? s.color + '20' : '#161b22',
              border: `1px solid ${sel === i ? s.color : '#30363d'}`,
            }}>
            <div style={{ fontSize: 12, color: s.color, fontWeight: 700, lineHeight: 1.4 }}>{s.title}</div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 4px' }}>
        <div style={CODE}>{sections[sel].code}</div>
      </div>
    </div>
  )
}

// ─── Dockerfile Tab ────────────────────────────────────────────────────────────
function DockerfileTab() {
  const [step, setStep] = useState(0)

  const steps = [
    { instr: 'FROM debian:12-slim',                    color: '#4d8fff', layer: true,
      desc: '拉取基础镜像。docker 检查本地缓存，cache miss 则从 Registry 按层拉取。',
      internal: `// 内部操作
1. GET /v2/library/debian/manifests/12-slim  (获取 manifest)
2. 解析 manifest → 得到各层的 sha256 digest
3. 对每层: GET /v2/library/debian/blobs/sha256:<digest>
4. 解压 tar.gz → /var/lib/docker/overlay2/<sha>/diff/
5. 记录层顺序到 image metadata JSON` },

    { instr: 'ENV DEBIAN_FRONTEND=noninteractive',     color: '#3fb950', layer: false,
      desc: '只写入 image config JSON，不创建新层。ENV/LABEL/ARG/EXPOSE/CMD/ENTRYPOINT 均如此。',
      internal: `// image config.json 片段
{
  "config": {
    "Env": [
      "PATH=/usr/local/sbin:/usr/local/bin:...",
      "DEBIAN_FRONTEND=noninteractive"  ← 新增
    ]
  }
}
// 不产生新 layer sha256` },

    { instr: 'RUN apt-get update && apt-get install -y nginx \\\n    && rm -rf /var/lib/apt/lists/*', color: '#a371f7', layer: true,
      desc: '执行命令 → 产生文件系统变化 → 打包为新层。同一 RUN 中删除文件才能缩小镜像。',
      internal: `// BuildKit 执行过程
1. 启动临时容器 (基于前一层)
2. 在容器的 upperdir 执行命令
3. apt-get update → 写入 /var/lib/apt/lists/ (临时)
4. apt-get install → 写入 /usr/sbin/nginx, /etc/nginx/ ...
5. rm -rf /var/lib/apt/lists/* → 在 upperdir 中删除 (whiteout)
6. tar upperdir → sha256 → 新层
7. 删除临时容器

// 关键: 分开写 rm 会产生两层, 且删除层仍有大小!
// ❌ RUN apt-get install -y nginx   (第一层: +12MB)
//    RUN rm -rf /var/lib/apt/lists  (第二层: 0B diff, 但 lowerdir 仍有 lists)
// ✓  合并在同一 RUN 中` },

    { instr: 'COPY nginx.conf /etc/nginx/nginx.conf',  color: '#f0883e', layer: true,
      desc: '将 build context 中的文件复制到镜像层。BuildKit 计算文件哈希作为缓存 key。',
      internal: `// BuildKit 缓存逻辑
cache_key = sha256(instruction + file_content_hash)
// nginx.conf 内容变化 → cache_key 变 → 此层之后所有层缓存失效

// 内部实现
src_stat = os.Stat("nginx.conf")
src_hash = sha256(file_content)  // 或 mtime+size (快速模式)
if cache_hit(cache_key):
    reuse_cached_layer()
else:
    copy_file_to_upperdir()
    commit_layer()

// COPY --chown=nginx:nginx 会同时修改 uid/gid
// ADD 支持 URL 和自动解压 tar (不推荐用于普通复制)` },

    { instr: 'EXPOSE 80',                              color: '#e3b341', layer: false,
      desc: '纯元数据，写入 config.json。不会真正开放端口，只是声明意图。',
      internal: `// 容器运行时由 docker -p 8080:80 实现端口映射:
// iptables -t nat -A DOCKER -p tcp --dport 8080
//   -j DNAT --to-destination 172.17.0.2:80
// (见 Network 部分)` },

    { instr: 'CMD ["nginx", "-g", "daemon off;"]',     color: '#56d364', layer: false,
      desc: '容器启动时的默认命令。写入 config.json。docker run <image> <cmd> 可覆盖。',
      internal: `// config.json
{
  "config": {
    "Cmd": ["nginx", "-g", "daemon off;"],
    "Entrypoint": null
  }
}

// ENTRYPOINT vs CMD:
// ENTRYPOINT ["nginx"]  CMD ["-g", "daemon off;"]
// → docker run myimage       → nginx -g 'daemon off;'
// → docker run myimage -t    → nginx -t  (CMD 被覆盖)
// → docker run --entrypoint sh myimage  (ENTRYPOINT 被覆盖)

// 最终 runc 执行:
// execv("/usr/sbin/nginx", ["nginx", "-g", "daemon off;"])` },
  ]

  const s = steps[step]

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%', overflow: 'hidden' }}>
      {/* Steps list */}
      <div style={{ flex: '0 0 320px', overflowY: 'auto', paddingTop: 8 }}>
        <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 8 }}>Dockerfile 构建过程 · 点击查看内部实现</div>
        {steps.map((st, i) => (
          <div key={i} onClick={() => setStep(i)}
            style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 6, cursor: 'pointer',
              background: step === i ? st.color + '20' : '#161b22',
              border: `1px solid ${step === i ? st.color : '#30363d'}`,
              transition: 'all 0.15s',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#8b949e' }}>#{i + 1}</span>
              {st.layer && <span style={{ ...BADGE('#1f2937'), fontSize: 10 }}>new layer</span>}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: st.color,
              marginTop: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {st.instr}
            </div>
          </div>
        ))}
      </div>
      {/* Detail */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 4px' }}>
        <div style={{ ...CARD, borderColor: s.color }}>
          <div style={{ fontFamily: 'monospace', fontSize: 13, color: s.color,
            marginBottom: 10, whiteSpace: 'pre-wrap' }}>{s.instr}</div>
          <div style={{ fontSize: 13, color: '#8b949e', lineHeight: 1.6 }}>{s.desc}</div>
        </div>
        <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 6, padding: '0 4px' }}>
          BuildKit 内部实现
        </div>
        <div style={CODE}>{s.internal}</div>
      </div>
    </div>
  )
}

// ─── Lifecycle Tab ─────────────────────────────────────────────────────────────
function LifecycleTab() {
  const [cur, setCur] = useState<string>('none')

  const states: Record<string, { color: string; x: number; y: number; label: string; api: string; code: string }> = {
    none: { color: '#8b949e', x: 60, y: 200, label: 'image', api: '—',
      code: `# 镜像是只读模板，容器是运行中的实例
docker images  # 列出本地镜像
# REPOSITORY   TAG    IMAGE ID     SIZE
# nginx        latest a27a1c4a...  188MB

# 镜像内部结构
docker inspect nginx:latest | jq '.[0].RootFS'
# { "Type": "layers", "Layers": ["sha256:2f14...", "sha256:9d5a..."] }` },
    created: { color: '#4d8fff', x: 230, y: 100, label: 'created', api: 'POST /containers/create',
      code: `// docker create nginx (不启动)
// POST /v1.43/containers/create
// 内部: 分配 container ID, 准备 overlay 快照, 写入 container config
// 但 clone() 尚未调用 — 无进程

// 容器目录已创建:
ls /var/lib/docker/containers/<id>/
# config.v2.json  hostconfig.json  hostname  hosts  resolv.conf  shm/

// overlay 快照已准备:
ls /var/lib/docker/overlay2/<id>/
# diff/  link  lower  merged/  work/  (merged 已挂载)` },
    running: { color: '#3fb950', x: 400, y: 200, label: 'running', api: 'POST /containers/{id}/start',
      code: `// docker start <id>
// 内部: containerd → shim → runc → clone() → execv()

// 验证运行状态
docker inspect <id> | jq '.[0].State'
# { "Status": "running", "Pid": 23456, "StartedAt": "..." }

// 宿主机视角
ps aux | grep 23456
# root 23456 nginx -g 'daemon off;'

// namespace 验证
ls -la /proc/23456/ns/
# pid  → pid:[4026532458]   (独立 PID ns)
# net  → net:[4026532459]   (独立 net ns)
# mnt  → mnt:[4026532455]   (独立 mount ns)

// cgroup 验证
cat /sys/fs/cgroup/system.slice/docker-<id>.scope/cgroup.procs
# 23456` },
    paused: { color: '#e3b341', x: 400, y: 340, label: 'paused', api: 'POST /containers/{id}/pause',
      code: `// docker pause <id>
// 内部: 向 cgroup 的 freezer 发送 FROZEN 信号
// (或 kill -SIGSTOP 整个进程组)

// cgroup v1 freezer (旧方式):
echo FROZEN > /sys/fs/cgroup/freezer/docker/<id>/freezer.state

// cgroup v2 (新方式):
echo 1 > /sys/fs/cgroup/system.slice/docker-<id>.scope/cgroup.freeze

// 效果: 进程仍存在内存中, 但 CPU 调度器不再调度它
// 内存中数据完整保留, 无文件 IO

// docker unpause:
echo 0 > /sys/fs/cgroup/system.slice/docker-<id>.scope/cgroup.freeze` },
    stopped: { color: '#ff7b72', x: 230, y: 340, label: 'stopped', api: 'POST /containers/{id}/stop',
      code: `// docker stop <id> (优雅停止)
// 1. 向容器 PID 1 发送 SIGTERM
kill -SIGTERM 23456

// 2. 等待 grace period (默认 10s)
// 3. 若仍运行, 发送 SIGKILL
kill -SIGKILL 23456

// 4. runc 等待 containerd-shim 收集退出码
// 5. overlay upperdir 保留 (docker start 可重新启动)
// 6. 网络 veth pair 删除

// docker kill --signal=SIGKILL <id>  跳过 SIGTERM
// docker stop -t 30 <id>  设置 30s 超时

// 查看退出码
docker inspect <id> | jq '.[0].State.ExitCode'  # → 0 / 137 (SIGKILL) / 143 (SIGTERM)` },
    removed: { color: '#d2a8ff', x: 60, y: 340, label: 'removed', api: 'DELETE /containers/{id}',
      code: `// docker rm <id>
// 容器必须先 stop (除非 -f)

// 内部清理:
// 1. 删除 overlay merged 挂载
umount /var/lib/docker/overlay2/<id>/merged

// 2. 删除 overlay 目录 (upperdir 中容器写入的数据全部丢失!)
rm -rf /var/lib/docker/overlay2/<id>/

// 3. 删除 container 配置目录
rm -rf /var/lib/docker/containers/<id>/

// 4. 删除 iptables 规则 (port mapping)
iptables -t nat -D DOCKER ...

// 5. 删除网络资源

// docker run = docker create + docker start (+ 可选 docker rm --rm)
// docker run --rm nginx  → 退出后自动 rm` },
  }

  const transitions = [
    { from: 'none',    to: 'created', x1: 145, y1: 200, x2: 230, y2: 130 },
    { from: 'created', to: 'running', x1: 330, y1: 130, x2: 400, y2: 210 },
    { from: 'running', to: 'paused',  x1: 420, y1: 260, x2: 420, y2: 330 },
    { from: 'paused',  to: 'running', x1: 400, y1: 330, x2: 400, y2: 270 },
    { from: 'running', to: 'stopped', x1: 380, y1: 250, x2: 320, y2: 350 },
    { from: 'stopped', to: 'running', x1: 260, y1: 330, x2: 370, y2: 250 },
    { from: 'stopped', to: 'removed', x1: 200, y1: 360, x2: 145, y2: 360 },
    { from: 'created', to: 'removed', x1: 240, y1: 160, x2: 120, y2: 330 },
  ]

  const sel = states[cur]

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: '0 0 480px', overflowY: 'auto' }}>
        <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 8, paddingLeft: 4 }}>
          点击状态查看底层实现
        </div>
        <svg width="480" height="480" style={{ display: 'block' }}>
          <defs>
            <marker id="arr2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#4d8fff"/>
            </marker>
          </defs>
          <rect width="480" height="480" fill="#0d1117" rx="8"/>

          {transitions.map((tr, i) => (
            <line key={i} x1={tr.x1} y1={tr.y1} x2={tr.x2} y2={tr.y2}
              stroke="#30363d" strokeWidth="1.5" markerEnd="url(#arr2)"
              strokeDasharray={['paused→running','stopped→running'].includes(`${tr.from}→${tr.to}`) ? '4,3' : 'none'}/>
          ))}

          {Object.entries(states).map(([id, st]) => (
            <g key={id} style={{ cursor: 'pointer' }} onClick={() => setCur(id)}>
              <ellipse cx={st.x + 55} cy={st.y} rx={58} ry={28}
                fill={cur === id ? st.color + '30' : '#161b22'}
                stroke={cur === id ? st.color : st.color + '70'}
                strokeWidth={cur === id ? 2 : 1}/>
              <text x={st.x + 55} y={st.y + 5} textAnchor="middle"
                fill={st.color} fontSize="13" fontWeight="700">{st.label}</text>
            </g>
          ))}

          {/* labels on transitions */}
          <text x="196" y="150" fill="#8b949e" fontSize="9" textAnchor="middle">create</text>
          <text x="375" y="190" fill="#8b949e" fontSize="9" textAnchor="middle">start</text>
          <text x="440" y="295" fill="#8b949e" fontSize="9" textAnchor="middle">pause</text>
          <text x="395" y="300" fill="#8b949e" fontSize="9" textAnchor="middle">unpause</text>
          <text x="355" y="315" fill="#8b949e" fontSize="9" textAnchor="middle">stop</text>
          <text x="285" y="285" fill="#8b949e" fontSize="9" textAnchor="middle">start</text>
          <text x="168" y="380" fill="#8b949e" fontSize="9" textAnchor="middle">rm</text>
        </svg>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 4px' }}>
        <div style={{ ...CARD, borderColor: sel.color }}>
          <div style={H2}>{sel.label}</div>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#8b949e' }}>{sel.api}</div>
        </div>
        <div style={CODE}>{sel.code}</div>
      </div>
    </div>
  )
}

// ─── Main DockerView ───────────────────────────────────────────────────────────
// ── Docker Compose Tab ──────────────────────────────────────────────────────

const COMPOSE_EXAMPLES = [
  {
    title: 'Web + DB + Redis',
    desc: '三服务：Nginx 前端、FastAPI 后端、PostgreSQL 数据库、Redis 缓存',
    yaml: `version: "3.9"

services:
  # ── Nginx 反向代理 ──────────────────────────────
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - api
    networks:
      - frontend

  # ── FastAPI 后端 ────────────────────────────────
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://app:secret@db:5432/appdb
      REDIS_URL:    redis://redis:6379/0
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - frontend
      - backend
    restart: unless-stopped

  # ── PostgreSQL ──────────────────────────────────
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER:     app
      POSTGRES_PASSWORD: secret
      POSTGRES_DB:       appdb
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d appdb"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend

  # ── Redis ───────────────────────────────────────
  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redisdata:/data
    networks:
      - backend

volumes:
  pgdata:
  redisdata:

networks:
  frontend:
  backend:`,
  },
  {
    title: 'Dev 开发环境',
    desc: '热重载开发模式：挂载源码、自动重启',
    yaml: `version: "3.9"

services:
  app:
    build:
      context: .
      target: dev          # 多阶段构建的 dev stage
    volumes:
      - .:/app             # 挂载源码实现热重载
      - /app/node_modules  # 匿名卷隔离 node_modules
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
    command: npm run dev
    stdin_open: true
    tty: true

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: devdb
    ports:
      - "5432:5432"        # 暴露给本地 IDE 连接`,
  },
  {
    title: 'Monitoring Stack',
    desc: 'Prometheus + Grafana + Node Exporter 监控栈',
    yaml: `version: "3.9"

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - promdata:/prometheus
    command:
      - --config.file=/etc/prometheus/prometheus.yml
      - --storage.tsdb.retention.time=30d
    ports:
      - "9090:9090"
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
      GF_USERS_ALLOW_SIGN_UP:     "false"
    volumes:
      - grafanadata:/var/lib/grafana
      - ./dashboards:/etc/grafana/provisioning/dashboards:ro
    ports:
      - "3000:3000"
    depends_on:
      - prometheus
    networks:
      - monitoring

  node_exporter:
    image: prom/node-exporter:latest
    pid: host
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - --path.procfs=/host/proc
      - --path.sysfs=/host/sys
      - --collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc)($|/)
    networks:
      - monitoring

volumes:
  promdata:
  grafanadata:

networks:
  monitoring:`,
  },
]

const COMPOSE_CMDS = [
  { cmd: 'docker compose up -d',           desc: '后台启动所有服务（detach 模式）' },
  { cmd: 'docker compose up --build',      desc: '重新构建镜像后启动' },
  { cmd: 'docker compose down',            desc: '停止并删除容器、网络（保留 volumes）' },
  { cmd: 'docker compose down -v',         desc: '同上，并删除命名 volumes' },
  { cmd: 'docker compose logs -f api',     desc: '跟踪 api 服务的日志流' },
  { cmd: 'docker compose exec db psql -U app appdb', desc: '进入 db 容器执行 psql' },
  { cmd: 'docker compose ps',              desc: '列出所有服务及其状态' },
  { cmd: 'docker compose restart api',     desc: '重启单个服务' },
  { cmd: 'docker compose scale api=3',     desc: '水平扩展 api 服务到 3 个实例' },
  { cmd: 'docker compose config',          desc: '校验并输出合并后的配置' },
]

function ComposeTab() {
  const [selEx, setSelEx] = useState(0)
  const ex = COMPOSE_EXAMPLES[selEx]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'auto' }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#e6edf3', marginBottom: 4 }}>🐙 Docker Compose</div>
        <div style={{ fontSize: 12, color: '#8b949e' }}>声明式多容器编排 — 开发、测试、小规模部署的首选工具</div>
      </div>

      {/* Example selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {COMPOSE_EXAMPLES.map((e, i) => (
          <button key={i} onClick={() => setSelEx(i)} style={{
            padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12,
            background: selEx === i ? '#238636' : 'var(--bg-elevated,#21262d)',
            color: selEx === i ? '#fff' : '#8b949e', fontWeight: selEx === i ? 700 : 400,
          }}>{e.title}</button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: '#8b949e', marginTop: -8 }}>{ex.desc}</div>

      {/* YAML viewer */}
      <div style={{ background: '#0d1117', borderRadius: 8, border: '1px solid #21262d', overflow: 'hidden', flex: 1 }}>
        <div style={{ padding: '6px 14px', background: '#161b22', borderBottom: '1px solid #21262d',
          fontSize: 11, color: '#8b949e', fontFamily: 'monospace' }}>docker-compose.yml</div>
        <pre style={{ margin: 0, padding: '14px 16px', fontSize: 12, lineHeight: 1.6, overflow: 'auto',
          color: '#e6edf3', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", maxHeight: 340 }}>
          {ex.yaml}
        </pre>
      </div>

      {/* Common commands */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e6edf3', marginBottom: 8 }}>常用命令</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {COMPOSE_CMDS.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '7px 12px', borderRadius: 6,
              background: '#161b22', border: '1px solid #21262d', alignItems: 'flex-start' }}>
              <code style={{ color: '#56d364', fontSize: 11, fontFamily: 'monospace', flexShrink: 0, minWidth: 0 }}>{c.cmd}</code>
              <span style={{ color: '#8b949e', fontSize: 11, flexShrink: 0 }}>—</span>
              <span style={{ color: '#c9d1d9', fontSize: 11 }}>{c.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Networking diagram */}
      <div style={{ background: '#161b22', borderRadius: 8, border: '1px solid #21262d', padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e6edf3', marginBottom: 10 }}>网络隔离原理</div>
        <div style={{ fontSize: 12, color: '#8b949e', lineHeight: 1.8 }}>
          每个 <code style={{ color: '#56d364' }}>networks:</code> 条目 → 独立的 Linux bridge（<code style={{ color: '#56d364' }}>docker network create</code>）<br />
          同一网络内容器互相以 <strong style={{ color: '#79c0ff' }}>service name</strong> 为主机名解析（内置 DNS）<br />
          跨网络流量被 iptables <code style={{ color: '#ff7b72' }}>FORWARD</code> 链过滤隔离<br />
          <code style={{ color: '#56d364' }}>ports:</code> 将宿主机端口通过 DNAT 映射到容器
        </div>
      </div>
    </div>
  )
}

const TABS = [
  { id: 'arch',       label: '🏗 架构全景',     comp: ArchTab },
  { id: 'layers',     label: '📦 镜像层/OverlayFS', comp: LayersTab },
  { id: 'runtime',    label: '🚀 容器运行时',   comp: RuntimeTab },
  { id: 'dockerfile', label: '📋 Dockerfile',  comp: DockerfileTab },
  { id: 'lifecycle',  label: '♻ 生命周期',     comp: LifecycleTab },
  { id: 'compose',    label: '🐙 Compose',     comp: ComposeTab },
]

export default function DockerView() {
  const [tab, setTab] = useState('arch')
  const active = TABS.find(t => t.id === tab)!
  const Comp = active.comp
  const isMobile = useMobile()

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100%', background: 'var(--bg,#0d1117)', overflow: 'hidden' }}>
      {/* Sidebar / Tab bar */}
      <div style={{
        width: isMobile ? '100%' : 180, flexShrink: 0,
        borderRight: isMobile ? 'none' : '1px solid var(--border,#21262d)',
        borderBottom: isMobile ? '1px solid var(--border,#21262d)' : 'none',
        padding: isMobile ? '6px 8px' : '12px 8px',
        overflowX: isMobile ? 'auto' : undefined,
        overflowY: isMobile ? 'hidden' : 'auto',
        maxHeight: isMobile ? 48 : undefined,
        display: isMobile ? 'flex' : 'block',
        gap: isMobile ? 4 : undefined,
        background: 'var(--bg-secondary,#161b22)',
        scrollbarWidth: 'none',
      }}>
        {!isMobile && <div style={{ fontSize: 13, fontWeight: 700, color: '#e6edf3', marginBottom: 12, padding: '0 6px' }}>
          🐳 Docker 原理
        </div>}
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              display: 'block', flexShrink: 0,
              width: isMobile ? 'auto' : '100%',
              textAlign: 'left',
              padding: isMobile ? '5px 10px' : '8px 10px',
              borderRadius: isMobile ? 6 : 6, marginBottom: isMobile ? 0 : 4,
              border: 'none', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap',
              background: tab === t.id ? 'var(--accent-muted,#1f6feb33)' : 'transparent',
              color: tab === t.id ? '#4d8fff' : 'var(--text-secondary,#8b949e)',
              fontWeight: tab === t.id ? 700 : 400,
              borderBottom: isMobile ? (tab === t.id ? '2px solid #4d8fff' : '2px solid transparent') : 'none',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '12px 16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Comp />
      </div>
    </div>
  )
}
