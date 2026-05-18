import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CmdEntry { cmd: string; desc: string; example: string }
interface IpcEntry  { name: string; icon: string; desc: string; pros: string; cons: string; code: string }
interface StructField { name: string; type: string; desc: string }

// ─── Linux Commands ───────────────────────────────────────────────────────────

const CMD_GROUPS: { label: string; icon: string; cmds: CmdEntry[] }[] = [
  {
    label: 'Process', icon: '⚙️',
    cmds: [
      { cmd: 'ps aux',          desc: 'List all running processes (BSD style)',           example: 'ps aux | grep nginx' },
      { cmd: 'top / htop',      desc: 'Live process monitor with CPU/mem stats',          example: 'htop -u root' },
      { cmd: 'pgrep / pkill',   desc: 'Find / kill processes by name pattern',            example: 'pkill -9 zombie' },
      { cmd: 'kill -SIGNAL PID',desc: 'Send signal to process (9=SIGKILL, 15=SIGTERM)',  example: 'kill -15 1234' },
      { cmd: 'strace',          desc: 'Trace system calls made by a process',             example: 'strace -p 1234' },
      { cmd: 'lsof',            desc: 'List open files held by processes',               example: 'lsof -p 1234' },
      { cmd: 'pstree',          desc: 'Show process tree (parent → child)',               example: 'pstree -p 1' },
      { cmd: 'nice / renice',   desc: 'Set / change process scheduling priority',        example: 'nice -n 10 ./heavy' },
      { cmd: 'nohup &',         desc: 'Run process immune to hangup, in background',     example: 'nohup ./server &' },
      { cmd: 'wait',            desc: 'Wait for background child processes to finish',   example: 'wait $!' },
    ],
  },
  {
    label: 'File System', icon: '📁',
    cmds: [
      { cmd: 'ls -lah',        desc: 'List files with size, permissions, human-readable', example: 'ls -lah /proc/1/' },
      { cmd: 'find',           desc: 'Search files by name, type, size, time',           example: 'find / -name "*.conf" -type f' },
      { cmd: 'grep -r',        desc: 'Recursive text search in files',                   example: 'grep -r "task_struct" /usr/include/' },
      { cmd: 'chmod / chown',  desc: 'Change file permissions / ownership',              example: 'chmod 755 script.sh' },
      { cmd: 'df -h',          desc: 'Show disk usage per filesystem',                   example: 'df -h /dev/sda1' },
      { cmd: 'du -sh',         desc: 'Summarize directory disk usage',                   example: 'du -sh /var/log/*' },
      { cmd: 'mount / umount', desc: 'Attach / detach filesystems',                      example: 'mount /dev/sdb1 /mnt' },
      { cmd: 'ln -s',          desc: 'Create symbolic (soft) link',                      example: 'ln -s /usr/bin/python3 python' },
      { cmd: 'inode (stat)',   desc: 'Show inode metadata: size, links, times',          example: 'stat /etc/passwd' },
      { cmd: 'dd',             desc: 'Low-level copy/convert blocks',                    example: 'dd if=/dev/zero of=disk.img bs=1M count=100' },
    ],
  },
  {
    label: 'Network', icon: '🌐',
    cmds: [
      { cmd: 'ip addr / ifconfig', desc: 'Show / configure network interfaces',          example: 'ip addr show eth0' },
      { cmd: 'ss / netstat',       desc: 'Socket statistics, open ports',                example: 'ss -tlnp' },
      { cmd: 'ping / traceroute', desc: 'Test connectivity / trace packet route',         example: 'traceroute 8.8.8.8' },
      { cmd: 'curl / wget',       desc: 'Transfer data from URLs',                       example: 'curl -I https://example.com' },
      { cmd: 'iptables',          desc: 'Kernel firewall rules (netfilter)',              example: 'iptables -L -n -v' },
      { cmd: 'tcpdump',           desc: 'Capture and analyse packets',                   example: 'tcpdump -i eth0 port 80' },
      { cmd: 'nmap',              desc: 'Network port scanning',                         example: 'nmap -sV 192.168.1.0/24' },
      { cmd: 'ssh / scp',         desc: 'Secure shell & file copy over SSH',             example: 'scp file user@host:/path' },
    ],
  },
  {
    label: 'Memory', icon: '🧠',
    cmds: [
      { cmd: 'free -h',          desc: 'Show RAM / swap usage',                          example: 'free -h' },
      { cmd: 'vmstat',           desc: 'Virtual memory, I/O, CPU stats',                 example: 'vmstat 1 5' },
      { cmd: '/proc/meminfo',    desc: 'Kernel memory breakdown (raw)',                  example: 'cat /proc/meminfo' },
      { cmd: '/proc/<pid>/maps', desc: 'Virtual memory map of a process',               example: 'cat /proc/1/maps' },
      { cmd: 'pmap',             desc: 'Process memory map (human-readable)',            example: 'pmap -x 1234' },
      { cmd: 'slabtop',         desc: 'Live slab allocator statistics',                 example: 'slabtop' },
      { cmd: 'valgrind',        desc: 'Memory error detector & profiler',               example: 'valgrind --leak-check=full ./prog' },
    ],
  },
  {
    label: 'Kernel / System', icon: '🔧',
    cmds: [
      { cmd: 'uname -a',    desc: 'Kernel version, arch, hostname',                    example: 'uname -r' },
      { cmd: 'sysctl',      desc: 'Read/write kernel parameters at runtime',           example: 'sysctl vm.swappiness=10' },
      { cmd: 'dmesg',       desc: 'Kernel ring buffer (boot & driver messages)',       example: 'dmesg | tail -20' },
      { cmd: 'modprobe',    desc: 'Load / remove kernel modules',                     example: 'modprobe ext4' },
      { cmd: 'lsmod',       desc: 'List loaded kernel modules',                       example: 'lsmod | grep kvm' },
      { cmd: 'perf',        desc: 'Linux performance profiler (CPU events, traces)',   example: 'perf top' },
      { cmd: 'strace',      desc: 'Trace syscalls and signals of a process',          example: 'strace ls -la' },
      { cmd: 'time',        desc: 'Measure real/user/sys time of a command',          example: 'time ./build.sh' },
    ],
  },
]

// ─── IPC Methods ──────────────────────────────────────────────────────────────

const IPC_LIST: IpcEntry[] = [
  {
    name: 'Pipe (|)', icon: '🪣',
    desc: 'Unidirectional byte stream connecting stdout of one process to stdin of another. Created by pipe(2) syscall; exists only while processes are alive.',
    pros: 'Zero setup, shell-native, low overhead', cons: 'Unidirectional, anonymous, related processes only (by default)',
    code: `/* pipe(2) — parent writes, child reads */
#include <unistd.h>
#include <stdio.h>

int main() {
    int fd[2];
    pipe(fd);            /* fd[0]=read  fd[1]=write */

    if (fork() == 0) {   /* child */
        close(fd[1]);
        char buf[64];
        read(fd[0], buf, sizeof(buf));
        printf("child got: %s\\n", buf);
    } else {             /* parent */
        close(fd[0]);
        write(fd[1], "hello", 6);
    }
}`,
  },
  {
    name: 'Named Pipe (FIFO)', icon: '🔄',
    desc: 'Pipe with a filesystem name. Allows unrelated processes to communicate. Created with mkfifo(3). Persists in the file system.',
    pros: 'Unrelated processes, visible in fs, POSIX', cons: 'Still unidirectional, blocking without O_NONBLOCK',
    code: `/* Producer */
int fd = open("/tmp/myfifo", O_WRONLY);
write(fd, "ping", 5);
close(fd);

/* Consumer (separate process) */
mkfifo("/tmp/myfifo", 0666);        /* create once */
int fd = open("/tmp/myfifo", O_RDONLY);
char buf[64];
read(fd, buf, sizeof(buf));
printf("got: %s\\n", buf);
close(fd);`,
  },
  {
    name: 'Signal', icon: '🚨',
    desc: 'Asynchronous notification sent to a process. ~30 standard signals (SIGKILL, SIGTERM, SIGSEGV …). Handler runs in the receiving process context.',
    pros: 'Instant async notification, built into every UNIX process', cons: 'Carries almost no data, race conditions with signal handlers',
    code: `#include <signal.h>
#include <stdio.h>
#include <unistd.h>

void handler(int sig) {
    printf("caught signal %d\\n", sig);
}

int main() {
    signal(SIGUSR1, handler);
    kill(getpid(), SIGUSR1); /* send to self */
    pause();                 /* wait for signal */
    return 0;
}`,
  },
  {
    name: 'Shared Memory', icon: '🤝',
    desc: 'Multiple processes map the same physical memory pages. Fastest IPC — no kernel copy. Needs explicit synchronization (mutex/semaphore).',
    pros: 'Fastest possible (zero copy), arbitrary data structures', cons: 'Needs external sync, hard to debug, POSIX (shm_open) or SysV API',
    code: `/* Writer */
int fd = shm_open("/myshm", O_CREAT|O_RDWR, 0666);
ftruncate(fd, 4096);
void* ptr = mmap(NULL, 4096,
    PROT_READ|PROT_WRITE, MAP_SHARED, fd, 0);
sprintf((char*)ptr, "shared data");

/* Reader (separate process) */
int fd = shm_open("/myshm", O_RDONLY, 0);
void* ptr = mmap(NULL, 4096,
    PROT_READ, MAP_SHARED, fd, 0);
printf("%s\\n", (char*)ptr);
shm_unlink("/myshm");`,
  },
  {
    name: 'Message Queue', icon: '📨',
    desc: 'Kernel-managed queue of typed messages. Processes can send/receive with priority. POSIX mq_open/mq_send or SysV msgget/msgsnd.',
    pros: 'Structured messages, priority ordering, decoupled sender/receiver', cons: 'Kernel limits on queue size, slower than shared memory',
    code: `/* Sender */
mqd_t mq = mq_open("/myqueue",
    O_WRONLY | O_CREAT, 0666, NULL);
mq_send(mq, "hello", 6, 0 /* priority */);
mq_close(mq);

/* Receiver */
struct mq_attr attr = { .mq_maxmsg=10, .mq_msgsize=256 };
mqd_t mq = mq_open("/myqueue",
    O_RDONLY | O_CREAT, 0666, &attr);
char buf[256];
mq_receive(mq, buf, sizeof(buf), NULL);
printf("got: %s\\n", buf);
mq_close(mq);
mq_unlink("/myqueue");`,
  },
  {
    name: 'Socket', icon: '🔌',
    desc: 'Universal IPC and network communication. Unix domain sockets for local IPC (fast, file-like path). TCP/UDP sockets for network communication.',
    pros: 'Works across machines, bidirectional, stream or datagram', cons: 'More setup, syscall overhead for local IPC vs shared memory',
    code: `/* Server (Unix domain socket) */
int srv = socket(AF_UNIX, SOCK_STREAM, 0);
struct sockaddr_un addr = { .sun_family = AF_UNIX };
strcpy(addr.sun_path, "/tmp/sock");
bind(srv, (struct sockaddr*)&addr, sizeof(addr));
listen(srv, 5);
int conn = accept(srv, NULL, NULL);
write(conn, "hi", 3);

/* Client */
int s = socket(AF_UNIX, SOCK_STREAM, 0);
connect(s, (struct sockaddr*)&addr, sizeof(addr));
char buf[16];
read(s, buf, sizeof(buf));
printf("%s\\n", buf);`,
  },
  {
    name: 'Semaphore', icon: '🚦',
    desc: 'Counter for synchronizing concurrent access to shared resources. sem_wait() decrements (blocks if 0); sem_post() increments. Used with shared memory.',
    pros: 'Lightweight sync primitive, POSIX standard', cons: 'Not a data channel — synchronization only, starvation risk',
    code: `#include <semaphore.h>
#include <pthread.h>

sem_t sem;
int counter = 0;

void* worker(void* _) {
    sem_wait(&sem);    /* P (acquire) */
    counter++;         /* critical section */
    sem_post(&sem);    /* V (release) */
    return NULL;
}

int main() {
    sem_init(&sem, 0, 1); /* binary semaphore */
    pthread_t t1, t2;
    pthread_create(&t1, NULL, worker, NULL);
    pthread_create(&t2, NULL, worker, NULL);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);
    sem_destroy(&sem);
    return 0; /* counter == 2 */
}`,
  },
]

// ─── task_struct fields ───────────────────────────────────────────────────────

const TASK_GROUPS: { label: string; color: string; fields: StructField[] }[] = [
  {
    label: 'Identity', color: '#58a6ff',
    fields: [
      { name: 'pid',            type: 'pid_t',                 desc: 'Process ID — unique per-process number' },
      { name: 'tgid',           type: 'pid_t',                 desc: 'Thread group ID — same as main thread PID for threads' },
      { name: 'comm',           type: 'char[16]',              desc: 'Short executable name (visible in ps, top)' },
      { name: 'parent',         type: 'struct task_struct *',  desc: 'Pointer to parent process (forms the process tree)' },
      { name: 'children',       type: 'struct list_head',      desc: 'Doubly-linked list of child processes' },
      { name: 'sibling',        type: 'struct list_head',      desc: 'Entry in parent\'s children list' },
      { name: 'tasks',          type: 'struct list_head',      desc: 'Entry in global process list (all task_structs form a circle)' },
    ],
  },
  {
    label: 'State & Scheduling', color: '#3fb950',
    fields: [
      { name: 'state',          type: 'volatile long',          desc: 'TASK_RUNNING | TASK_INTERRUPTIBLE | TASK_UNINTERRUPTIBLE | __TASK_STOPPED …' },
      { name: 'prio',           type: 'int',                   desc: 'Dynamic priority (can be boosted by kernel)' },
      { name: 'static_prio',    type: 'int',                   desc: 'Nice-value based static priority (100–139 for normal tasks)' },
      { name: 'rt_priority',    type: 'unsigned int',          desc: 'Real-time priority (1–99); 0 for normal tasks' },
      { name: 'sched_class',    type: 'const struct sched_class *', desc: 'Pointer to scheduling policy class (CFS / RT / Deadline …)' },
      { name: 'se',             type: 'struct sched_entity',   desc: 'CFS scheduler entity — embeds vruntime (virtual runtime)' },
      { name: 'policy',         type: 'unsigned int',          desc: 'SCHED_NORMAL | SCHED_FIFO | SCHED_RR | SCHED_DEADLINE' },
      { name: 'cpus_ptr',       type: 'cpumask_t *',           desc: 'CPU affinity mask — which CPUs this task may run on' },
    ],
  },
  {
    label: 'Memory', color: '#d2a8ff',
    fields: [
      { name: 'mm',             type: 'struct mm_struct *',    desc: 'Virtual memory space descriptor (NULL for kernel threads)' },
      { name: 'active_mm',      type: 'struct mm_struct *',    desc: 'Active mm — borrowed from last user-space process by kernel threads' },
      { name: 'stack',          type: 'void *',                desc: 'Pointer to the kernel stack (8 KB or 16 KB per task)' },
      { name: 'thread_info',    type: 'struct thread_info',    desc: 'Arch-specific thread info (lives at bottom of kernel stack)' },
    ],
  },
  {
    label: 'Files & I/O', color: '#ffa657',
    fields: [
      { name: 'fs',             type: 'struct fs_struct *',    desc: 'Root dir, current working dir, umask' },
      { name: 'files',          type: 'struct files_struct *', desc: 'Open file descriptor table (fd → struct file *)' },
    ],
  },
  {
    label: 'Signals', color: '#f85149',
    fields: [
      { name: 'signal',         type: 'struct signal_struct *', desc: 'Shared signal state for the whole thread group' },
      { name: 'sighand',        type: 'struct sighand_struct *',desc: 'Signal handlers (sa_handler, sa_flags per signal)' },
      { name: 'pending',        type: 'struct sigpending',      desc: 'Per-thread pending signal queue' },
      { name: 'blocked',        type: 'sigset_t',               desc: 'Blocked (masked) signals bitmask' },
    ],
  },
  {
    label: 'Security & Credentials', color: '#e3b341',
    fields: [
      { name: 'cred',           type: 'const struct cred *',   desc: 'Effective UID/GID, capabilities — determines what process may do' },
      { name: 'real_cred',      type: 'const struct cred *',   desc: 'Real credentials (before setuid/setgid)' },
    ],
  },
  {
    label: 'Time & Stats', color: '#79c0ff',
    fields: [
      { name: 'utime',          type: 'u64',                   desc: 'CPU time spent in user mode (nanoseconds)' },
      { name: 'stime',          type: 'u64',                   desc: 'CPU time spent in kernel mode (nanoseconds)' },
      { name: 'start_time',     type: 'u64',                   desc: 'Monotonic clock time when the process started' },
      { name: 'nvcsw / nivcsw', type: 'unsigned long',         desc: 'Voluntary / involuntary context switch counts' },
    ],
  },
]

const MM_FIELDS: StructField[] = [
  { name: 'mmap',       type: 'struct vm_area_struct *', desc: 'Head of the sorted VMA list (code, data, heap, stack, mmap regions)' },
  { name: 'mm_rb',      type: 'struct rb_root',          desc: 'Red-black tree of VMAs — O(log n) lookup by address' },
  { name: 'pgd',        type: 'pgd_t *',                 desc: 'Page Global Directory — root of the 4-level page table' },
  { name: 'start_code', type: 'unsigned long',           desc: 'Start address of text (code) segment' },
  { name: 'end_code',   type: 'unsigned long',           desc: 'End address of text segment' },
  { name: 'start_data', type: 'unsigned long',           desc: 'Start of initialized data segment (.data section)' },
  { name: 'start_brk',  type: 'unsigned long',           desc: 'Start of heap; end_brk grows upward with brk()/sbrk()' },
  { name: 'start_stack',type: 'unsigned long',           desc: 'Start of main thread stack (grows downward)' },
  { name: 'arg_start',  type: 'unsigned long',           desc: 'Start of command-line arguments (argv)' },
  { name: 'env_start',  type: 'unsigned long',           desc: 'Start of environment variables' },
  { name: 'total_vm',   type: 'unsigned long',           desc: 'Total virtual memory mapped (pages)' },
  { name: 'rss',        type: 'atomic_long_t',           desc: 'Resident Set Size — pages actually in physical RAM' },
]

// ─── Subsection components ─────────────────────────────────────────────────────

function CommandsTab() {
  const [activeGroup, setActiveGroup] = useState(0)
  const [search, setSearch] = useState('')
  const group = CMD_GROUPS[activeGroup]
  const filtered = search
    ? CMD_GROUPS.flatMap(g => g.cmds).filter(c => c.cmd.toLowerCase().includes(search.toLowerCase()) || c.desc.toLowerCase().includes(search.toLowerCase()))
    : group.cmds

  return (
    <div style={{ display: 'flex', gap: 0, height: '100%' }}>
      {/* Group sidebar */}
      <div style={{ width: 130, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg-secondary)', padding: '8px 0' }}>
        {CMD_GROUPS.map((g, i) => (
          <button key={g.label} onClick={() => { setActiveGroup(i); setSearch('') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '9px 14px', border: 'none',
              borderLeft: i === activeGroup && !search ? '3px solid var(--accent-blue)' : '3px solid transparent',
              background: i === activeGroup && !search ? 'var(--bg-elevated)' : 'transparent',
              color: i === activeGroup && !search ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: 12, fontWeight: i === activeGroup && !search ? 600 : 400,
            }}>
            <span>{g.icon}</span><span>{g.label}</span>
          </button>
        ))}
      </div>
      {/* Commands */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <input
          placeholder="Search commands…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '8px 12px', marginBottom: 16,
            background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(c => (
            <div key={c.cmd} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <code style={{ background: 'var(--bg-elevated)', borderRadius: 5, padding: '2px 8px', fontSize: 13, color: 'var(--accent-blue)', fontWeight: 700, whiteSpace: 'nowrap' }}>{c.cmd}</code>
                <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{c.desc}</span>
              </div>
              <div style={{ marginTop: 6, fontFamily: 'monospace', fontSize: 12, color: 'var(--accent-green)', background: 'var(--bg-tertiary)', borderRadius: 5, padding: '4px 10px' }}>$ {c.example}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function IpcTab() {
  const [sel, setSel] = useState(0)
  const ipc = IPC_LIST[sel]
  return (
    <div style={{ display: 'flex', gap: 0, height: '100%' }}>
      {/* Sidebar */}
      <div style={{ width: 160, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg-secondary)', padding: '8px 0' }}>
        {IPC_LIST.map((ipc, i) => (
          <button key={ipc.name} onClick={() => setSel(i)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '9px 14px', border: 'none',
              borderLeft: i === sel ? '3px solid var(--accent-purple)' : '3px solid transparent',
              background: i === sel ? 'var(--bg-elevated)' : 'transparent',
              color: i === sel ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: 12, fontWeight: i === sel ? 600 : 400,
            }}>
            <span style={{ fontSize: 16 }}>{ipc.icon}</span><span>{ipc.name}</span>
          </button>
        ))}
      </div>
      {/* Detail */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        <h3 style={{ fontSize: 18, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 26 }}>{ipc.icon}</span>{ipc.name}
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>{ipc.desc}</p>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, background: 'rgba(63,185,80,0.1)', border: '1px solid rgba(63,185,80,0.3)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-green)', marginBottom: 4 }}>✓ PROS</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ipc.pros}</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-red)', marginBottom: 4 }}>✗ CONS</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ipc.cons}</div>
          </div>
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6, background: 'var(--bg-tertiary)', borderRadius: 8, padding: 16, overflowX: 'auto' }}>
          <pre style={{ margin: 0, color: 'var(--text-primary)' }}>{ipc.code}</pre>
        </div>
      </div>
    </div>
  )
}

function FieldRow({ f, color }: { f: StructField; color: string }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '190px 220px 1fr',
      gap: 12, padding: '8px 12px',
      borderBottom: '1px solid var(--border)',
      alignItems: 'start',
    }}>
      <code style={{ color, fontSize: 12, fontWeight: 700 }}>{f.name}</code>
      <code style={{ color: 'var(--accent-orange)', fontSize: 11 }}>{f.type}</code>
      <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{f.desc}</span>
    </div>
  )
}

function ProcessTab() {
  const [openGroup, setOpenGroup] = useState<string | null>('Identity')

  return (
    <div style={{ overflow: 'auto', padding: 20 }}>
      {/* Intro */}
      <div style={{ marginBottom: 20, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>task_struct — the kernel's "process identity card"</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          Every process and thread in Linux is represented by a <code style={{ color: 'var(--accent-blue)' }}>task_struct</code>.
          It's ~16 KB of interconnected fields. All tasks are linked through the <code style={{ color: 'var(--accent-green)' }}>tasks</code> doubly-linked
          list. Parent/child relationships form a <strong>process tree</strong> (what <code>pstree</code> shows).
          The idle process (<code>pid=0</code>) is the root; <code>init/systemd</code> (<code>pid=1</code>) is its first child.
        </p>
      </div>

      {/* Process tree diagram */}
      <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: 16, marginBottom: 20, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.8, color: 'var(--text-secondary)', overflowX: 'auto' }}>
        <div style={{ color: 'var(--accent-blue)', fontWeight: 700, marginBottom: 4 }}>Process tree (kernel view):</div>
        <pre style={{ margin: 0 }}>{`idle (pid=0)  ← swapper, runs when no other task is runnable
└── init / systemd (pid=1)  ← ancestor of all user processes
      ├── sshd (pid=xxx)
      │     └── bash (pid=yyy)
      │           └── your-program (pid=zzz)
      │                 ├── thread-1  ← same mm_struct, different task_struct
      │                 └── thread-2
      ├── cron (pid=...)
      └── ...`}</pre>
      </div>

      {/* Struct groups */}
      {TASK_GROUPS.map(g => (
        <div key={g.label} style={{ marginBottom: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <button
            onClick={() => setOpenGroup(openGroup === g.label ? null : g.label)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', border: 'none', background: 'transparent',
              cursor: 'pointer', color: 'var(--text-primary)', textAlign: 'left',
            }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: g.color, flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: 13 }}>{g.label}</span>
            <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 12 }}>{openGroup === g.label ? '▲' : '▼'} {g.fields.length} fields</span>
          </button>
          {openGroup === g.label && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '190px 220px 1fr', gap: 12, padding: '6px 12px', background: 'var(--bg-tertiary)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', borderTop: '1px solid var(--border)' }}>
                <span>FIELD</span><span>TYPE</span><span>DESCRIPTION</span>
              </div>
              {g.fields.map(f => <FieldRow key={f.name} f={f} color={g.color} />)}
            </div>
          )}
        </div>
      ))}

      {/* mm_struct */}
      <div style={{ marginTop: 20, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
          <h4 style={{ margin: 0, fontSize: 14 }}>mm_struct — per-process virtual memory space</h4>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 12 }}>
            Linked from <code style={{ color: 'var(--accent-blue)' }}>task_struct.mm</code>.
            Describes the entire virtual address space. VMAs are stored in both a linked list (traversal) and a red-black tree (fast lookup by address).
          </p>
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)', padding: '8px 12px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)' }}>
          Address space layout (typical x86-64):
          <pre style={{ margin: '6px 0 0', lineHeight: 1.7, color: 'var(--text-secondary)' }}>{`0xFFFF_FFFF_FFFF_FFFF  ← kernel space (not accessible from user)
────────────────────────
0x7FFF_FFFF_FFFF       ← stack (grows ↓)
                        ← mmap / shared libs / anonymous maps
              heap →    ← brk (grows ↑)
              BSS →     ← uninitialised globals
              data →    ← initialised globals
              text →    ← executable code
0x0000_0000_0000_0000`}</pre>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '180px 220px 1fr', gap: 12, padding: '6px 12px', background: 'var(--bg-tertiary)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
          <span>FIELD</span><span>TYPE</span><span>DESCRIPTION</span>
        </div>
        {MM_FIELDS.map(f => <FieldRow key={f.name} f={f} color="#d2a8ff" />)}
      </div>

      {/* Comparison table */}
      <div style={{ marginTop: 20, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>
          Kernel process tree vs DOM tree — analogy
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', fontSize: 11 }}>
              {['Dimension','DOM (browser)','Kernel (Linux)','Similarity'].map(h => (
                <th key={h} style={{ padding: '8px 14px', textAlign: 'left', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Core unit','Node / Element','task_struct + mm_struct','🟢 High'],
              ['Hierarchy','Tree (parent/child)','Process tree + global list + red-black trees','🟡 Similar'],
              ['Dynamics','JS add/remove nodes','fork() / exit(), constantly changing','🟢 More dynamic'],
              ['Relationships','attributes, events','Pointers to files, signal, cred…','🟢 Richer'],
              ['Scale','Thousands of nodes','10 000 – 100 000 task_structs','🔵 Much larger'],
              ['Lookup speed','Browser optimised','Red-black tree, radix tree, hash tables','🔵 Kernel-grade'],
            ].map(row => (
              <tr key={row[0]} style={{ borderBottom: '1px solid var(--border)' }}>
                {row.map((cell, i) => (
                  <td key={i} style={{ padding: '8px 14px', color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: i === 0 ? 600 : 400 }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main Linux View ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'commands',  label: '📋 Commands',    comp: CommandsTab },
  { id: 'process',   label: '⚙️ task_struct', comp: ProcessTab },
  { id: 'ipc',       label: '🔌 IPC',         comp: IpcTab },
]

export default function LinuxView() {
  const [tab, setTab] = useState('commands')
  const Current = TABS.find(t => t.id === tab)?.comp ?? CommandsTab

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '12px 22px', border: 'none', background: 'transparent',
              borderBottom: tab === t.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
              color: tab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 700 : 400,
            }}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Current />
      </div>
    </div>
  )
}
