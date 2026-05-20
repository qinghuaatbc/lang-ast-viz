import { useState, useEffect } from 'react'
import { useMobile } from '../hooks/useMobile'
import { useLang } from '../i18n/lang'

interface CodeEx { name: string; name_en?: string; desc?: string; desc_en?: string; code: string }
interface SyscallEx {
  name: string; icon: string; chapter: string; vol: 1|2; desc: string
  syscalls?: { name: string; sig: string }[]
  code?: string; notes?: string; demoCode?: string
  examples?: CodeEx[]   // multiple runnable examples
}

async function runCode(code: string): Promise<{ output: string[]; stderr?: string; error?: string }> {
  const res = await fetch('/api/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, language: 'c' }),
  })
  return res.json()
}

// ─── Chapter list ─────────────────────────────────────────────────────────────

const CHAPTERS: { id: string; label: string; icon: string; color: string; vol: 1|2 }[] = [
  { id: 'errno',         label: 'Ch.3   Error Handling',      icon: '⚠️',  color: '#f85149', vol: 1 },
  { id: 'fileio',        label: 'Ch.4   File I/O',            icon: '📄',  color: '#4d8fff', vol: 1 },
  { id: 'dupfcntl',      label: 'Ch.5   dup & fcntl',         icon: '🔗',  color: '#58a6ff', vol: 1 },
  { id: 'proc_env',      label: 'Ch.6   Process Basics',      icon: '🌱',  color: '#3fb950', vol: 1 },
  { id: 'malloc',        label: 'Ch.7   Memory Allocation',   icon: '🧱',  color: '#a371f7', vol: 1 },
  { id: 'users',         label: 'Ch.8   Users & Groups',      icon: '👤',  color: '#f0883e', vol: 1 },
  { id: 'creds',         label: 'Ch.9   Credentials',         icon: '🔑',  color: '#e3b341', vol: 1 },
  { id: 'time',          label: 'Ch.10  Times & Dates',       icon: '🕐',  color: '#79c0ff', vol: 1 },
  { id: 'sysconf',       label: 'Ch.11  System Limits',       icon: '📏',  color: '#d2a8ff', vol: 1 },
  { id: 'proc_fs',       label: 'Ch.12  /proc Filesystem',    icon: '🗂️',  color: '#ffa657', vol: 1 },
  { id: 'bufio',         label: 'Ch.13  I/O Buffering',       icon: '🔁',  color: '#58a6ff', vol: 1 },
  { id: 'fallocate_adv', label: 'Ch.13+ Adv. File I/O',      icon: '🗜️',  color: '#79c0ff', vol: 1 },
  { id: 'statfs',        label: 'Ch.14  File Systems',        icon: '💾',  color: '#56d364', vol: 1 },
  { id: 'stat',          label: 'Ch.15  File Attributes',     icon: '📋',  color: '#4d8fff', vol: 1 },
  { id: 'xattr',         label: 'Ch.16  Xattr',               icon: '🏷️',  color: '#d2a8ff', vol: 1 },
  { id: 'acl',           label: 'Ch.17  POSIX ACLs',          icon: '🔏',  color: '#e3b341', vol: 1 },
  { id: 'dirs',          label: 'Ch.18  Directories & Links', icon: '📁',  color: '#ffa657', vol: 1 },
  { id: 'inotify',       label: 'Ch.19  inotify',             icon: '👁️',  color: '#56d364', vol: 1 },
  { id: 'signals',       label: 'Ch.20  Signals',             icon: '🚨',  color: '#f85149', vol: 1 },
  { id: 'sighandler',    label: 'Ch.21  Signal Handlers',     icon: '🎯',  color: '#ff7b72', vol: 1 },
  { id: 'sigmask',       label: 'Ch.22  Signal Masking',      icon: '🛡️',  color: '#ffa657', vol: 1 },
  { id: 'signalfd_ch',   label: 'Ch.22+ signalfd',            icon: '📬',  color: '#56d364', vol: 1 },
  { id: 'timerfd',       label: 'Ch.23  Timers',              icon: '⏱️',  color: '#e3b341', vol: 1 },
  { id: 'itimer',        label: 'Ch.23+ Interval Timers',     icon: '⏰',  color: '#ffa657', vol: 1 },
  { id: 'process',       label: 'Ch.24  fork/exec/wait',      icon: '🌿',  color: '#3fb950', vol: 1 },
  { id: 'atexit',        label: 'Ch.25  Proc Termination',    icon: '🚪',  color: '#ff7b72', vol: 1 },
  { id: 'waitchild',     label: 'Ch.26  Child Monitoring',    icon: '🔭',  color: '#79c0ff', vol: 1 },
  { id: 'execve',        label: 'Ch.27  Program Execution',   icon: '🚀',  color: '#ffa657', vol: 1 },
  { id: 'vfork',         label: 'Ch.28  vfork & clone',       icon: '🧬',  color: '#3fb950', vol: 1 },
  { id: 'threads',       label: 'Ch.29  Threads',             icon: '🧵',  color: '#ffa657', vol: 1 },
  { id: 'mutex',         label: 'Ch.30  Thread Sync',         icon: '🔐',  color: '#bc8cff', vol: 1 },
  { id: 'rwlock',        label: 'Ch.31  Thread Safety',       icon: '📖',  color: '#4d8fff', vol: 1 },
  { id: 'thr_cancel',    label: 'Ch.32  Thread Cancel',       icon: '✂️',  color: '#f85149', vol: 1 },
  { id: 'thr_sig',       label: 'Ch.33  Threads & Signals',   icon: '📡',  color: '#e3b341', vol: 1 },
  { id: 'sessions',      label: 'Ch.34  Sessions & Jobs',     icon: '🖥️',  color: '#79c0ff', vol: 1 },
  { id: 'sched',         label: 'Ch.35  Scheduling',          icon: '⚖️',  color: '#a371f7', vol: 1 },
  { id: 'rlimit',        label: 'Ch.36  Resource Limits',     icon: '📊',  color: '#3fb950', vol: 1 },
  { id: 'daemon',        label: 'Ch.37  Daemons',             icon: '👻',  color: '#58a6ff', vol: 2 },
  { id: 'secure',        label: 'Ch.38  Secure Programming',  icon: '🛡️',  color: '#f85149', vol: 2 },
  { id: 'prctl_caps',    label: 'Ch.39  Capabilities',        icon: '🔐',  color: '#f85149', vol: 2 },
  { id: 'utmpx',         label: 'Ch.40  Login Accounting',    icon: '📝',  color: '#3fb950', vol: 2 },
  { id: 'dlopen',        label: 'Ch.41  Shared Libraries',    icon: '📦',  color: '#d2a8ff', vol: 2 },
  { id: 'shlib_ctor',    label: 'Ch.42  Lib Constructor',     icon: '🏗️',  color: '#56d364', vol: 2 },
  { id: 'pipes',         label: 'Ch.44  Pipes & FIFOs',       icon: '🪣',  color: '#3fb950', vol: 2 },
  { id: 'ipckeys',       label: 'Ch.45  IPC Keys',            icon: '🗝️',  color: '#ffa657', vol: 2 },
  { id: 'sysv_msg',      label: 'Ch.46  SysV Msg Queue',      icon: '📨',  color: '#79c0ff', vol: 2 },
  { id: 'sysvsem',       label: 'Ch.47  SysV Semaphores',     icon: '🚦',  color: '#f0883e', vol: 2 },
  { id: 'sysvshm',       label: 'Ch.48  SysV Shared Mem',     icon: '🤝',  color: '#58a6ff', vol: 2 },
  { id: 'mmap',          label: 'Ch.49  Memory Mapping',      icon: '🗺️',  color: '#a371f7', vol: 2 },
  { id: 'memfd',         label: 'Ch.49+ memfd_create',        icon: '💿',  color: '#bc8cff', vol: 2 },
  { id: 'vmops',         label: 'Ch.50  VM Operations',       icon: '🧠',  color: '#bc8cff', vol: 2 },
  { id: 'mremap',        label: 'Ch.50+ mremap',              icon: '🔄',  color: '#79c0ff', vol: 2 },
  { id: 'posixmq',       label: 'Ch.52  POSIX Msg Queue',     icon: '📨',  color: '#ffa657', vol: 2 },
  { id: 'posixsem',      label: 'Ch.53  POSIX Semaphore',     icon: '🚦',  color: '#e3b341', vol: 2 },
  { id: 'posixshm',      label: 'Ch.54  POSIX Shared Mem',    icon: '🤝',  color: '#4d8fff', vol: 2 },
  { id: 'flock',         label: 'Ch.55  File Locking',        icon: '🔒',  color: '#f85149', vol: 2 },
  { id: 'socket',        label: 'Ch.56  Sockets',             icon: '🔌',  color: '#79c0ff', vol: 2 },
  { id: 'unixsock',      label: 'Ch.57  Unix Sockets',        icon: '🔗',  color: '#56d364', vol: 2 },
  { id: 'inetaddr',      label: 'Ch.59  Internet Sockets',    icon: '🌐',  color: '#4d8fff', vol: 2 },
  { id: 'srvdesign',     label: 'Ch.60  Server Design',       icon: '🏛️',  color: '#3fb950', vol: 2 },
  { id: 'advsock',       label: 'Ch.61  Adv. Sockets',        icon: '⚡',  color: '#d2a8ff', vol: 2 },
  { id: 'splice',        label: 'Ch.61+ splice/tee',          icon: '🔀',  color: '#58a6ff', vol: 2 },
  { id: 'termios',       label: 'Ch.62  Terminals',           icon: '🖥️',  color: '#e3b341', vol: 2 },
  { id: 'eventfd',       label: 'Ch.63+ eventfd',             icon: '🔔',  color: '#3fb950', vol: 2 },
  { id: 'select',        label: 'Ch.63  select/poll/epoll',   icon: '⚡',  color: '#39d353', vol: 2 },
  { id: 'setuid',        label: 'Ch.9   setuid/creds',        icon: '🪪',  color: '#e3b341', vol: 1 },
  { id: 'ptrace_demo',   label: 'Ch.41  ptrace',              icon: '🔭',  color: '#74c0fc', vol: 2 },
  { id: 'seccomp',       label: 'Ch.38+ seccomp',             icon: '🔒',  color: '#ff6b6b', vol: 2 },
  { id: 'io_uring',      label: 'Ch.13+ io_uring',            icon: '🌀',  color: '#cc5de8', vol: 1 },
  { id: 'futex',         label: 'Ch.30+ futex',               icon: '⚙️',  color: '#a371f7', vol: 1 },
  { id: 'sendfile',      label: 'Ch.61+ sendfile',            icon: '📤',  color: '#4d8fff', vol: 2 },
  { id: 'namespace',     label: 'Ch.28+ Namespaces',          icon: '📦',  color: '#3fb950', vol: 1 },
  { id: 'prctl',         label: 'Ch.28+ prctl',               icon: '🎛️',  color: '#ffa657', vol: 1 },
  { id: 'sigqueue',      label: 'Ch.22+ sigqueue/RT',         icon: '📬',  color: '#e3b341', vol: 1 },
  { id: 'cgroup',        label: 'Ch.39+ cgroups v2',          icon: '🗂️',  color: '#58a6ff', vol: 2 },
  { id: 'tls_thread',    label: 'Ch.31  Thread-Local Storage',icon: '🧵',  color: '#d2a8ff', vol: 1 },
]

// ─── Examples ─────────────────────────────────────────────────────────────────

const EXAMPLES: Record<string, SyscallEx> = {

  errno: {
    name: 'Error Handling', icon: '⚠️', chapter: 'Ch. 3', vol: 1,
    desc: 'Every syscall that fails sets the global integer errno to an error code. perror(3) and strerror(3) convert it to a human-readable message. errno is never cleared by a successful call — always check return value first.',
    syscalls: [
      { name: 'perror',   sig: 'void perror(const char *msg)' },
      { name: 'strerror', sig: 'char *strerror(int errnum)' },
      { name: 'errno',    sig: 'extern int errno;  /* set by failing syscall */' },
    ],
    code: `/* TLPI §3.4 — errno-based error reporting */
#include <stdio.h>
#include <errno.h>
#include <string.h>
#include <fcntl.h>

void errExit(const char *msg) {
    fprintf(stderr, "%s: %s\\n", msg, strerror(errno));
    exit(EXIT_FAILURE);
}

int main() {
    int fd = open("/nonexistent/path", O_RDONLY);
    if (fd == -1)
        errExit("open");   /* prints: open: No such file or directory */
    return 0;
}`,
    notes: 'errno is thread-local (POSIX mandates this). Always capture errno immediately after a failing call — the next syscall may overwrite it. The value 0 means success, but success does not clear errno.',
    demoCode: `/* Demo: trigger and print several errno values */
#include <stdio.h>
#include <errno.h>
#include <string.h>
#include <fcntl.h>
#include <unistd.h>

int main() {
    struct { const char *path; int flags; } tests[] = {
        { "/no/such/file",  O_RDONLY },
        { "/etc/shadow",    O_WRONLY },
        { "/etc/hostname",  O_RDONLY },
    };
    for (int i = 0; i < 3; i++) {
        errno = 0;
        int fd = open(tests[i].path, tests[i].flags);
        if (fd == -1) {
            printf("open(%s) -> errno %d: %s\\n",
                   tests[i].path, errno, strerror(errno));
        } else {
            char buf[64];
            ssize_t n = read(fd, buf, sizeof(buf)-1);
            if (n > 0) { buf[n] = '\\0'; printf("read: %s", buf); }
            close(fd);
        }
    }
    return 0;
}`,
    examples: [
      { name: 'Custom errExit', desc: '封装 errExit/errMsg 供整个程序使用，模仿 TLPI 书中的 tlpi_hdr.h 风格', desc_en: 'Wrap errExit/errMsg helpers used project-wide, mimicking TLPI\'s tlpi_hdr.h style',
        code: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <stdarg.h>

/* 非致命错误: 打印消息继续 */
void errMsg(const char *fmt, ...) {
    int savedErrno = errno;   /* 保存 errno，防止被 va_* 覆盖 */
    va_list ap;
    va_start(ap, fmt);
    vfprintf(stderr, fmt, ap);
    va_end(ap);
    fprintf(stderr, ": %s\\n", strerror(savedErrno));
}

/* 致命错误: 打印后 exit(1) */
void errExit(const char *fmt, ...) {
    int savedErrno = errno;
    va_list ap;
    va_start(ap, fmt);
    vfprintf(stderr, fmt, ap);
    va_end(ap);
    fprintf(stderr, ": %s\\n", strerror(savedErrno));
    exit(EXIT_FAILURE);
}

int main() {
    errno = ENOENT;  errMsg("open(%s)", "/no/file");
    errno = EACCES;  errMsg("write(%s)", "/etc/shadow");
    errno = EINVAL;  errMsg("ioctl(TIOCGWINSZ)");
    printf("program continues after non-fatal errors\\n");
    /* errExit 会直接退出: */
    /* errno = ENOMEM; errExit("malloc"); */
    return 0;
}` },
      { name: 'errno 全表', name_en: 'errno Table', desc: '打印所有标准 errno 错误码及描述', desc_en: 'Print all standard errno codes and their descriptions',
        code: `#include <stdio.h>
#include <string.h>
#include <errno.h>

int main() {
    /* POSIX 要求的常见错误码 */
    int codes[] = {
        EPERM,ENOENT,ESRCH,EINTR,EIO,ENXIO,E2BIG,ENOEXEC,
        EBADF,ECHILD,EAGAIN,ENOMEM,EACCES,EFAULT,EBUSY,
        EEXIST,EXDEV,ENODEV,ENOTDIR,EISDIR,EINVAL,ENFILE,
        EMFILE,ENOTTY,EFBIG,ENOSPC,ESPIPE,EROFS,EMLINK,
        EPIPE,EDOM,ERANGE,EDEADLK,ENAMETOOLONG,ENOLCK,
        ENOSYS,ENOTEMPTY,ELOOP,EWOULDBLOCK,ENOMSG,
        EPROTO,EOVERFLOW,EILSEQ,EUSERS,ENOTSOCK,
        EDESTADDRREQ,EMSGSIZE,EPROTOTYPE,ENOPROTOOPT,
        ECONNREFUSED,ECONNRESET,ETIMEDOUT,EADDRINUSE,
    };
    int n = sizeof(codes)/sizeof(codes[0]);
    for (int i = 0; i < n; i++) {
        printf("%-4d  %-20s  %s\\n",
               codes[i],
               strerrorname_np(codes[i]),   /* GNU 扩展 */
               strerror(codes[i]));
    }
    return 0;
}` },
    ],
  },

  fileio: {
    name: 'File I/O', icon: '📄', chapter: 'Ch. 4–5', vol: 1,
    desc: 'The four universal I/O syscalls underlie every file operation in Linux. open() allocates a struct file in the kernel and returns the lowest unused file descriptor — an index into files_struct. All I/O is byte-stream; the kernel provides no record structure.',
    syscalls: [
      { name: 'open',  sig: 'int open(const char *path, int flags, mode_t mode)' },
      { name: 'read',  sig: 'ssize_t read(int fd, void *buf, size_t count)' },
      { name: 'write', sig: 'ssize_t write(int fd, const void *buf, size_t count)' },
      { name: 'lseek', sig: 'off_t lseek(int fd, off_t offset, int whence)' },
      { name: 'close', sig: 'int close(int fd)' },
    ],
    code: `/* TLPI §4.1 — file copy */
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#define BUF_SIZE 4096

int main(int argc, char *argv[]) {
    int src = open(argv[1], O_RDONLY);
    int dst = open(argv[2],
                   O_WRONLY | O_CREAT | O_TRUNC,
                   S_IRUSR | S_IWUSR);
    char buf[BUF_SIZE];
    ssize_t n;
    while ((n = read(src, buf, BUF_SIZE)) > 0)
        if (write(dst, buf, n) != n)
            break;
    close(src);
    close(dst);
}`,
    notes: 'After fork(), parent and child share the same open file description — same offset, same flags. O_APPEND makes write+seek atomic. open() with O_CREAT|O_EXCL fails if the file exists (atomic create-or-fail).',
    demoCode: `/* Demo: write, lseek, read back */
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

int main() {
    const char *p = "/tmp/tlpi_io.txt";
    int fd = open(p, O_WRONLY|O_CREAT|O_TRUNC, S_IRUSR|S_IWUSR);
    const char *msg = "TLPI File I/O demo\\n";
    write(fd, msg, strlen(msg));
    close(fd);

    fd = open(p, O_RDONLY);
    char buf[64];
    ssize_t n = read(fd, buf, sizeof(buf)-1); buf[n]=0;
    printf("full read: %s", buf);

    lseek(fd, 5, SEEK_SET);
    n = read(fd, buf, sizeof(buf)-1); buf[n]=0;
    printf("after lseek(5): %s", buf);
    close(fd);
    unlink(p);
    return 0;
}`,
    examples: [
      { name: 'Scatter-Gather I/O', desc: 'readv/writev 一次 syscall 读写多个缓冲区 (Scatter-Gather I/O)', desc_en: 'readv/writev: read/write multiple buffers in one syscall (Scatter-Gather I/O)',
        code: `#include <sys/uio.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

int main() {
    const char *path = "/tmp/tlpi_iov.txt";
    /* writev: 3 个缓冲区合并成一次 syscall */
    char h[] = "Header|";
    char b[] = "Body content|";
    char f[] = "Footer\\n";
    struct iovec iov[3] = {
        { h, strlen(h) },
        { b, strlen(b) },
        { f, strlen(f) },
    };
    int fd = open(path, O_WRONLY|O_CREAT|O_TRUNC, 0644);
    ssize_t total = writev(fd, iov, 3);
    printf("writev wrote %zd bytes in 1 syscall\\n", total);
    close(fd);

    /* readv: 读回分散到不同缓冲区 */
    char r1[8], r2[14], r3[8];
    struct iovec rov[3] = {
        { r1, sizeof(r1)-1 },
        { r2, sizeof(r2)-1 },
        { r3, sizeof(r3)-1 },
    };
    fd = open(path, O_RDONLY);
    readv(fd, rov, 3);
    r1[7]=r2[13]=r3[7]='\\0';
    printf("readv: [%s] [%s] [%s]\\n", r1, r2, r3);
    close(fd);
    unlink(path);
    return 0;
}` },
      { name: 'O_APPEND 原子写', name_en: 'O_APPEND Atomic Write', desc: '多进程并发追加写文件时 O_APPEND 保证原子性，避免数据交错', desc_en: 'O_APPEND guarantees atomic appends under concurrent processes — no interleaving',
        code: `#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>
#include <sys/wait.h>

/* 演示: O_APPEND 下 fork 出的子进程安全并发追加 */
int main() {
    const char *p = "/tmp/tlpi_append.txt";
    /* 以 O_APPEND 打开: 每次 write 自动跳到文件末尾 (原子) */
    int fd = open(p, O_WRONLY|O_CREAT|O_TRUNC|O_APPEND, 0644);

    for (int i = 0; i < 3; i++) {
        pid_t pid = fork();
        if (pid == 0) {
            char line[64];
            for (int j = 0; j < 5; j++) {
                int len = snprintf(line, sizeof(line),
                                   "pid=%d line=%d\\n", (int)getpid(), j);
                write(fd, line, len);   /* O_APPEND: atomic lseek+write */
            }
            _exit(0);
        }
    }
    close(fd);
    while (wait(NULL) > 0) {}

    /* 计行数: 应恰好 15 行 */
    fd = open(p, O_RDONLY);
    char buf[4096]; ssize_t n = read(fd, buf, sizeof(buf)-1); buf[n]=0;
    close(fd); unlink(p);
    int lines = 0;
    for (char *c = buf; *c; c++) if (*c=='\\n') lines++;
    printf("total lines = %d (expected 15)\\n", lines);
    return 0;
}` },
      { name: '/proc/self/fd 查看 fd', name_en: '/proc/self/fd List', desc: '通过 /proc/self/fd 列出进程当前所有打开的文件描述符', desc_en: 'List all open file descriptors of the current process via /proc/self/fd',
        code: `#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>
#include <dirent.h>
#include <string.h>

int main() {
    /* 打开几个文件制造 fd */
    open("/etc/hostname", O_RDONLY);
    open("/etc/os-release", O_RDONLY);

    DIR *d = opendir("/proc/self/fd");
    struct dirent *e;
    printf("%-6s  %s\\n", "fd", "target");
    while ((e = readdir(d)) != NULL) {
        if (e->d_name[0] == '.') continue;
        char link[64], target[256];
        snprintf(link, sizeof(link), "/proc/self/fd/%s", e->d_name);
        ssize_t n = readlink(link, target, sizeof(target)-1);
        if (n > 0) { target[n] = 0; printf("%-6s  %s\\n", e->d_name, target); }
    }
    closedir(d);
    return 0;
}` },
    ],
  },

  proc_env: {
    name: 'Process Basics', icon: '🌱', chapter: 'Ch. 6', vol: 1,
    desc: 'Each process has a unique memory layout: text, data, BSS, heap, stack. environ[] holds the environment variables. /proc/PID/ exposes process details to user space without syscalls.',
    syscalls: [
      { name: 'getenv',   sig: 'char *getenv(const char *name)' },
      { name: 'setenv',   sig: 'int setenv(const char *name, const char *value, int overwrite)' },
      { name: 'environ',  sig: 'extern char **environ;  /* NULL-terminated env list */' },
    ],
    code: `/* TLPI §6.3 — environment variables */
#include <stdio.h>
#include <stdlib.h>

extern char **environ;

int main() {
    /* read */
    printf("PATH = %s\\n", getenv("PATH"));
    printf("HOME = %s\\n", getenv("HOME"));

    /* set */
    setenv("MY_VAR", "hello", 1 /* overwrite */);
    printf("MY_VAR = %s\\n", getenv("MY_VAR"));

    /* iterate all */
    for (char **ep = environ; *ep; ep++)
        printf("  %s\\n", *ep);
    return 0;
}`,
    notes: 'environ is just a NULL-terminated array of "KEY=VALUE" strings in the process address space. putenv() modifies the string in place; setenv() always allocates a new string. Forked children inherit the parent\'s environment.',
    demoCode: `/* Demo: read environ, modify, read /proc/self/cmdline */
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <fcntl.h>

int main(int argc, char *argv[]) {
    printf("PID: %d\\n", getpid());

    /* Show first 4 env vars */
    extern char **environ;
    printf("First env vars:\\n");
    for (int i = 0; i < 4 && environ[i]; i++)
        printf("  %s\\n", environ[i]);

    /* Read our own cmdline from /proc */
    char buf[256];
    int fd = open("/proc/self/cmdline", O_RDONLY);
    ssize_t n = read(fd, buf, sizeof(buf)-1);
    close(fd);
    /* cmdline is NUL-separated */
    for (int i = 0; i < n-1; i++)
        if (buf[i] == '\\0') buf[i] = ' ';
    buf[n] = '\\0';
    printf("cmdline: %s\\n", buf);
    return 0;
}`,
  },

  malloc: {
    name: 'Memory Allocation', icon: '🧱', chapter: 'Ch. 7', vol: 1,
    desc: 'malloc(3) draws memory from the heap via brk()/mmap() syscalls. Small allocations extend the heap with brk(); large ones (≥MMAP_THRESHOLD, default 128KB) use anonymous mmap. The allocator maintains free lists for reuse.',
    syscalls: [
      { name: 'malloc',   sig: 'void *malloc(size_t size)' },
      { name: 'calloc',   sig: 'void *calloc(size_t nmemb, size_t size)' },
      { name: 'realloc',  sig: 'void *realloc(void *ptr, size_t size)' },
      { name: 'free',     sig: 'void free(void *ptr)' },
      { name: 'brk/sbrk',sig: 'int brk(void *addr)  /  void *sbrk(intptr_t incr)' },
    ],
    code: `/* TLPI §7.1 — heap allocation */
#include <stdlib.h>
#include <stdio.h>
#include <string.h>

int main() {
    /* malloc: uninitialized */
    char *buf = malloc(128);
    if (!buf) { perror("malloc"); exit(1); }
    strcpy(buf, "hello heap");
    printf("%s\\n", buf);
    free(buf);

    /* calloc: zeroed */
    int *arr = calloc(8, sizeof(int));
    for (int i = 0; i < 8; i++) arr[i] = i*i;
    for (int i = 0; i < 8; i++) printf("%d ", arr[i]);
    printf("\\n");

    /* realloc: grow */
    arr = realloc(arr, 16 * sizeof(int));
    for (int i = 8; i < 16; i++) arr[i] = i*i;
    free(arr);

    /* track heap position */
    void *brk0 = sbrk(0);
    void *p = malloc(4096);
    void *brk1 = sbrk(0);
    printf("brk moved by: %ld bytes\\n", (char*)brk1-(char*)brk0);
    free(p);
    return 0;
}`,
    notes: 'Never access freed memory or free the same pointer twice (undefined behaviour). Use valgrind --leak-check=full to find leaks. In Linux, free() may not release memory back to the OS immediately — it goes to the allocator\'s free list.',
    demoCode: `/* Demo: malloc, calloc, realloc, sbrk, free */
#include <stdlib.h>
#include <stdio.h>
#include <string.h>

int main() {
    void *brk0 = sbrk(0);
    printf("initial brk: %p\\n", brk0);

    char *s = malloc(64);
    strcpy(s, "malloc'd string");
    printf("%s\\n", s);
    free(s);

    int *arr = calloc(5, sizeof(int));
    for (int i=0;i<5;i++) arr[i]=i*3;
    printf("calloc (zeroed): ");
    for (int i=0;i<5;i++) printf("%d ", arr[i]);
    printf("\\n");

    arr = realloc(arr, 10 * sizeof(int));
    for (int i=5;i<10;i++) arr[i]=i*3;
    printf("realloc (10):   ");
    for (int i=0;i<10;i++) printf("%d ", arr[i]);
    printf("\\n");
    free(arr);

    void *brk1 = sbrk(0);
    printf("brk delta: %ld bytes\\n", (char*)brk1-(char*)brk0);
    return 0;
}`,
    examples: [
      { name: '内存泄漏检测', name_en: 'Memory Leak Detection', desc: '故意泄漏，用 valgrind 思路自己追踪 malloc/free', desc_en: 'Intentional leak — track malloc/free manually using valgrind-style logic', code: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* Simple allocation tracker */
static long alloc_count = 0, free_count = 0;
static size_t alloc_bytes = 0;

void *tracked_malloc(size_t n) {
    void *p = malloc(n);
    if (p) { alloc_count++; alloc_bytes += n; }
    return p;
}
void tracked_free(void *p) {
    if (p) { free_count++; free(p); }
}

int main() {
    char *a = tracked_malloc(64);
    strcpy(a, "allocated buffer 1");

    char *b = tracked_malloc(128);
    strcpy(b, "allocated buffer 2");

    tracked_free(a);
    /* intentional leak: b not freed */

    printf("mallocs: %ld  frees: %ld  bytes allocated: %zu\\n",
           alloc_count, free_count, alloc_bytes);
    printf("LEAK: %ld allocation(s) not freed\\n",
           alloc_count - free_count);
    /* run under valgrind --leak-check=full to verify */
    return 0;
}` },
      { name: 'realloc 动态数组', name_en: 'realloc Dynamic Array', desc: '用 realloc 实现类似 vector 的动态增长', desc_en: 'Dynamic array growth using realloc, similar to std::vector', code: `#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int *data;
    size_t len, cap;
} IntVec;

void vec_push(IntVec *v, int val) {
    if (v->len == v->cap) {
        v->cap = v->cap ? v->cap * 2 : 4;
        v->data = realloc(v->data, v->cap * sizeof(int));
    }
    v->data[v->len++] = val;
}

int main() {
    IntVec v = {0};
    for (int i = 0; i < 20; i++) vec_push(&v, i * i);

    printf("len=%zu cap=%zu\\n", v.len, v.cap);
    printf("data: ");
    for (size_t i = 0; i < v.len; i++) printf("%d ", v.data[i]);
    printf("\\n");
    free(v.data);
    return 0;
}` },
      { name: 'brk/sbrk 堆边界', name_en: 'brk/sbrk Heap Boundary', desc: '直接操控堆顶，观察 program break 变化', desc_en: 'Directly manipulate the heap top with brk/sbrk, observe program break changes', code: `#include <stdio.h>
#include <unistd.h>

int main() {
    void *start = sbrk(0);
    printf("initial brk: %p\\n", start);

    /* Expand heap by 4096 bytes */
    sbrk(4096);
    void *after = sbrk(0);
    printf("after +4096: %p (delta %ld)\\n", after,
           (char*)after - (char*)start);

    /* Shrink heap */
    brk(start);
    void *shrunk = sbrk(0);
    printf("after shrink: %p (delta %ld)\\n", shrunk,
           (char*)shrunk - (char*)start);
    /* Note: large mallocs bypass brk and use mmap instead */
    return 0;
}` },
    ],
  },

  creds: {
    name: 'Process Credentials', icon: '🔑', chapter: 'Ch. 9', vol: 1,
    desc: 'Every process has real UID/GID (who you are) and effective UID/GID (what you can do). setuid executables run with the file owner\'s effective UID. Credentials are stored in task_struct.cred.',
    syscalls: [
      { name: 'getuid/getgid',   sig: 'uid_t getuid(void)  /  gid_t getgid(void)' },
      { name: 'geteuid/getegid', sig: 'uid_t geteuid(void) /  gid_t getegid(void)' },
      { name: 'setuid/setgid',   sig: 'int setuid(uid_t uid) / int setgid(gid_t gid)' },
      { name: 'getgroups',       sig: 'int getgroups(int size, gid_t list[])' },
    ],
    code: `/* TLPI §9.1 — real and effective credentials */
#include <unistd.h>
#include <stdio.h>
#include <sys/types.h>

int main() {
    printf("PID   = %d\\n",   getpid());
    printf("PPID  = %d\\n",   getppid());
    printf("UID   = %d  (real)\\n",      getuid());
    printf("EUID  = %d  (effective)\\n", geteuid());
    printf("GID   = %d  (real)\\n",      getgid());
    printf("EGID  = %d  (effective)\\n", getegid());

    gid_t groups[64];
    int n = getgroups(64, groups);
    printf("supplementary groups (%d): ", n);
    for (int i = 0; i < n; i++) printf("%d ", groups[i]);
    printf("\\n");
    return 0;
}`,
    notes: 'A process with EUID=0 (root) bypasses most permission checks. setuid(0) succeeds only if EUID is already 0 or UID is 0. Capabilities (Ch.39) provide fine-grained root-like privileges without giving full root.',
    demoCode: `/* Demo: print all credentials */
#include <unistd.h>
#include <stdio.h>
#include <pwd.h>
#include <grp.h>

int main() {
    uid_t uid  = getuid(),  euid = geteuid();
    gid_t gid  = getgid(),  egid = getegid();

    struct passwd *pw = getpwuid(uid);
    printf("User:   %s (uid=%d, euid=%d)\\n",
           pw ? pw->pw_name : "?", uid, euid);

    struct group *gr = getgrgid(gid);
    printf("Group:  %s (gid=%d, egid=%d)\\n",
           gr ? gr->gr_name : "?", gid, egid);

    gid_t supp[64];
    int n = getgroups(64, supp);
    printf("Supplementary groups (%d):\\n", n);
    for (int i = 0; i < n && i < 8; i++) {
        struct group *g = getgrgid(supp[i]);
        printf("  %d (%s)\\n", supp[i], g ? g->gr_name : "?");
    }
    return 0;
}`,
  },

  time: {
    name: 'Times & Dates', icon: '🕐', chapter: 'Ch. 10', vol: 1,
    desc: 'Linux tracks time as seconds since the epoch (1970-01-01 00:00:00 UTC). CLOCK_REALTIME is wall-clock time (can jump on NTP). CLOCK_MONOTONIC is monotonically increasing — safe for measuring intervals.',
    syscalls: [
      { name: 'time',           sig: 'time_t time(time_t *tloc)' },
      { name: 'clock_gettime',  sig: 'int clock_gettime(clockid_t clk, struct timespec *tp)' },
      { name: 'gmtime/localtime',sig: 'struct tm *gmtime(const time_t *timep)' },
      { name: 'strftime',       sig: 'size_t strftime(char *s, size_t max, const char *fmt, const struct tm *tm)' },
      { name: 'clock_nanosleep',sig: 'int clock_nanosleep(clockid_t clk, int flags, const struct timespec *req, struct timespec *rem)' },
    ],
    code: `/* TLPI §10.1 — clocks and time formatting */
#include <time.h>
#include <stdio.h>

int main() {
    time_t t = time(NULL);
    printf("epoch seconds: %ld\\n", (long)t);
    printf("ctime:         %s", ctime(&t));

    struct tm *gmt = gmtime(&t);
    char buf[64];
    strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", gmt);
    printf("ISO 8601:      %s\\n", buf);

    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    printf("monotonic:     %ld.%09ld s\\n", ts.tv_sec, ts.tv_nsec);

    clock_gettime(CLOCK_PROCESS_CPUTIME_ID, &ts);
    printf("cpu time used: %ld ns\\n", ts.tv_nsec);
    return 0;
}`,
    notes: 'CLOCK_PROCESS_CPUTIME_ID measures CPU time consumed by the process (not wall time). struct timespec has nanosecond resolution; struct timeval (older APIs) has microsecond resolution. Use CLOCK_MONOTONIC for all interval measurements.',
    demoCode: `/* Demo: multiple clocks, nanosleep, measure elapsed */
#include <time.h>
#include <stdio.h>

int main() {
    struct timespec t0, t1;

    time_t wall = time(NULL);
    printf("wall clock: %s", ctime(&wall));

    char buf[64];
    struct tm *lt = localtime(&wall);
    strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S %Z", lt);
    printf("local time: %s\\n", buf);

    clock_gettime(CLOCK_MONOTONIC, &t0);

    /* sleep 100ms */
    struct timespec req = { 0, 100000000 };
    clock_nanosleep(CLOCK_MONOTONIC, 0, &req, NULL);

    clock_gettime(CLOCK_MONOTONIC, &t1);
    long elapsed_us = (t1.tv_sec - t0.tv_sec) * 1000000
                    + (t1.tv_nsec - t0.tv_nsec) / 1000;
    printf("100ms sleep actually took: %ld µs\\n", elapsed_us);
    return 0;
}`,
  },

  proc_fs: {
    name: '/proc Filesystem', icon: '🗂️', chapter: 'Ch. 12', vol: 1,
    desc: '/proc is a virtual filesystem — files contain kernel data structures exposed as text. /proc/self refers to the current process. Reading these files never touches disk; the kernel generates content on demand.',
    syscalls: [
      { name: 'open/read', sig: 'read /proc files like regular files' },
      { name: 'sysinfo',   sig: 'int sysinfo(struct sysinfo *info)' },
      { name: 'uname',     sig: 'int uname(struct utsname *buf)' },
    ],
    code: `/* TLPI §12.1 — reading /proc/self/status */
#include <stdio.h>
#include <string.h>

int main() {
    FILE *f = fopen("/proc/self/status", "r");
    char line[256];
    while (fgets(line, sizeof(line), f)) {
        if (!strncmp(line, "Name:",     5) ||
            !strncmp(line, "Pid:",      4) ||
            !strncmp(line, "PPid:",     5) ||
            !strncmp(line, "VmRSS:",    6) ||
            !strncmp(line, "VmPeak:",   7) ||
            !strncmp(line, "Threads:",  8))
            printf("%s", line);
    }
    fclose(f);
    return 0;
}`,
    notes: '/proc/PID/maps shows the full virtual memory layout — text, data, heap, stack, shared libs. /proc/PID/fd/ lists all open file descriptors as symlinks. Many tools (ps, top, lsof) are just /proc readers.',
    demoCode: `/* Demo: /proc self-inspection + sysinfo + uname */
#include <stdio.h>
#include <string.h>
#include <sys/sysinfo.h>
#include <sys/utsname.h>
#include <unistd.h>
#include <fcntl.h>

int main() {
    /* kernel version */
    struct utsname u;
    uname(&u);
    printf("kernel: %s %s\\n", u.sysname, u.release);

    /* system memory */
    struct sysinfo si;
    sysinfo(&si);
    printf("RAM total: %lu MB\\n", si.totalram * si.mem_unit / 1024 / 1024);
    printf("RAM free:  %lu MB\\n", si.freeram  * si.mem_unit / 1024 / 1024);
    printf("uptime:    %lu s\\n",  si.uptime);

    /* our own /proc/self/status */
    printf("\\n/proc/self/status (selected):\\n");
    FILE *f = fopen("/proc/self/status", "r");
    char line[256];
    while (fgets(line, sizeof(line), f))
        if (!strncmp(line,"VmRSS:",6)||!strncmp(line,"Threads:",8)||
            !strncmp(line,"Pid:",4))
            printf("  %s", line);
    fclose(f);
    return 0;
}`,
  },

  bufio: {
    name: 'I/O Buffering', icon: '🔁', chapter: 'Ch. 13', vol: 1,
    desc: 'Data flows through two buffers: the stdio buffer (in the C library, in user space) and the kernel page cache. write() puts data in the page cache; fsync() flushes the page cache to disk. fflush() flushes only the stdio buffer to the page cache.',
    syscalls: [
      { name: 'fflush',     sig: 'int fflush(FILE *stream)' },
      { name: 'fsync',      sig: 'int fsync(int fd)' },
      { name: 'fdatasync',  sig: 'int fdatasync(int fd)  /* no metadata update */' },
      { name: 'sync',       sig: 'void sync(void)  /* flush all dirty buffers */' },
      { name: 'setvbuf',    sig: 'int setvbuf(FILE *stream, char *buf, int mode, size_t size)' },
    ],
    code: `/* TLPI §13.1 — stdio vs kernel buffering */
#include <stdio.h>
#include <unistd.h>

int main() {
    FILE *f = fopen("/tmp/tlpi_buf.txt", "w");

    fprintf(f, "line 1\\n");   /* in stdio buffer, not in kernel yet */
    fflush(f);                /* stdio → page cache */
    fsync(fileno(f));         /* page cache → disk */

    /* set line buffering */
    setvbuf(f, NULL, _IOLBF, 0);
    fprintf(f, "line 2\\n");  /* auto-flushed at '\\n' */

    /* set unbuffered */
    setvbuf(f, NULL, _IONBF, 0);
    fprintf(f, "line 3\\n");  /* immediately in page cache */

    fclose(f);
    return 0;
}`,
    notes: 'stdout is line-buffered when connected to a terminal; fully-buffered to a file. stderr is always unbuffered. O_DIRECT bypasses the page cache entirely (DMA straight from device to user buffer) — used by databases.',
    demoCode: `/* Demo: compare buffered vs unbuffered, measure fsync cost */
#include <stdio.h>
#include <unistd.h>
#include <fcntl.h>
#include <time.h>
#include <string.h>

long ns_now() {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return ts.tv_sec * 1000000000L + ts.tv_nsec;
}

int main() {
    const char *path = "/tmp/tlpi_bufio.txt";

    /* fully buffered write */
    FILE *f = fopen(path, "w");
    setvbuf(f, NULL, _IOFBF, 4096);
    long t0 = ns_now();
    for (int i = 0; i < 1000; i++)
        fprintf(f, "line %04d\\n", i);
    fflush(f);
    long t1 = ns_now();
    printf("1000 buffered fprintf: %ld µs\\n", (t1-t0)/1000);
    fclose(f);

    /* unbuffered (each write → syscall) */
    int fd = open(path, O_WRONLY|O_TRUNC);
    setvbuf(f, NULL, _IONBF, 0);
    t0 = ns_now();
    for (int i = 0; i < 100; i++) {
        char buf[16]; int n = snprintf(buf,sizeof(buf),"line %04d\\n",i);
        write(fd, buf, n);
    }
    t1 = ns_now();
    printf("100  direct write:    %ld µs\\n", (t1-t0)/1000);

    fsync(fd);
    printf("fsync'd to disk\\n");
    close(fd);
    unlink(path);
    return 0;
}`,
  },

  stat: {
    name: 'File Attributes', icon: '📋', chapter: 'Ch. 15', vol: 1,
    desc: 'stat(2) returns the inode metadata: permissions, ownership, size, link count, and three timestamps (atime/mtime/ctime). chmod/chown modify these attributes; they are stored in the inode, not the directory entry.',
    syscalls: [
      { name: 'stat/lstat/fstat', sig: 'int stat(const char *path, struct stat *buf)' },
      { name: 'chmod/fchmod',     sig: 'int chmod(const char *path, mode_t mode)' },
      { name: 'chown/lchown',     sig: 'int chown(const char *path, uid_t owner, gid_t group)' },
      { name: 'utimensat',        sig: 'int utimensat(int dirfd, const char *path, const struct timespec times[2], int flags)' },
      { name: 'umask',            sig: 'mode_t umask(mode_t mask)' },
    ],
    code: `/* TLPI §15.1 — stat() inode metadata */
#include <sys/stat.h>
#include <stdio.h>
#include <time.h>

int main(int argc, char *argv[]) {
    const char *path = argc > 1 ? argv[1] : "/etc/hostname";
    struct stat st;
    if (stat(path, &st) == -1) { perror("stat"); return 1; }

    printf("File:   %s\\n", path);
    printf("Inode:  %lu\\n", (unsigned long)st.st_ino);
    printf("Type:   %s\\n",
           S_ISREG(st.st_mode) ? "regular" :
           S_ISDIR(st.st_mode) ? "directory" :
           S_ISLNK(st.st_mode) ? "symlink" : "other");
    printf("Mode:   %04o\\n",  st.st_mode & 07777);
    printf("UID:    %d\\n",     st.st_uid);
    printf("Size:   %lld\\n",   (long long)st.st_size);
    printf("Links:  %lu\\n",   (unsigned long)st.st_nlink);
    printf("Mtime:  %s", ctime(&st.st_mtime));
    return 0;
}`,
    notes: 'lstat() does not follow symlinks — it returns info about the symlink itself. ctime in stat is "inode change time" (not creation time); Linux has no portable creation-time field. Use S_ISREG()/S_ISDIR() macros to test the file type bits.',
    demoCode: `/* Demo: stat /etc/hostname and /proc/self/exe */
#include <sys/stat.h>
#include <stdio.h>
#include <time.h>

void show(const char *path) {
    struct stat st;
    if (lstat(path, &st) == -1) { perror(path); return; }
    printf("\\n--- %s ---\\n", path);
    printf("  inode %lu  size %lld  nlinks %lu\\n",
           (unsigned long)st.st_ino,
           (long long)st.st_size,
           (unsigned long)st.st_nlink);
    printf("  mode %04o (%s)\\n", st.st_mode & 07777,
           S_ISREG(st.st_mode)  ? "file" :
           S_ISDIR(st.st_mode)  ? "dir"  :
           S_ISLNK(st.st_mode)  ? "link" : "other");
    char tbuf[32];
    strftime(tbuf, sizeof(tbuf), "%Y-%m-%d %H:%M:%S", localtime(&st.st_mtime));
    printf("  mtime %s\\n", tbuf);
}

int main() {
    show("/etc/hostname");
    show("/proc/self/exe");
    show("/tmp");
    return 0;
}`,
  },

  dirs: {
    name: 'Directories & Links', icon: '📁', chapter: 'Ch. 18', vol: 1,
    desc: 'Directories map filenames to inode numbers. Hard links are multiple directory entries pointing to the same inode. Symbolic (soft) links are files containing a path string — they can cross filesystems and point to non-existent targets.',
    syscalls: [
      { name: 'opendir/readdir', sig: 'DIR *opendir(const char *path)  /  struct dirent *readdir(DIR *dp)' },
      { name: 'mkdir/rmdir',     sig: 'int mkdir(const char *path, mode_t mode)' },
      { name: 'symlink',         sig: 'int symlink(const char *target, const char *linkpath)' },
      { name: 'link',            sig: 'int link(const char *oldpath, const char *newpath)  /* hard link */' },
      { name: 'unlink/remove',   sig: 'int unlink(const char *path)' },
      { name: 'readlink',        sig: 'ssize_t readlink(const char *path, char *buf, size_t bufsize)' },
    ],
    code: `/* TLPI §18.8 — list directory, create links */
#include <dirent.h>
#include <sys/stat.h>
#include <stdio.h>
#include <string.h>

int main(int argc, char *argv[]) {
    const char *dir = argc > 1 ? argv[1] : ".";
    DIR *dp = opendir(dir);
    if (!dp) { perror("opendir"); return 1; }

    struct dirent *ent;
    while ((ent = readdir(dp))) {
        if (ent->d_name[0] == '.') continue;
        printf("%-32s  ino=%lu\\n",
               ent->d_name, (unsigned long)ent->d_ino);
    }
    closedir(dp);
    return 0;
}`,
    notes: 'readdir() is not thread-safe — use readdir_r() or a per-directory mutex. The d_type field may be DT_UNKNOWN on some filesystems (e.g., older ext2). Use stat() to reliably determine the file type. unlink() decrements the link count; the inode is freed when count reaches 0 AND no process has it open.',
    demoCode: `/* Demo: opendir /etc, create symlink, readlink, hard link */
#include <dirent.h>
#include <stdio.h>
#include <unistd.h>
#include <sys/stat.h>
#include <string.h>

int main() {
    /* list /etc, first 8 entries */
    DIR *dp = opendir("/etc");
    printf("/etc entries (first 8):\\n");
    struct dirent *e; int n=0;
    while ((e=readdir(dp)) && n<8) {
        if (e->d_name[0]=='.') continue;
        printf("  [%lu] %s\\n", (unsigned long)e->d_ino, e->d_name);
        n++;
    }
    closedir(dp);

    /* symlink demo */
    unlink("/tmp/tlpi_link");
    symlink("/etc/hostname", "/tmp/tlpi_link");
    char buf[128];
    ssize_t r = readlink("/tmp/tlpi_link", buf, sizeof(buf)-1);
    buf[r] = '\\0';
    printf("\\nsymlink /tmp/tlpi_link -> %s\\n", buf);

    /* stat vs lstat */
    struct stat st;
    stat("/tmp/tlpi_link",  &st); printf("stat:  ino=%lu\\n", (unsigned long)st.st_ino);
    lstat("/tmp/tlpi_link", &st); printf("lstat: ino=%lu (link itself)\\n", (unsigned long)st.st_ino);

    unlink("/tmp/tlpi_link");
    return 0;
}`,
  },

  signals: {
    name: 'Signals', icon: '🚨', chapter: 'Ch. 20–22', vol: 1,
    desc: 'Reliable signal handling via sigaction(2). SA_RESTART auto-restarts interrupted syscalls. SA_SIGINFO delivers sender PID and extra context. Signals are delivered asynchronously — the handler runs between any two instructions.',
    syscalls: [
      { name: 'sigaction',   sig: 'int sigaction(int sig, const struct sigaction *act, struct sigaction *oldact)' },
      { name: 'sigprocmask', sig: 'int sigprocmask(int how, const sigset_t *set, sigset_t *oldset)' },
      { name: 'sigsuspend',  sig: 'int sigsuspend(const sigset_t *mask)' },
      { name: 'kill',        sig: 'int kill(pid_t pid, int sig)' },
      { name: 'sigwaitinfo', sig: 'int sigwaitinfo(const sigset_t *set, siginfo_t *info)' },
    ],
    code: `/* TLPI §20.13 — sigaction with SA_SIGINFO */
#include <signal.h>
#include <stdio.h>
#include <unistd.h>

static void handler(int sig, siginfo_t *si, void *ctx) {
    /* si->si_pid = sender PID */
    printf("signal %d from pid %d\\n", sig, (int)si->si_pid);
}

int main() {
    struct sigaction sa = {
        .sa_sigaction = handler,
        .sa_flags     = SA_SIGINFO | SA_RESTART,
    };
    sigemptyset(&sa.sa_mask);
    sigaction(SIGUSR1, &sa, NULL);
    printf("PID %d — send: kill -USR1 %d\\n", getpid(), getpid());
    pause();
    return 0;
}`,
    notes: 'Only async-signal-safe functions (signal-safety(7)) may be called in a handler. Standard signals do NOT queue if already pending — use SIGRTMIN+n for reliable queuing. Signals live in task_struct.pending (per-thread) and signal->shared_pending.',
    demoCode: `/* Demo: SIGALRM via kill to self, signal mask */
#include <signal.h>
#include <stdio.h>
#include <unistd.h>

static volatile int caught = 0;

static void handler(int sig, siginfo_t *si, void *ctx) {
    caught++;
    write(STDOUT_FILENO, "handler: signal caught!\\n", 24);
}

int main() {
    struct sigaction sa = {
        .sa_sigaction = handler,
        .sa_flags     = SA_SIGINFO | SA_RESTART,
    };
    sigemptyset(&sa.sa_mask);
    sigaction(SIGALRM, &sa, NULL);
    sigaction(SIGUSR1, &sa, NULL);

    /* block SIGUSR1 temporarily */
    sigset_t block, old;
    sigemptyset(&block); sigaddset(&block, SIGUSR1);
    sigprocmask(SIG_BLOCK, &block, &old);

    kill(getpid(), SIGUSR1);   /* will be pending until unblocked */
    printf("SIGUSR1 blocked and pending...\\n");

    sigprocmask(SIG_SETMASK, &old, NULL);  /* unblock — handler fires now */
    printf("unblocked, caught=%d\\n", caught);

    kill(getpid(), SIGALRM);
    printf("final caught=%d\\n", caught);
    return 0;
}`,
    examples: [
      { name: 'signalfd + epoll', desc: '用 signalfd 将信号转为 fd 事件，配合 epoll 做事件循环', desc_en: 'Convert signals to fd events with signalfd, use with epoll for an event loop',
        code: `#include <sys/signalfd.h>
#include <sys/epoll.h>
#include <signal.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

int main() {
    /* 1. 屏蔽目标信号 (必须先屏蔽再 signalfd) */
    sigset_t mask;
    sigemptyset(&mask);
    sigaddset(&mask, SIGUSR1);
    sigaddset(&mask, SIGTERM);
    sigprocmask(SIG_BLOCK, &mask, NULL);

    /* 2. 创建 signalfd */
    int sfd = signalfd(-1, &mask, SFD_CLOEXEC | SFD_NONBLOCK);

    /* 3. 加入 epoll */
    int efd = epoll_create1(EPOLL_CLOEXEC);
    struct epoll_event ev = { .events = EPOLLIN, .data.fd = sfd };
    epoll_ctl(efd, EPOLL_CTL_ADD, sfd, &ev);

    /* 4. 发送信号给自己 */
    kill(getpid(), SIGUSR1);
    kill(getpid(), SIGUSR1);
    kill(getpid(), SIGTERM);

    /* 5. 事件循环 */
    struct epoll_event events[4];
    int done = 0;
    while (!done) {
        int n = epoll_wait(efd, events, 4, 500);
        for (int i = 0; i < n; i++) {
            struct signalfd_siginfo ssi;
            read(sfd, &ssi, sizeof(ssi));
            printf("signal %u from pid %u\\n",
                   ssi.ssi_signo, ssi.ssi_pid);
            if (ssi.ssi_signo == SIGTERM) done = 1;
        }
        if (n == 0) break;  /* 超时退出 */
    }
    close(sfd); close(efd);
    return 0;
}` },
      { name: '实时信号排队', name_en: 'Real-Time Signal Queue', desc: '普通信号不排队，SIGRTMIN+n 可靠排队——用 sigqueue 发送', desc_en: 'Regular signals do not queue; SIGRTMIN+n real-time signals reliably queue — send with sigqueue',
        code: `#include <signal.h>
#include <stdio.h>
#include <unistd.h>
#include <string.h>

#define SIG_RT SIGRTMIN+1

static void handler(int sig, siginfo_t *si, void *ctx) {
    printf("RT signal: val=%d from pid=%d\\n",
           si->si_value.sival_int, (int)si->si_pid);
}

int main() {
    struct sigaction sa = {
        .sa_sigaction = handler,
        .sa_flags     = SA_SIGINFO,
    };
    sigemptyset(&sa.sa_mask);
    sigaction(SIG_RT, &sa, NULL);

    /* 屏蔽信号，批量发送 3 次 */
    sigset_t block;
    sigemptyset(&block); sigaddset(&block, SIG_RT);
    sigprocmask(SIG_BLOCK, &block, NULL);

    for (int i = 1; i <= 3; i++) {
        union sigval sv = { .sival_int = i * 100 };
        sigqueue(getpid(), SIG_RT, sv);   /* 实时信号排队 */
    }
    printf("sent 3 RT signals (blocked, pending)\\n");

    /* 解除屏蔽: 3 次全部按序触发 */
    sigprocmask(SIG_UNBLOCK, &block, NULL);
    printf("done\\n");
    return 0;
}` },
    ],
  },

  timerfd: {
    name: 'Timers', icon: '⏱️', chapter: 'Ch. 23', vol: 1,
    desc: 'timerfd_create() returns a file descriptor that becomes readable when a timer fires — integrates directly with epoll. interval timers (setitimer/POSIX timer_create) deliver via SIGALRM or a real-time signal.',
    syscalls: [
      { name: 'timerfd_create',  sig: 'int timerfd_create(int clockid, int flags)' },
      { name: 'timerfd_settime', sig: 'int timerfd_settime(int fd, int flags, const struct itimerspec *new, struct itimerspec *old)' },
      { name: 'timer_create',    sig: 'int timer_create(clockid_t clk, struct sigevent *sev, timer_t *tid)' },
      { name: 'setitimer',       sig: 'int setitimer(int which, const struct itimerval *new, struct itimerval *old)' },
    ],
    code: `/* TLPI §23.6 — timerfd periodic ticks */
#include <sys/timerfd.h>
#include <unistd.h>
#include <stdio.h>
#include <stdint.h>

int main() {
    int tfd = timerfd_create(CLOCK_MONOTONIC, TFD_CLOEXEC);
    struct itimerspec ts = {
        .it_interval = { .tv_sec = 1 },
        .it_value    = { .tv_sec = 1 },
    };
    timerfd_settime(tfd, 0, &ts, NULL);
    for (int i = 0; i < 5; i++) {
        uint64_t exp;
        read(tfd, &exp, 8);
        printf("tick %d\\n", i+1);
    }
    close(tfd);
}`,
    notes: 'read() from a timerfd returns the accumulated expiration count — missed ticks do not block further ticks. Combine timerfd with epoll to build a multi-timer event loop with no signals. CLOCK_MONOTONIC never goes backward — always prefer it for intervals.',
    demoCode: `/* Demo: 4 ticks at 200ms, show actual timing */
#include <sys/timerfd.h>
#include <unistd.h>
#include <stdio.h>
#include <stdint.h>
#include <time.h>

int main() {
    int tfd = timerfd_create(CLOCK_MONOTONIC, 0);
    struct itimerspec ts = {
        .it_interval = { 0, 200000000 },
        .it_value    = { 0, 200000000 },
    };
    timerfd_settime(tfd, 0, &ts, NULL);

    struct timespec t0; clock_gettime(CLOCK_MONOTONIC, &t0);
    for (int i = 0; i < 4; i++) {
        uint64_t exp; read(tfd, &exp, 8);
        struct timespec now; clock_gettime(CLOCK_MONOTONIC, &now);
        long ms = (now.tv_sec-t0.tv_sec)*1000+(now.tv_nsec-t0.tv_nsec)/1000000;
        printf("tick %d at +%ldms (exp=%llu)\\n", i+1, ms, (unsigned long long)exp);
    }
    close(tfd);
}`,
  },

  process: {
    name: 'fork / exec / wait', icon: '🌿', chapter: 'Ch. 24–26', vol: 1,
    desc: 'fork() duplicates the process using copy-on-write. execve() replaces the process image. waitpid() reaps zombie children. Together they form the UNIX "spawn" model used by every shell.',
    syscalls: [
      { name: 'fork',    sig: 'pid_t fork(void)' },
      { name: 'execve', sig: 'int execve(const char *path, char *const argv[], char *const envp[])' },
      { name: 'waitpid',sig: 'pid_t waitpid(pid_t pid, int *wstatus, int options)' },
      { name: 'getpid',  sig: 'pid_t getpid(void)' },
      { name: '_exit',   sig: 'void _exit(int status)' },
    ],
    code: `/* TLPI §24.1 — fork + exec + wait */
#include <unistd.h>
#include <sys/wait.h>
#include <stdio.h>

int main() {
    pid_t cpid = fork();
    if (cpid == 0) {           /* child */
        char *args[] = { "ls", "-lh", NULL };
        execvp("ls", args);
        _exit(127);
    }
    int status;
    waitpid(cpid, &status, 0);
    if (WIFEXITED(status))
        printf("child exited: %d\\n", WEXITSTATUS(status));
}`,
    notes: 'fork() is copy-on-write — child shares parent pages until a write triggers a page copy. A zombie has exited but its task_struct is kept until the parent calls wait(). SIGCHLD is sent to the parent on child state change. vfork() is an optimized fork() that borrows the parent\'s address space.',
    demoCode: `/* Demo: fork tree, exec, waitpid with status macros */
#include <unistd.h>
#include <sys/wait.h>
#include <stdio.h>

int main() {
    printf("parent PID=%d\\n", getpid());

    pid_t c1 = fork();
    if (c1 == 0) {
        printf("child1 PID=%d\\n", getpid());
        char *a[] = {"echo","hello from execvp",NULL};
        execvp("echo", a);
        _exit(127);
    }

    pid_t c2 = fork();
    if (c2 == 0) {
        printf("child2 PID=%d, exiting with 42\\n", getpid());
        _exit(42);
    }

    int st; pid_t pid;
    while ((pid = waitpid(-1, &st, 0)) > 0) {
        if (WIFEXITED(st))
            printf("reaped %d exit=%d\\n", pid, WEXITSTATUS(st));
        else if (WIFSIGNALED(st))
            printf("reaped %d signal=%d\\n", pid, WTERMSIG(st));
    }
    return 0;
}`,
    examples: [
      { name: 'pipe + fork', desc: '父子进程通过 pipe 通信：子进程写，父进程读', desc_en: 'Parent-child IPC via pipe: child writes, parent reads',
        code: `#include <unistd.h>
#include <stdio.h>
#include <string.h>
#include <sys/wait.h>

int main() {
    int pfd[2];
    pipe(pfd);   /* pfd[0]=读端, pfd[1]=写端 */

    pid_t pid = fork();
    if (pid == 0) {
        /* 子进程: 关闭读端，写数据 */
        close(pfd[0]);
        const char *msgs[] = {"hello\\n","world\\n","from child\\n"};
        for (int i = 0; i < 3; i++)
            write(pfd[1], msgs[i], strlen(msgs[i]));
        close(pfd[1]);
        _exit(0);
    }
    /* 父进程: 关闭写端，读数据 */
    close(pfd[1]);
    char buf[256]; ssize_t n;
    printf("parent reading pipe:\\n");
    while ((n = read(pfd[0], buf, sizeof(buf)-1)) > 0) {
        buf[n] = 0;
        printf("  got: %s", buf);
    }
    close(pfd[0]);
    wait(NULL);
    return 0;
}` },
      { name: '僵尸进程演示', name_en: 'Zombie Process Demo', desc: '子进程退出后父进程延迟 wait()，期间子进程处于 zombie 状态', desc_en: 'Child exits, parent delays wait() — child stays zombie until reaped',
        code: `#include <unistd.h>
#include <stdio.h>
#include <sys/wait.h>

int main() {
    pid_t child = fork();
    if (child == 0) {
        printf("child PID=%d exiting now\\n", getpid());
        _exit(99);
    }
    /* 父进程故意不立即 wait，子进程变僵尸 2 秒 */
    printf("parent sleeping 2s (child is zombie during this time)\\n");
    printf("run: ps aux | grep Z  in another shell to see it\\n");
    sleep(2);

    int status;
    pid_t r = waitpid(child, &status, 0);
    printf("reaped child=%d exit=%d\\n", r, WEXITSTATUS(status));
    printf("zombie gone!\\n");
    return 0;
}` },
      { name: 'SIGCHLD 异步 reap', name_en: 'SIGCHLD Async Reap', desc: '安装 SIGCHLD 处理函数，在信号处理中 waitpid 避免僵尸', desc_en: 'Install SIGCHLD handler to waitpid inside the handler — prevents zombies',
        code: `#include <unistd.h>
#include <stdio.h>
#include <signal.h>
#include <sys/wait.h>
#include <errno.h>

static void sigchld_handler(int sig) {
    (void)sig;
    int saved = errno;
    int status;
    pid_t pid;
    /* 循环 waitpid 处理所有已退出子进程 */
    while ((pid = waitpid(-1, &status, WNOHANG)) > 0) {
        if (WIFEXITED(status))
            printf("[SIGCHLD] reaped pid=%d exit=%d\\n",
                   pid, WEXITSTATUS(status));
    }
    errno = saved;
}

int main() {
    struct sigaction sa = { .sa_handler = sigchld_handler,
                            .sa_flags   = SA_RESTART | SA_NOCLDSTOP };
    sigemptyset(&sa.sa_mask);
    sigaction(SIGCHLD, &sa, NULL);

    for (int i = 0; i < 4; i++) {
        if (fork() == 0) {
            sleep(i);                 /* 错开退出时间 */
            _exit(i * 10);
        }
    }
    /* 父进程等所有子进程退出 */
    while (wait(NULL) > 0 || errno == EINTR) {}
    printf("all children reaped\\n");
    return 0;
}` },
    ],
  },

  threads: {
    name: 'Threads', icon: '🧵', chapter: 'Ch. 29–33', vol: 1,
    desc: 'POSIX threads share the process\'s mm_struct but each has its own task_struct, stack VMA, errno, and register set. pthread_mutex_t uses futex(2) internally — only enters the kernel when there is contention.',
    syscalls: [
      { name: 'pthread_create',     sig: 'int pthread_create(pthread_t *tid, const pthread_attr_t *a, void *(*fn)(void*), void *arg)' },
      { name: 'pthread_join',       sig: 'int pthread_join(pthread_t tid, void **retval)' },
      { name: 'pthread_mutex_lock', sig: 'int pthread_mutex_lock(pthread_mutex_t *m)' },
      { name: 'pthread_cond_wait',  sig: 'int pthread_cond_wait(pthread_cond_t *cv, pthread_mutex_t *m)' },
      { name: 'pthread_key_create', sig: 'int pthread_key_create(pthread_key_t *key, void (*destr)(void*))' },
    ],
    code: `/* TLPI §30.2 — producer–consumer with mutex + condvar */
#include <pthread.h>
#include <stdio.h>

static pthread_mutex_t mtx  = PTHREAD_MUTEX_INITIALIZER;
static pthread_cond_t  cond = PTHREAD_COND_INITIALIZER;
static int item=0, ready=0;

static void *producer(void *_) {
    pthread_mutex_lock(&mtx);
    item=42; ready=1;
    pthread_cond_signal(&cond);
    pthread_mutex_unlock(&mtx);
    return NULL;
}
static void *consumer(void *_) {
    pthread_mutex_lock(&mtx);
    while (!ready) pthread_cond_wait(&cond, &mtx);
    printf("consumed: %d\\n", item);
    pthread_mutex_unlock(&mtx);
    return NULL;
}
int main() {
    pthread_t p, c;
    pthread_create(&c, NULL, consumer, NULL);
    pthread_create(&p, NULL, producer, NULL);
    pthread_join(p, NULL); pthread_join(c, NULL);
}`,
    notes: 'Always check the predicate in a while() loop after pthread_cond_wait to guard against spurious wakeups. Thread-local storage (pthread_key_create or __thread) gives each thread its own copy of a variable without locking.',
    demoCode: `/* Demo: mutex counter race comparison */
#include <pthread.h>
#include <stdio.h>

static pthread_mutex_t mtx = PTHREAD_MUTEX_INITIALIZER;
static long safe=0, unsafe=0;

void *safe_inc(void *n) {
    for(int i=0;i<*(int*)n;i++){pthread_mutex_lock(&mtx);safe++;pthread_mutex_unlock(&mtx);}
    return NULL;
}
void *unsafe_inc(void *n) {
    for(int i=0;i<*(int*)n;i++) unsafe++;
    return NULL;
}

int main() {
    int each=200000;
    pthread_t t1,t2;
    pthread_create(&t1,NULL,safe_inc,&each);
    pthread_create(&t2,NULL,safe_inc,&each);
    pthread_join(t1,NULL); pthread_join(t2,NULL);
    printf("safe   expected=%d got=%ld  %s\\n", each*2, safe,   safe==each*2?"OK":"WRONG");

    pthread_create(&t1,NULL,unsafe_inc,&each);
    pthread_create(&t2,NULL,unsafe_inc,&each);
    pthread_join(t1,NULL); pthread_join(t2,NULL);
    printf("unsafe expected=%d got=%ld  %s\\n", each*2, unsafe, unsafe==each*2?"OK":"RACE DETECTED");
    return 0;
}`,
  },

  sessions: {
    name: 'Sessions & Job Control', icon: '🖥️', chapter: 'Ch. 34', vol: 1,
    desc: 'Each process belongs to a process group (PGID) and a session (SID). Sessions have at most one controlling terminal. setsid() creates a new session — used by daemons to detach from the terminal.',
    syscalls: [
      { name: 'getpgrp/setpgid', sig: 'pid_t getpgrp(void)  /  int setpgid(pid_t pid, pid_t pgid)' },
      { name: 'getsid/setsid',   sig: 'pid_t getsid(pid_t pid)  /  pid_t setsid(void)' },
      { name: 'tcgetpgrp',       sig: 'pid_t tcgetpgrp(int fd)  /* foreground process group */' },
      { name: 'kill(-pgid, sig)',sig: 'kill(-pgid, sig)  /* send signal to entire process group */' },
    ],
    code: `/* TLPI §34.2 — session and process group IDs */
#include <unistd.h>
#include <stdio.h>

int main() {
    printf("PID:  %d\\n", getpid());
    printf("PGID: %d  (process group)\\n", getpgrp());
    printf("SID:  %d  (session)\\n",       getsid(0));

    /* Create a new session (detach from terminal) */
    pid_t new_sid = setsid();  /* fails if already process group leader */
    if (new_sid == -1)
        perror("setsid");      /* -1 if called from process group leader */
    else
        printf("new SID: %d\\n", new_sid);
    return 0;
}`,
    notes: 'setsid() fails if the caller is a process group leader — so daemons fork first and call setsid() in the child. Sending SIGTERM to -pgid delivers it to every process in the group (the shell uses this for Ctrl+C).',
    demoCode: `/* Demo: fork, new process group, new session */
#include <unistd.h>
#include <stdio.h>
#include <sys/wait.h>

int main() {
    printf("parent: PID=%d PGID=%d SID=%d\\n",
           getpid(), getpgrp(), getsid(0));

    pid_t child = fork();
    if (child == 0) {
        printf("child before setsid: PID=%d PGID=%d SID=%d\\n",
               getpid(), getpgrp(), getsid(0));

        pid_t sid = setsid();   /* child is not group leader — this works */
        printf("child after  setsid: PID=%d PGID=%d SID=%d (new sid=%d)\\n",
               getpid(), getpgrp(), getsid(0), sid);
        return 0;
    }
    wait(NULL);
    return 0;
}`,
  },

  sched: {
    name: 'Scheduling', icon: '⚖️', chapter: 'Ch. 35', vol: 1,
    desc: 'Linux uses CFS (Completely Fair Scheduler) for normal tasks, plus real-time policies SCHED_FIFO and SCHED_RR. nice() adjusts priority for SCHED_OTHER. Real-time processes have static priorities 1–99 and preempt normal tasks.',
    syscalls: [
      { name: 'nice',              sig: 'int nice(int inc)  /* -20 (highest) to +19 (lowest) */' },
      { name: 'sched_setscheduler',sig: 'int sched_setscheduler(pid_t pid, int policy, const struct sched_param *p)' },
      { name: 'sched_getscheduler',sig: 'int sched_getscheduler(pid_t pid)' },
      { name: 'sched_yield',       sig: 'int sched_yield(void)  /* voluntarily give up CPU */' },
      { name: 'sched_setaffinity', sig: 'int sched_setaffinity(pid_t pid, size_t cpusetsize, const cpu_set_t *mask)' },
    ],
    code: `/* TLPI §35.1 — scheduling policy and priority */
#include <sched.h>
#include <sys/resource.h>
#include <stdio.h>
#include <unistd.h>

int main() {
    printf("current nice:   %d\\n", nice(0));
    printf("priority min/max (SCHED_OTHER): %d/%d\\n",
           sched_get_priority_min(SCHED_OTHER),
           sched_get_priority_max(SCHED_OTHER));
    printf("priority min/max (SCHED_FIFO):  %d/%d\\n",
           sched_get_priority_min(SCHED_FIFO),
           sched_get_priority_max(SCHED_FIFO));

    int pol = sched_getscheduler(0);
    printf("policy: %s\\n",
           pol==SCHED_OTHER ? "SCHED_OTHER" :
           pol==SCHED_FIFO  ? "SCHED_FIFO"  :
           pol==SCHED_RR    ? "SCHED_RR"    : "other");
    return 0;
}`,
    notes: 'SCHED_FIFO tasks run until they block or yield — they can starve lower-priority tasks. SCHED_RR has a time quantum. sched_setscheduler() requires CAP_SYS_NICE. CFS tracks vruntime (virtual runtime) in task_struct.se to pick the least-run task.',
    demoCode: `/* Demo: query scheduling info + CPU affinity */
#include <sched.h>
#include <stdio.h>
#include <unistd.h>

int main() {
    /* nice and policy */
    printf("nice value: %d\\n", nice(0));

    int pol = sched_getscheduler(getpid());
    printf("sched policy: %s\\n",
           pol==SCHED_OTHER?"SCHED_OTHER":
           pol==SCHED_FIFO ?"SCHED_FIFO" :
           pol==SCHED_RR   ?"SCHED_RR"   :"unknown");

    printf("SCHED_FIFO  priority range: %d–%d\\n",
           sched_get_priority_min(SCHED_FIFO),
           sched_get_priority_max(SCHED_FIFO));
    printf("SCHED_RR    priority range: %d–%d\\n",
           sched_get_priority_min(SCHED_RR),
           sched_get_priority_max(SCHED_RR));

    /* CPU affinity */
    cpu_set_t mask;
    sched_getaffinity(0, sizeof(mask), &mask);
    printf("CPU affinity mask: ");
    for (int i = 0; i < 8; i++)
        if (CPU_ISSET(i, &mask)) printf("cpu%d ", i);
    printf("\\n");
    return 0;
}`,
  },

  daemon: {
    name: 'Daemons', icon: '👻', chapter: 'Ch. 37', vol: 2,
    desc: 'A daemon is a long-lived background process with no controlling terminal. The standard daemonize procedure: fork → setsid → fork again → redirect stdio → chdir("/"). The double-fork ensures the daemon cannot re-acquire a controlling terminal.',
    syscalls: [
      { name: 'fork',   sig: 'pid_t fork(void)' },
      { name: 'setsid', sig: 'pid_t setsid(void)' },
      { name: 'chdir',  sig: 'int chdir(const char *path)' },
      { name: 'umask',  sig: 'mode_t umask(mode_t mask)' },
      { name: 'dup2',   sig: 'int dup2(int oldfd, int newfd)' },
    ],
    code: `/* TLPI §37.2 — daemonize() */
#include <unistd.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <fcntl.h>

int daemonize(void) {
    /* Step 1: fork, parent exits */
    switch (fork()) {
    case -1: return -1;
    case  0: break;          /* child continues */
    default: exit(EXIT_SUCCESS);
    }
    /* Step 2: new session, no controlling terminal */
    if (setsid() == -1) return -1;

    /* Step 3: fork again (cannot acquire terminal) */
    switch (fork()) {
    case -1: return -1;
    case  0: break;
    default: exit(EXIT_SUCCESS);
    }
    /* Step 4: clear umask, cd to root */
    umask(0);
    chdir("/");

    /* Step 5: close all fds, redirect to /dev/null */
    int maxfd = sysconf(_SC_OPEN_MAX);
    for (int fd = 0; fd < maxfd; fd++) close(fd);
    int null = open("/dev/null", O_RDWR);
    dup2(null, STDIN_FILENO);
    dup2(null, STDOUT_FILENO);
    dup2(null, STDERR_FILENO);
    return 0;
}`,
    notes: 'The second fork() prevents the daemon from ever becoming a session leader — which is the only way to acquire a controlling terminal on Linux. After daemonize(), write a PID file and use syslog(3) for logging.',
    demoCode: `/* Demo: simplified daemon (no double-fork; shows the pattern) */
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <sys/wait.h>

int main() {
    printf("before fork: PID=%d SID=%d\\n", getpid(), getsid(0));

    pid_t child = fork();
    if (child > 0) {
        /* parent waits, then reports */
        int st; waitpid(child, &st, 0);
        printf("parent: child exited with %d\\n", WEXITSTATUS(st));
        return 0;
    }

    /* child: become new session leader */
    setsid();
    umask(0);
    chdir("/");

    printf("daemon: PID=%d SID=%d (new session)\\n", getpid(), getsid(0));
    printf("daemon: would now redirect stdio to /dev/null and loop\\n");
    /* real daemon would: open /dev/null, dup2, then event loop */
    return 0;
}`,
  },

  pipes: {
    name: 'Pipes & FIFOs', icon: '🪣', chapter: 'Ch. 44', vol: 2,
    desc: 'pipe(2) creates an anonymous unidirectional byte channel. FIFOs (named pipes) are filesystem objects; unrelated processes can open them by path. popen(3) wraps pipe+fork+exec into a single call.',
    syscalls: [
      { name: 'pipe',   sig: 'int pipe(int pipefd[2])  /* fd[0]=read, fd[1]=write */' },
      { name: 'pipe2',  sig: 'int pipe2(int pipefd[2], int flags)  /* O_CLOEXEC, O_NONBLOCK */' },
      { name: 'mkfifo', sig: 'int mkfifo(const char *path, mode_t mode)' },
      { name: 'popen',  sig: 'FILE *popen(const char *command, const char *type)' },
      { name: 'pclose', sig: 'int pclose(FILE *stream)' },
    ],
    code: `/* TLPI §44.2 — pipe: parent writes, child reads */
#include <unistd.h>
#include <sys/wait.h>
#include <stdio.h>
#include <string.h>

int main() {
    int pfd[2];
    pipe(pfd);   /* fd[0]=read, fd[1]=write */

    if (fork() == 0) {          /* child reads */
        close(pfd[1]);
        char buf[128];
        ssize_t n = read(pfd[0], buf, sizeof(buf)-1);
        buf[n] = '\\0';
        printf("child got: %s\\n", buf);
        close(pfd[0]);
    } else {                    /* parent writes */
        close(pfd[0]);
        const char *msg = "data through the pipe";
        write(pfd[1], msg, strlen(msg));
        close(pfd[1]);          /* EOF — child's read returns 0 */
        wait(NULL);
    }
    return 0;
}`,
    notes: 'The pipe has a kernel buffer (typically 64KB). write() to a full pipe blocks. Closing the write end causes read() to return 0 (EOF). Always close both ends you don\'t use in child — otherwise EOF is never sent.',
    examples: [
      { name: 'FIFO 命名管道', name_en: 'FIFO Named Pipe', desc: '无亲缘关系的进程通过文件路径通信', desc_en: 'Unrelated processes communicate via FIFO (named pipe) filesystem path', code: `#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>
#include <sys/wait.h>

#define FIFO "/tmp/tlpi_fifo"

int main() {
    mkfifo(FIFO, 0600);   /* create named pipe in filesystem */

    if (fork() == 0) {    /* reader child */
        int rfd = open(FIFO, O_RDONLY);
        char buf[64]; ssize_t n;
        while ((n = read(rfd, buf, sizeof(buf)-1)) > 0) {
            buf[n] = '\\0';
            printf("reader got: %s\\n", buf);
        }
        close(rfd); return 0;
    }
    /* writer parent */
    int wfd = open(FIFO, O_WRONLY);
    write(wfd, "msg via FIFO", 12);
    write(wfd, "second msg  ", 12);
    close(wfd);           /* EOF to reader */
    wait(NULL);
    unlink(FIFO);
    return 0;
}` },
      { name: '双向管道', name_en: 'Bidirectional Pipes', desc: '两个 pipe 实现父子全双工通信', desc_en: 'Full-duplex parent-child communication using two pipes', code: `#include <unistd.h>
#include <sys/wait.h>
#include <stdio.h>
#include <string.h>

int main() {
    int p2c[2], c2p[2];   /* parent-to-child, child-to-parent */
    pipe(p2c); pipe(c2p);

    if (fork() == 0) {
        close(p2c[1]); close(c2p[0]);

        char buf[64]; ssize_t n;
        n = read(p2c[0], buf, sizeof(buf)-1);
        buf[n] = '\\0';
        printf("child received: %s\\n", buf);

        const char *reply = "pong from child";
        write(c2p[1], reply, strlen(reply));
        close(p2c[0]); close(c2p[1]);
        return 0;
    }
    close(p2c[0]); close(c2p[1]);

    write(p2c[1], "ping from parent", 16);
    close(p2c[1]);

    char buf[64]; ssize_t n = read(c2p[0], buf, sizeof(buf)-1);
    buf[n] = '\\0';
    printf("parent received: %s\\n", buf);
    close(c2p[0]);
    wait(NULL);
    return 0;
}` },
      { name: 'popen 捕获命令输出', name_en: 'popen Capture Output', desc: '用 popen 读取 shell 命令的标准输出', desc_en: 'Capture shell command stdout with popen', code: `#include <stdio.h>
#include <stdlib.h>

int main() {
    /* popen = pipe + fork + exec + sh -c */
    FILE *f = popen("df -h / | tail -1", "r");
    if (!f) { perror("popen"); return 1; }

    char line[256];
    printf("=== df -h / (last line) ===\\n");
    while (fgets(line, sizeof(line), f))
        printf("  %s", line);

    int status = pclose(f);
    printf("exit status: %d\\n", WEXITSTATUS(status));

    /* also works for writing to a command */
    FILE *g = popen("wc -c", "w");
    fprintf(g, "count these bytes please");
    pclose(g);
    return 0;
}` },
    ],
    demoCode: `/* Demo: pipe + popen(ls) */
#include <unistd.h>
#include <sys/wait.h>
#include <stdio.h>
#include <string.h>

int main() {
    /* anonymous pipe */
    int pfd[2]; pipe(pfd);
    if (fork() == 0) {
        close(pfd[1]);
        char buf[64]; ssize_t n;
        while ((n=read(pfd[0],buf,sizeof(buf)-1))>0){buf[n]=0;printf("child: %s\\n",buf);}
        close(pfd[0]); return 0;
    }
    close(pfd[0]);
    write(pfd[1],"hello pipe",10);
    write(pfd[1],"second msg",10);
    close(pfd[1]);
    wait(NULL);

    /* popen: capture shell command output */
    printf("\\npopen(uname -r):\\n");
    FILE *f = popen("uname -r", "r");
    char line[128];
    while (fgets(line,sizeof(line),f)) printf("  %s",line);
    pclose(f);
    return 0;
}`,
  },

  mmap: {
    name: 'Memory Mapping', icon: '🗺️', chapter: 'Ch. 49–50', vol: 2,
    desc: 'mmap() maps a file or anonymous memory into the virtual address space. The kernel creates a VMA in mm_struct. File-backed mappings go through the page cache — zero-copy between user space and disk.',
    syscalls: [
      { name: 'mmap',    sig: 'void *mmap(void *addr, size_t len, int prot, int flags, int fd, off_t offset)' },
      { name: 'munmap',  sig: 'int munmap(void *addr, size_t len)' },
      { name: 'mprotect',sig: 'int mprotect(void *addr, size_t len, int prot)' },
      { name: 'msync',   sig: 'int msync(void *addr, size_t len, int flags)' },
      { name: 'madvise', sig: 'int madvise(void *addr, size_t len, int advice)' },
    ],
    code: `/* TLPI §49.2 — memory-mapped file */
#include <sys/mman.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>

int main(int argc, char *argv[]) {
    int fd = open(argv[1], O_RDWR);
    struct stat st; fstat(fd, &st);
    char *p = mmap(NULL, st.st_size,
                   PROT_READ|PROT_WRITE, MAP_SHARED, fd, 0);
    close(fd);  /* fd not needed after mmap */
    for (size_t i=0; i<(size_t)st.st_size; i++)
        if (p[i]>='a'&&p[i]<='z') p[i]-=32;
    msync(p, st.st_size, MS_SYNC);
    munmap(p, st.st_size);
}`,
    notes: 'MAP_PRIVATE creates copy-on-write — writes create private anonymous pages visible only to this process. MAP_SHARED writes go to the page cache and are visible to all mappers. madvise(MADV_SEQUENTIAL) enables aggressive readahead.',
    examples: [
      { name: '匿名共享内存', name_en: 'Anonymous Shared Memory', desc: 'MAP_ANONYMOUS|MAP_SHARED: 父子进程零拷贝共享', desc_en: 'MAP_ANONYMOUS|MAP_SHARED: zero-copy shared memory between parent and child', code: `#include <sys/mman.h>
#include <stdio.h>
#include <unistd.h>
#include <sys/wait.h>

int main() {
    /* Anonymous MAP_SHARED: visible to parent AND child */
    int *counter = mmap(NULL, sizeof(int),
        PROT_READ|PROT_WRITE,
        MAP_SHARED|MAP_ANONYMOUS, -1, 0);
    *counter = 0;

    pid_t pid = fork();
    if (pid == 0) {
        for (int i = 0; i < 5; i++) {
            (*counter)++;          /* child increments */
            usleep(10000);
        }
        return 0;
    }
    /* parent reads counter updated by child */
    wait(NULL);
    printf("shared counter = %d (expected 5)\\n", *counter);
    munmap(counter, sizeof(int));
    return 0;
}` },
      { name: 'mprotect 只读保护', name_en: 'mprotect Read-Only', desc: '将内存区域改为只读，写入触发 SIGSEGV', desc_en: 'Make a memory region read-only with mprotect; write triggers SIGSEGV', code: `#include <sys/mman.h>
#include <stdio.h>
#include <string.h>
#include <signal.h>
#include <setjmp.h>

static sigjmp_buf jb;
static void handler(int s) { siglongjmp(jb, 1); }

int main() {
    char *p = mmap(NULL, 4096,
        PROT_READ|PROT_WRITE,
        MAP_PRIVATE|MAP_ANONYMOUS, -1, 0);
    strcpy(p, "writable");
    printf("wrote: %s\\n", p);

    mprotect(p, 4096, PROT_READ);   /* make read-only */

    signal(SIGSEGV, handler);
    if (sigsetjmp(jb, 1) == 0) {
        p[0] = 'X';                 /* triggers SIGSEGV */
        printf("should not reach here\\n");
    } else {
        printf("caught SIGSEGV: write to read-only mmap\\n");
    }
    munmap(p, 4096);
    return 0;
}` },
      { name: 'msync 持久化', name_en: 'msync Persist', desc: '将 MAP_SHARED 修改同步写回文件', desc_en: 'Flush MAP_SHARED changes back to file with msync', code: `#include <sys/mman.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

int main() {
    const char *path = "/tmp/tlpi_msync.txt";
    const char *init = "0000000000";
    int fd = open(path, O_RDWR|O_CREAT|O_TRUNC, 0600);
    write(fd, init, strlen(init));

    struct stat st; fstat(fd, &st);
    char *p = mmap(NULL, st.st_size,
        PROT_READ|PROT_WRITE, MAP_SHARED, fd, 0);
    close(fd);

    /* Modify in memory */
    memcpy(p, "PERSISTED", 9);
    /* Force writeback to disk */
    if (msync(p, st.st_size, MS_SYNC) == 0)
        printf("msync OK, file now: %.*s\\n", (int)st.st_size, p);

    munmap(p, st.st_size);
    unlink(path);
    return 0;
}` },
    ],
    demoCode: `/* Demo: create file, MAP_SHARED uppercase in-place */
#include <sys/mman.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <stdio.h>
#include <unistd.h>
#include <string.h>

int main() {
    const char *p = "/tmp/tlpi_mmap.txt";
    const char *content = "hello from mmap: page cache zero-copy";
    int fd = open(p, O_RDWR|O_CREAT|O_TRUNC, 0600);
    write(fd, content, strlen(content)); close(fd);

    fd = open(p, O_RDWR);
    struct stat st; fstat(fd, &st);
    char *mp = mmap(NULL, st.st_size, PROT_READ|PROT_WRITE, MAP_SHARED, fd, 0);
    close(fd);

    printf("before: %.*s\\n", (int)st.st_size, mp);
    for (int i=0;i<st.st_size;i++) if(mp[i]>='a'&&mp[i]<='z') mp[i]-=32;
    msync(mp, st.st_size, MS_SYNC);
    printf("after:  %.*s\\n", (int)st.st_size, mp);
    munmap(mp, st.st_size);
    unlink(p);
    return 0;
}`,
  },

  posixmq: {
    name: 'POSIX Message Queues', icon: '📨', chapter: 'Ch. 52', vol: 2,
    desc: 'POSIX message queues provide typed, prioritized, kernel-buffered messaging. Messages are retrieved in priority order (highest first). The queue persists until explicitly unlinked, even after all processes close it.',
    syscalls: [
      { name: 'mq_open',    sig: 'mqd_t mq_open(const char *name, int flags, mode_t mode, struct mq_attr *attr)' },
      { name: 'mq_send',    sig: 'int mq_send(mqd_t mqd, const char *msg, size_t len, unsigned prio)' },
      { name: 'mq_receive', sig: 'ssize_t mq_receive(mqd_t mqd, char *msg, size_t len, unsigned *prio)' },
      { name: 'mq_close',   sig: 'int mq_close(mqd_t mqd)' },
      { name: 'mq_unlink',  sig: 'int mq_unlink(const char *name)' },
    ],
    code: `/* TLPI §52.2 — mq_open + mq_send + mq_receive */
#include <mqueue.h>
#include <stdio.h>
#include <string.h>
#include <fcntl.h>

int main() {
    struct mq_attr attr = { .mq_maxmsg=10, .mq_msgsize=256 };
    mqd_t mq = mq_open("/tlpi_mq",
                       O_CREAT|O_RDWR, 0600, &attr);

    mq_send(mq, "low priority",  13, 0);
    mq_send(mq, "high priority", 14, 5);  /* sent last, received first */

    char buf[256]; unsigned prio;
    mq_receive(mq, buf, sizeof(buf), &prio);
    printf("got (prio=%u): %s\\n", prio, buf);
    mq_receive(mq, buf, sizeof(buf), &prio);
    printf("got (prio=%u): %s\\n", prio, buf);

    mq_close(mq);
    mq_unlink("/tlpi_mq");
    return 0;
}`,
    examples: [
      { name: '跨进程消息传递', name_en: 'Cross-Process Messaging', desc: '父进程发送，子进程接收，验证优先级排序', desc_en: 'Parent sends, child receives; verify priority ordering', code: `#include <mqueue.h>
#include <stdio.h>
#include <string.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/wait.h>

#define MQ_NAME "/tlpi_ipc_mq"

int main() {
    mq_unlink(MQ_NAME);
    struct mq_attr attr = { .mq_maxmsg=10, .mq_msgsize=64 };
    mqd_t mq = mq_open(MQ_NAME, O_CREAT|O_RDWR, 0600, &attr);

    if (fork() == 0) {   /* consumer */
        mqd_t cmq = mq_open(MQ_NAME, O_RDONLY);
        char buf[64]; unsigned prio;
        for (int i = 0; i < 3; i++) {
            mq_receive(cmq, buf, sizeof(buf), &prio);
            printf("child got [prio=%u]: %s\\n", prio, buf);
        }
        mq_close(cmq);
        return 0;
    }
    /* producer sends in reverse priority order */
    mq_send(mq, "LOW",  3, 1);
    mq_send(mq, "HIGH", 4, 9);
    mq_send(mq, "MED",  3, 5);
    mq_close(mq);
    wait(NULL);
    mq_unlink(MQ_NAME);
    return 0;
}` },
    ],
    notes: 'mq_receive() always returns the highest-priority message. Use mq_notify() to get a signal or start a thread when a message arrives on an empty queue. Compile with -lrt. Queue names must start with "/".',
    demoCode: `/* Demo: priority ordering and mq_getattr */
#include <mqueue.h>
#include <stdio.h>
#include <string.h>
#include <fcntl.h>

int main() {
    mq_unlink("/tlpi_demo_mq");  /* clean up from previous run */
    struct mq_attr attr = { .mq_maxmsg=8, .mq_msgsize=128 };
    mqd_t mq = mq_open("/tlpi_demo_mq", O_CREAT|O_RDWR, 0600, &attr);

    /* send with different priorities */
    mq_send(mq, "msg prio=0", 11, 0);
    mq_send(mq, "msg prio=9", 11, 9);
    mq_send(mq, "msg prio=3", 11, 3);

    struct mq_attr cur; mq_getattr(mq, &cur);
    printf("queue: maxmsg=%ld msgsize=%ld curmsgs=%ld\\n",
           cur.mq_maxmsg, cur.mq_msgsize, cur.mq_curmsgs);

    char buf[128]; unsigned prio;
    for (int i=0;i<3;i++) {
        mq_receive(mq, buf, sizeof(buf), &prio);
        printf("received (prio=%2u): %s\\n", prio, buf);
    }
    mq_close(mq);
    mq_unlink("/tlpi_demo_mq");
    return 0;
}`,
  },

  posixsem: {
    name: 'POSIX Semaphores', icon: '🚦', chapter: 'Ch. 53', vol: 2,
    desc: 'POSIX semaphores come in two forms: named (backed by a filesystem path) and unnamed (stored in shared memory). sem_wait() is "P" (decrement, block if 0); sem_post() is "V" (increment). Used for synchronization, not data transfer.',
    syscalls: [
      { name: 'sem_open',    sig: 'sem_t *sem_open(const char *name, int flags, mode_t mode, unsigned value)' },
      { name: 'sem_wait',    sig: 'int sem_wait(sem_t *sem)  /* P: decrement, block if 0 */' },
      { name: 'sem_post',    sig: 'int sem_post(sem_t *sem)  /* V: increment */' },
      { name: 'sem_init',    sig: 'int sem_init(sem_t *sem, int pshared, unsigned value)  /* unnamed */' },
      { name: 'sem_timedwait',sig:'int sem_timedwait(sem_t *sem, const struct timespec *abs_timeout)' },
    ],
    code: `/* TLPI §53.2 — named semaphore */
#include <semaphore.h>
#include <fcntl.h>
#include <stdio.h>

int main() {
    sem_t *sem = sem_open("/tlpi_sem",
                          O_CREAT|O_RDWR, 0600, 1);

    int val; sem_getvalue(sem, &val);
    printf("initial value: %d\\n", val);

    sem_wait(sem);    /* P: decrement to 0 */
    sem_getvalue(sem, &val);
    printf("after wait:    %d (locked)\\n", val);

    /* critical section */

    sem_post(sem);    /* V: increment to 1 */
    sem_getvalue(sem, &val);
    printf("after post:    %d (released)\\n", val);

    sem_close(sem);
    sem_unlink("/tlpi_sem");
    return 0;
}`,
    examples: [
      { name: '生产者-消费者', name_en: 'Producer-Consumer', desc: '用无名信号量实现线程间生产者-消费者同步', desc_en: 'Producer-consumer thread sync using unnamed POSIX semaphores', code: `#include <semaphore.h>
#include <pthread.h>
#include <stdio.h>
#include <unistd.h>

#define BUF_SIZE 4
static int buffer[BUF_SIZE];
static int head = 0, tail = 0;
static sem_t empty_slots, filled_slots;
static pthread_mutex_t mtx = PTHREAD_MUTEX_INITIALIZER;

void *producer(void *_) {
    for (int i = 0; i < 8; i++) {
        sem_wait(&empty_slots);
        pthread_mutex_lock(&mtx);
        buffer[tail % BUF_SIZE] = i;
        tail++;
        printf("produced: %d  (tail=%d)\\n", i, tail);
        pthread_mutex_unlock(&mtx);
        sem_post(&filled_slots);
        usleep(10000);
    }
    return NULL;
}

void *consumer(void *_) {
    for (int i = 0; i < 8; i++) {
        sem_wait(&filled_slots);
        pthread_mutex_lock(&mtx);
        int val = buffer[head % BUF_SIZE];
        head++;
        printf("consumed: %d  (head=%d)\\n", val, head);
        pthread_mutex_unlock(&mtx);
        sem_post(&empty_slots);
        usleep(15000);
    }
    return NULL;
}

int main() {
    sem_init(&empty_slots, 0, BUF_SIZE);
    sem_init(&filled_slots, 0, 0);
    pthread_t p, c;
    pthread_create(&p, NULL, producer, NULL);
    pthread_create(&c, NULL, consumer, NULL);
    pthread_join(p, NULL);
    pthread_join(c, NULL);
    sem_destroy(&empty_slots);
    sem_destroy(&filled_slots);
    return 0;
}` },
    ],
    notes: 'sem_post() is async-signal-safe — it can be called from a signal handler. Unnamed semaphores (sem_init with pshared=1) live in shared memory and can synchronize processes. Unlike mutexes, any process/thread can call sem_post regardless of who called sem_wait.',
    demoCode: `/* Demo: named sem + unnamed sem in threads */
#include <semaphore.h>
#include <fcntl.h>
#include <stdio.h>
#include <pthread.h>
#include <unistd.h>

static sem_t thread_sem;
static int shared_val = 0;

void *worker(void *_) {
    sem_wait(&thread_sem);
    shared_val = 42;
    sem_post(&thread_sem);
    return NULL;
}

int main() {
    /* named semaphore */
    sem_unlink("/tlpi_s");
    sem_t *ns = sem_open("/tlpi_s", O_CREAT, 0600, 1);
    int v; sem_getvalue(ns, &v);
    printf("named sem initial: %d\\n", v);
    sem_wait(ns); sem_getvalue(ns,&v); printf("after wait: %d\\n",v);
    sem_post(ns); sem_getvalue(ns,&v); printf("after post: %d\\n",v);
    sem_close(ns); sem_unlink("/tlpi_s");

    /* unnamed semaphore with threads */
    sem_init(&thread_sem, 0, 1);
    pthread_t t;
    sem_wait(&thread_sem);          /* main holds it */
    pthread_create(&t, NULL, worker, NULL);
    sleep(0);                       /* let thread block on sem_wait */
    sem_post(&thread_sem);          /* release — thread runs */
    pthread_join(t, NULL);
    printf("shared_val = %d\\n", shared_val);
    sem_destroy(&thread_sem);
    return 0;
}`,
  },

  posixshm: {
    name: 'POSIX Shared Memory', icon: '🤝', chapter: 'Ch. 54', vol: 2,
    desc: 'shm_open() creates or opens a shared memory object (a named region backed by RAM). ftruncate() sets its size. mmap() with MAP_SHARED then maps it into the virtual address space of multiple processes — zero-copy data sharing.',
    syscalls: [
      { name: 'shm_open',   sig: 'int shm_open(const char *name, int flags, mode_t mode)' },
      { name: 'ftruncate',  sig: 'int ftruncate(int fd, off_t length)' },
      { name: 'mmap',       sig: 'void *mmap(NULL, size, PROT_READ|PROT_WRITE, MAP_SHARED, fd, 0)' },
      { name: 'shm_unlink', sig: 'int shm_unlink(const char *name)' },
    ],
    code: `/* TLPI §54.2 — shm_open + mmap: parent writes, child reads */
#include <sys/mman.h>
#include <sys/wait.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>

#define SHM_SIZE 4096
#define SHM_NAME "/tlpi_shm"

int main() {
    int fd = shm_open(SHM_NAME, O_CREAT|O_RDWR, 0600);
    ftruncate(fd, SHM_SIZE);
    char *shm = mmap(NULL, SHM_SIZE,
                     PROT_READ|PROT_WRITE, MAP_SHARED, fd, 0);
    close(fd);

    if (fork() == 0) {   /* child reads */
        usleep(1000);    /* let parent write */
        printf("child read: %s\\n", shm);
        munmap(shm, SHM_SIZE);
    } else {             /* parent writes */
        sprintf(shm, "hello from PID %d via shm", getpid());
        wait(NULL);
        munmap(shm, SHM_SIZE);
        shm_unlink(SHM_NAME);
    }
    return 0;
}`,
    notes: 'Shared memory needs explicit synchronization (semaphore or mutex with PTHREAD_PROCESS_SHARED). POSIX shared memory objects appear in /dev/shm on Linux. They are faster than System V shmget() and have a cleaner API.',
    demoCode: `/* Demo: shm_open, write, read from both sides */
#include <sys/mman.h>
#include <sys/wait.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

int main() {
    shm_unlink("/tlpi_shm2");
    int fd = shm_open("/tlpi_shm2", O_CREAT|O_RDWR, 0600);
    ftruncate(fd, 256);
    char *shm = mmap(NULL,256,PROT_READ|PROT_WRITE,MAP_SHARED,fd,0);
    close(fd);

    strcpy(shm, "initial from parent");
    printf("parent wrote: \"%s\"\\n", shm);

    pid_t child = fork();
    if (child == 0) {
        printf("child  read: \"%s\"\\n", shm);
        snprintf(shm, 256, "updated by child PID=%d", getpid());
        munmap(shm, 256);
        return 0;
    }
    wait(NULL);
    printf("parent read back: \"%s\"\\n", shm);
    munmap(shm, 256);
    shm_unlink("/tlpi_shm2");
    return 0;
}`,
  },

  flock: {
    name: 'File Locking', icon: '🔒', chapter: 'Ch. 55', vol: 2,
    desc: 'POSIX record locking with fcntl() provides byte-range locks per process. flock() is simpler but BSD-style (whole-file, advisory). Locks are released automatically when the process exits or closes any fd to the file.',
    syscalls: [
      { name: 'fcntl F_SETLK',  sig: 'int fcntl(int fd, F_SETLK, struct flock *fl)  /* non-blocking */' },
      { name: 'fcntl F_SETLKW', sig: 'int fcntl(int fd, F_SETLKW, struct flock *fl) /* blocking wait */' },
      { name: 'fcntl F_GETLK',  sig: 'int fcntl(int fd, F_GETLK, struct flock *fl)  /* test */' },
      { name: 'flock',          sig: 'int flock(int fd, int operation)  /* LOCK_SH | LOCK_EX | LOCK_UN */' },
    ],
    code: `/* TLPI §55.3 — POSIX record locking */
#include <fcntl.h>
#include <stdio.h>
#include <unistd.h>

int main() {
    int fd = open("/tmp/tlpi_lock.txt",
                  O_RDWR|O_CREAT|O_TRUNC, 0600);
    write(fd, "data\\n", 5);

    struct flock fl = {
        .l_type   = F_WRLCK,   /* exclusive write lock */
        .l_whence = SEEK_SET,
        .l_start  = 0,
        .l_len    = 0,         /* 0 = entire file */
    };
    if (fcntl(fd, F_SETLK, &fl) == 0) {
        printf("write lock acquired\\n");
        /* ... exclusive work ... */
        fl.l_type = F_UNLCK;
        fcntl(fd, F_SETLK, &fl);
        printf("lock released\\n");
    } else {
        perror("fcntl");
    }
    close(fd);
    unlink("/tmp/tlpi_lock.txt");
    return 0;
}`,
    examples: [
      { name: 'flock 全文件锁', name_en: 'flock Whole-File Lock', desc: '用 flock() 实现简单进程间互斥锁', desc_en: 'Simple inter-process mutex with flock()', code: `#include <sys/file.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>
#include <sys/wait.h>

int main() {
    int fd = open("/tmp/tlpi_flock.lock",
                  O_RDWR|O_CREAT|O_TRUNC, 0600);

    if (fork() == 0) {
        printf("child: trying to acquire exclusive lock...\\n");
        /* LOCK_EX: exclusive (writer) lock, blocking */
        flock(fd, LOCK_EX);
        printf("child: got lock, working...\\n");
        usleep(200000);
        flock(fd, LOCK_UN);
        printf("child: released lock\\n");
        return 0;
    }

    /* parent also takes exclusive lock briefly */
    flock(fd, LOCK_EX);
    printf("parent: holding lock for 100ms\\n");
    usleep(100000);
    flock(fd, LOCK_UN);
    printf("parent: released, child can proceed\\n");

    wait(NULL);
    close(fd);
    unlink("/tmp/tlpi_flock.lock");
    return 0;
}` },
      { name: 'fcntl 字节范围锁', name_en: 'fcntl Byte-Range Lock', desc: '对文件的特定字节范围加锁（数据库常用）', desc_en: 'Lock a specific byte range in a file with fcntl (common in databases)', code: `#include <fcntl.h>
#include <stdio.h>
#include <unistd.h>

void lock_range(int fd, short type, off_t start, off_t len) {
    struct flock fl = {
        .l_type   = type,
        .l_whence = SEEK_SET,
        .l_start  = start,
        .l_len    = len,
    };
    if (fcntl(fd, F_SETLKW, &fl) == 0)
        printf("%s bytes [%lld, %lld]\\n",
            type == F_WRLCK ? "WRLCK" : "RDLCK",
            (long long)start, (long long)(start+len-1));
    else
        perror("fcntl");
}

void unlock_all(int fd) {
    struct flock fl = { .l_type=F_UNLCK, .l_whence=SEEK_SET,
                        .l_start=0, .l_len=0 };
    fcntl(fd, F_SETLK, &fl);
    printf("all locks released\\n");
}

int main() {
    int fd = open("/tmp/tlpi_range.db",
                  O_RDWR|O_CREAT|O_TRUNC, 0600);
    /* Simulate: write-lock record 0-63, read-lock record 64-127 */
    lock_range(fd, F_WRLCK,  0, 64);
    lock_range(fd, F_RDLCK, 64, 64);
    /* ... modify records ... */
    unlock_all(fd);
    close(fd);
    unlink("/tmp/tlpi_range.db");
    return 0;
}` },
    ],
    notes: 'POSIX locks are per-process, not per-fd — closing any fd to the file releases all locks held by that process on the file. Use flock() (whole-file) for simpler use cases. Mandatory locking (rarely used) enforces locks on read()/write() calls.',
    demoCode: `/* Demo: write lock then shared (read) lock from child */
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>
#include <sys/wait.h>

void set_lock(int fd, int type, const char *label) {
    struct flock fl = { .l_type=type, .l_whence=SEEK_SET, .l_start=0, .l_len=0 };
    int r = fcntl(fd, F_SETLK, &fl);
    printf("%s: %s\\n", label, r==0 ? "OK" : "FAILED (locked by other)");
}

int main() {
    int fd = open("/tmp/tlpi_fl.txt", O_RDWR|O_CREAT|O_TRUNC, 0600);
    write(fd, "data", 4);

    set_lock(fd, F_WRLCK, "parent exclusive lock");

    pid_t child = fork();
    if (child == 0) {
        int cfd = open("/tmp/tlpi_fl.txt", O_RDONLY);
        set_lock(cfd, F_RDLCK, "child shared lock (should fail — parent holds exclusive)");
        close(cfd);
        return 0;
    }
    wait(NULL);
    set_lock(fd, F_UNLCK, "parent unlock");

    /* now try again without exclusive */
    pid_t c2 = fork();
    if (c2 == 0) {
        int cfd = open("/tmp/tlpi_fl.txt", O_RDONLY);
        set_lock(cfd, F_RDLCK, "child shared lock (should succeed now)");
        close(cfd);
        return 0;
    }
    wait(NULL);
    close(fd);
    unlink("/tmp/tlpi_fl.txt");
    return 0;
}`,
  },

  socket: {
    name: 'Sockets', icon: '🔌', chapter: 'Ch. 56–61', vol: 2,
    desc: 'Sockets are the universal networking and local IPC API. AF_UNIX sockets stay inside the kernel — no TCP/IP stack. AF_INET (TCP/UDP) communicates over the network. socketpair() creates a connected pair with one syscall.',
    syscalls: [
      { name: 'socket',       sig: 'int socket(int domain, int type, int protocol)' },
      { name: 'bind',         sig: 'int bind(int fd, const struct sockaddr *addr, socklen_t len)' },
      { name: 'listen/accept',sig: 'int listen(int fd, int backlog)  /  int accept(int fd, ...)' },
      { name: 'connect',      sig: 'int connect(int fd, const struct sockaddr *addr, socklen_t len)' },
      { name: 'send/recv',    sig: 'ssize_t send(int fd, const void *buf, size_t len, int flags)' },
      { name: 'socketpair',   sig: 'int socketpair(int domain, int type, int proto, int sv[2])' },
    ],
    code: `/* TLPI §57 — Unix domain stream socket */
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>
#include <stdio.h>

#define SOCK_PATH "/tmp/tlpi.sock"

int main() {
    int srv = socket(AF_UNIX, SOCK_STREAM, 0);
    struct sockaddr_un addr = { .sun_family = AF_UNIX };
    snprintf(addr.sun_path, sizeof(addr.sun_path), SOCK_PATH);
    unlink(SOCK_PATH);
    bind(srv, (struct sockaddr*)&addr, sizeof addr);
    listen(srv, 5);

    if (fork() == 0) {   /* client */
        int c = socket(AF_UNIX, SOCK_STREAM, 0);
        connect(c, (struct sockaddr*)&addr, sizeof addr);
        char buf[32]; ssize_t n = recv(c, buf, sizeof buf, 0);
        printf("client got: %.*s\\n", (int)n, buf);
        close(c);
    } else {             /* server */
        int conn = accept(srv, NULL, NULL);
        send(conn, "hello client", 12, 0);
        close(conn);
        wait(NULL);
        close(srv); unlink(SOCK_PATH);
    }
    return 0;
}`,
    notes: 'The three-way TCP handshake (SYN→SYN-ACK→ACK) happens inside connect()+listen(). SO_REUSEADDR lets you rebind immediately after server restart. For AF_UNIX, the path is the address — create/unlink it like a file.',
    demoCode: `/* Demo: socketpair bidirectional + getpeername */
#include <sys/socket.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>
#include <sys/wait.h>

int main() {
    int sv[2];
    socketpair(AF_UNIX, SOCK_STREAM, 0, sv);

    if (fork() == 0) {
        close(sv[0]);
        char buf[64];
        ssize_t n = recv(sv[1], buf, sizeof(buf)-1, 0);
        buf[n]='\\0'; printf("child  recv: %s\\n", buf);
        send(sv[1], "reply from child", 16, 0);
        close(sv[1]); return 0;
    }
    close(sv[1]);
    send(sv[0], "hello from parent", 17, 0);
    char buf[64]; ssize_t n = recv(sv[0], buf, sizeof(buf)-1, 0);
    buf[n]='\\0'; printf("parent recv: %s\\n", buf);
    wait(NULL); close(sv[0]);
    return 0;
}`,
    examples: [
      { name: 'TCP echo server', desc: '最简 TCP echo 服务端 + 客户端 (fork 在同一进程演示)', desc_en: 'Minimal TCP echo server + client (forked in same process for demo)',
        code: `#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>
#include <sys/wait.h>

#define PORT 19988

int main() {
    /* ── 服务端 ── */
    int srv = socket(AF_INET, SOCK_STREAM, 0);
    int opt = 1;
    setsockopt(srv, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    struct sockaddr_in addr = {
        .sin_family      = AF_INET,
        .sin_port        = htons(PORT),
        .sin_addr.s_addr = INADDR_ANY,
    };
    bind(srv, (struct sockaddr*)&addr, sizeof(addr));
    listen(srv, 5);
    printf("server listening on port %d\\n", PORT);

    pid_t pid = fork();
    if (pid == 0) {
        /* ── 客户端 (子进程) ── */
        sleep(0);   /* 等服务端就绪 */
        int c = socket(AF_INET, SOCK_STREAM, 0);
        struct sockaddr_in saddr = {
            .sin_family = AF_INET,
            .sin_port   = htons(PORT),
        };
        inet_pton(AF_INET, "127.0.0.1", &saddr.sin_addr);
        connect(c, (struct sockaddr*)&saddr, sizeof(saddr));

        const char *msgs[] = {"hello\\n","world\\n","quit\\n"};
        char buf[64];
        for (int i = 0; i < 3; i++) {
            send(c, msgs[i], strlen(msgs[i]), 0);
            ssize_t n = recv(c, buf, sizeof(buf)-1, 0);
            if (n > 0) { buf[n]=0; printf("client echo: %s", buf); }
        }
        close(c);
        _exit(0);
    }

    /* 服务端接受一个连接 */
    int conn = accept(srv, NULL, NULL);
    char buf[64]; ssize_t n;
    while ((n = recv(conn, buf, sizeof(buf)-1, 0)) > 0) {
        buf[n]=0;
        printf("server got: %s", buf);
        send(conn, buf, n, 0);   /* echo back */
        if (strstr(buf, "quit")) break;
    }
    close(conn); close(srv);
    wait(NULL);
    return 0;
}` },
      { name: 'UDP 广播', name_en: 'UDP Broadcast', desc: 'UDP 一发多收：SO_BROADCAST + INADDR_BROADCAST', desc_en: 'UDP broadcast: one sender, multiple receivers — SO_BROADCAST + INADDR_BROADCAST',
        code: `#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>
#include <sys/wait.h>

#define PORT 19989

/* 启动 2 个接收者，1 个广播发送者 */
int main() {
    /* 接收者 1 */
    if (fork() == 0) {
        int s = socket(AF_INET, SOCK_DGRAM, 0);
        int yes = 1; setsockopt(s, SOL_SOCKET, SO_REUSEPORT, &yes, sizeof(yes));
        struct sockaddr_in a = { AF_INET, htons(PORT), {INADDR_ANY} };
        bind(s, (struct sockaddr*)&a, sizeof(a));
        char buf[64]; struct sockaddr_in from; socklen_t fl=sizeof(from);
        recvfrom(s, buf, sizeof(buf)-1, 0, (struct sockaddr*)&from, &fl);
        printf("receiver-1 got: %s\\n", buf);
        _exit(0);
    }
    /* 接收者 2 */
    if (fork() == 0) {
        int s = socket(AF_INET, SOCK_DGRAM, 0);
        int yes = 1; setsockopt(s, SOL_SOCKET, SO_REUSEPORT, &yes, sizeof(yes));
        struct sockaddr_in a = { AF_INET, htons(PORT), {INADDR_ANY} };
        bind(s, (struct sockaddr*)&a, sizeof(a));
        char buf[64]; struct sockaddr_in from; socklen_t fl=sizeof(from);
        recvfrom(s, buf, sizeof(buf)-1, 0, (struct sockaddr*)&from, &fl);
        printf("receiver-2 got: %s\\n", buf);
        _exit(0);
    }

    sleep(0);
    /* 发送者: SO_BROADCAST 允许向广播地址发送 */
    int s = socket(AF_INET, SOCK_DGRAM, 0);
    int bcast = 1; setsockopt(s, SOL_SOCKET, SO_BROADCAST, &bcast, sizeof(bcast));
    struct sockaddr_in dst = { AF_INET, htons(PORT), {INADDR_BROADCAST} };
    const char *msg = "broadcast hello!";
    sendto(s, msg, strlen(msg), 0, (struct sockaddr*)&dst, sizeof(dst));
    printf("sent broadcast\\n");
    close(s);
    wait(NULL); wait(NULL);
    return 0;
}` },
    ],
  },

  select: {
    name: 'I/O Multiplexing', icon: '⚡', chapter: 'Ch. 63', vol: 2,
    desc: 'Three APIs allow monitoring multiple fds: select() (portable, O(n), 1024-fd limit), poll() (no limit, still O(n)), epoll (Linux-only, O(1) per event). epoll uses a red-black tree and a ready-list — used by every modern Linux server.',
    syscalls: [
      { name: 'select', sig: 'int select(int nfds, fd_set *rfds, fd_set *wfds, fd_set *efds, struct timeval *tv)' },
      { name: 'poll',   sig: 'int poll(struct pollfd *fds, nfds_t nfds, int timeout_ms)' },
      { name: 'epoll_create1', sig: 'int epoll_create1(int flags)' },
      { name: 'epoll_ctl',     sig: 'int epoll_ctl(int epfd, int op, int fd, struct epoll_event *ev)' },
      { name: 'epoll_wait',    sig: 'int epoll_wait(int epfd, struct epoll_event *evs, int max, int timeout_ms)' },
    ],
    code: `/* TLPI §63.2 — select() on a pipe */
#include <sys/select.h>
#include <unistd.h>
#include <stdio.h>

int main() {
    int pfd[2]; pipe(pfd);
    write(pfd[1], "ready!", 6);

    fd_set rfds; FD_ZERO(&rfds); FD_SET(pfd[0], &rfds);
    struct timeval tv = { .tv_sec=1 };

    int ret = select(pfd[0]+1, &rfds, NULL, NULL, &tv);
    if (ret > 0 && FD_ISSET(pfd[0], &rfds)) {
        char buf[16];
        ssize_t n = read(pfd[0], buf, sizeof(buf)-1);
        buf[n]='\\0';
        printf("select: fd ready, read: %s\\n", buf);
    } else if (ret == 0) printf("timeout\\n");
    close(pfd[0]); close(pfd[1]);
    return 0;
}`,
    notes: 'select() rebuilds fd_set on every call — O(n) scan of all bits up to nfds. poll() uses an array of structs (no bit-scanning limit). epoll is O(1): it stores ready events in a linked list and only returns what\'s ready. Use EPOLLET (edge-triggered) with non-blocking fds for maximum performance.',
    examples: [
      { name: 'poll() 多 fd', name_en: 'poll() Multiple fds', desc: 'poll 同时监听两个管道，无 fd 数量上限', desc_en: 'poll monitors two pipes simultaneously — no fd count limit', code: `#include <poll.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

int main() {
    int p1[2], p2[2];
    pipe(p1); pipe(p2);

    write(p1[1], "pipe1 ready", 11);
    write(p2[1], "pipe2 ready", 11);

    struct pollfd fds[2] = {
        { .fd = p1[0], .events = POLLIN },
        { .fd = p2[0], .events = POLLIN },
    };

    int n = poll(fds, 2, 1000 /* ms timeout */);
    printf("poll returned %d ready fds\\n", n);

    char buf[32];
    for (int i = 0; i < 2; i++) {
        if (fds[i].revents & POLLIN) {
            ssize_t k = read(fds[i].fd, buf, sizeof(buf)-1);
            buf[k] = '\\0';
            printf("fd[%d]: %s\\n", i, buf);
        }
    }
    close(p1[0]); close(p1[1]);
    close(p2[0]); close(p2[1]);
    return 0;
}` },
      { name: 'epoll ET 边缘触发', name_en: 'epoll ET Edge-Triggered', desc: 'EPOLLET 模式：仅在状态变化时通知一次，需读尽', desc_en: 'EPOLLET edge-triggered mode: notified only once per state change — must drain the fd', code: `#include <sys/epoll.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>
#include <errno.h>

int set_nonblock(int fd) {
    return fcntl(fd, F_SETFL, fcntl(fd, F_GETFL) | O_NONBLOCK);
}

int main() {
    int pfd[2]; pipe(pfd);
    set_nonblock(pfd[0]);  /* EPOLLET requires non-blocking */

    int ep = epoll_create1(0);
    struct epoll_event ev = {
        .events = EPOLLIN | EPOLLET,  /* edge-triggered */
        .data.fd = pfd[0],
    };
    epoll_ctl(ep, EPOLL_CTL_ADD, pfd[0], &ev);

    /* Write data in two chunks — ET only fires once */
    write(pfd[1], "hello", 5);
    write(pfd[1], "world", 5);

    struct epoll_event evs[4];
    int n = epoll_wait(ep, evs, 4, 1000);
    printf("epoll_wait returned %d events\\n", n);

    /* Must drain ALL data on ET notification */
    char buf[4]; ssize_t r;
    while ((r = read(pfd[0], buf, sizeof(buf))) > 0)
        printf("read %zd bytes: %.*s\\n", r, (int)r, buf);
    if (errno == EAGAIN) printf("EAGAIN: fd drained\\n");

    close(ep); close(pfd[0]); close(pfd[1]);
    return 0;
}` },
      { name: 'epoll 超时', name_en: 'epoll Timeout', desc: 'epoll_wait 超时：-1 永久阻塞，0 立即返回，>0 毫秒', desc_en: 'epoll_wait timeout: -1 blocks forever, 0 returns immediately, >0 waits N ms', code: `#include <sys/epoll.h>
#include <unistd.h>
#include <stdio.h>
#include <time.h>

int main() {
    int pfd[2]; pipe(pfd);  /* empty pipe — nothing to read */

    int ep = epoll_create1(0);
    struct epoll_event ev = { .events = EPOLLIN, .data.fd = pfd[0] };
    epoll_ctl(ep, EPOLL_CTL_ADD, pfd[0], &ev);

    struct epoll_event evs[1];

    /* timeout = 200 ms */
    struct timespec t0, t1;
    clock_gettime(CLOCK_MONOTONIC, &t0);
    int n = epoll_wait(ep, evs, 1, 200);
    clock_gettime(CLOCK_MONOTONIC, &t1);

    long elapsed_ms = (t1.tv_sec - t0.tv_sec) * 1000 +
                      (t1.tv_nsec - t0.tv_nsec) / 1000000;
    if (n == 0)
        printf("timeout after ~%ld ms (no events)\\n", elapsed_ms);
    else
        printf("event ready (unexpected)\\n");

    close(ep); close(pfd[0]); close(pfd[1]);
    return 0;
}` },
    ],
    demoCode: `/* Demo: select, poll, epoll — all three on a self-pipe */
#include <sys/select.h>
#include <poll.h>
#include <sys/epoll.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

int main() {
    int pfd[2]; pipe(pfd);
    write(pfd[1], "test", 4);
    char buf[32];

    /* select */
    fd_set r; FD_ZERO(&r); FD_SET(pfd[0],&r);
    struct timeval tv={1,0};
    int n=select(pfd[0]+1,&r,NULL,NULL,&tv);
    if(n>0){ssize_t k=read(pfd[0],buf,sizeof(buf)-1);buf[k]=0;printf("select: %s\\n",buf);}

    /* re-fill pipe */
    write(pfd[1],"test",4);

    /* poll */
    struct pollfd pf={.fd=pfd[0],.events=POLLIN};
    n=poll(&pf,1,1000);
    if(n>0&&(pf.revents&POLLIN)){ssize_t k=read(pfd[0],buf,sizeof(buf)-1);buf[k]=0;printf("poll:   %s\\n",buf);}

    /* re-fill pipe */
    write(pfd[1],"test",4);

    /* epoll */
    int ep=epoll_create1(0);
    struct epoll_event ev={.events=EPOLLIN,.data.fd=pfd[0]};
    epoll_ctl(ep,EPOLL_CTL_ADD,pfd[0],&ev);
    struct epoll_event evs[1];
    n=epoll_wait(ep,evs,1,1000);
    if(n>0){ssize_t k=read(pfd[0],buf,sizeof(buf)-1);buf[k]=0;printf("epoll:  %s\\n",buf);}
    close(ep); close(pfd[0]); close(pfd[1]);
    return 0;
}`,
  },

  dupfcntl: {
    name: 'dup & fcntl', icon: '🔗', chapter: 'Ch. 5', vol: 1,
    desc: 'dup() and dup2() duplicate file descriptors — both old and new fd refer to the same open file description (same offset, same flags). fcntl() inspects or modifies descriptor flags (FD_CLOEXEC) and file status flags (O_NONBLOCK, O_APPEND). Shell I/O redirection is built on dup2().',
    syscalls: [
      { name: 'dup',   sig: 'int dup(int oldfd)' },
      { name: 'dup2',  sig: 'int dup2(int oldfd, int newfd)' },
      { name: 'fcntl', sig: 'int fcntl(int fd, int cmd, ... /* arg */)' },
    ],
    code: `/* TLPI §5.5 — dup2: redirect stdout to a file then restore */
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>

int main() {
    int fd = open("/tmp/tlpi_dup.txt",
                  O_WRONLY|O_CREAT|O_TRUNC, 0644);

    /* replace stdout (fd 1) with our file */
    dup2(fd, STDOUT_FILENO);
    close(fd);

    printf("This goes to the file, not the terminal\\n");
    fflush(stdout);

    /* restore via /dev/tty */
    int tty = open("/dev/tty", O_WRONLY);
    dup2(tty, STDOUT_FILENO);
    close(tty);

    printf("Back on terminal\\n");
    unlink("/tmp/tlpi_dup.txt");
    return 0;
}`,
    notes: 'dup2() is the foundation of shell redirection (< > >>). Both descriptors share one struct file — the file offset is the same object. FD_CLOEXEC (set via fcntl F_SETFD) closes the fd automatically on exec, eliminating the open()+close() race in multi-threaded code.',
    demoCode: `/* Demo: dup2 redirect + fcntl flag inspection */
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

int main() {
    /* 1. FD_CLOEXEC on stdin */
    int flags = fcntl(STDIN_FILENO, F_GETFD);
    printf("stdin  FD_CLOEXEC: %s\\n",
           (flags & FD_CLOEXEC) ? "set" : "not set");

    /* 2. file status flags on stdout */
    int fl = fcntl(STDOUT_FILENO, F_GETFL);
    printf("stdout O_APPEND  : %s\\n",
           (fl & O_APPEND) ? "yes" : "no");

    /* 3. dup — two fds share one file offset */
    int fd = open("/tmp/tlpi_dup_demo.txt",
                  O_RDWR|O_CREAT|O_TRUNC, 0644);
    int fd2 = dup(fd);
    write(fd,  "hello ", 6);
    write(fd2, "world\\n", 7);   /* offset continues from fd's write */
    lseek(fd, 0, SEEK_SET);
    char buf[32];
    ssize_t n = read(fd, buf, sizeof(buf)-1);
    buf[n] = '\\0';
    printf("file   contents  : %s", buf);
    close(fd); close(fd2);
    unlink("/tmp/tlpi_dup_demo.txt");
    return 0;
}`,
  },

  users: {
    name: 'Users & Groups', icon: '👤', chapter: 'Ch. 8', vol: 1,
    desc: 'The password database (/etc/passwd) and group database (/etc/group) are accessed via getpwnam(), getpwuid(), getgrnam(), getgrgid(). Each returns a pointer to static storage — copy strings before the next call. Reentrant _r variants are required in multi-threaded code.',
    syscalls: [
      { name: 'getpwnam',  sig: 'struct passwd *getpwnam(const char *name)' },
      { name: 'getpwuid',  sig: 'struct passwd *getpwuid(uid_t uid)' },
      { name: 'getgrnam',  sig: 'struct group  *getgrnam(const char *name)' },
      { name: 'getgrgid',  sig: 'struct group  *getgrgid(gid_t gid)' },
    ],
    code: `/* TLPI §8.1 — look up current user's passwd & group entry */
#include <pwd.h>
#include <grp.h>
#include <unistd.h>
#include <stdio.h>

int main() {
    uid_t uid = getuid();
    struct passwd *pw = getpwuid(uid);
    if (!pw) { perror("getpwuid"); return 1; }

    printf("login : %s\\n", pw->pw_name);
    printf("uid   : %d\\n", pw->pw_uid);
    printf("gid   : %d\\n", pw->pw_gid);
    printf("home  : %s\\n", pw->pw_dir);
    printf("shell : %s\\n", pw->pw_shell);

    struct group *gr = getgrgid(pw->pw_gid);
    if (gr)
        printf("group : %s\\n", gr->gr_name);
    return 0;
}`,
    notes: 'getpwnam() returns a pointer to a static buffer — it is not thread-safe. Use getpwnam_r() in multi-threaded programs. On modern Linux, NSS (Name Service Switch, /etc/nsswitch.conf) routes these calls transparently to files, LDAP, or NIS.',
    demoCode: `/* Demo: iterate /etc/passwd, list first 10 users */
#include <pwd.h>
#include <grp.h>
#include <stdio.h>

int main() {
    struct passwd *pw;
    setpwent();
    int count = 0;
    while ((pw = getpwent()) != NULL) {
        struct group *gr = getgrgid(pw->pw_gid);
        printf("%-16s uid=%-6d gid=%-6d group=%-12s home=%s\\n",
               pw->pw_name, pw->pw_uid, pw->pw_gid,
               gr ? gr->gr_name : "?", pw->pw_dir);
        if (++count >= 10) { printf("... (truncated)\\n"); break; }
    }
    endpwent();
    return 0;
}`,
  },

  sysconf: {
    name: 'System Limits', icon: '📏', chapter: 'Ch. 11', vol: 1,
    desc: 'POSIX defines limits (OPEN_MAX, NAME_MAX, …) that may vary at compile time or run time. sysconf() queries run-time system limits; pathconf() queries filesystem-specific limits. Always query at run time rather than hard-coding constants like 4096 or 1024.',
    syscalls: [
      { name: 'sysconf',   sig: 'long sysconf(int name)' },
      { name: 'pathconf',  sig: 'long pathconf(const char *path, int name)' },
      { name: 'fpathconf', sig: 'long fpathconf(int fd, int name)' },
    ],
    code: `/* TLPI §11.1 — query common system limits */
#include <unistd.h>
#include <stdio.h>

int main() {
    printf("OPEN_MAX         : %ld\\n", sysconf(_SC_OPEN_MAX));
    printf("CLK_TCK          : %ld\\n", sysconf(_SC_CLK_TCK));
    printf("PAGE_SIZE        : %ld\\n", sysconf(_SC_PAGESIZE));
    printf("NPROCESSORS_ONLN : %ld\\n", sysconf(_SC_NPROCESSORS_ONLN));

    /* filesystem-specific */
    printf("NAME_MAX(/tmp)   : %ld\\n", pathconf("/tmp", _PC_NAME_MAX));
    printf("PATH_MAX(/tmp)   : %ld\\n", pathconf("/tmp", _PC_PATH_MAX));
    return 0;
}`,
    notes: 'A return of -1 with errno==0 means the limit is indeterminate (no bound set). Compile-time macros like OPEN_MAX give the minimum guaranteed value; sysconf() reveals the actual current value, which is usually much higher. Use sysconf(_SC_PAGESIZE) — never hard-code 4096.',
    demoCode: `/* Demo: page size, CPU count, open-file limit, rlimit */
#include <unistd.h>
#include <stdio.h>
#include <sys/resource.h>

int main() {
    long page  = sysconf(_SC_PAGESIZE);
    long cpus  = sysconf(_SC_NPROCESSORS_ONLN);
    long open  = sysconf(_SC_OPEN_MAX);
    long clktck = sysconf(_SC_CLK_TCK);

    printf("Page size         : %ld bytes (%ld KB)\\n", page, page/1024);
    printf("CPUs online       : %ld\\n", cpus);
    printf("Max open fds      : %ld\\n", open);
    printf("Clock ticks/sec   : %ld\\n", clktck);
    printf("NAME_MAX /tmp     : %ld\\n", pathconf("/tmp", _PC_NAME_MAX));

    struct rlimit rl;
    getrlimit(RLIMIT_NOFILE, &rl);
    printf("RLIMIT_NOFILE soft: %lu\\n", (unsigned long)rl.rlim_cur);
    printf("RLIMIT_NOFILE hard: %lu\\n", (unsigned long)rl.rlim_max);
    return 0;
}`,
  },

  inotify: {
    name: 'inotify', icon: '👁️', chapter: 'Ch. 19', vol: 1,
    desc: 'inotify is a Linux-specific API for monitoring filesystem events without polling. inotify_init1() returns a file descriptor; inotify_add_watch() registers a path with an event mask (IN_CREATE, IN_MODIFY, IN_DELETE, IN_MOVED_FROM/TO, …). Events are read as inotify_event structs from the fd.',
    syscalls: [
      { name: 'inotify_init1',     sig: 'int inotify_init1(int flags)' },
      { name: 'inotify_add_watch', sig: 'int inotify_add_watch(int fd, const char *path, uint32_t mask)' },
      { name: 'inotify_rm_watch',  sig: 'int inotify_rm_watch(int fd, int wd)' },
    ],
    code: `/* TLPI §19.1 — watch /tmp for create/delete events */
#include <sys/inotify.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

#define BUF_LEN (10 * (sizeof(struct inotify_event) + 256))

int main() {
    int ifd = inotify_init1(IN_NONBLOCK);
    int wd  = inotify_add_watch(ifd, "/tmp",
                                IN_CREATE | IN_DELETE | IN_MODIFY);
    printf("Watching /tmp (wd=%d)\\n", wd);

    system("touch /tmp/_tlpi_inotify_test");

    char buf[BUF_LEN];
    ssize_t n = read(ifd, buf, BUF_LEN);
    for (char *p = buf; p < buf + n; ) {
        struct inotify_event *ev = (struct inotify_event *)p;
        const char *kind =
            (ev->mask & IN_CREATE) ? "CREATE" :
            (ev->mask & IN_DELETE) ? "DELETE" : "MODIFY";
        printf("event %-8s name=%s\\n",
               kind, ev->len ? ev->name : "(none)");
        p += sizeof(*ev) + ev->len;
    }
    system("rm -f /tmp/_tlpi_inotify_test");
    close(ifd);
    return 0;
}`,
    notes: 'IN_MOVED_FROM / IN_MOVED_TO share a cookie field so you can correlate renames across directories. Use inotify_init1(IN_CLOEXEC|IN_NONBLOCK) in production. Each watch descriptor consumes kernel memory — call inotify_rm_watch() when done. Tools like inotifywait are wrappers around this API.',
    demoCode: `/* Demo: create, modify, delete — catch all three events */
#include <sys/inotify.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

#define EV_SIZE (sizeof(struct inotify_event))
#define BUF_LEN (16 * (EV_SIZE + 256))

static void drain(int ifd) {
    char buf[BUF_LEN];
    ssize_t n = read(ifd, buf, BUF_LEN);
    if (n <= 0) return;
    for (char *p = buf; p < buf + n; ) {
        struct inotify_event *e = (struct inotify_event *)p;
        const char *evt =
            (e->mask & IN_CREATE) ? "CREATE" :
            (e->mask & IN_MODIFY) ? "MODIFY" :
            (e->mask & IN_DELETE) ? "DELETE" : "OTHER";
        printf("  %-8s %s\\n", evt, e->len ? e->name : "");
        p += EV_SIZE + e->len;
    }
}

int main() {
    int ifd = inotify_init1(IN_NONBLOCK);
    inotify_add_watch(ifd, "/tmp", IN_CREATE|IN_MODIFY|IN_DELETE);

    system("touch /tmp/_inotify_demo");
    usleep(5000);  drain(ifd);

    system("echo data >> /tmp/_inotify_demo");
    usleep(5000);  drain(ifd);

    system("rm -f /tmp/_inotify_demo");
    usleep(5000);  drain(ifd);

    close(ifd);
    return 0;
}`,
  },

  atexit: {
    name: 'Process Termination', icon: '🚪', chapter: 'Ch. 25', vol: 1,
    desc: 'exit() flushes stdio buffers and invokes atexit() handlers in LIFO order before calling _exit(). _exit() skips all that and goes directly to the kernel. atexit() and on_exit() (GNU) register cleanup functions. The low 8 bits of the exit status are visible to the parent via wait().',
    syscalls: [
      { name: 'exit',    sig: 'void exit(int status)' },
      { name: '_exit',   sig: 'void _exit(int status)' },
      { name: 'atexit',  sig: 'int atexit(void (*func)(void))' },
      { name: 'on_exit', sig: 'int on_exit(void (*func)(int, void*), void *arg)' },
    ],
    code: `/* TLPI §25.3 — atexit cleanup handlers run LIFO */
#include <stdio.h>
#include <stdlib.h>

void cleanup1(void) { printf("cleanup 1 (registered last, runs first)\\n"); }
void cleanup2(void) { printf("cleanup 2\\n"); }
void cleanup3(void) { printf("cleanup 3 (registered first, runs last)\\n"); }

int main() {
    atexit(cleanup3);
    atexit(cleanup2);
    atexit(cleanup1);
    printf("main: calling exit()\\n");
    exit(EXIT_SUCCESS);
    /* handlers run LIFO: 1 → 2 → 3 */
}`,
    notes: 'atexit() handlers run only when exit() is called — not on _exit(), abort(), or fatal signals. They run in LIFO order. Handlers cannot receive the exit status; use on_exit() (GNU extension) if needed. After fork(), the child inherits registered handlers — be careful to guard against double cleanup.',
    demoCode: `/* Demo: atexit in parent and child after fork */
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/wait.h>

void cleanup(void) {
    printf("cleanup() called in PID %d\\n", (int)getpid());
}

int main() {
    atexit(cleanup);
    printf("parent PID: %d\\n", (int)getpid());

    pid_t pid = fork();
    if (pid == 0) {
        /* child inherits atexit handlers */
        printf("child  PID: %d — calling exit()\\n", (int)getpid());
        exit(0);
    }
    wait(NULL);
    printf("parent: child done, parent now exits\\n");
    return 0;  /* cleanup runs once per process */
}`,
  },

  execve: {
    name: 'Program Execution', icon: '🚀', chapter: 'Ch. 27', vol: 1,
    desc: 'execve() replaces the calling process\'s memory image with a new program — same PID, new code/data/stack. The exec family (execlp, execvp, execve, …) are libc wrappers. On success execve() never returns. Combined with fork(), this is the classic UNIX process model: fork then exec.',
    syscalls: [
      { name: 'execve',  sig: 'int execve(const char *path, char *const argv[], char *const envp[])' },
      { name: 'execlp',  sig: 'int execlp(const char *file, const char *arg, ... /*, NULL */)' },
      { name: 'execvp',  sig: 'int execvp(const char *file, char *const argv[])' },
    ],
    code: `/* TLPI §27.2 — fork + execvp to run ls -l /tmp */
#include <unistd.h>
#include <sys/wait.h>
#include <stdio.h>

int main() {
    pid_t pid = fork();
    if (pid == 0) {
        /* child replaces itself with ls */
        char *argv[] = { "ls", "-l", "/tmp", NULL };
        execvp("ls", argv);
        perror("execvp");  /* only reached on error */
        _exit(1);
    }
    int status;
    waitpid(pid, &status, 0);
    printf("child exited: %d\\n", WEXITSTATUS(status));
    return 0;
}`,
    notes: 'After execve(), open file descriptors without FD_CLOEXEC survive. Signal dispositions are reset to SIG_DFL. The exec family differs only in how argv/envp are passed: l=varargs list, v=array, p=PATH search, e=explicit envp. Use execve() when you need precise control; execlp()/execvp() for convenience.',
    examples: [
      { name: 'exec 家族对比', name_en: 'exec Family Comparison', desc: 'execlp/execvp/execve 三种变体对比', desc_en: 'Compare execlp / execvp / execve variants', code: `#include <unistd.h>
#include <sys/wait.h>
#include <stdio.h>

void run(const char *label) {
    pid_t pid = fork();
    if (pid == 0) {
        if (label[0] == 'l') {
            /* execlp: PATH search, varargs */
            execlp("echo", "echo", "hello from execlp", NULL);
        } else if (label[0] == 'v') {
            /* execvp: PATH search, array */
            char *argv[] = { "echo", "hello from execvp", NULL };
            execvp("echo", argv);
        } else {
            /* execve: full path, explicit env */
            char *argv[] = { "echo", "hello from execve", NULL };
            char *envp[] = { "HOME=/tmp", NULL };
            execve("/bin/echo", argv, envp);
        }
        _exit(1);
    }
    int st; waitpid(pid, &st, 0);
    printf("[%s] exit=%d\\n", label, WEXITSTATUS(st));
}

int main() {
    run("execlp");
    run("execvp");
    run("execve");
    return 0;
}` },
      { name: 'FD_CLOEXEC 继承', name_en: 'FD_CLOEXEC Inheritance', desc: 'exec 后 fd 默认继承，FD_CLOEXEC 可阻止泄漏', desc_en: 'File descriptors survive exec by default; FD_CLOEXEC prevents the leak', code: `#include <unistd.h>
#include <fcntl.h>
#include <sys/wait.h>
#include <stdio.h>

int main() {
    /* Open without CLOEXEC — fd survives exec */
    int fd_leak = open("/tmp/test_leak.txt", O_RDWR|O_CREAT|O_TRUNC, 0600);

    /* Open with CLOEXEC — fd closed on exec */
    int fd_safe = open("/tmp/test_safe.txt", O_RDWR|O_CREAT|O_TRUNC|O_CLOEXEC, 0600);

    printf("fd_leak=%d fd_safe=%d\\n", fd_leak, fd_safe);

    if (fork() == 0) {
        /* /proc/self/fd shows which fds are open */
        char *argv[] = { "ls", "-la",
            "/proc/self/fd", NULL };
        execvp("ls", argv);
        _exit(1);
    }
    wait(NULL);
    close(fd_leak); close(fd_safe);
    unlink("/tmp/test_leak.txt");
    unlink("/tmp/test_safe.txt");
    return 0;
}` },
      { name: '简单 Shell 实现', name_en: 'Mini Shell', desc: '用 fork+exec+waitpid 实现一个极简 shell', desc_en: 'Implement a minimal shell with fork+exec+waitpid', code: `#include <unistd.h>
#include <sys/wait.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#define MAXARGS 64

int main() {
    char line[256];
    while (1) {
        printf("sh$ ");
        fflush(stdout);
        if (!fgets(line, sizeof(line), stdin)) break;
        line[strcspn(line, "\\n")] = '\\0';
        if (!*line) continue;
        if (strcmp(line, "exit") == 0) break;

        /* tokenize */
        char *argv[MAXARGS]; int argc = 0;
        char *tok = strtok(line, " ");
        while (tok && argc < MAXARGS-1)
            argv[argc++] = tok, tok = strtok(NULL, " ");
        argv[argc] = NULL;

        pid_t pid = fork();
        if (pid == 0) {
            execvp(argv[0], argv);
            fprintf(stderr, "%s: command not found\\n", argv[0]);
            _exit(127);
        }
        int status; waitpid(pid, &status, 0);
        printf("[exit %d]\\n", WEXITSTATUS(status));
    }
    return 0;
}` },
    ],
    demoCode: `/* Demo: fork+exec pipeline — ls /etc | wc -l */
#include <unistd.h>
#include <sys/wait.h>
#include <stdio.h>

int main() {
    int pfd[2];
    pipe(pfd);

    /* left: ls /etc */
    pid_t p1 = fork();
    if (p1 == 0) {
        dup2(pfd[1], STDOUT_FILENO);
        close(pfd[0]); close(pfd[1]);
        execlp("ls", "ls", "/etc", NULL);
        _exit(1);
    }

    /* right: wc -l */
    pid_t p2 = fork();
    if (p2 == 0) {
        dup2(pfd[0], STDIN_FILENO);
        close(pfd[0]); close(pfd[1]);
        execlp("wc", "wc", "-l", NULL);
        _exit(1);
    }

    close(pfd[0]); close(pfd[1]);
    waitpid(p1, NULL, 0);
    waitpid(p2, NULL, 0);
    return 0;
}`,
  },

  mutex: {
    name: 'Thread Sync', icon: '🔐', chapter: 'Ch. 30', vol: 1,
    desc: 'pthread_mutex ensures only one thread at a time enters a critical section. pthread_cond lets threads sleep until a condition is true, atomically releasing the mutex while waiting. Together they implement all classic concurrency patterns: producer-consumer, barriers, readers-writers.',
    syscalls: [
      { name: 'pthread_mutex_lock',   sig: 'int pthread_mutex_lock(pthread_mutex_t *mutex)' },
      { name: 'pthread_mutex_unlock', sig: 'int pthread_mutex_unlock(pthread_mutex_t *mutex)' },
      { name: 'pthread_cond_wait',    sig: 'int pthread_cond_wait(pthread_cond_t *cond, pthread_mutex_t *mutex)' },
      { name: 'pthread_cond_signal',  sig: 'int pthread_cond_signal(pthread_cond_t *cond)' },
    ],
    code: `/* TLPI §30.1 — mutex protecting a shared counter */
#include <pthread.h>
#include <stdio.h>

static int counter = 0;
static pthread_mutex_t mtx = PTHREAD_MUTEX_INITIALIZER;

void *increment(void *arg) {
    for (int i = 0; i < 1000000; i++) {
        pthread_mutex_lock(&mtx);
        counter++;
        pthread_mutex_unlock(&mtx);
    }
    return NULL;
}

int main() {
    pthread_t t1, t2;
    pthread_create(&t1, NULL, increment, NULL);
    pthread_create(&t2, NULL, increment, NULL);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);
    printf("counter = %d (expected 2000000)\\n", counter);
    return 0;
}`,
    notes: 'Without the mutex, counter would be less than 2000000 due to lost updates (read-modify-write is not atomic). PTHREAD_MUTEX_INITIALIZER is for static/global mutexes; use pthread_mutex_init() on the stack. A mutex must be unlocked by the same thread that locked it — mutexes are not recursive by default.',
    demoCode: `/* Demo: producer-consumer with mutex + condition variable */
#include <pthread.h>
#include <stdio.h>
#include <unistd.h>

static int item = -1, ready = 0;
static pthread_mutex_t mtx  = PTHREAD_MUTEX_INITIALIZER;
static pthread_cond_t  cond = PTHREAD_COND_INITIALIZER;

void *producer(void *arg) {
    for (int i = 0; i < 5; i++) {
        pthread_mutex_lock(&mtx);
        item  = i * 10;
        ready = 1;
        printf("produced: %d\\n", item);
        pthread_cond_signal(&cond);
        pthread_mutex_unlock(&mtx);
        usleep(1000);
    }
    return NULL;
}

void *consumer(void *arg) {
    for (int i = 0; i < 5; i++) {
        pthread_mutex_lock(&mtx);
        while (!ready)
            pthread_cond_wait(&cond, &mtx);
        printf("consumed: %d\\n", item);
        ready = 0;
        pthread_mutex_unlock(&mtx);
    }
    return NULL;
}

int main() {
    pthread_t p, c;
    pthread_create(&p, NULL, producer, NULL);
    pthread_create(&c, NULL, consumer, NULL);
    pthread_join(p, NULL);
    pthread_join(c, NULL);
    return 0;
}`,
    examples: [
      { name: '竞态条件', name_en: 'Race Condition', desc: '不加锁的计数器 vs 加锁计数器：演示 race condition 造成结果错误', desc_en: 'Unlocked counter vs mutex-protected counter: demonstrating race condition data loss',
        code: `#include <pthread.h>
#include <stdio.h>

#define N_THREADS 4
#define N_ITERS   100000

long unsafe_counter = 0;
long safe_counter   = 0;
pthread_mutex_t mtx = PTHREAD_MUTEX_INITIALIZER;

void *unsafe_fn(void *_) {
    for (int i = 0; i < N_ITERS; i++)
        unsafe_counter++;   /* 竞态：read-modify-write 非原子 */
    return NULL;
}

void *safe_fn(void *_) {
    for (int i = 0; i < N_ITERS; i++) {
        pthread_mutex_lock(&mtx);
        safe_counter++;
        pthread_mutex_unlock(&mtx);
    }
    return NULL;
}

int main() {
    pthread_t t[N_THREADS];
    for (int i = 0; i < N_THREADS; i++)
        pthread_create(&t[i], NULL, unsafe_fn, NULL);
    for (int i = 0; i < N_THREADS; i++) pthread_join(t[i], NULL);
    printf("unsafe counter = %ld  (expected %d)\\n",
           unsafe_counter, N_THREADS * N_ITERS);

    for (int i = 0; i < N_THREADS; i++)
        pthread_create(&t[i], NULL, safe_fn, NULL);
    for (int i = 0; i < N_THREADS; i++) pthread_join(t[i], NULL);
    printf("safe  counter = %ld  (expected %d)\\n",
           safe_counter, N_THREADS * N_ITERS);
    return 0;
}` },
      { name: '线程局部存储 TLS', name_en: 'Thread-Local Storage (TLS)', desc: 'pthread_key_create + 每线程独立数据，__thread 关键字', desc_en: 'pthread_key_create + per-thread independent data, __thread keyword',
        code: `#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>

/* 方法1: __thread (GCC/Clang 扩展，最简单) */
static __thread int tls_val = 0;

/* 方法2: POSIX pthread_key_t (更通用) */
static pthread_key_t key;

static void key_destructor(void *val) {
    printf("TLS destructor called for key, val=%d\\n", *(int*)val);
    free(val);
}

void *thread_fn(void *arg) {
    int id = (int)(long)arg;

    /* __thread: 每线程独立 */
    tls_val = id * 100;
    printf("thread %d: tls_val=%d\\n", id, tls_val);

    /* pthread_key: 每线程独立 */
    int *p = malloc(sizeof(int));
    *p = id * 200;
    pthread_setspecific(key, p);
    printf("thread %d: key val=%d\\n", id,
           *(int*)pthread_getspecific(key));
    return NULL;
}

int main() {
    pthread_key_create(&key, key_destructor);
    pthread_t t[3];
    for (int i = 0; i < 3; i++)
        pthread_create(&t[i], NULL, thread_fn, (void*)(long)i);
    for (int i = 0; i < 3; i++) pthread_join(t[i], NULL);
    pthread_key_delete(key);
    return 0;
}` },
      { name: '读写锁 rwlock', name_en: 'Read-Write Lock', desc: '多读单写锁：允许并发读，写时独占', desc_en: 'Multiple concurrent readers, exclusive writer — pthread_rwlock',
        code: `#include <pthread.h>
#include <stdio.h>
#include <unistd.h>

static pthread_rwlock_t rwl = PTHREAD_RWLOCK_INITIALIZER;
static int shared_data = 0;

void *reader(void *arg) {
    int id = (int)(long)arg;
    for (int i = 0; i < 3; i++) {
        pthread_rwlock_rdlock(&rwl);   /* 允许多个读者并发持有 */
        printf("reader %d: data=%d\\n", id, shared_data);
        usleep(5000);                  /* 模拟读操作耗时 */
        pthread_rwlock_unlock(&rwl);
        usleep(1000);
    }
    return NULL;
}

void *writer(void *arg) {
    for (int i = 0; i < 2; i++) {
        usleep(8000);
        pthread_rwlock_wrlock(&rwl);   /* 写时独占，等待所有读者退出 */
        shared_data = (i + 1) * 42;
        printf("writer: updated data=%d\\n", shared_data);
        pthread_rwlock_unlock(&rwl);
    }
    return NULL;
}

int main() {
    pthread_t r[4], w;
    pthread_create(&w, NULL, writer, NULL);
    for (int i = 0; i < 4; i++)
        pthread_create(&r[i], NULL, reader, (void*)(long)i);
    pthread_join(w, NULL);
    for (int i = 0; i < 4; i++) pthread_join(r[i], NULL);
    return 0;
}` },
    ],
  },

  rlimit: {
    name: 'Resource Limits', icon: '📊', chapter: 'Ch. 36', vol: 1,
    desc: 'getrlimit()/setrlimit() control per-process resource limits: open files, stack size, CPU time, address space, core dump size. Each resource has a soft limit (currently enforced) and a hard limit (ceiling for the soft). Only root can raise the hard limit. prlimit() atomically gets and sets limits.',
    syscalls: [
      { name: 'getrlimit', sig: 'int getrlimit(int resource, struct rlimit *rlim)' },
      { name: 'setrlimit', sig: 'int setrlimit(int resource, const struct rlimit *rlim)' },
      { name: 'prlimit',   sig: 'int prlimit(pid_t pid, int res, const struct rlimit *new, struct rlimit *old)' },
    ],
    code: `/* TLPI §36.3 — inspect and lower RLIMIT_NOFILE */
#include <sys/resource.h>
#include <stdio.h>

int main() {
    struct rlimit rl;
    getrlimit(RLIMIT_NOFILE, &rl);
    printf("NOFILE before: soft=%lu hard=%lu\\n",
           (unsigned long)rl.rlim_cur,
           (unsigned long)rl.rlim_max);

    /* lower soft limit — unprivileged processes may do this */
    rl.rlim_cur = 20;
    setrlimit(RLIMIT_NOFILE, &rl);

    getrlimit(RLIMIT_NOFILE, &rl);
    printf("NOFILE after : soft=%lu\\n", (unsigned long)rl.rlim_cur);
    return 0;
}`,
    notes: 'Limits are inherited across fork() and preserved across exec(). RLIMIT_CORE=0 disables core dumps (useful in production). RLIMIT_AS limits virtual address space — effective for sandboxing. RLIMIT_NPROC limits the number of processes a user can create, preventing fork bombs.',
    demoCode: `/* Demo: display common resource limits */
#include <sys/resource.h>
#include <stdio.h>

static void show(const char *name, int res) {
    struct rlimit r;
    getrlimit(res, &r);
    char soft[24], hard[24];
    if (r.rlim_cur == RLIM_INFINITY)
        snprintf(soft, sizeof(soft), "unlimited");
    else
        snprintf(soft, sizeof(soft), "%lu", (unsigned long)r.rlim_cur);
    if (r.rlim_max == RLIM_INFINITY)
        snprintf(hard, sizeof(hard), "unlimited");
    else
        snprintf(hard, sizeof(hard), "%lu", (unsigned long)r.rlim_max);
    printf("%-18s soft=%-14s hard=%s\\n", name, soft, hard);
}

int main() {
    show("RLIMIT_NOFILE",  RLIMIT_NOFILE);
    show("RLIMIT_NPROC",   RLIMIT_NPROC);
    show("RLIMIT_STACK",   RLIMIT_STACK);
    show("RLIMIT_AS",      RLIMIT_AS);
    show("RLIMIT_CORE",    RLIMIT_CORE);
    show("RLIMIT_CPU",     RLIMIT_CPU);
    return 0;
}`,
  },

  dlopen: {
    name: 'Shared Libraries', icon: '📦', chapter: 'Ch. 41', vol: 2,
    desc: 'dlopen() loads a shared library at run time and returns an opaque handle. dlsym() looks up a symbol by name and returns a pointer to it. dlclose() decrements the reference count and unloads when it reaches zero. This mechanism underlies plugin systems, language extensions, and hot-reload.',
    syscalls: [
      { name: 'dlopen',  sig: 'void *dlopen(const char *filename, int flags)' },
      { name: 'dlsym',   sig: 'void *dlsym(void *handle, const char *symbol)' },
      { name: 'dlclose', sig: 'int dlclose(void *handle)' },
      { name: 'dlerror', sig: 'char *dlerror(void)' },
    ],
    code: `/* TLPI §41.5 — dlopen libm and call sin() at run time */
#include <dlfcn.h>
#include <stdio.h>

int main() {
    void *handle = dlopen("libm.so.6", RTLD_LAZY);
    if (!handle) {
        fprintf(stderr, "dlopen: %s\\n", dlerror());
        return 1;
    }
    dlerror();  /* clear any previous error */

    typedef double (*mathfn)(double);
    mathfn fn_sin = (mathfn)dlsym(handle, "sin");
    const char *err = dlerror();
    if (err) { fprintf(stderr, "dlsym: %s\\n", err); return 1; }

    printf("sin(π/2) = %f\\n", fn_sin(3.14159265358979 / 2));
    dlclose(handle);
    return 0;
}`,
    notes: 'RTLD_LAZY defers symbol resolution to first call; RTLD_NOW resolves everything at dlopen() time (better for catching missing symbols early). RTLD_GLOBAL makes symbols visible to subsequently loaded libraries. dlopen(NULL, ...) returns a handle for the main program itself.',
    demoCode: `/* Demo: dlopen libm — call floor, ceil, sqrt, fabs */
#include <dlfcn.h>
#include <stdio.h>

int main() {
    void *h = dlopen("libm.so.6", RTLD_LAZY);
    if (!h) { fprintf(stderr, "dlopen: %s\\n", dlerror()); return 1; }

    typedef double (*mathfn)(double);
    const char *names[] = { "floor", "ceil", "sqrt", "fabs", "log" };
    double arg = 2.718281828;

    for (int i = 0; i < 5; i++) {
        dlerror();
        mathfn fn = (mathfn)dlsym(h, names[i]);
        if (dlerror()) { printf("%-6s not found\\n", names[i]); continue; }
        printf("%-6s(%.6f) = %.6f\\n", names[i], arg, fn(arg));
    }
    dlclose(h);
    return 0;
}`,
  },

  unixsock: {
    name: 'Unix Domain Sockets', icon: '🔗', chapter: 'Ch. 57', vol: 2,
    desc: 'AF_UNIX (AF_LOCAL) sockets provide fast IPC within a single host without TCP/IP overhead. They appear as filesystem entries and support both SOCK_STREAM (connected) and SOCK_DGRAM (connectionless). socketpair() creates a pre-connected pair ideal for parent-child communication after fork().',
    syscalls: [
      { name: 'socket',     sig: 'int socket(int domain, int type, int protocol)' },
      { name: 'bind',       sig: 'int bind(int sockfd, const struct sockaddr *addr, socklen_t len)' },
      { name: 'socketpair', sig: 'int socketpair(int domain, int type, int protocol, int sv[2])' },
      { name: 'connect',    sig: 'int connect(int sockfd, const struct sockaddr *addr, socklen_t len)' },
    ],
    code: `/* TLPI §57.3 — socketpair for parent-child ping-pong */
#include <sys/socket.h>
#include <sys/wait.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

int main() {
    int sv[2];
    socketpair(AF_UNIX, SOCK_STREAM, 0, sv);

    if (fork() == 0) {
        /* child uses sv[1] */
        close(sv[0]);
        char buf[16];
        ssize_t n = read(sv[1], buf, sizeof(buf)-1);
        buf[n] = '\\0';
        printf("child  received: %s\\n", buf);
        write(sv[1], "pong", 4);
        close(sv[1]);
        _exit(0);
    }
    /* parent uses sv[0] */
    close(sv[1]);
    write(sv[0], "ping", 4);
    char buf[16];
    ssize_t n = read(sv[0], buf, sizeof(buf)-1);
    buf[n] = '\\0';
    printf("parent received: %s\\n", buf);
    close(sv[0]);
    wait(NULL);
    return 0;
}`,
    notes: 'Unix sockets support SCM_RIGHTS ancillary data to pass open file descriptors between processes — impossible with TCP. The filesystem path is the socket\'s identity; always unlink() it after use. Abstract namespace sockets (path beginning with \'\\0\') never appear in the filesystem and are auto-cleaned when the last fd closes.',
    demoCode: `/* Demo: AF_UNIX SOCK_STREAM — server + client in one process */
#include <sys/socket.h>
#include <sys/un.h>
#include <sys/wait.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

#define SOCK_PATH "/tmp/_tlpi_unix.sock"

int main() {
    unlink(SOCK_PATH);
    int srv = socket(AF_UNIX, SOCK_STREAM, 0);

    struct sockaddr_un addr;
    memset(&addr, 0, sizeof(addr));
    addr.sun_family = AF_UNIX;
    strncpy(addr.sun_path, SOCK_PATH, sizeof(addr.sun_path)-1);

    bind(srv, (struct sockaddr *)&addr, sizeof(addr));
    listen(srv, 5);

    if (fork() == 0) {
        /* client */
        close(srv);
        int cfd = socket(AF_UNIX, SOCK_STREAM, 0);
        connect(cfd, (struct sockaddr *)&addr, sizeof(addr));
        write(cfd, "hello unix", 10);
        char buf[32]; ssize_t n = read(cfd, buf, sizeof(buf)-1);
        buf[n] = '\\0';
        printf("client got : %s\\n", buf);
        close(cfd);
        _exit(0);
    }

    /* server accepts one connection */
    int cfd = accept(srv, NULL, NULL);
    char buf[32]; ssize_t n = read(cfd, buf, sizeof(buf)-1);
    buf[n] = '\\0';
    printf("server got : %s\\n", buf);
    write(cfd, "world!", 6);
    close(cfd); close(srv);
    wait(NULL);
    unlink(SOCK_PATH);
    return 0;
}`,
  },

  statfs: {
    name: 'File Systems', icon: '💾', chapter: 'Ch. 14', vol: 1,
    desc: 'statfs() returns filesystem statistics for the mount point containing a path: block size, total/free blocks, inode counts, and a magic number identifying the filesystem type. statvfs() is the POSIX-portable version. /proc/mounts lists all currently mounted filesystems.',
    syscalls: [
      { name: 'statfs',  sig: 'int statfs(const char *path, struct statfs *buf)' },
      { name: 'statvfs', sig: 'int statvfs(const char *path, struct statvfs *buf)' },
      { name: 'mount',   sig: 'int mount(const char *src, const char *tgt, const char *fs, unsigned long flags, const void *data)' },
    ],
    code: `/* TLPI §14.6 — statfs: query filesystem statistics */
#include <sys/vfs.h>
#include <stdio.h>

int main() {
    const char *paths[] = { "/", "/tmp", "/proc" };
    for (int i = 0; i < 3; i++) {
        struct statfs st;
        if (statfs(paths[i], &st) == -1) { perror(paths[i]); continue; }
        long long total_mb = (long long)st.f_blocks * st.f_bsize / (1024*1024);
        long long free_mb  = (long long)st.f_bfree  * st.f_bsize / (1024*1024);
        printf("%-6s  blksize=%-6ld  total=%5lld MB  free=%5lld MB  inodes=%llu\\n",
               paths[i], st.f_bsize, total_mb, free_mb,
               (unsigned long long)st.f_files);
    }
    return 0;
}`,
    notes: 'statfs() f_type holds a magic number identifying the filesystem (0xef53=ext4, 0x6969=NFS, 0x9fa0=/proc, 0x64646464=tmpfs). This is Linux-specific; use statvfs() for portable code. f_bavail gives blocks available to unprivileged users (< f_bfree because of reserved blocks).',
    demoCode: `/* Demo: statfs + parse /proc/mounts */
#include <sys/vfs.h>
#include <stdio.h>
#include <string.h>

int main() {
    /* statfs on several paths */
    const char *paths[] = { "/", "/tmp", "/proc", "/dev" };
    printf("%-8s %-10s %8s %8s %8s\\n",
           "path", "type-magic", "blksz", "totMB", "freeMB");
    for (int i = 0; i < 4; i++) {
        struct statfs st;
        if (statfs(paths[i], &st) == -1) continue;
        long long tot = (long long)st.f_blocks * st.f_bsize / (1024*1024);
        long long fre = (long long)st.f_bfree  * st.f_bsize / (1024*1024);
        printf("%-8s 0x%-8lx %8ld %8lld %8lld\\n",
               paths[i], (long)st.f_type, st.f_bsize, tot, fre);
    }

    /* first 5 lines of /proc/mounts */
    printf("\\n/proc/mounts (first 5):\\n");
    FILE *f = fopen("/proc/mounts", "r");
    if (f) {
        char line[256]; int n = 0;
        while (fgets(line, sizeof(line), f) && n++ < 5)
            printf("  %s", line);
        fclose(f);
    }
    return 0;
}`,
  },

  sighandler: {
    name: 'Signal Handlers', icon: '🎯', chapter: 'Ch. 21', vol: 1,
    desc: 'sigaction() is the preferred way to install a signal handler — it offers more control than signal(). SA_SIGINFO delivers a siginfo_t with the sender PID, signal value, and fault address. SA_RESTART makes interrupted slow syscalls restart automatically. Only async-signal-safe functions may be called inside a handler.',
    syscalls: [
      { name: 'sigaction',   sig: 'int sigaction(int sig, const struct sigaction *act, struct sigaction *old)' },
      { name: 'sigaltstack', sig: 'int sigaltstack(const stack_t *ss, stack_t *oss)' },
      { name: 'raise',       sig: 'int raise(int sig)' },
    ],
    code: `/* TLPI §21.3 — sigaction with SA_SIGINFO */
#include <signal.h>
#include <stdio.h>
#include <unistd.h>
#include <string.h>

static void handler(int sig, siginfo_t *si, void *ctx) {
    /* only async-signal-safe calls here; write() is safe */
    char buf[80];
    int n = snprintf(buf, sizeof(buf),
                     "caught signal %d  si_pid=%d  si_code=%d\\n",
                     sig, si->si_pid, si->si_code);
    write(STDOUT_FILENO, buf, n);
}

int main() {
    struct sigaction sa;
    memset(&sa, 0, sizeof(sa));
    sa.sa_sigaction = handler;
    sa.sa_flags = SA_SIGINFO | SA_RESTART;
    sigemptyset(&sa.sa_mask);

    sigaction(SIGUSR1, &sa, NULL);
    sigaction(SIGUSR2, &sa, NULL);

    printf("PID=%d — sending SIGUSR1 then SIGUSR2\\n", (int)getpid());
    kill(getpid(), SIGUSR1);
    kill(getpid(), SIGUSR2);
    printf("both signals handled\\n");
    return 0;
}`,
    notes: 'Never call non-async-signal-safe functions (malloc, printf, fclose) inside a handler — they may deadlock or corrupt state. Use write() for output. The siginfo_t.si_pid field tells you who sent the signal. SA_RESTART prevents EINTR on slow syscalls (read/write on pipes, sockets, etc.).',
    demoCode: `/* Demo: SA_SIGINFO — catch SIGSEGV and print fault address */
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>
#include <setjmp.h>

static sigjmp_buf jmpenv;

static void segv_handler(int sig, siginfo_t *si, void *ctx) {
    char buf[128];
    int n = snprintf(buf, sizeof(buf),
        "SIGSEGV: fault addr=%p  code=%d\\n",
        si->si_addr, si->si_code);
    write(STDOUT_FILENO, buf, n);
    siglongjmp(jmpenv, 1);  /* jump out of handler */
}

int main() {
    struct sigaction sa;
    memset(&sa, 0, sizeof(sa));
    sa.sa_sigaction = segv_handler;
    sa.sa_flags = SA_SIGINFO;
    sigemptyset(&sa.sa_mask);
    sigaction(SIGSEGV, &sa, NULL);

    /* also catch SIGUSR1 to show si_pid */
    struct sigaction sa2;
    memset(&sa2, 0, sizeof(sa2));
    sa2.sa_sigaction = (void(*)(int,siginfo_t*,void*))
        (void*)segv_handler;  /* reuse for demo */
    sa2.sa_flags = SA_SIGINFO;
    sigemptyset(&sa2.sa_mask);

    if (sigsetjmp(jmpenv, 1) == 0) {
        printf("about to dereference NULL...\\n");
        volatile int *p = NULL;
        (void)*p;  /* triggers SIGSEGV */
    } else {
        printf("recovered from SIGSEGV via siglongjmp\\n");
    }
    return 0;
}`,
  },

  sigmask: {
    name: 'Signal Masking', icon: '🛡️', chapter: 'Ch. 22', vol: 1,
    desc: 'sigprocmask() adds/removes signals from the process signal mask — blocked signals are queued until unblocked. sigpending() reveals which signals are waiting. sigsuspend() atomically replaces the mask and sleeps until a signal arrives — the safe way to wait for a specific signal.',
    syscalls: [
      { name: 'sigprocmask', sig: 'int sigprocmask(int how, const sigset_t *set, sigset_t *oldset)' },
      { name: 'sigpending',  sig: 'int sigpending(sigset_t *set)' },
      { name: 'sigsuspend',  sig: 'int sigsuspend(const sigset_t *mask)' },
      { name: 'sigwaitinfo', sig: 'int sigwaitinfo(const sigset_t *set, siginfo_t *info)' },
    ],
    code: `/* TLPI §22.1 — block SIGUSR1, send to self, then unblock */
#include <signal.h>
#include <stdio.h>
#include <unistd.h>

static volatile sig_atomic_t got_sig = 0;
static void handler(int sig) { got_sig = 1; }

int main() {
    struct sigaction sa = { .sa_handler = handler };
    sigemptyset(&sa.sa_mask);
    sigaction(SIGUSR1, &sa, NULL);

    sigset_t blockSet, prevMask, pending;
    sigemptyset(&blockSet);
    sigaddset(&blockSet, SIGUSR1);

    /* block SIGUSR1 */
    sigprocmask(SIG_BLOCK, &blockSet, &prevMask);
    printf("SIGUSR1 blocked — sending to self\\n");
    kill(getpid(), SIGUSR1);

    /* check it is pending */
    sigpending(&pending);
    printf("SIGUSR1 pending: %s\\n",
           sigismember(&pending, SIGUSR1) ? "yes" : "no");
    printf("got_sig before unblock: %d\\n", got_sig);

    /* restore mask — handler fires immediately */
    sigprocmask(SIG_SETMASK, &prevMask, NULL);
    printf("got_sig after unblock : %d\\n", got_sig);
    return 0;
}`,
    notes: 'Standard signals (< SIGRTMIN) are not queued — sending the same signal twice while blocked delivers it only once. Real-time signals (SIGRTMIN..SIGRTMAX) are queued in order. sigsuspend() is the only race-free way to wait for a signal: it replaces the mask and sleeps in one atomic operation.',
    demoCode: `/* Demo: sigwaitinfo — synchronously receive a queued signal */
#include <signal.h>
#include <stdio.h>
#include <unistd.h>
#include <sys/wait.h>

int main() {
    sigset_t mask;
    sigemptyset(&mask);
    sigaddset(&mask, SIGUSR1);
    sigaddset(&mask, SIGUSR2);

    /* block both so they queue */
    sigprocmask(SIG_BLOCK, &mask, NULL);

    /* child sends two signals */
    pid_t pid = fork();
    if (pid == 0) {
        kill(getppid(), SIGUSR1);
        kill(getppid(), SIGUSR2);
        _exit(0);
    }
    wait(NULL);

    /* synchronously receive each pending signal */
    for (int i = 0; i < 2; i++) {
        siginfo_t si;
        int sig = sigwaitinfo(&mask, &si);
        printf("received signal %d from PID %d\\n", sig, si.si_pid);
    }
    return 0;
}`,
  },

  waitchild: {
    name: 'Child Monitoring', icon: '🔭', chapter: 'Ch. 26', vol: 1,
    desc: 'waitpid() collects a child\'s exit status without blocking if WNOHANG is specified. WIFEXITED/WIFSIGNALED/WIFSTOPPED decode the status word. waitid() is the POSIX.1-2008 upgrade: it uses siginfo_t and supports P_PGID/P_ALL. SIGCHLD is sent to the parent when a child changes state.',
    syscalls: [
      { name: 'waitpid', sig: 'pid_t waitpid(pid_t pid, int *status, int options)' },
      { name: 'waitid',  sig: 'int waitid(idtype_t idtype, id_t id, siginfo_t *infop, int options)' },
      { name: 'wait3',   sig: 'pid_t wait3(int *status, int options, struct rusage *rusage)' },
    ],
    code: `/* TLPI §26.3 — WNOHANG polling loop */
#include <sys/wait.h>
#include <unistd.h>
#include <stdio.h>

int main() {
    pid_t pid = fork();
    if (pid == 0) {
        sleep(1);
        _exit(42);
    }

    int status, polls = 0;
    pid_t ret;
    do {
        ret = waitpid(pid, &status, WNOHANG);
        if (ret == 0) { polls++; usleep(200000); }
    } while (ret == 0);

    if (WIFEXITED(status))
        printf("child exited: %d  (polled %d times)\\n",
               WEXITSTATUS(status), polls);
    else if (WIFSIGNALED(status))
        printf("child killed by signal %d\\n", WTERMSIG(status));
    return 0;
}`,
    notes: 'WNOHANG returns 0 immediately if no child has changed state — ideal for polling in an event loop. WUNTRACED also catches children that were stopped by a signal. Use SIGCHLD + SA_NOCLDWAIT to auto-reap children and avoid zombies without calling wait() at all.',
    demoCode: `/* Demo: multiple children, collect all with WNOHANG */
#include <sys/wait.h>
#include <unistd.h>
#include <stdio.h>
#include <sys/resource.h>

int main() {
    /* spawn 4 children with different exit codes */
    for (int i = 1; i <= 4; i++) {
        if (fork() == 0) {
            usleep(i * 100000);  /* staggered exit times */
            _exit(i * 10);
        }
    }

    int reaped = 0;
    while (reaped < 4) {
        int status;
        struct rusage ru;
        pid_t pid = wait3(&status, WNOHANG, &ru);
        if (pid > 0) {
            printf("reaped PID %-6d  exit=%d  utime=%ld us\\n",
                   pid, WEXITSTATUS(status),
                   (long)ru.ru_utime.tv_usec);
            reaped++;
        } else {
            usleep(50000);
        }
    }
    printf("all %d children collected\\n", reaped);
    return 0;
}`,
  },

  rwlock: {
    name: 'Thread Safety', icon: '📖', chapter: 'Ch. 31', vol: 1,
    desc: 'pthread_rwlock allows multiple concurrent readers but exclusive writers — much faster than a mutex when reads dominate. pthread_once guarantees a function runs exactly once across all threads. __thread (or _Thread_local) declares thread-local storage with no synchronization overhead.',
    syscalls: [
      { name: 'pthread_rwlock_rdlock', sig: 'int pthread_rwlock_rdlock(pthread_rwlock_t *rwlock)' },
      { name: 'pthread_rwlock_wrlock', sig: 'int pthread_rwlock_wrlock(pthread_rwlock_t *rwlock)' },
      { name: 'pthread_once',          sig: 'int pthread_once(pthread_once_t *once, void (*init)(void))' },
    ],
    code: `/* TLPI §31.4 — pthread_rwlock: concurrent reads, exclusive write */
#include <pthread.h>
#include <stdio.h>
#include <unistd.h>

static int shared = 0;
static pthread_rwlock_t rwl = PTHREAD_RWLOCK_INITIALIZER;

void *reader(void *arg) {
    pthread_rwlock_rdlock(&rwl);
    printf("reader #%ld: shared = %d\\n", (long)arg, shared);
    usleep(40000);
    pthread_rwlock_unlock(&rwl);
    return NULL;
}

void *writer(void *arg) {
    pthread_rwlock_wrlock(&rwl);
    shared = (int)(long)arg * 100;
    printf("writer #%ld: shared = %d\\n", (long)arg, shared);
    pthread_rwlock_unlock(&rwl);
    return NULL;
}

int main() {
    pthread_t t[6];
    pthread_create(&t[0], NULL, reader, (void*)1L);
    pthread_create(&t[1], NULL, reader, (void*)2L);
    pthread_create(&t[2], NULL, writer, (void*)1L);
    pthread_create(&t[3], NULL, reader, (void*)3L);
    pthread_create(&t[4], NULL, writer, (void*)2L);
    pthread_create(&t[5], NULL, reader, (void*)4L);
    for (int i = 0; i < 6; i++) pthread_join(t[i], NULL);
    return 0;
}`,
    notes: 'Multiple threads can hold rdlock simultaneously; wrlock requires all readers to release first. On Linux, pthread_rwlock is biased toward readers by default — use PTHREAD_RWLOCK_PREFER_WRITER_NONRECURSIVE_NP to avoid writer starvation. Thread-local storage (__thread int x) gives each thread its own copy with zero synchronization.',
    demoCode: `/* Demo: pthread_once — one-time initialization across threads */
#include <pthread.h>
#include <stdio.h>

static int config_value = 0;
static pthread_once_t once_ctrl = PTHREAD_ONCE_INIT;

static void init_config(void) {
    config_value = 42;
    printf("init_config() called once in thread %lu\\n",
           (unsigned long)pthread_self());
}

void *worker(void *arg) {
    pthread_once(&once_ctrl, init_config);
    printf("thread %ld: config_value = %d\\n",
           (long)arg, config_value);
    return NULL;
}

int main() {
    pthread_t t[4];
    for (int i = 0; i < 4; i++)
        pthread_create(&t[i], NULL, worker, (void*)(long)i);
    for (int i = 0; i < 4; i++)
        pthread_join(t[i], NULL);
    return 0;
}`,
  },

  sysvsem: {
    name: 'SysV Semaphores', icon: '🚦', chapter: 'Ch. 47', vol: 2,
    desc: 'System V semaphores predate POSIX semaphores and operate on semaphore sets (arrays). semget() creates/opens a set; semop() performs atomic operations on one or more semaphores in a set; semctl() queries/sets values. They survive process death unless explicitly removed — use POSIX semaphores for new code.',
    syscalls: [
      { name: 'semget', sig: 'int semget(key_t key, int nsems, int semflg)' },
      { name: 'semop',  sig: 'int semop(int semid, struct sembuf *sops, size_t nsops)' },
      { name: 'semctl', sig: 'int semctl(int semid, int semnum, int cmd, ...)' },
    ],
    code: `/* TLPI §47.3 — SysV semaphore as a binary mutex */
#include <sys/sem.h>
#include <sys/wait.h>
#include <unistd.h>
#include <stdio.h>

union semun { int val; struct semid_ds *buf; unsigned short *array; };

static void sem_adj(int id, int delta) {
    struct sembuf sb = { .sem_num=0, .sem_op=(short)delta, .sem_flg=0 };
    semop(id, &sb, 1);
}

int main() {
    int semid = semget(IPC_PRIVATE, 1, IPC_CREAT|0600);
    union semun arg = { .val = 1 };
    semctl(semid, 0, SETVAL, arg);   /* binary semaphore → 1 */

    pid_t pid = fork();
    if (pid == 0) {
        sem_adj(semid, -1);          /* lock */
        printf("child  : in critical section\\n");
        sleep(1);
        printf("child  : releasing\\n");
        sem_adj(semid, +1);          /* unlock */
        _exit(0);
    }
    usleep(50000);                   /* let child lock first */
    printf("parent : waiting for lock…\\n");
    sem_adj(semid, -1);              /* blocks until child unlocks */
    printf("parent : acquired lock\\n");
    sem_adj(semid, +1);
    wait(NULL);
    semctl(semid, 0, IPC_RMID);
    return 0;
}`,
    notes: 'SysV semaphores persist after the process exits — always call semctl(IPC_RMID) for cleanup. Use SEM_UNDO flag in semop() to automatically undo operations if the process crashes. Check existing IPC objects with ipcs -s and remove them with ipcrm -s.',
    demoCode: `/* Demo: semaphore set with 2 semaphores — producer/consumer */
#include <sys/sem.h>
#include <sys/wait.h>
#include <unistd.h>
#include <stdio.h>

union semun { int val; struct semid_ds *buf; unsigned short *array; };

static void sem_op2(int id, int num, int op) {
    struct sembuf sb = { .sem_num=(unsigned short)num,
                         .sem_op=(short)op, .sem_flg=0 };
    semop(id, &sb, 1);
}

int main() {
    /* sem[0]=empty slots (init=3), sem[1]=filled slots (init=0) */
    int id = semget(IPC_PRIVATE, 2, IPC_CREAT|0600);
    union semun a = { .val=3 }; semctl(id, 0, SETVAL, a);
    a.val=0;                     semctl(id, 1, SETVAL, a);

    pid_t pid = fork();
    if (pid == 0) {
        /* producer: produce 3 items */
        for (int i = 1; i <= 3; i++) {
            sem_op2(id, 0, -1);   /* wait for empty slot */
            printf("produced item %d\\n", i);
            sem_op2(id, 1, +1);   /* signal filled slot */
            usleep(100000);
        }
        _exit(0);
    }
    /* consumer: consume 3 items */
    for (int i = 1; i <= 3; i++) {
        sem_op2(id, 1, -1);       /* wait for filled slot */
        printf("consumed item %d\\n", i);
        sem_op2(id, 0, +1);       /* signal empty slot */
    }
    wait(NULL);
    semctl(id, 0, IPC_RMID);
    return 0;
}`,
  },

  sysvshm: {
    name: 'SysV Shared Mem', icon: '🤝', chapter: 'Ch. 48', vol: 2,
    desc: 'System V shared memory lets unrelated processes share a memory region. shmget() creates or opens a segment by key; shmat() maps it into the process address space; shmdt() unmaps it; shmctl(IPC_RMID) marks it for deletion. The segment persists until the last process detaches and IPC_RMID is set.',
    syscalls: [
      { name: 'shmget', sig: 'int shmget(key_t key, size_t size, int shmflg)' },
      { name: 'shmat',  sig: 'void *shmat(int shmid, const void *shmaddr, int shmflg)' },
      { name: 'shmdt',  sig: 'int shmdt(const void *shmaddr)' },
      { name: 'shmctl', sig: 'int shmctl(int shmid, int cmd, struct shmid_ds *buf)' },
    ],
    code: `/* TLPI §48.2 — fork: child writes, parent reads shared mem */
#include <sys/shm.h>
#include <sys/wait.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

int main() {
    int shmid = shmget(IPC_PRIVATE, 4096, IPC_CREAT|0600);

    pid_t pid = fork();
    if (pid == 0) {
        char *p = (char *)shmat(shmid, NULL, 0);
        snprintf(p, 128, "hello from child PID %d", (int)getpid());
        shmdt(p);
        _exit(0);
    }
    wait(NULL);

    char *p = (char *)shmat(shmid, NULL, 0);
    printf("shared memory: %s\\n", p);

    struct shmid_ds info;
    shmctl(shmid, IPC_STAT, &info);
    printf("size=%zu  nattch=%lu\\n",
           info.shm_segsz, (unsigned long)info.shm_nattch);
    shmdt(p);
    shmctl(shmid, IPC_RMID, NULL);
    return 0;
}`,
    notes: 'shmat() with shmaddr=NULL lets the kernel choose the attach address — always prefer this. Shared memory provides no synchronization; combine it with a semaphore or mutex in shared memory. Use ftok() to generate a reproducible key from a path + project ID for unrelated processes.',
    demoCode: `/* Demo: two children communicate through shared memory */
#include <sys/shm.h>
#include <sys/sem.h>
#include <sys/wait.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

typedef struct { char msg[64]; int done; } Shared;

int main() {
    int shmid = shmget(IPC_PRIVATE, sizeof(Shared), IPC_CREAT|0600);

    /* writer child */
    if (fork() == 0) {
        Shared *s = (Shared *)shmat(shmid, NULL, 0);
        snprintf(s->msg, sizeof(s->msg),
                 "written by PID %d", (int)getpid());
        s->done = 1;
        shmdt(s);
        _exit(0);
    }

    wait(NULL);  /* ensure writer finishes */

    /* reader child */
    if (fork() == 0) {
        Shared *s = (Shared *)shmat(shmid, NULL, 0);
        if (s->done)
            printf("reader got: %s\\n", s->msg);
        shmdt(s);
        _exit(0);
    }
    wait(NULL);
    shmctl(shmid, IPC_RMID, NULL);
    return 0;
}`,
  },

  vmops: {
    name: 'VM Operations', icon: '🧠', chapter: 'Ch. 50', vol: 2,
    desc: 'mprotect() changes permissions on a mapped region (PROT_READ/WRITE/EXEC/NONE). madvise() gives the kernel hints about future access patterns (MADV_SEQUENTIAL, MADV_DONTNEED, MADV_WILLNEED). mincore() tests which pages of a mapping are resident in RAM.',
    syscalls: [
      { name: 'mprotect', sig: 'int mprotect(void *addr, size_t len, int prot)' },
      { name: 'madvise',  sig: 'int madvise(void *addr, size_t length, int advice)' },
      { name: 'mincore',  sig: 'int mincore(void *addr, size_t length, unsigned char *vec)' },
      { name: 'mlock',    sig: 'int mlock(const void *addr, size_t len)' },
    ],
    code: `/* TLPI §50.1 — mprotect: toggle R/W on an anonymous page */
#include <sys/mman.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

int main() {
    long page = sysconf(_SC_PAGESIZE);
    char *p = (char *)mmap(NULL, page,
                           PROT_READ|PROT_WRITE,
                           MAP_PRIVATE|MAP_ANONYMOUS, -1, 0);
    if (p == MAP_FAILED) { perror("mmap"); return 1; }

    strcpy(p, "R/W anonymous page");
    printf("written : %s\\n", p);

    mprotect(p, page, PROT_READ);   /* make read-only */
    printf("read    : %s\\n", p);
    /* p[0]='X'; // SIGSEGV here */

    mprotect(p, page, PROT_READ|PROT_WRITE);  /* restore */
    p[0] = 'r';
    printf("modified: %s\\n", p);

    madvise(p, page, MADV_DONTNEED);  /* reclaim physical pages */
    munmap(p, page);
    return 0;
}`,
    notes: 'madvise(MADV_DONTNEED) zeroes anonymous pages on Linux when they are next accessed — useful for implementing a pool allocator reset. madvise(MADV_SEQUENTIAL) causes the kernel to read-ahead aggressively. mlock() pins pages in RAM (prevents swap-out) — requires CAP_IPC_LOCK or RLIMIT_MEMLOCK quota.',
    demoCode: `/* Demo: mmap + mincore — check page residency */
#include <sys/mman.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

int main() {
    long page = sysconf(_SC_PAGESIZE);
    size_t sz = 4 * page;

    char *p = (char *)mmap(NULL, sz,
                           PROT_READ|PROT_WRITE,
                           MAP_PRIVATE|MAP_ANONYMOUS, -1, 0);
    if (p == MAP_FAILED) { perror("mmap"); return 1; }

    unsigned char vec[4] = {0};
    mincore(p, sz, vec);
    printf("before touch: pages resident = %d %d %d %d\\n",
           vec[0]&1, vec[1]&1, vec[2]&1, vec[3]&1);

    /* touch pages 0 and 2 */
    p[0]            = 'A';
    p[2 * page]     = 'C';

    mincore(p, sz, vec);
    printf("after  touch: pages resident = %d %d %d %d\\n",
           vec[0]&1, vec[1]&1, vec[2]&1, vec[3]&1);

    madvise(p, sz, MADV_DONTNEED);
    mincore(p, sz, vec);
    printf("after DONTNEED:              = %d %d %d %d\\n",
           vec[0]&1, vec[1]&1, vec[2]&1, vec[3]&1);

    munmap(p, sz);
    return 0;
}`,
  },

  inetaddr: {
    name: 'Internet Sockets', icon: '🌐', chapter: 'Ch. 59', vol: 2,
    desc: 'getaddrinfo() is the modern, protocol-agnostic way to resolve hostnames and service names — it returns a linked list of addrinfo structs usable directly with socket/connect/bind. getnameinfo() performs the reverse lookup. inet_pton/inet_ntop convert between text and binary IP addresses.',
    syscalls: [
      { name: 'getaddrinfo', sig: 'int getaddrinfo(const char *host, const char *port, const struct addrinfo *hints, struct addrinfo **res)' },
      { name: 'getnameinfo', sig: 'int getnameinfo(const struct sockaddr *sa, socklen_t salen, char *host, socklen_t hostlen, char *serv, socklen_t servlen, int flags)' },
      { name: 'inet_pton',   sig: 'int inet_pton(int af, const char *src, void *dst)' },
      { name: 'inet_ntop',   sig: 'const char *inet_ntop(int af, const void *src, char *dst, socklen_t size)' },
    ],
    code: `/* TLPI §59.2 — getaddrinfo: resolve localhost */
#include <sys/socket.h>
#include <netdb.h>
#include <arpa/inet.h>
#include <stdio.h>
#include <string.h>

int main() {
    struct addrinfo hints, *res;
    memset(&hints, 0, sizeof(hints));
    hints.ai_family   = AF_UNSPEC;
    hints.ai_socktype = SOCK_STREAM;

    int rc = getaddrinfo("localhost", "80", &hints, &res);
    if (rc) { fprintf(stderr, "%s\\n", gai_strerror(rc)); return 1; }

    char host[NI_MAXHOST], port[NI_MAXSERV];
    for (struct addrinfo *r = res; r; r = r->ai_next) {
        getnameinfo(r->ai_addr, r->ai_addrlen,
                    host, sizeof(host),
                    port, sizeof(port),
                    NI_NUMERICHOST|NI_NUMERICSERV);
        printf("family=%-4s  addr=%-18s  port=%s\\n",
               r->ai_family==AF_INET ? "IPv4" : "IPv6", host, port);
    }
    freeaddrinfo(res);
    return 0;
}`,
    notes: 'Always use getaddrinfo() — never gethostbyname() (not thread-safe, IPv4-only). Set ai_flags=AI_PASSIVE to get wildcard addresses suitable for bind(). Use AI_NUMERICHOST to skip DNS resolution. freeaddrinfo() must be called to avoid memory leaks.',
    demoCode: `/* Demo: getaddrinfo + inet_pton/inet_ntop round-trips */
#include <sys/socket.h>
#include <netdb.h>
#include <arpa/inet.h>
#include <stdio.h>
#include <string.h>

static void resolve(const char *host) {
    struct addrinfo hints, *res;
    memset(&hints, 0, sizeof(hints));
    hints.ai_family = AF_UNSPEC;
    int rc = getaddrinfo(host, NULL, &hints, &res);
    if (rc) { printf("%-20s  error: %s\\n", host, gai_strerror(rc)); return; }
    char addr[INET6_ADDRSTRLEN];
    for (struct addrinfo *r = res; r; r = r->ai_next) {
        void *in_addr = r->ai_family == AF_INET
            ? (void*)&((struct sockaddr_in *)r->ai_addr)->sin_addr
            : (void*)&((struct sockaddr_in6*)r->ai_addr)->sin6_addr;
        inet_ntop(r->ai_family, in_addr, addr, sizeof(addr));
        printf("%-20s  %-4s  %s\\n", host,
               r->ai_family==AF_INET ? "IPv4" : "IPv6", addr);
    }
    freeaddrinfo(res);
}

int main() {
    resolve("localhost");
    resolve("127.0.0.1");
    resolve("::1");

    /* inet_pton round-trip */
    struct in_addr a4; struct in6_addr a6;
    char buf4[INET_ADDRSTRLEN], buf6[INET6_ADDRSTRLEN];
    inet_pton(AF_INET,  "192.0.2.1", &a4);
    inet_pton(AF_INET6, "2001:db8::1", &a6);
    inet_ntop(AF_INET,  &a4, buf4, sizeof(buf4));
    inet_ntop(AF_INET6, &a6, buf6, sizeof(buf6));
    printf("IPv4 round-trip: %s\\n", buf4);
    printf("IPv6 round-trip: %s\\n", buf6);
    return 0;
}`,
  },

  termios: {
    name: 'Terminals', icon: '🖥️', chapter: 'Ch. 62', vol: 2,
    desc: 'tcgetattr()/tcsetattr() read and write the termios structure that controls the terminal line discipline: input/output modes, canonical vs raw mode, echo, signal generation. cfmakeraw() sets the full set of flags for raw (character-at-a-time, no echo) mode — used by shells, editors, and SSH.',
    syscalls: [
      { name: 'tcgetattr', sig: 'int tcgetattr(int fd, struct termios *termios_p)' },
      { name: 'tcsetattr', sig: 'int tcsetattr(int fd, int optional_actions, const struct termios *termios_p)' },
      { name: 'cfmakeraw', sig: 'void cfmakeraw(struct termios *termios_p)' },
      { name: 'cfsetspeed',sig: 'int cfsetspeed(struct termios *termios_p, speed_t speed)' },
    ],
    code: `/* TLPI §62.2 — inspect and switch to raw mode briefly */
#include <termios.h>
#include <unistd.h>
#include <stdio.h>

int main() {
    struct termios orig, raw;
    if (tcgetattr(STDIN_FILENO, &orig) == -1) {
        perror("tcgetattr");
        printf("(stdin is not a terminal)\\n");
        return 0;
    }
    printf("ECHO   : %s\\n", (orig.c_lflag & ECHO)   ? "on" : "off");
    printf("ICANON : %s\\n", (orig.c_lflag & ICANON) ? "on" : "off");
    printf("ISIG   : %s\\n", (orig.c_lflag & ISIG)   ? "on" : "off");
    printf("VMIN   : %d\\n", orig.cc[VMIN]);
    printf("VTIME  : %d\\n", orig.cc[VTIME]);

    raw = orig;
    cfmakeraw(&raw);
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &raw);
    /* in raw mode now — restore before output */
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &orig);
    printf("restored canonical mode\\n");
    return 0;
}`,
    notes: 'cfmakeraw() clears ICANON (line buffering), ECHO, ISIG (^C/^Z signals), and IXON (^S/^Q flow control). Always save the original termios and restore it before exit — including via atexit(). TCSAFLUSH waits for all output to drain and flushes the input queue before applying changes.',
    demoCode: `/* Demo: tcgetattr on /dev/tty — show full termios flags */
#include <termios.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>

int main() {
    int tfd = open("/dev/tty", O_RDWR);
    if (tfd == -1) {
        printf("(no controlling terminal — demo skipped)\\n");
        return 0;
    }
    struct termios t;
    tcgetattr(tfd, &t);

    speed_t isp = cfgetispeed(&t);
    speed_t osp = cfgetospeed(&t);
    printf("input  baud  : %u\\n", (unsigned)isp);
    printf("output baud  : %u\\n", (unsigned)osp);

    /* c_lflag bits */
    struct { const char *name; tcflag_t bit; } lflags[] = {
        {"ICANON", ICANON}, {"ECHO", ECHO}, {"ECHOE", ECHOE},
        {"ISIG",   ISIG},   {"IEXTEN", IEXTEN}, {NULL,0}
    };
    printf("c_lflag bits :\\n");
    for (int i = 0; lflags[i].name; i++)
        printf("  %-8s %s\\n", lflags[i].name,
               (t.c_lflag & lflags[i].bit) ? "set" : "---");

    printf("VMIN=%d  VTIME=%d\\n", t.cc[VMIN], t.cc[VTIME]);
    close(tfd);
    return 0;
}`,
  },

  xattr: {
    name: 'Extended Attributes', icon: '🏷️', chapter: 'Ch. 16', vol: 1,
    desc: 'Extended attributes (xattrs) attach arbitrary name=value metadata to files and directories outside the normal inode fields. The "user.*" namespace is available to all users; "trusted.*" requires CAP_SYS_ADMIN. SELinux labels, file capabilities, and ACLs are all stored as xattrs.',
    syscalls: [
      { name: 'setxattr',    sig: 'int setxattr(const char *path, const char *name, const void *value, size_t size, int flags)' },
      { name: 'getxattr',    sig: 'ssize_t getxattr(const char *path, const char *name, void *value, size_t size)' },
      { name: 'listxattr',   sig: 'ssize_t listxattr(const char *path, char *list, size_t size)' },
      { name: 'removexattr', sig: 'int removexattr(const char *path, const char *name)' },
    ],
    code: `/* TLPI §16.1 — set, get, list, and remove extended attributes */
#include <sys/xattr.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

int main() {
    const char *path = "/tmp/tlpi_xattr.txt";
    close(open(path, O_CREAT|O_WRONLY, 0644));

    setxattr(path, "user.project", "tlpi-demo", 9, 0);
    setxattr(path, "user.version", "1.0",       3, 0);
    setxattr(path, "user.author",  "Kerrisk",   7, 0);

    /* list all xattrs (NUL-separated names) */
    char list[512];
    ssize_t lsz = listxattr(path, list, sizeof(list));
    for (char *p = list; p < list + lsz; p += strlen(p)+1) {
        char val[64];
        ssize_t vsz = getxattr(path, p, val, sizeof(val)-1);
        val[vsz] = '\\0';
        printf("  %-20s = %s\\n", p, val);
    }

    removexattr(path, "user.version");
    printf("after remove: %zd bytes of xattr names remain\\n",
           listxattr(path, list, sizeof(list)));
    unlink(path);
    return 0;
}`,
    notes: 'xattr names in the "user.*" namespace may only be set on regular files and directories. Flags XATTR_CREATE (fail if exists) and XATTR_REPLACE (fail if not exists) provide atomic create-or-update semantics. SELinux and AppArmor store their security labels in the "security.*" namespace.',
    demoCode: `/* Demo: xattr round-trip with binary value and XATTR_CREATE */
#include <sys/xattr.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>
#include <errno.h>

int main() {
    const char *path = "/tmp/tlpi_xattr_demo.txt";
    close(open(path, O_CREAT|O_WRONLY|O_TRUNC, 0644));

    /* set with XATTR_CREATE — fails if already exists */
    int rc = setxattr(path, "user.tag", "v1", 2, XATTR_CREATE);
    printf("XATTR_CREATE: %s\\n", rc==0 ? "ok" : "failed");

    /* second attempt fails (already exists) */
    rc = setxattr(path, "user.tag", "v2", 2, XATTR_CREATE);
    printf("XATTR_CREATE again: %s (errno=%d)\\n",
           rc==0 ? "ok" : "EEXIST", errno);

    /* XATTR_REPLACE updates existing */
    setxattr(path, "user.tag", "v2-updated", 10, XATTR_REPLACE);

    char buf[32];
    ssize_t n = getxattr(path, "user.tag", buf, sizeof(buf)-1);
    buf[n]='\\0';
    printf("after REPLACE: user.tag = %s\\n", buf);

    unlink(path);
    return 0;
}`,
  },

  vfork: {
    name: 'vfork & clone', icon: '🧬', chapter: 'Ch. 28', vol: 1,
    desc: 'vfork() creates a child that borrows the parent\'s address space without copying it. The parent is suspended until the child calls _exit() or exec(). clone() is the Linux syscall underlying both fork() and pthread_create() — its flags field selects which resources the child shares.',
    syscalls: [
      { name: 'vfork', sig: 'pid_t vfork(void)' },
      { name: 'clone', sig: 'int clone(int (*fn)(void*), void *stack, int flags, void *arg, ...)' },
    ],
    code: `/* TLPI §28.3 — vfork: child borrows parent address space */
#include <unistd.h>
#include <sys/wait.h>
#include <stdio.h>

int main() {
    int x = 10;
    printf("before vfork: x=%d  PID=%d\\n", x, (int)getpid());

    pid_t pid = vfork();
    if (pid == 0) {
        /* child runs first; parent is suspended.
           Must NOT return from this function — only _exit() or exec(). */
        x = 42;   /* directly modifies parent's x — shared stack! */
        printf("child:  x=%d  PID=%d\\n", x, (int)getpid());
        _exit(0);
    }
    /* parent resumes only after child's _exit() */
    printf("parent: x=%d  PID=%d  (modified by child!)\\n",
           x, (int)getpid());
    return 0;
}`,
    notes: 'vfork() is a performance hack for the fork-exec pattern — it avoids the copy-on-write setup that fork() does. The child MUST call _exit() or one of the exec() family; returning from the calling function corrupts the parent\'s stack. Modern fork() with CoW makes vfork() rarely worth the risk.',
    demoCode: `/* Demo: vfork then execvp — the intended use of vfork */
#include <unistd.h>
#include <sys/wait.h>
#include <stdio.h>

int main() {
    printf("parent PID=%d about to vfork+exec\\n", (int)getpid());

    pid_t pid = vfork();
    if (pid == 0) {
        /* child: immediately replace with echo */
        char *argv[] = { "echo", "hello from vfork+exec child", NULL };
        execvp("echo", argv);
        _exit(127);   /* exec failed */
    }

    int status;
    waitpid(pid, &status, 0);
    printf("parent: child exited %d\\n", WEXITSTATUS(status));

    /* compare: regular fork does NOT share address space */
    int shared = 99;
    if (fork() == 0) {
        shared = 0;  /* parent's copy unchanged */
        _exit(0);
    }
    wait(NULL);
    printf("after fork: shared=%d (unchanged)\\n", shared);
    return 0;
}`,
  },

  thr_cancel: {
    name: 'Thread Cancellation', icon: '✂️', chapter: 'Ch. 32', vol: 1,
    desc: 'pthread_cancel() requests cancellation of a thread. The thread acts on the request at a cancellation point (read, write, sleep, …). pthread_cleanup_push/pop register cleanup handlers that run when the thread is cancelled or exits normally. pthread_setcancelstate/type control when and how cancellation takes effect.',
    syscalls: [
      { name: 'pthread_cancel',           sig: 'int pthread_cancel(pthread_t thread)' },
      { name: 'pthread_cleanup_push',     sig: 'void pthread_cleanup_push(void (*routine)(void*), void *arg)' },
      { name: 'pthread_cleanup_pop',      sig: 'void pthread_cleanup_pop(int execute)' },
      { name: 'pthread_setcancelstate',   sig: 'int pthread_setcancelstate(int state, int *oldstate)' },
    ],
    code: `/* TLPI §32.1 — pthread_cancel + cleanup handler */
#include <pthread.h>
#include <stdio.h>
#include <unistd.h>

static void cleanup(void *arg) {
    printf("cleanup: releasing %s\\n", (char *)arg);
}

void *worker(void *arg) {
    pthread_cleanup_push(cleanup, "resource-A");
    printf("worker: started\\n");
    sleep(10);          /* cancellation point — cancelled here */
    printf("worker: done (unreachable)\\n");
    pthread_cleanup_pop(1);
    return NULL;
}

int main() {
    pthread_t t;
    pthread_create(&t, NULL, worker, NULL);
    usleep(100000);
    printf("main: sending cancel\\n");
    pthread_cancel(t);

    void *retval;
    pthread_join(t, &retval);
    printf("thread %s\\n",
           retval == PTHREAD_CANCELED ? "was cancelled" : "exited normally");
    return 0;
}`,
    notes: 'Cancellation is asynchronous by request but synchronous by delivery — the thread is only cancelled at a cancellation point. Call pthread_setcancelstate(PTHREAD_CANCEL_DISABLE,...) to protect non-atomic critical sections. cleanup_pop(0) pops the handler without executing it; pop(1) executes it regardless of how the thread exits.',
    demoCode: `/* Demo: deferred vs async cancellation */
#include <pthread.h>
#include <stdio.h>
#include <unistd.h>

static void cleanup(void *arg) {
    printf("cleanup: %s\\n", (char *)arg);
}

void *deferred_worker(void *arg) {
    int old;
    pthread_setcanceltype(PTHREAD_CANCEL_DEFERRED, &old);
    pthread_cleanup_push(cleanup, "deferred-res");
    for (int i = 0; i < 5; i++) {
        printf("deferred: step %d\\n", i);
        pthread_testcancel();   /* explicit cancellation point */
        usleep(50000);
    }
    pthread_cleanup_pop(1);
    return NULL;
}

void *nodisable_worker(void *arg) {
    int old;
    pthread_setcancelstate(PTHREAD_CANCEL_DISABLE, &old);
    pthread_cleanup_push(cleanup, "disabled-res");
    printf("cancel disabled — running critical section\\n");
    usleep(200000);
    pthread_setcancelstate(PTHREAD_CANCEL_ENABLE, &old);
    sleep(10);  /* now cancellable */
    pthread_cleanup_pop(1);
    return NULL;
}

int main() {
    pthread_t t1, t2;
    pthread_create(&t1, NULL, deferred_worker,  NULL);
    pthread_create(&t2, NULL, nodisable_worker, NULL);
    usleep(120000);
    pthread_cancel(t1);
    pthread_cancel(t2);
    void *r1, *r2;
    pthread_join(t1, &r1);
    pthread_join(t2, &r2);
    printf("t1: %s\\n", r1==PTHREAD_CANCELED?"cancelled":"exited");
    printf("t2: %s\\n", r2==PTHREAD_CANCELED?"cancelled":"exited");
    return 0;
}`,
  },

  thr_sig: {
    name: 'Threads & Signals', icon: '📡', chapter: 'Ch. 33', vol: 1,
    desc: 'In a multi-threaded process, signals sent to the process are delivered to one arbitrary thread that has it unblocked. pthread_sigmask() sets the per-thread signal mask. pthread_kill() sends a signal to a specific thread. The recommended pattern: block signals in all threads, then dedicate one thread to sigwait().',
    syscalls: [
      { name: 'pthread_sigmask', sig: 'int pthread_sigmask(int how, const sigset_t *set, sigset_t *oldset)' },
      { name: 'pthread_kill',    sig: 'int pthread_kill(pthread_t thread, int sig)' },
      { name: 'sigwait',         sig: 'int sigwait(const sigset_t *set, int *sig)' },
    ],
    code: `/* TLPI §33.2 — dedicated signal-handling thread via sigwait */
#include <pthread.h>
#include <signal.h>
#include <stdio.h>
#include <unistd.h>

static void *sig_handler_thread(void *arg) {
    sigset_t *mask = (sigset_t *)arg;
    int sig;
    /* synchronously wait for any signal in mask */
    while (sigwait(mask, &sig) == 0) {
        printf("signal thread: received signal %d\\n", sig);
        if (sig == SIGTERM) break;
    }
    return NULL;
}

int main() {
    sigset_t mask;
    sigemptyset(&mask);
    sigaddset(&mask, SIGUSR1);
    sigaddset(&mask, SIGTERM);

    /* block in ALL threads (inherited by newly created ones) */
    pthread_sigmask(SIG_BLOCK, &mask, NULL);

    pthread_t t;
    pthread_create(&t, NULL, sig_handler_thread, &mask);
    usleep(50000);

    /* send signals to the process — caught by sig_handler_thread */
    kill(getpid(), SIGUSR1);
    kill(getpid(), SIGUSR1);
    kill(getpid(), SIGTERM);

    pthread_join(t, NULL);
    return 0;
}`,
    notes: 'This is the canonical pattern for signal handling in multi-threaded programs: block the signals in all threads (block before creating any thread), then have one dedicated thread call sigwait() or sigwaitinfo(). This avoids the restrictions of signal handlers (async-signal-safe only) since sigwait() runs in normal thread context.',
    demoCode: `/* Demo: pthread_kill targets a specific thread */
#include <pthread.h>
#include <signal.h>
#include <stdio.h>
#include <unistd.h>

static volatile int target_got = 0, other_got = 0;

static void handler(int sig) {
    /* which thread got it? */
    if (sig == SIGUSR1) __sync_fetch_and_add(&target_got, 1);
    if (sig == SIGUSR2) __sync_fetch_and_add(&other_got,  1);
}

void *thread_fn(void *arg) {
    /* install handler — each thread needs it */
    struct sigaction sa = { .sa_handler = handler };
    sigemptyset(&sa.sa_mask);
    sigaction(SIGUSR1, &sa, NULL);
    sigaction(SIGUSR2, &sa, NULL);

    pause();   /* sleep until a signal arrives */
    return NULL;
}

int main() {
    struct sigaction sa = { .sa_handler = handler };
    sigemptyset(&sa.sa_mask);
    sigaction(SIGUSR1, &sa, NULL);
    sigaction(SIGUSR2, &sa, NULL);

    pthread_t t1, t2;
    pthread_create(&t1, NULL, thread_fn, NULL);
    pthread_create(&t2, NULL, thread_fn, NULL);
    usleep(50000);

    pthread_kill(t1, SIGUSR1);   /* to t1 specifically */
    pthread_kill(t2, SIGUSR2);   /* to t2 specifically */
    usleep(50000);

    pthread_cancel(t1); pthread_cancel(t2);
    pthread_join(t1, NULL); pthread_join(t2, NULL);

    printf("SIGUSR1 deliveries: %d\\n", target_got);
    printf("SIGUSR2 deliveries: %d\\n", other_got);
    return 0;
}`,
  },

  prctl_caps: {
    name: 'Capabilities', icon: '🔐', chapter: 'Ch. 39', vol: 2,
    desc: 'Linux capabilities break root\'s all-or-nothing power into ~40 fine-grained privileges. prctl() queries/sets process attributes like dumpable, no-new-privs, and securebits. CAP_NET_BIND_SERVICE allows binding ports < 1024; CAP_SYS_ADMIN is the "super-capability" covering many kernel operations.',
    syscalls: [
      { name: 'prctl',   sig: 'int prctl(int option, unsigned long arg2, ...)' },
      { name: 'capget',  sig: 'int capget(cap_user_header_t hdrp, cap_user_data_t datap)' },
      { name: 'capset',  sig: 'int capset(cap_user_header_t hdrp, const cap_user_data_t datap)' },
    ],
    code: `/* TLPI §39.4 — prctl: inspect privilege-related process attributes */
#include <sys/prctl.h>
#include <stdio.h>
#include <unistd.h>

int main() {
    /* process name */
    char name[17] = {0};
    prctl(PR_GET_NAME, name);
    printf("process name  : %s\\n", name);

    /* dumpable: 1=core enabled, 0=disabled, 2=suid-dump */
    printf("dumpable      : %d\\n", prctl(PR_GET_DUMPABLE));

    /* securebits: control UID-0 privilege inheritance */
    printf("securebits    : 0x%x\\n", prctl(PR_GET_SECUREBITS));

    /* UID / EUID */
    printf("uid/euid      : %d / %d\\n", getuid(), geteuid());
    printf("gid/egid      : %d / %d\\n", getgid(), getegid());

    /* set no-new-privs — irreversible, restricts exec privilege escalation */
    prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0);
    printf("no_new_privs  : %d\\n",
           prctl(PR_GET_NO_NEW_PRIVS, 0, 0, 0, 0));
    return 0;
}`,
    notes: 'PR_SET_NO_NEW_PRIVS prevents exec() from gaining new privileges (setuid bits, file capabilities) — used by seccomp sandboxes and containers. The three capability sets are: permitted (the ceiling), effective (currently active), and inheritable (passed across exec). Use /proc/self/status to read CapPrm/CapEff/CapBnd.',
    demoCode: `/* Demo: read capability sets from /proc/self/status */
#include <sys/prctl.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

int main() {
    printf("=== Process privilege info ===\\n");
    printf("PID=%d  UID=%d  EUID=%d\\n",
           getpid(), getuid(), geteuid());

    /* read capability masks from /proc/self/status */
    FILE *f = fopen("/proc/self/status", "r");
    char line[256];
    while (fgets(line, sizeof(line), f)) {
        if (strncmp(line, "Cap", 3) == 0)
            printf("%s", line);
    }
    fclose(f);

    /* prctl attributes */
    char name[17]={0};
    prctl(PR_GET_NAME, name);
    printf("Name        : %s\\n", name);
    printf("Dumpable    : %d\\n", prctl(PR_GET_DUMPABLE));
    printf("Securebits  : 0x%x\\n", prctl(PR_GET_SECUREBITS));

    /* set and verify no-new-privs */
    prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0);
    printf("NoNewPrivs  : %d (set)\\n",
           prctl(PR_GET_NO_NEW_PRIVS, 0, 0, 0, 0));
    return 0;
}`,
  },

  shlib_ctor: {
    name: 'Lib Constructor', icon: '🏗️', chapter: 'Ch. 42', vol: 2,
    desc: '__attribute__((constructor)) marks a function to run automatically when a shared library is loaded (before main() or dlopen() returns). __attribute__((destructor)) runs on unload/exit. LD_PRELOAD injects a shared library before any other, enabling symbol interposition — the basis of tools like valgrind and strace wrappers.',
    syscalls: [
      { name: '__attribute__((constructor))', sig: 'static void my_init(void) __attribute__((constructor))' },
      { name: '__attribute__((destructor))',  sig: 'static void my_fini(void) __attribute__((destructor))' },
      { name: 'dladdr',                       sig: 'int dladdr(const void *addr, Dl_info *info)' },
    ],
    code: `/* TLPI §42.4 — constructor/destructor: auto-init and cleanup */
#include <stdio.h>

__attribute__((constructor(101)))
static void early_init(void) {
    printf("early_init  (priority 101 — runs first)\\n");
}

__attribute__((constructor(200)))
static void late_init(void) {
    printf("late_init   (priority 200 — runs second)\\n");
}

__attribute__((destructor(200)))
static void early_fini(void) {
    printf("early_fini  (priority 200 — destructor runs LIFO)\\n");
}

__attribute__((destructor(101)))
static void late_fini(void) {
    printf("late_fini   (priority 101 — runs last)\\n");
}

int main() {
    printf("main()      running\\n");
    return 0;
    /* destructors run after main() returns, LIFO order */
}`,
    notes: 'Lower priority numbers run first for constructors; for destructors the order is reversed. LD_PRELOAD allows injecting a shared object before libc — functions defined in the preloaded library shadow the originals. Use dlsym(RTLD_NEXT, "malloc") inside an interposed function to call the real original.',
    demoCode: `/* Demo: dladdr — find symbol name and library for a function pointer */
#define _GNU_SOURCE
#include <dlfcn.h>
#include <stdio.h>
#include <math.h>

static void my_func(void) {}

int main() {
    Dl_info info;
    void *ptrs[] = {
        (void*)printf,
        (void*)sin,
        (void*)my_func,
        (void*)main,
    };
    const char *labels[] = {"printf", "sin", "my_func", "main"};

    for (int i = 0; i < 4; i++) {
        if (dladdr(ptrs[i], &info)) {
            printf("%-10s  lib=%-30s  sym=%s\\n",
                   labels[i],
                   info.dli_fname ? info.dli_fname : "(main)",
                   info.dli_sname ? info.dli_sname : "?");
        }
    }
    return 0;
}`,
  },

  ipckeys: {
    name: 'IPC Keys', icon: '🗝️', chapter: 'Ch. 45', vol: 2,
    desc: 'System V IPC objects (queues, semaphores, shared memory) are identified by a key_t. ftok() derives a reproducible key from a filesystem path + project ID, so unrelated processes can find the same object. IPC_PRIVATE always creates a new private object. ipcs lists all existing IPC objects system-wide.',
    syscalls: [
      { name: 'ftok',    sig: 'key_t ftok(const char *pathname, int proj_id)' },
      { name: 'msgget',  sig: 'int msgget(key_t key, int msgflg)' },
      { name: 'shmget',  sig: 'int shmget(key_t key, size_t size, int shmflg)' },
      { name: 'semget',  sig: 'int semget(key_t key, int nsems, int semflg)' },
    ],
    code: `/* TLPI §45.1 — ftok: generate and decode IPC keys */
#include <sys/ipc.h>
#include <stdio.h>

int main() {
    /* same path + same proj_id → same key on every call */
    key_t k1 = ftok("/tmp", 'A');
    key_t k2 = ftok("/tmp", 'B');
    key_t k3 = ftok("/",    'A');

    printf("ftok(/tmp,'A') = 0x%08x\\n", k1);
    printf("ftok(/tmp,'B') = 0x%08x\\n", k2);
    printf("ftok(/,   'A') = 0x%08x\\n", k3);

    /* key anatomy: [proj_id:8][inode_low:16][device:8] */
    printf("\\nkey1 anatomy:\\n");
    printf("  proj_id  (bits 24-31): 0x%02x  (%c)\\n",
           (k1>>24)&0xff, (k1>>24)&0xff);
    printf("  inode low(bits  8-23): 0x%04x\\n", (k1>>8)&0xffff);
    printf("  device   (bits  0-7 ): 0x%02x\\n",  k1&0xff);

    printf("\\nIPC_PRIVATE = %d (always unique)\\n", (int)IPC_PRIVATE);
    return 0;
}`,
    notes: 'ftok() is not perfectly collision-free — different path/proj combinations can produce the same key if they share the same inode low bits and device. IPC_PRIVATE guarantees uniqueness. Use IPC_CREAT|IPC_EXCL to create exclusively (error if already exists), like O_CREAT|O_EXCL for files.',
    demoCode: `/* Demo: create SysV objects with ftok key, then inspect with shmctl/msgctl */
#include <sys/ipc.h>
#include <sys/shm.h>
#include <sys/msg.h>
#include <stdio.h>
#include <time.h>

int main() {
    key_t key = ftok("/tmp", 42);
    printf("using key = 0x%08x\\n", key);

    /* shared memory segment */
    int shmid = shmget(key, 4096, IPC_CREAT|IPC_EXCL|0600);
    if (shmid == -1) {
        perror("shmget (try: ipcrm -M key)");
    } else {
        struct shmid_ds ds;
        shmctl(shmid, IPC_STAT, &ds);
        printf("shm id=%d  size=%zu  key=0x%08x\\n",
               shmid, ds.shm_segsz, (unsigned)ds.shm_perm.__key);
        shmctl(shmid, IPC_RMID, NULL);
        printf("shm removed\\n");
    }

    /* message queue */
    int msqid = msgget(IPC_PRIVATE, IPC_CREAT|0600);
    struct msqid_ds mds;
    msgctl(msqid, IPC_STAT, &mds);
    printf("msg id=%d  key=0x%08x\\n",
           msqid, (unsigned)mds.msg_perm.__key);
    msgctl(msqid, IPC_RMID, NULL);
    return 0;
}`,
  },

  sysv_msg: {
    name: 'SysV Msg Queue', icon: '📨', chapter: 'Ch. 46', vol: 2,
    desc: 'System V message queues allow processes to exchange typed messages without synchronizing on a shared memory region. msgsnd() enqueues a message with a type field; msgrcv() dequeues by type (0=any, >0=exact, <0=lowest ≤ |type|). Messages persist in the kernel until explicitly removed.',
    syscalls: [
      { name: 'msgget', sig: 'int msgget(key_t key, int msgflg)' },
      { name: 'msgsnd', sig: 'int msgsnd(int msqid, const void *msgp, size_t msgsz, int msgflg)' },
      { name: 'msgrcv', sig: 'ssize_t msgrcv(int msqid, void *msgp, size_t msgsz, long msgtyp, int msgflg)' },
      { name: 'msgctl', sig: 'int msgctl(int msqid, int cmd, struct msqid_ds *buf)' },
    ],
    code: `/* TLPI §46.2 — typed messages: send type 2 first, receive type 1 first */
#include <sys/msg.h>
#include <sys/wait.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

struct msgbuf { long mtype; char mtext[64]; };

int main() {
    int msqid = msgget(IPC_PRIVATE, IPC_CREAT|0600);

    pid_t pid = fork();
    if (pid == 0) {
        struct msgbuf m;
        m.mtype = 2; strcpy(m.mtext, "type-2 message");
        msgsnd(msqid, &m, strlen(m.mtext)+1, 0);
        m.mtype = 1; strcpy(m.mtext, "type-1 message");
        msgsnd(msqid, &m, strlen(m.mtext)+1, 0);
        _exit(0);
    }
    wait(NULL);

    /* receive type 1 first, even though it was enqueued second */
    struct msgbuf m;
    msgrcv(msqid, &m, sizeof(m.mtext), 1, 0);
    printf("got type=%ld: %s\\n", m.mtype, m.mtext);
    msgrcv(msqid, &m, sizeof(m.mtext), 2, 0);
    printf("got type=%ld: %s\\n", m.mtype, m.mtext);

    msgctl(msqid, IPC_RMID, NULL);
    return 0;
}`,
    notes: 'msgrcv() with msgtyp=0 retrieves the oldest message regardless of type. With msgtyp>0 it retrieves the oldest message of exactly that type. With msgtyp<0 it retrieves the lowest-numbered type ≤ |msgtyp| — useful for priority queues. IPC_NOWAIT makes msgsnd/msgrcv return EAGAIN instead of blocking.',
    demoCode: `/* Demo: request-reply pattern over two message queues */
#include <sys/msg.h>
#include <sys/wait.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

struct req  { long mtype; int  value; };
struct resp { long mtype; int  result; };

int main() {
    int req_q  = msgget(IPC_PRIVATE, IPC_CREAT|0600);
    int resp_q = msgget(IPC_PRIVATE, IPC_CREAT|0600);

    /* server process */
    if (fork() == 0) {
        for (int i = 0; i < 3; i++) {
            struct req r;
            msgrcv(req_q, &r, sizeof(r.value), 1, 0);
            struct resp rs = { .mtype=1, .result = r.value * r.value };
            msgsnd(resp_q, &rs, sizeof(rs.result), 0);
        }
        _exit(0);
    }

    /* client: send 3 requests */
    for (int v = 2; v <= 4; v++) {
        struct req r = { .mtype=1, .value=v };
        msgsnd(req_q, &r, sizeof(r.value), 0);
        struct resp rs;
        msgrcv(resp_q, &rs, sizeof(rs.result), 1, 0);
        printf("%d^2 = %d\\n", v, rs.result);
    }
    wait(NULL);
    msgctl(req_q,  IPC_RMID, NULL);
    msgctl(resp_q, IPC_RMID, NULL);
    return 0;
}`,
  },

  srvdesign: {
    name: 'Server Design', icon: '🏛️', chapter: 'Ch. 60', vol: 2,
    desc: 'SO_REUSEADDR lets a server rebind immediately after crash/restart without waiting for TIME_WAIT to expire. Iterative servers handle one client at a time; concurrent servers fork or thread per client. SO_KEEPALIVE detects dead connections. TCP_NODELAY disables Nagle\'s algorithm for low-latency protocols.',
    syscalls: [
      { name: 'setsockopt', sig: 'int setsockopt(int sockfd, int level, int optname, const void *optval, socklen_t optlen)' },
      { name: 'getsockopt', sig: 'int getsockopt(int sockfd, int level, int optname, void *optval, socklen_t *optlen)' },
      { name: 'accept',     sig: 'int accept(int sockfd, struct sockaddr *addr, socklen_t *addrlen)' },
    ],
    code: `/* TLPI §60.3 — SO_REUSEADDR + concurrent TCP server */
#include <sys/socket.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <sys/wait.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

#define PORT 19876

int main() {
    int srv = socket(AF_INET, SOCK_STREAM, 0);

    int opt = 1;
    setsockopt(srv, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    struct sockaddr_in addr = {
        .sin_family      = AF_INET,
        .sin_port        = htons(PORT),
        .sin_addr.s_addr = htonl(INADDR_LOOPBACK),
    };
    bind(srv, (struct sockaddr *)&addr, sizeof(addr));
    listen(srv, 5);
    printf("server: listening on port %d\\n", PORT);

    /* fork a client */
    if (fork() == 0) {
        usleep(50000);
        int cfd = socket(AF_INET, SOCK_STREAM, 0);
        connect(cfd, (struct sockaddr *)&addr, sizeof(addr));
        write(cfd, "hello", 5);
        char buf[16]; ssize_t n=read(cfd,buf,sizeof(buf)-1); buf[n]=0;
        printf("client got: %s\\n", buf);
        close(cfd); _exit(0);
    }

    int cfd = accept(srv, NULL, NULL);
    char buf[16]; ssize_t n=read(cfd,buf,sizeof(buf)-1); buf[n]=0;
    printf("server got: %s\\n", buf);
    write(cfd, "world", 5);
    close(cfd); close(srv); wait(NULL);
    return 0;
}`,
    notes: 'Without SO_REUSEADDR, a server that crashes leaves its port in TIME_WAIT for ~60s, preventing immediate restart. TCP_NODELAY should be set for protocols that send many small messages (e.g., Redis). SO_LINGER with l_linger=0 causes RST on close() — useful for servers that need to abort connections immediately.',
    demoCode: `/* Demo: inspect and set common socket options */
#include <sys/socket.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <stdio.h>

int main() {
    int fd = socket(AF_INET, SOCK_STREAM, 0);

    /* show defaults */
    int val; socklen_t len = sizeof(val);
    getsockopt(fd, SOL_SOCKET,  SO_SNDBUF,   &val, &len); printf("SO_SNDBUF     : %d\\n", val);
    getsockopt(fd, SOL_SOCKET,  SO_RCVBUF,   &val, &len); printf("SO_RCVBUF     : %d\\n", val);
    getsockopt(fd, SOL_SOCKET,  SO_KEEPALIVE,&val, &len); printf("SO_KEEPALIVE  : %d\\n", val);
    getsockopt(fd, IPPROTO_TCP, TCP_NODELAY, &val, &len); printf("TCP_NODELAY   : %d\\n", val);

    /* set options */
    val=1; setsockopt(fd, SOL_SOCKET,  SO_REUSEADDR, &val, sizeof(val));
    val=1; setsockopt(fd, SOL_SOCKET,  SO_KEEPALIVE, &val, sizeof(val));
    val=1; setsockopt(fd, IPPROTO_TCP, TCP_NODELAY,  &val, sizeof(val));

    /* verify */
    getsockopt(fd, SOL_SOCKET,  SO_REUSEADDR,&val, &len); printf("SO_REUSEADDR  : %d (set)\\n", val);
    getsockopt(fd, SOL_SOCKET,  SO_KEEPALIVE,&val, &len); printf("SO_KEEPALIVE  : %d (set)\\n", val);
    getsockopt(fd, IPPROTO_TCP, TCP_NODELAY, &val, &len); printf("TCP_NODELAY   : %d (set)\\n", val);

    close(fd);
    return 0;
}`,
  },

  advsock: {
    name: 'Adv. Sockets', icon: '⚡', chapter: 'Ch. 61', vol: 2,
    desc: 'sendfile() transfers data directly from a file fd to a socket fd in the kernel — zero user-space copies. splice() and tee() enable zero-copy between two fds. recvmsg()/sendmsg() send ancillary (control) data, including passing file descriptors between processes via SCM_RIGHTS on Unix sockets.',
    syscalls: [
      { name: 'sendfile', sig: 'ssize_t sendfile(int out_fd, int in_fd, off_t *offset, size_t count)' },
      { name: 'splice',   sig: 'ssize_t splice(int fd_in, loff_t *off_in, int fd_out, loff_t *off_out, size_t len, unsigned int flags)' },
      { name: 'sendmsg',  sig: 'ssize_t sendmsg(int sockfd, const struct msghdr *msg, int flags)' },
      { name: 'recvmsg',  sig: 'ssize_t recvmsg(int sockfd, struct msghdr *msg, int flags)' },
    ],
    code: `/* TLPI §61.3 — sendfile: zero-copy file→socket */
#include <sys/sendfile.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>
#include <sys/wait.h>

#define PORT 19877

int main() {
    const char *fpath = "/tmp/tlpi_sendfile.txt";
    int ffd = open(fpath, O_WRONLY|O_CREAT|O_TRUNC, 0644);
    const char *msg = "zero-copy sendfile from TLPI Ch.61\\n";
    write(ffd, msg, strlen(msg));
    close(ffd);

    int srv = socket(AF_INET, SOCK_STREAM, 0);
    int opt = 1; setsockopt(srv, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
    struct sockaddr_in addr = {
        .sin_family=AF_INET, .sin_port=htons(PORT),
        .sin_addr.s_addr=htonl(INADDR_LOOPBACK)
    };
    bind(srv,(struct sockaddr*)&addr,sizeof(addr));
    listen(srv,1);

    if (fork()==0) {              /* receiver */
        close(srv); usleep(30000);
        int cfd=socket(AF_INET,SOCK_STREAM,0);
        connect(cfd,(struct sockaddr*)&addr,sizeof(addr));
        char buf[128]; ssize_t n=read(cfd,buf,sizeof(buf)-1); buf[n]=0;
        printf("received: %s", buf);
        close(cfd); _exit(0);
    }

    int cfd=accept(srv,NULL,NULL);
    ffd=open(fpath,O_RDONLY);
    struct stat st; fstat(ffd,&st);
    off_t off=0;
    sendfile(cfd,ffd,&off,st.st_size);  /* single syscall, no copy */
    close(ffd); close(cfd); close(srv);
    wait(NULL); unlink(fpath);
    return 0;
}`,
    notes: 'sendfile() requires out_fd to be a socket (on Linux); it performs the transfer entirely in kernel space. For pipe-to-pipe or file-to-pipe, use splice(). SPLICE_F_MOVE moves pages without copying when possible. recvmsg() with SCM_RIGHTS in the control message passes open file descriptors between processes — invaluable for privilege separation designs.',
    demoCode: `/* Demo: pass an open fd between processes via SCM_RIGHTS */
#include <sys/socket.h>
#include <sys/un.h>
#include <sys/wait.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

static void send_fd(int sock, int fd) {
    char dummy = 'F';
    struct iovec  iov = { .iov_base=&dummy, .iov_len=1 };
    char cmsgbuf[CMSG_SPACE(sizeof(int))];
    struct msghdr msg = {
        .msg_iov=&iov, .msg_iovlen=1,
        .msg_control=cmsgbuf, .msg_controllen=sizeof(cmsgbuf)
    };
    struct cmsghdr *cm = CMSG_FIRSTHDR(&msg);
    cm->cmsg_level = SOL_SOCKET;
    cm->cmsg_type  = SCM_RIGHTS;
    cm->cmsg_len   = CMSG_LEN(sizeof(int));
    memcpy(CMSG_DATA(cm), &fd, sizeof(int));
    sendmsg(sock, &msg, 0);
}

static int recv_fd(int sock) {
    char dummy;
    struct iovec iov = { .iov_base=&dummy, .iov_len=1 };
    char cmsgbuf[CMSG_SPACE(sizeof(int))];
    struct msghdr msg = {
        .msg_iov=&iov, .msg_iovlen=1,
        .msg_control=cmsgbuf, .msg_controllen=sizeof(cmsgbuf)
    };
    recvmsg(sock, &msg, 0);
    struct cmsghdr *cm = CMSG_FIRSTHDR(&msg);
    int fd; memcpy(&fd, CMSG_DATA(cm), sizeof(int));
    return fd;
}

int main() {
    /* write a temp file */
    const char *path = "/tmp/tlpi_scm.txt";
    int wfd = open(path, O_WRONLY|O_CREAT|O_TRUNC, 0644);
    write(wfd, "passed via SCM_RIGHTS\\n", 22);
    close(wfd);

    int sv[2];
    socketpair(AF_UNIX, SOCK_STREAM, 0, sv);

    if (fork() == 0) {
        close(sv[1]);
        int fd = open(path, O_RDONLY);
        send_fd(sv[0], fd);     /* pass fd to parent */
        close(fd); close(sv[0]); _exit(0);
    }
    close(sv[0]);
    wait(NULL);

    int rfd = recv_fd(sv[1]);   /* receive fd from child */
    char buf[64]; ssize_t n = read(rfd, buf, sizeof(buf)-1);
    buf[n]='\\0';
    printf("parent read via passed fd: %s", buf);
    close(rfd); close(sv[1]);
    unlink(path);
    return 0;
}`,
  },

  fallocate_adv: {
    name: 'Advanced File I/O', icon: '🗜️', chapter: 'Ch. 13+', vol: 1,
    desc: 'Beyond basic buffering: posix_fadvise() hints let you tell the kernel your access pattern (sequential, random, willneed, dontneed) to tune readahead. fallocate() pre-allocates disk space without writing data — avoids fragmentation and "no space" surprises at write time. fdatasync() flushes data blocks only; fsync() also flushes inode metadata.',
    syscalls: [
      { name: 'posix_fadvise', sig: 'int posix_fadvise(int fd, off_t offset, off_t len, int advice)' },
      { name: 'fallocate',     sig: 'int fallocate(int fd, int mode, off_t offset, off_t len)  // Linux' },
      { name: 'posix_fallocate', sig: 'int posix_fallocate(int fd, off_t offset, off_t len)  // POSIX' },
      { name: 'fdatasync',     sig: 'int fdatasync(int fd)' },
      { name: 'sync_file_range', sig: 'int sync_file_range(int fd, off64_t offset, off64_t nbytes, unsigned int flags)' },
    ],
    code: `/* TLPI §13.6+ — Advanced file I/O: fadvise, fallocate, fdatasync */
#define _GNU_SOURCE
#include <fcntl.h>
#include <stdio.h>
#include <unistd.h>

int main(void) {
    int fd = open("/tmp/tlpi_adv_fio.dat",
                  O_RDWR|O_CREAT|O_TRUNC, 0644);

    /* Pre-allocate 1 MiB — kernel reserves blocks, avoids fragmentation */
    if (fallocate(fd, 0, 0, 1024*1024) == -1)
        perror("fallocate");           /* Linux-specific; use posix_fallocate() for portability */

    /* Tell kernel we'll read the whole file sequentially */
    posix_fadvise(fd, 0, 0, POSIX_FADV_SEQUENTIAL);  /* hint: increase readahead */

    /* After writes: flush data pages to disk (skip metadata) */
    fdatasync(fd);    /* faster than fsync() — no inode timestamp update */

    /* Done — tell kernel we no longer need cached pages */
    posix_fadvise(fd, 0, 0, POSIX_FADV_DONTNEED);

    close(fd);
    unlink("/tmp/tlpi_adv_fio.dat");
    return 0;
}`,
    notes: 'POSIX_FADV_SEQUENTIAL doubles default readahead on Linux. fallocate() is O(1) — it marks extents allocated in the filesystem without writing zeros. posix_fallocate() is portable but much slower (writes zeros). Use POSIX_FADV_DONTNEED after large sequential reads to return page cache memory to the system.',
    demoCode: `#define _GNU_SOURCE
#include <fcntl.h>
#include <stdio.h>
#include <unistd.h>
#include <sys/stat.h>
#include <string.h>

int main(void) {
    const char *path = "/tmp/tlpi_fadv_demo.dat";
    int fd = open(path, O_RDWR|O_CREAT|O_TRUNC, 0644);
    if (fd < 0) { perror("open"); return 1; }

    /* fallocate: allocate 64 KiB instantly */
    if (fallocate(fd, 0, 0, 65536) == 0) {
        struct stat st;
        fstat(fd, &st);
        printf("fallocate(64K): size=%lld blocks=%lld\\n",
               (long long)st.st_size, (long long)st.st_blocks);
    } else {
        /* fallback for non-Linux filesystems */
        perror("fallocate (not supported on this fs, using ftruncate)");
        ftruncate(fd, 65536);
    }

    /* Advice: sequential read pattern */
    if (posix_fadvise(fd, 0, 0, POSIX_FADV_SEQUENTIAL) == 0)
        printf("posix_fadvise(SEQUENTIAL): readahead increased\\n");

    /* Write some data */
    const char *msg = "hello advanced file I/O\\n";
    write(fd, msg, strlen(msg));

    /* Flush data (but not metadata like mtime) */
    fdatasync(fd);
    printf("fdatasync: data flushed to disk (no metadata overhead)\\n");

    /* Release page cache for this file */
    posix_fadvise(fd, 0, 0, POSIX_FADV_DONTNEED);
    printf("POSIX_FADV_DONTNEED: page cache released\\n");

    close(fd);
    unlink(path);
    printf("Done.\\n");
    return 0;
}`,
  },

  acl: {
    name: 'POSIX ACLs', icon: '🔏', chapter: 'Ch. 17', vol: 1,
    desc: 'POSIX Access Control Lists extend the traditional owner/group/other permission model with per-user and per-group entries. Each file can have a list of (tag, qualifier, permissions) entries. The effective-rights mask (ACL_MASK) limits maximum permissions for named users and groups. Requires linking with -lacl and mounting with acl option.',
    syscalls: [
      { name: 'acl_get_file',    sig: 'acl_t acl_get_file(const char *path, acl_type_t type)' },
      { name: 'acl_set_file',    sig: 'int acl_set_file(const char *path, acl_type_t type, acl_t acl)' },
      { name: 'acl_create_entry',sig: 'int acl_create_entry(acl_t *acl, acl_entry_t *entry)' },
      { name: 'acl_get_entry',   sig: 'int acl_get_entry(acl_t acl, int entry_id, acl_entry_t *entry)' },
      { name: 'acl_to_text',     sig: 'char *acl_to_text(acl_t acl, ssize_t *len)' },
      { name: 'acl_free',        sig: 'int acl_free(void *obj)' },
    ],
    code: `/* TLPI §17 — POSIX ACLs (link with: gcc -lacl) */
#include <stdio.h>
#include <sys/acl.h>

int main(void) {
    /* Read the access ACL of a file */
    acl_t acl = acl_get_file("/etc/hostname", ACL_TYPE_ACCESS);
    if (acl == NULL) { perror("acl_get_file"); return 1; }

    /* Convert to human-readable text (same format as getfacl) */
    char *text = acl_to_text(acl, NULL);
    printf("ACL for /etc/hostname:\\n%s\\n", text);

    acl_free(text);
    acl_free(acl);   /* always free both the text and the ACL object */

    /* Adding a named-user entry */
    acl_t new_acl = acl_get_file("/tmp/myfile", ACL_TYPE_ACCESS);
    acl_entry_t entry;
    acl_create_entry(&new_acl, &entry);

    acl_tag_t tag = ACL_USER;
    acl_set_tag_type(entry, tag);

    uid_t uid = 1001;
    acl_set_qualifier(entry, &uid);

    acl_permset_t perms;
    acl_get_permset(entry, &perms);
    acl_add_perm(perms, ACL_READ);    /* grant read to uid 1001 */

    acl_set_file("/tmp/myfile", ACL_TYPE_ACCESS, new_acl);
    acl_free(new_acl);
    return 0;
}`,
    notes: 'ACL entries: ACL_USER_OBJ (file owner), ACL_USER (named user), ACL_GROUP_OBJ (owning group), ACL_GROUP (named group), ACL_MASK (max permissions for named entries), ACL_OTHER. When a named entry exists, ACL_MASK limits effective permissions. View/edit with: getfacl / setfacl. Filesystem must be mounted with "acl" option (ext4 default since kernel 2.6).',
    demoCode: `/* ACL demo — shows permissions without requiring libacl link */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>

int main(void) {
    const char *path = "/tmp/tlpi_acl_demo.txt";

    /* Create file with specific permissions */
    int fd = open(path, O_WRONLY|O_CREAT|O_TRUNC, 0640);
    if (fd < 0) { perror("open"); return 1; }
    write(fd, "ACL test file\\n", 14);
    close(fd);

    struct stat st;
    stat(path, &st);
    printf("File: %s\\n", path);
    printf("Mode: %04o (owner=rw-, group=r--, other=---)\\n",
           st.st_mode & 07777);
    printf("\\nACL extends this with per-user/group entries:\\n");
    printf("  # file: %s\\n", path);
    printf("  user::rw-      (owner)\\n");
    printf("  user:alice:r-- (named user — needs -lacl)\\n");
    printf("  group::r--     (owning group)\\n");
    printf("  mask::r--      (effective rights mask)\\n");
    printf("  other::---\\n\\n");

    /* Try system getfacl if available */
    char cmd[256];
    snprintf(cmd, sizeof(cmd), "getfacl %s 2>/dev/null || echo '(getfacl not available)'", path);
    printf("getfacl output:\\n");
    system(cmd);

    unlink(path);
    printf("\\nNote: acl_get_file/acl_set_file require gcc -lacl\\n");
    return 0;
}`,
  },

  signalfd_ch: {
    name: 'signalfd', icon: '📬', chapter: 'Ch. 22+', vol: 1,
    desc: 'signalfd() is a Linux-specific API that delivers signals via a file descriptor instead of asynchronous signal handlers. This makes signal handling synchronous and I/O-multiplexable — the signalfd can be watched with select/poll/epoll alongside other fds. First block signals with sigprocmask, then create the signalfd to receive them synchronously.',
    syscalls: [
      { name: 'signalfd',    sig: 'int signalfd(int fd, const sigset_t *mask, int flags)' },
      { name: 'read',        sig: 'ssize_t read(int fd, struct signalfd_siginfo *buf, size_t count)' },
    ],
    code: `/* TLPI §22.10 — signalfd: synchronous signal delivery via fd (Linux) */
#define _GNU_SOURCE
#include <sys/signalfd.h>
#include <signal.h>
#include <stdio.h>
#include <unistd.h>

int main(void) {
    sigset_t mask;
    sigemptyset(&mask);
    sigaddset(&mask, SIGINT);
    sigaddset(&mask, SIGTERM);

    /* Block signals — they'll be consumed via signalfd instead */
    sigprocmask(SIG_BLOCK, &mask, NULL);

    /* Create signalfd watching SIGINT and SIGTERM */
    int sfd = signalfd(-1, &mask, SFD_CLOEXEC);
    if (sfd == -1) { perror("signalfd"); return 1; }

    printf("Waiting for SIGINT or SIGTERM on fd=%d...\\n", sfd);

    /* Blocking read — wakes when a signal arrives */
    struct signalfd_siginfo si;
    ssize_t n = read(sfd, &si, sizeof(si));
    if (n == sizeof(si))
        printf("Got signal %u from pid %u\\n",
               si.ssi_signo, si.ssi_pid);

    close(sfd);
    return 0;
}`,
    notes: 'SFD_NONBLOCK and SFD_CLOEXEC flags available. signalfd(-1, mask, flags) creates a new fd; passing an existing sfd replaces its mask. struct signalfd_siginfo mirrors siginfo_t and contains ssi_signo, ssi_pid, ssi_uid, ssi_code, ssi_status (exit status for SIGCHLD). Combine with epoll for event-loop signal handling without thread-safety concerns.',
    demoCode: `#define _GNU_SOURCE
#include <sys/signalfd.h>
#include <signal.h>
#include <stdio.h>
#include <unistd.h>

int main(void) {
    sigset_t mask;
    sigemptyset(&mask);
    sigaddset(&mask, SIGUSR1);
    sigaddset(&mask, SIGUSR2);

    /* Block so signals go to signalfd, not handlers */
    sigprocmask(SIG_BLOCK, &mask, NULL);

    int sfd = signalfd(-1, &mask, SFD_CLOEXEC);
    if (sfd < 0) { perror("signalfd"); return 1; }
    printf("signalfd created, fd=%d\\n", sfd);

    /* Send two signals to ourselves */
    kill(getpid(), SIGUSR1);
    kill(getpid(), SIGUSR2);
    printf("Sent SIGUSR1 and SIGUSR2 to self (pid=%d)\\n", getpid());

    /* Read them synchronously — no async signal handler needed! */
    struct signalfd_siginfo si;
    for (int i = 0; i < 2; i++) {
        ssize_t n = read(sfd, &si, sizeof(si));
        if (n == (ssize_t)sizeof(si)) {
            const char *name = si.ssi_signo == SIGUSR1 ? "SIGUSR1" : "SIGUSR2";
            printf("Received %s (signo=%u) from pid=%u\\n",
                   name, si.ssi_signo, si.ssi_pid);
        }
    }

    close(sfd);
    printf("Done — signals handled without async signal handler!\\n");
    printf("signalfd can be watched with select/poll/epoll alongside sockets.\\n");
    return 0;
}`,
  },

  itimer: {
    name: 'Interval Timers', icon: '⏰', chapter: 'Ch. 23+', vol: 1,
    desc: 'setitimer() provides per-process interval timers that deliver signals at fixed intervals. ITIMER_REAL counts wall-clock time and delivers SIGALRM. ITIMER_VIRTUAL counts CPU time in user mode (SIGVTALRM). ITIMER_PROF counts CPU time in user+kernel mode (SIGPROF). alarm() is a simpler one-shot SIGALRM wrapper. Only one timer per type per process.',
    syscalls: [
      { name: 'setitimer', sig: 'int setitimer(int which, const struct itimerval *new, struct itimerval *old)' },
      { name: 'getitimer', sig: 'int getitimer(int which, struct itimerval *curr)' },
      { name: 'alarm',     sig: 'unsigned int alarm(unsigned int seconds)' },
    ],
    code: `/* TLPI §23.1 — Interval timers: setitimer / alarm */
#include <signal.h>
#include <sys/time.h>
#include <stdio.h>
#include <unistd.h>

static volatile int cnt = 0;

static void sigalrm_handler(int sig) { cnt++; }

int main(void) {
    struct sigaction sa = { .sa_handler = sigalrm_handler };
    sigemptyset(&sa.sa_mask);
    sigaction(SIGALRM, &sa, NULL);

    struct itimerval it = {
        .it_value    = { .tv_sec=0, .tv_usec=200000 }, /* first: 200 ms */
        .it_interval = { .tv_sec=0, .tv_usec=200000 }, /* repeat: 200 ms */
    };
    setitimer(ITIMER_REAL, &it, NULL);  /* start — delivers SIGALRM */

    while (cnt < 5)
        pause();    /* sleep until signal */

    /* Cancel timer by setting it_value to zero */
    struct itimerval off = {0};
    setitimer(ITIMER_REAL, &off, NULL);

    printf("Timer fired %d times\\n", cnt);
    return 0;
}`,
    notes: 'itimerval has two timeval fields: it_value (time until first delivery, 0=disarm) and it_interval (reload value after each delivery, 0=one-shot). ITIMER_REAL resolution is ~10ms on older kernels but much finer with CONFIG_HZ=1000 or hrtimers. For nanosecond precision and per-thread timers, prefer timer_create()/timer_settime() (POSIX interval timers, Ch.23).',
    demoCode: `#include <signal.h>
#include <sys/time.h>
#include <stdio.h>
#include <unistd.h>
#include <time.h>

static volatile int count = 0;

static void handler(int sig) { count++; }

int main(void) {
    struct sigaction sa = { .sa_handler = handler };
    sigemptyset(&sa.sa_mask);
    sigaction(SIGALRM, &sa, NULL);

    printf("Starting 100ms interval timer...\\n");

    struct itimerval it = {
        .it_value    = { .tv_sec=0, .tv_usec=100000 },  /* 100ms */
        .it_interval = { .tv_sec=0, .tv_usec=100000 },
    };
    setitimer(ITIMER_REAL, &it, NULL);

    /* Wait for 5 ticks */
    while (count < 5) pause();

    /* Disarm */
    struct itimerval zero = {0};
    setitimer(ITIMER_REAL, &zero, NULL);
    printf("SIGALRM fired %d times at 100ms intervals\\n", count);

    /* Read remaining time */
    struct itimerval cur;
    getitimer(ITIMER_REAL, &cur);
    printf("Remaining after disarm: it_value=%lds %ldus\\n",
           (long)cur.it_value.tv_sec, (long)cur.it_value.tv_usec);

    /* Demonstrate alarm(): one-shot, whole seconds only */
    printf("\\nalarm(1) set — fires in 1 second...\\n");
    alarm(1);
    pause();   /* wait for SIGALRM from alarm() */
    printf("alarm() fired! (one-shot SIGALRM)\\n");

    return 0;
}`,
  },

  secure: {
    name: 'Secure Programming', icon: '🛡️', chapter: 'Ch. 38', vol: 2,
    desc: 'Ch.38 covers hardening programs against attack: TOCTTOU races (check-then-use), symlink attacks, temporary file pitfalls, privilege minimization, and safe string handling. Core rule: never access() then open() — open() atomically handles both. Use O_NOFOLLOW to refuse symlinks. Set umask(0077) before creating sensitive files. Drop privileges (seteuid/setgid) immediately after obtaining them.',
    syscalls: [
      { name: 'umask',     sig: 'mode_t umask(mode_t mask)' },
      { name: 'open',      sig: 'int open(path, O_NOFOLLOW|O_CREAT|O_EXCL, mode)  // safe pattern' },
      { name: 'mkstemp',   sig: 'int mkstemp(char *template)  // safe temp file' },
      { name: 'access',    sig: 'int access(const char *path, int mode)  // NEVER use before open!' },
      { name: 'seteuid',   sig: 'int seteuid(uid_t euid)  // drop/regain privilege' },
    ],
    code: `/* TLPI §38 — Secure programming: TOCTTOU, O_NOFOLLOW, umask */
#define _GNU_SOURCE
#include <fcntl.h>
#include <stdio.h>
#include <unistd.h>
#include <sys/stat.h>

/* WRONG — TOCTTOU race: attacker swaps /tmp/f to a symlink between check and use */
void insecure_write(const char *path) {
    if (access(path, F_OK) == -1) {        /* CHECK — vulnerable window */
        int fd = open(path, O_WRONLY|O_CREAT, 0600); /* USE */
        if (fd != -1) { write(fd,"data",4); close(fd); }
    }
}

/* RIGHT — single atomic open() with O_CREAT|O_EXCL; fail if exists */
void secure_write(const char *path) {
    int fd = open(path,
        O_WRONLY | O_CREAT | O_EXCL |  /* fail if exists (atomic) */
        O_NOFOLLOW,                      /* refuse if symlink */
        0600);
    if (fd != -1) { write(fd,"data",4); close(fd); }
}

int main(void) {
    umask(0077);   /* mask group+other bits on all subsequent creates */

    /* Safe temp file: mkstemp creates with O_CREAT|O_EXCL atomically */
    char tmpl[] = "/tmp/tlpi_XXXXXX";
    int tfd = mkstemp(tmpl);
    printf("Secure temp file: %s\\n", tmpl);
    unlink(tmpl);  /* unlink immediately so it disappears on close */
    close(tfd);

    secure_write("/tmp/tlpi_sec_test");
    struct stat st;
    stat("/tmp/tlpi_sec_test", &st);
    printf("Mode: %04o (umask applied)\\n", st.st_mode & 07777);
    unlink("/tmp/tlpi_sec_test");
    return 0;
}`,
    notes: 'TOCTTOU (Time-Of-Check-To-Time-Of-Use) is the #1 class of filesystem race bugs. In setuid programs, /tmp symlink attacks can escalate to root. O_NOFOLLOW is essential when the path comes from untrusted input. mkstemp() is the correct way to create temp files — never use tmpnam(). Always unlink temp files immediately after mkstemp and before writing sensitive data.',
    demoCode: `#define _GNU_SOURCE
#include <fcntl.h>
#include <stdio.h>
#include <unistd.h>
#include <sys/stat.h>
#include <errno.h>
#include <string.h>

int main(void) {
    /* 1. Demonstrate umask */
    umask(0077);
    printf("umask set to 0077 (mask group+other)\\n");

    int fd = open("/tmp/tlpi_umask_demo.txt",
                  O_WRONLY|O_CREAT|O_TRUNC, 0666);
    if (fd < 0) { perror("open"); return 1; }
    write(fd, "secure\\n", 7);
    close(fd);

    struct stat st;
    stat("/tmp/tlpi_umask_demo.txt", &st);
    printf("Requested 0666, got: %04o (umask removed 077)\\n",
           st.st_mode & 07777);
    unlink("/tmp/tlpi_umask_demo.txt");

    /* 2. O_NOFOLLOW rejects symlinks */
    symlink("/etc/passwd", "/tmp/tlpi_sym_demo");
    int fd2 = open("/tmp/tlpi_sym_demo", O_RDONLY|O_NOFOLLOW);
    if (fd2 < 0)
        printf("\\nO_NOFOLLOW rejected symlink -> /etc/passwd: %s\\n",
               strerror(errno));
    unlink("/tmp/tlpi_sym_demo");

    /* 3. Safe temp file with mkstemp */
    char tmpl[] = "/tmp/tlpi_sec_XXXXXX";
    int tfd = mkstemp(tmpl);
    if (tfd >= 0) {
        unlink(tmpl);  /* unlink while still open — vanishes on close */
        write(tfd, "confidential\\n", 13);
        printf("\\nmkstemp: %s (unlinked; fd=%d still usable)\\n", tmpl, tfd);
        close(tfd);
        printf("After close: file gone — no name, no trace\\n");
    }
    return 0;
}`,
  },

  utmpx: {
    name: 'Login Accounting', icon: '📝', chapter: 'Ch. 40', vol: 2,
    desc: 'POSIX utmpx maintains records of logged-in users, boot times, and run-level changes in /var/run/utmp (current state) and /var/log/wtmp (history). getutxent() iterates records; pututxline() writes a record. The utmpx structure has ut_type (BOOT_TIME, USER_PROCESS, DEAD_PROCESS…), ut_user, ut_line, ut_host, and ut_tv timestamp.',
    syscalls: [
      { name: 'setutxent',   sig: 'void setutxent(void)  // rewind to start' },
      { name: 'getutxent',   sig: 'struct utmpx *getutxent(void)' },
      { name: 'pututxline',  sig: 'struct utmpx *pututxline(const struct utmpx *ut)' },
      { name: 'endutxent',   sig: 'void endutxent(void)' },
      { name: 'getutxline',  sig: 'struct utmpx *getutxline(const struct utmpx *ut)' },
      { name: 'getutxid',    sig: 'struct utmpx *getutxid(const struct utmpx *ut)' },
    ],
    code: `/* TLPI §40 — Login accounting: reading utmpx records */
#include <utmpx.h>
#include <stdio.h>
#include <time.h>

int main(void) {
    struct utmpx *ut;
    setutxent();   /* rewind the utmpx database */

    printf("%-10s %-12s %-20s %s\\n", "USER","TTY","HOST","TIME");
    printf("%-10s %-12s %-20s %s\\n", "----","---","----","----");

    while ((ut = getutxent()) != NULL) {
        if (ut->ut_type != USER_PROCESS) continue;
        char tbuf[32];
        time_t t = ut->ut_tv.tv_sec;
        strftime(tbuf, sizeof(tbuf), "%Y-%m-%d %H:%M", localtime(&t));
        printf("%-10s %-12s %-20s %s\\n",
               ut->ut_user, ut->ut_line,
               ut->ut_host[0] ? ut->ut_host : "(local)", tbuf);
    }
    endutxent();

    /* Writing a logout record */
    struct utmpx dead = {0};
    dead.ut_type = DEAD_PROCESS;
    /* fill ut_id, ut_pid from login record before calling: */
    /* pututxline(&dead); */
    return 0;
}`,
    notes: 'utmpx record types: EMPTY(0) BOOT_TIME(2) NEW_TIME(3) OLD_TIME(4) INIT_PROCESS(5) LOGIN_PROCESS(6) USER_PROCESS(7) DEAD_PROCESS(8). Programs writing login records (login, sshd, xterm) should update both utmp and wtmp. lastlog(5) is a separate database tracking each user\'s last login. Requires root or appropriate group membership to write utmpx records.',
    demoCode: `#include <utmpx.h>
#include <stdio.h>
#include <time.h>
#include <string.h>

int main(void) {
    struct utmpx *ut;
    int users = 0, boots = 0, total = 0;

    setutxent();
    while ((ut = getutxent()) != NULL) {
        total++;
        switch (ut->ut_type) {
        case USER_PROCESS: {
            char tbuf[32];
            time_t t = ut->ut_tv.tv_sec;
            strftime(tbuf, sizeof(tbuf), "%H:%M:%S", localtime(&t));
            printf("USER_PROCESS  user=%-12s tty=%-8s host=%s login=%s\\n",
                   ut->ut_user, ut->ut_line,
                   ut->ut_host[0] ? ut->ut_host : "-", tbuf);
            users++;
            break;
        }
        case BOOT_TIME: {
            time_t t = ut->ut_tv.tv_sec;
            printf("BOOT_TIME     system booted at %s", ctime(&t));
            boots++;
            break;
        }
        case DEAD_PROCESS:
            break;  /* skip dead entries */
        default:
            break;
        }
    }
    endutxent();

    printf("\\nSummary: %d total records, %d logged-in users, %d boots\\n",
           total, users, boots);
    if (total == 0)
        printf("(utmpx empty or no read access — try as root)\\n");

    printf("\\nut_type constants: BOOT_TIME=%d RUN_LVL=%d USER_PROCESS=%d DEAD_PROCESS=%d\\n",
           BOOT_TIME, RUN_LVL, USER_PROCESS, DEAD_PROCESS);
    return 0;
}`,
  },

  memfd: {
    name: 'memfd_create', icon: '💿', chapter: 'Ch. 49+', vol: 2,
    desc: 'memfd_create() creates an anonymous file backed by memory — no filesystem entry, lives entirely in RAM. The returned fd behaves like a regular file: ftruncate, mmap, read, write all work. Key use: pass memory regions between processes via fd-passing (SCM_RIGHTS) without any /tmp file. Supports sealing (F_ADD_SEALS) to prevent further modifications.',
    syscalls: [
      { name: 'memfd_create', sig: 'int memfd_create(const char *name, unsigned int flags)  // Linux 3.17+' },
      { name: 'ftruncate',    sig: 'int ftruncate(int fd, off_t length)' },
      { name: 'mmap',         sig: 'void *mmap(NULL, size, PROT_READ|PROT_WRITE, MAP_SHARED, fd, 0)' },
      { name: 'fcntl',        sig: 'int fcntl(int fd, F_ADD_SEALS, F_SEAL_WRITE|F_SEAL_GROW|F_SEAL_SHRINK)' },
    ],
    code: `/* TLPI §49+ — memfd_create: anonymous file-backed memory */
#define _GNU_SOURCE
#include <sys/mman.h>
#include <sys/memfd.h>
#include <fcntl.h>
#include <stdio.h>
#include <unistd.h>
#include <string.h>

int main(void) {
    /* Create anonymous in-memory file (name is for /proc/self/fd/ only) */
    int fd = memfd_create("my_memfd", MFD_CLOEXEC | MFD_ALLOW_SEALING);
    if (fd == -1) { perror("memfd_create"); return 1; }

    ftruncate(fd, 4096);   /* set size */

    /* Map it into address space */
    char *p = mmap(NULL, 4096, PROT_READ|PROT_WRITE, MAP_SHARED, fd, 0);
    snprintf(p, 4096, "PID=%d says hello via memfd!", getpid());
    printf("Mapped: %s\\n", p);

    /* Seal: prevent size changes (now read-only to other processes) */
    fcntl(fd, F_ADD_SEALS, F_SEAL_SHRINK | F_SEAL_GROW | F_SEAL_WRITE);
    printf("Sealed — writes and resizes now forbidden\\n");

    /* fd can be sent to child via fork or SCM_RIGHTS (no unlink needed) */
    munmap(p, 4096);
    close(fd);   /* memory freed automatically — no filesystem cleanup */
    return 0;
}`,
    notes: 'MFD_ALLOW_SEALING enables F_ADD_SEALS/F_GET_SEALS. Seals: F_SEAL_SEAL (no more seals), F_SEAL_SHRINK, F_SEAL_GROW, F_SEAL_WRITE (immutable content). Typical pattern for shared memory: create memfd, ftruncate, mmap, write data, add F_SEAL_WRITE, pass fd to child — child gets guaranteed-immutable shared memory. Better than POSIX shm_open() since it leaves no /dev/shm entry.',
    demoCode: `#define _GNU_SOURCE
#include <sys/mman.h>
#include <sys/memfd.h>
#include <fcntl.h>
#include <stdio.h>
#include <unistd.h>
#include <string.h>
#include <sys/wait.h>

int main(void) {
    int fd = memfd_create("demo", MFD_CLOEXEC | MFD_ALLOW_SEALING);
    if (fd < 0) { perror("memfd_create"); return 1; }

    ftruncate(fd, 4096);
    char *map = mmap(NULL, 4096, PROT_READ|PROT_WRITE, MAP_SHARED, fd, 0);
    if (map == MAP_FAILED) { perror("mmap"); return 1; }

    snprintf(map, 4096, "shared message from parent pid=%d", getpid());
    printf("Parent wrote: %s\\n", map);

    /* Seal: children can read but not write */
    fcntl(fd, F_ADD_SEALS, F_SEAL_SHRINK|F_SEAL_GROW|F_SEAL_WRITE);
    printf("Sealed (no write/resize allowed)\\n");

    pid_t pid = fork();
    if (pid == 0) {
        /* Child: read via same fd (inherited across fork) */
        char *cm = mmap(NULL, 4096, PROT_READ, MAP_SHARED, fd, 0);
        printf("Child  read: %s\\n", cm);
        munmap(cm, 4096);
        _exit(0);
    }
    wait(NULL);

    /* Verify /proc path */
    char proc[64];
    snprintf(proc, sizeof(proc), "/proc/self/fd/%d", fd);
    char link[128]; ssize_t n = readlink(proc, link, sizeof(link)-1);
    if (n > 0) { link[n] = 0; printf("/proc path: %s -> %s\\n", proc, link); }

    munmap(map, 4096);
    close(fd);
    printf("Closed fd — no unlink needed, memory reclaimed!\\n");
    return 0;
}`,
  },

  mremap: {
    name: 'mremap', icon: '🔄', chapter: 'Ch. 50+', vol: 2,
    desc: 'mremap() resizes an existing memory mapping in place — it can grow, shrink, or move a mapping. With MREMAP_MAYMOVE, the kernel can relocate the mapping if it cannot grow in place, returning the new address. This avoids a costly munmap+mmap+memcpy cycle when growing a large buffer. Linux-specific; no POSIX equivalent.',
    syscalls: [
      { name: 'mremap', sig: 'void *mremap(void *old_addr, size_t old_size, size_t new_size, int flags, ...)' },
      { name: 'mmap',   sig: 'void *mmap(NULL, size, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0)' },
      { name: 'munmap', sig: 'int munmap(void *addr, size_t length)' },
    ],
    code: `/* TLPI §50 — mremap: resize existing memory mapping in-place */
#define _GNU_SOURCE
#include <sys/mman.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

int main(void) {
    const size_t PAGE = getpagesize();

    /* Initial anonymous mapping */
    char *p = mmap(NULL, PAGE, PROT_READ|PROT_WRITE,
                   MAP_PRIVATE|MAP_ANONYMOUS, -1, 0);
    if (p == MAP_FAILED) { perror("mmap"); return 1; }

    strcpy(p, "original data");
    printf("Before: addr=%p data='%s'\\n", p, p);

    /* Grow to 2 pages — MREMAP_MAYMOVE allows relocation */
    char *q = mremap(p, PAGE, PAGE*2, MREMAP_MAYMOVE);
    if (q == MAP_FAILED) { perror("mremap"); return 1; }

    printf("After:  addr=%p data='%s' (may have moved)\\n", q, q);

    /* Use the new region */
    strcpy(q + PAGE, "data in extended region");
    printf("New region: '%s'\\n", q + PAGE);

    munmap(q, PAGE * 2);
    return 0;
}`,
    notes: 'Flags: MREMAP_MAYMOVE (allow relocation), MREMAP_FIXED (move to specified address, like MAP_FIXED for mmap). When growing works in-place, the old pointer stays valid. When the mapping moves, accessing the old address is undefined behaviour. mremap() is atomic — no window where the memory is unmapped. Commonly used in dynamic array implementations to avoid copying on resize.',
    demoCode: `#define _GNU_SOURCE
#include <sys/mman.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

int main(void) {
    const size_t PAGE = getpagesize();
    printf("Page size: %zu bytes\\n\\n", PAGE);

    /* Allocate 1 page */
    char *p = mmap(NULL, PAGE, PROT_READ|PROT_WRITE,
                   MAP_PRIVATE|MAP_ANONYMOUS, -1, 0);
    if (p == MAP_FAILED) { perror("mmap"); return 1; }

    snprintf(p, PAGE, "Page1 data at %p", p);
    printf("Alloc 1 page:   %p  '%s'\\n", p, p);

    /* Grow to 2 pages */
    char *q = mremap(p, PAGE, PAGE*2, MREMAP_MAYMOVE);
    if (q == MAP_FAILED) { perror("mremap grow"); return 1; }
    printf("Grow to 2 pages: %p  '%s'\\n", q, q);
    snprintf(q + PAGE, PAGE, "Page2 data at %p", q+PAGE);
    printf("New page data:   %s\\n", q+PAGE);

    /* Grow to 4 pages */
    char *r = mremap(q, PAGE*2, PAGE*4, MREMAP_MAYMOVE);
    if (r == MAP_FAILED) { perror("mremap grow2"); return 1; }
    printf("Grow to 4 pages: %p\\n", r);

    /* Shrink back to 1 page */
    char *s = mremap(r, PAGE*4, PAGE, 0);  /* 0 = no MAYMOVE needed for shrink */
    if (s == MAP_FAILED) { perror("mremap shrink"); return 1; }
    printf("Shrink to 1 page: %p  '%s'\\n", s, s);

    munmap(s, PAGE);
    printf("\\nmremap avoids memcpy when growing — stays in same virtual address space.\\n");
    return 0;
}`,
  },

  splice: {
    name: 'splice / tee', icon: '🔀', chapter: 'Ch. 61+', vol: 2,
    desc: 'splice() moves data between a pipe and another fd (file, socket) entirely in kernel space — no userspace buffer involved. tee() duplicates data between two pipes without consuming it. vmsplice() moves userspace memory into a pipe via VM page remapping. These zero-copy primitives underpin high-performance servers (nginx uses splice for sendfile-like transfers).',
    syscalls: [
      { name: 'splice',   sig: 'ssize_t splice(int fd_in, loff_t *off_in, int fd_out, loff_t *off_out, size_t len, unsigned int flags)' },
      { name: 'tee',      sig: 'ssize_t tee(int fd_in, int fd_out, size_t len, unsigned int flags)' },
      { name: 'vmsplice', sig: 'ssize_t vmsplice(int fd, const struct iovec *iov, size_t nr_segs, unsigned int flags)' },
    ],
    code: `/* TLPI §61+ — splice/tee: zero-copy fd-to-fd data movement */
#define _GNU_SOURCE
#include <fcntl.h>
#include <stdio.h>
#include <unistd.h>

int main(void) {
    int pfd[2];
    pipe(pfd);

    /* Write into pipe */
    write(pfd[1], "zero-copy via splice!\\n", 22);
    close(pfd[1]);

    /* splice: pipe → stdout, no userspace copy */
    ssize_t n = splice(pfd[0], NULL,
                       STDOUT_FILENO, NULL,
                       4096, SPLICE_F_MOVE | SPLICE_F_MORE);
    printf("spliced %zd bytes\\n", n);
    close(pfd[0]);

    /* tee: duplicate pipe data without consuming it */
    int p1[2], p2[2];
    pipe(p1); pipe(p2);
    write(p1[1], "tee me\\n", 8); close(p1[1]);
    ssize_t t = tee(p1[0], p2[1], 4096, SPLICE_F_NONBLOCK);
    printf("tee copied %zd bytes (p1 still readable)\\n", t);
    close(p1[0]); close(p2[0]); close(p2[1]);
    return 0;
}`,
    notes: 'SPLICE_F_MOVE hints kernel to move pages rather than copy (best-effort). SPLICE_F_MORE hints more data coming (like TCP_CORK). SPLICE_F_NONBLOCK makes the splice non-blocking. At least one fd must be a pipe. Classic pattern: splice(file_fd→pipe) then splice(pipe→socket) for zero-copy file serving — replaces sendfile() with more flexibility.',
    demoCode: `#define _GNU_SOURCE
#include <fcntl.h>
#include <stdio.h>
#include <unistd.h>
#include <string.h>

int main(void) {
    /* splice: file -> pipe -> file (zero-copy pipeline) */
    int src = open("/etc/hostname", O_RDONLY);
    if (src < 0) { perror("open /etc/hostname"); return 1; }

    int pfd[2];
    pipe(pfd);

    /* splice file into pipe (kernel-side) */
    ssize_t n = splice(src, NULL, pfd[1], NULL, 4096, SPLICE_F_MOVE);
    printf("splice /etc/hostname -> pipe: %zd bytes\\n", n);
    close(src); close(pfd[1]);

    /* splice pipe -> stdout */
    printf("Content via splice: ");
    fflush(stdout);
    splice(pfd[0], NULL, STDOUT_FILENO, NULL, n, SPLICE_F_MOVE);
    close(pfd[0]);

    /* tee: copy pipe without consuming */
    int p1[2], p2[2];
    pipe(p1); pipe(p2);
    const char *msg = "tee duplicates pipe data in kernel\\n";
    ssize_t len = strlen(msg);
    write(p1[1], msg, len); close(p1[1]);

    ssize_t t = tee(p1[0], p2[1], len, 0);
    printf("\\ntee copied %zd bytes\\n", t);
    close(p2[1]);

    char buf[128];
    ssize_t r = read(p1[0], buf, sizeof(buf)-1); buf[r]=0;
    printf("p1 original: %s", buf);
    r = read(p2[0], buf, sizeof(buf)-1); buf[r]=0;
    printf("p2 tee copy: %s", buf);
    close(p1[0]); close(p2[0]);
    return 0;
}`,
  },

  eventfd: {
    name: 'eventfd', icon: '🔔', chapter: 'Ch. 63+', vol: 2,
    desc: 'eventfd() creates a file descriptor backed by a 64-bit kernel counter. write() adds to the counter; read() returns the current value and resets it to 0 (or decrements by 1 with EFD_SEMAPHORE). If the counter is 0, read() blocks (unless EFD_NONBLOCK). The fd can be used with select/poll/epoll — it becomes readable when the counter is nonzero. Much lighter than a pipe pair for simple signaling.',
    syscalls: [
      { name: 'eventfd', sig: 'int eventfd(unsigned int initval, int flags)  // EFD_CLOEXEC|EFD_NONBLOCK|EFD_SEMAPHORE' },
      { name: 'write',   sig: 'ssize_t write(int efd, uint64_t *val, 8)  // adds val to counter' },
      { name: 'read',    sig: 'ssize_t read(int efd, uint64_t *val, 8)   // returns counter, resets to 0' },
    ],
    code: `/* TLPI §63+ — eventfd: lightweight kernel event counter */
#include <sys/eventfd.h>
#include <stdio.h>
#include <unistd.h>
#include <stdint.h>

int main(void) {
    /* Create eventfd counter starting at 0 */
    int efd = eventfd(0, EFD_CLOEXEC);
    if (efd == -1) { perror("eventfd"); return 1; }

    /* Signal the event: add 1 to the counter */
    uint64_t val = 1;
    write(efd, &val, sizeof(val));

    /* Wait for event: read blocks until counter > 0,
       then returns count and resets counter to 0 */
    uint64_t count;
    read(efd, &count, sizeof(count));
    printf("Got event, counter was %llu\\n",
           (unsigned long long)count);

    /* With EFD_SEMAPHORE: read always returns 1 and decrements by 1
       (P operation — useful as a counting semaphore) */
    close(efd);
    return 0;
}`,
    notes: 'EFD_SEMAPHORE: each read returns 1 and decrements (classic P). Without flag: read returns full accumulated count and resets to 0. Write saturates at UINT64_MAX-1 (EAGAIN before overflow). eventfd uses only ~400 bytes of kernel memory vs a pipe pair (~8 KB). Ideal for thread/process notification in epoll event loops. Compatible with select/poll/epoll — becomes readable when counter > 0.',
    demoCode: `#define _GNU_SOURCE
#include <sys/eventfd.h>
#include <stdio.h>
#include <unistd.h>
#include <stdint.h>
#include <sys/wait.h>

int main(void) {
    /* Test basic counter mode */
    int efd = eventfd(0, EFD_CLOEXEC);
    if (efd < 0) { perror("eventfd"); return 1; }
    printf("eventfd created (fd=%d, initial counter=0)\\n", efd);

    /* Accumulate: write 3 times */
    uint64_t v = 1;
    write(efd, &v, 8);
    write(efd, &v, 8);
    write(efd, &v, 8);
    printf("Wrote 1+1+1 to counter\\n");

    /* Single read gets accumulated total */
    uint64_t count;
    read(efd, &count, sizeof(count));
    printf("One read returned: %llu (counter reset to 0)\\n",
           (unsigned long long)count);
    close(efd);

    /* Fork demo: child signals parent via eventfd */
    int efd2 = eventfd(0, EFD_CLOEXEC);
    pid_t pid = fork();
    if (pid == 0) {
        for (int i = 1; i <= 3; i++) {
            uint64_t one = 1;
            write(efd2, &one, 8);
            printf("  child: signaled event #%d\\n", i);
            usleep(20000);
        }
        _exit(0);
    }
    for (int i = 0; i < 3; i++) {
        uint64_t n;
        read(efd2, &n, 8);   /* blocks until counter > 0 */
        printf("parent: received event, count=%llu\\n",
               (unsigned long long)n);
    }
    wait(NULL);
    close(efd2);
    printf("\\neventfd: 2 bytes of state, works with epoll, lighter than pipe!\\n");
    return 0;
}`,
  },
  epoll: {
    name: 'epoll', icon: '⚡', chapter: 'Ch. 62', vol: 2,
    desc: 'I/O 多路复用高效实现，O(1) 事件通知，适合高并发服务器',
    code: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/epoll.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <fcntl.h>

#define MAX_EVENTS 64
#define PORT 9000

static void set_nonblock(int fd) {
    int flags = fcntl(fd, F_GETFL, 0);
    fcntl(fd, F_SETFL, flags | O_NONBLOCK);
}

int main(void) {
    /* 创建监听 socket */
    int lfd = socket(AF_INET, SOCK_STREAM, 0);
    int opt = 1;
    setsockopt(lfd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
    struct sockaddr_in addr = {
        .sin_family = AF_INET, .sin_port = htons(PORT),
        .sin_addr.s_addr = INADDR_ANY
    };
    bind(lfd, (struct sockaddr *)&addr, sizeof(addr));
    listen(lfd, 128);
    set_nonblock(lfd);

    /* 创建 epoll 实例 */
    int epfd = epoll_create1(EPOLL_CLOEXEC);
    struct epoll_event ev = { .events = EPOLLIN, .data.fd = lfd };
    epoll_ctl(epfd, EPOLL_CTL_ADD, lfd, &ev);

    printf("epoll server listening on :%d\\n", PORT);

    struct epoll_event events[MAX_EVENTS];
    for (;;) {
        int n = epoll_wait(epfd, events, MAX_EVENTS, -1);
        for (int i = 0; i < n; i++) {
            int fd = events[i].data.fd;
            if (fd == lfd) {          /* 新连接 */
                int cfd = accept4(lfd, NULL, NULL, SOCK_NONBLOCK);
                ev.events = EPOLLIN | EPOLLET;  /* 边缘触发 */
                ev.data.fd = cfd;
                epoll_ctl(epfd, EPOLL_CTL_ADD, cfd, &ev);
                printf("accept fd=%d\\n", cfd);
            } else {                  /* 可读事件 */
                char buf[1024];
                ssize_t r = read(fd, buf, sizeof(buf));
                if (r <= 0) {
                    epoll_ctl(epfd, EPOLL_CTL_DEL, fd, NULL);
                    close(fd);
                    printf("close fd=%d\\n", fd);
                } else {
                    write(fd, buf, r);  /* echo 回去 */
                }
            }
        }
    }
}`,
  },
  posix_shm: {
    name: 'POSIX shm', icon: '🤝', chapter: 'Ch. 54', vol: 2,
    desc: 'POSIX 共享内存，进程间零拷贝数据共享',
    code: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/mman.h>
#include <sys/wait.h>

#define SHM_NAME "/demo_shm"
#define SHM_SIZE 4096

typedef struct { int counter; char message[256]; } SharedData;

int main(void) {
    /* 创建共享内存对象 */
    int fd = shm_open(SHM_NAME, O_CREAT | O_RDWR, 0600);
    if (fd == -1) { perror("shm_open"); exit(1); }
    ftruncate(fd, SHM_SIZE);

    /* 映射到进程地址空间 */
    SharedData *shm = mmap(NULL, SHM_SIZE,
                           PROT_READ | PROT_WRITE,
                           MAP_SHARED, fd, 0);
    close(fd);

    shm->counter = 0;
    strcpy(shm->message, "hello from parent");

    pid_t pid = fork();
    if (pid == 0) {  /* 子进程 */
        for (int i = 0; i < 5; i++) {
            shm->counter++;                    /* 直接写共享内存 */
            printf("child: counter=%d\\n", shm->counter);
            usleep(100000);
        }
        snprintf(shm->message, 256, "written by child (pid=%d)", getpid());
        munmap(shm, SHM_SIZE);
        exit(0);
    }

    wait(NULL);  /* 等子进程完成 */
    printf("parent: final counter=%d\\n", shm->counter);
    printf("parent: message='%s'\\n", shm->message);

    munmap(shm, SHM_SIZE);
    shm_unlink(SHM_NAME);   /* 删除共享内存对象 */
    printf("\\nPOSIX shm: zero-copy IPC, persists until shm_unlink()\\n");
    return 0;
}`,
  },
  posix_sem: {
    name: 'POSIX sem', icon: '🚦', chapter: 'Ch. 53', vol: 2,
    desc: 'POSIX 命名/匿名信号量，进程/线程同步原语',
    code: `#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>
#include <semaphore.h>
#include <unistd.h>

#define ITEMS 8

sem_t empty_slots, filled_slots;
int buffer[4], head = 0, tail = 0;

void *producer(void *arg) {
    for (int i = 0; i < ITEMS; i++) {
        int item = i * 10;
        sem_wait(&empty_slots);          /* 等待空槽 */
        buffer[head % 4] = item;
        head++;
        printf("produce: item=%d (head=%d)\\n", item, head);
        sem_post(&filled_slots);         /* 通知消费者 */
        usleep(50000);
    }
    return NULL;
}

void *consumer(void *arg) {
    for (int i = 0; i < ITEMS; i++) {
        sem_wait(&filled_slots);         /* 等待数据 */
        int item = buffer[tail % 4];
        tail++;
        printf("consume: item=%d (tail=%d)\\n", item, tail);
        sem_post(&empty_slots);          /* 释放槽位 */
        usleep(120000);
    }
    return NULL;
}

int main(void) {
    sem_init(&empty_slots, 0, 4);    /* 4个空槽 */
    sem_init(&filled_slots, 0, 0);   /* 0个数据 */

    pthread_t prod, cons;
    pthread_create(&prod, NULL, producer, NULL);
    pthread_create(&cons, NULL, consumer, NULL);
    pthread_join(prod, NULL);
    pthread_join(cons, NULL);

    sem_destroy(&empty_slots);
    sem_destroy(&filled_slots);
    printf("\\nPOSIX sem: producer-consumer with bounded buffer done!\\n");
    return 0;
}`,
  },
  select_poll: {
    name: 'select/poll', icon: '🎯', chapter: 'Ch. 63', vol: 2,
    desc: 'I/O 多路复用基础：select 和 poll 监视多个文件描述符',
    code: `#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/select.h>
#include <poll.h>
#include <string.h>

void demo_select(int fd0, int fd1) {
    fd_set rfds;
    struct timeval tv = { .tv_sec = 2, .tv_usec = 0 };

    FD_ZERO(&rfds);
    FD_SET(fd0, &rfds);
    FD_SET(fd1, &rfds);
    int maxfd = fd0 > fd1 ? fd0 : fd1;

    int n = select(maxfd + 1, &rfds, NULL, NULL, &tv);
    if (n == 0) { printf("select: timeout\\n"); return; }
    if (n < 0)  { perror("select"); return; }

    if (FD_ISSET(fd0, &rfds)) printf("select: fd0=%d readable\\n", fd0);
    if (FD_ISSET(fd1, &rfds)) printf("select: fd1=%d readable\\n", fd1);
}

void demo_poll(int fd0, int fd1) {
    struct pollfd fds[2] = {
        { .fd = fd0, .events = POLLIN },
        { .fd = fd1, .events = POLLIN },
    };
    int n = poll(fds, 2, 2000);   /* 2000ms timeout */
    if (n == 0) { printf("poll: timeout\\n"); return; }
    if (n < 0)  { perror("poll"); return; }

    for (int i = 0; i < 2; i++) {
        if (fds[i].revents & POLLIN)
            printf("poll: fds[%d].fd=%d readable\\n", i, fds[i].fd);
        if (fds[i].revents & POLLERR)
            printf("poll: fds[%d] error\\n", i);
    }
}

int main(void) {
    int pfd0[2], pfd1[2];
    pipe(pfd0); pipe(pfd1);

    write(pfd0[1], "hello", 5);   /* 让 fd0 可读 */

    printf("--- select demo ---\\n");
    demo_select(pfd0[0], pfd1[0]);

    printf("--- poll demo ---\\n");
    demo_poll(pfd0[0], pfd1[0]);

    close(pfd0[0]); close(pfd0[1]);
    close(pfd1[0]); close(pfd1[1]);
    printf("\\nselect O(n), poll O(n), epoll O(1) for large fd sets\\n");
    return 0;
}`,
  },
  setuid: {
    name: 'setuid/creds', icon: '🪪', chapter: 'Ch. 9', vol: 1,
    desc: '进程凭证管理：UID/GID、saved-set-UID、seteuid 权限模型',
    code: `#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/types.h>

void print_ids(const char *label) {
    printf("[%s]\\n", label);
    printf("  real UID=%d  effective UID=%d\\n", getuid(),  geteuid());
    printf("  real GID=%d  effective GID=%d\\n", getgid(),  getegid());
}

int main(void) {
    print_ids("initial");

    /* seteuid: 临时降低权限（常见于 set-user-ID 程序） */
    uid_t saved = geteuid();
    if (seteuid(getuid()) == -1) {
        perror("seteuid");
        /* 非 root 无法切换，仅演示接口 */
    }
    print_ids("after seteuid(getuid())");

    /* 恢复原 effective UID */
    if (seteuid(saved) == -1) {
        perror("restore seteuid");
    }
    print_ids("after restore");

    /* setreuid: 同时改 real 和 effective UID */
    printf("\\nKey rules:\\n");
    printf("  unprivileged: can set eUID to rUID or saved-set-UID\\n");
    printf("  root (eUID=0): can set rUID/eUID to any value\\n");
    printf("  /etc/passwd 'x': password in shadow, not here\\n");

    printf("\\nset-user-ID bit (chmod u+s):\\n");
    printf("  when exec'd, eUID = file owner's UID\\n");
    printf("  used by: passwd(1), ping(8), su(1)\\n");
    return 0;
}`,
  },
  ptrace_demo: {
    name: 'ptrace', icon: '🔭', chapter: 'Ch. 41', vol: 2,
    desc: 'ptrace 系统调用跟踪：strace/gdb 的底层机制',
    code: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/ptrace.h>
#include <sys/wait.h>
#include <sys/user.h>
#include <sys/syscall.h>

int main(void) {
    pid_t child = fork();
    if (child == 0) {
        /* 子进程：允许父进程 trace */
        ptrace(PTRACE_TRACEME, 0, NULL, NULL);
        raise(SIGSTOP);            /* 通知父进程已就绪 */
        /* 做几个系统调用供父进程捕获 */
        write(1, "hello\\n", 6);
        getpid();
        exit(0);
    }

    int status;
    waitpid(child, &status, 0);   /* 等待 SIGSTOP */

    /* 设置追踪选项：在每次 syscall 进入/退出时暂停 */
    ptrace(PTRACE_SETOPTIONS, child, 0, PTRACE_O_TRACESYSGOOD);
    ptrace(PTRACE_SYSCALL, child, NULL, NULL);  /* 继续 */

    int syscall_count = 0;
    while (1) {
        waitpid(child, &status, 0);
        if (WIFEXITED(status)) break;
        if (!WIFSTOPPED(status)) continue;

        /* 读取寄存器（syscall 号在 orig_rax） */
        struct user_regs_struct regs;
        ptrace(PTRACE_GETREGS, child, NULL, &regs);
        long nr = regs.orig_rax;

        const char *name = "unknown";
        if (nr == SYS_write)  name = "write";
        else if (nr == SYS_getpid) name = "getpid";
        else if (nr == SYS_exit_group) name = "exit_group";

        printf("syscall #%ld (%s) rax=%lld\\n",
               nr, name, (long long)regs.rax);
        syscall_count++;

        ptrace(PTRACE_SYSCALL, child, NULL, NULL);
    }
    printf("\\ncaptured %d syscall events (ptrace powers strace/gdb)\\n",
           syscall_count);
    return 0;
}`,
  },
  seccomp: {
    name: 'seccomp', icon: '🔒', chapter: 'Ch. 38+', vol: 2,
    desc: '安全计算模式：限制进程可用的系统调用（Docker/Chrome 沙箱基础）',
    code: `#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <errno.h>
#include <sys/prctl.h>
#include <sys/syscall.h>
#include <linux/seccomp.h>
#include <linux/filter.h>
#include <linux/audit.h>
#include <stddef.h>

/* BPF 过滤器：只允许 read/write/exit/exit_group/sigreturn */
static struct sock_filter filter[] = {
    /* 验证架构 */
    BPF_STMT(BPF_LD | BPF_W | BPF_ABS,
             offsetof(struct seccomp_data, arch)),
    BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, AUDIT_ARCH_X86_64, 1, 0),
    BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_KILL),

    /* 读取 syscall 号 */
    BPF_STMT(BPF_LD | BPF_W | BPF_ABS,
             offsetof(struct seccomp_data, nr)),

    BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_read,       4, 0),
    BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_write,       3, 0),
    BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_exit,        2, 0),
    BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_exit_group,  1, 0),
    /* 不在白名单：返回 EPERM */
    BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ERRNO | EPERM),
    BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ALLOW),
};

int main(void) {
    printf("before seccomp: getpid()=%d\\n", getpid());

    /* 安装 seccomp 过滤器 */
    prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0);
    struct sock_fprog prog = {
        .len = sizeof(filter) / sizeof(filter[0]),
        .filter = filter,
    };
    if (syscall(SYS_seccomp, SECCOMP_SET_MODE_FILTER, 0, &prog) != 0) {
        perror("seccomp"); exit(1);
    }

    printf("seccomp active: write() allowed\\n");

    /* getpid() 被禁止：SIGKILL 或返回 EPERM */
    long r = syscall(SYS_getpid);
    if (r == -1 && errno == EPERM)
        printf("getpid() blocked by seccomp (EPERM)\\n");

    printf("\\nseccomp: Docker/Chrome/Firefox sandbox foundation\\n");
    return 0;
}`,
  },
  io_uring: {
    name: 'io_uring', icon: '🌀', chapter: 'Ch. 13+', vol: 1,
    desc: 'Linux 5.1+ 异步 I/O 框架，共享环形队列，零系统调用数据路径',
    code: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/syscall.h>
#include <linux/io_uring.h>
#include <sys/mman.h>
#include <stdatomic.h>

/* io_uring 系统调用包装 */
static int io_uring_setup(unsigned entries, struct io_uring_params *p) {
    return syscall(__NR_io_uring_setup, entries, p);
}
static int io_uring_enter(int fd, unsigned to_submit,
                          unsigned min_complete, unsigned flags) {
    return syscall(__NR_io_uring_enter, fd, to_submit,
                   min_complete, flags, NULL, 0);
}

int main(void) {
    /* 初始化 io_uring */
    struct io_uring_params params = {};
    int ring_fd = io_uring_setup(8, &params);
    if (ring_fd < 0) { perror("io_uring_setup"); exit(1); }

    /* 映射 submission queue (SQ) 和 completion queue (CQ) */
    size_t sq_sz = params.sq_off.array +
                   params.sq_entries * sizeof(unsigned);
    void *sq_ring = mmap(0, sq_sz, PROT_READ | PROT_WRITE,
                         MAP_SHARED | MAP_POPULATE, ring_fd,
                         IORING_OFF_SQ_RING);
    size_t cq_sz = params.cq_off.cqes +
                   params.cq_entries * sizeof(struct io_uring_cqe);
    void *cq_ring = mmap(0, cq_sz, PROT_READ | PROT_WRITE,
                         MAP_SHARED | MAP_POPULATE, ring_fd,
                         IORING_OFF_CQ_RING);
    struct io_uring_sqe *sqes = mmap(0,
                         params.sq_entries * sizeof(struct io_uring_sqe),
                         PROT_READ | PROT_WRITE,
                         MAP_SHARED | MAP_POPULATE, ring_fd,
                         IORING_OFF_SQES);

    /* 提交一个 nop 操作 */
    unsigned *sq_tail = (unsigned *)((char *)sq_ring + params.sq_off.tail);
    unsigned *sq_array= (unsigned *)((char *)sq_ring + params.sq_off.array);
    unsigned idx = *sq_tail & (params.sq_entries - 1);
    memset(&sqes[idx], 0, sizeof(sqes[idx]));
    sqes[idx].opcode = IORING_OP_NOP;
    sqes[idx].user_data = 0xdeadbeef;
    sq_array[idx] = idx;
    atomic_store((_Atomic unsigned *)sq_tail, *sq_tail + 1);

    int ret = io_uring_enter(ring_fd, 1, 1, IORING_ENTER_GETEVENTS);
    printf("io_uring_enter returned %d\\n", ret);

    /* 检查 completion queue */
    unsigned *cq_head = (unsigned *)((char *)cq_ring + params.cq_off.head);
    unsigned *cq_tail = (unsigned *)((char *)cq_ring + params.cq_off.tail);
    struct io_uring_cqe *cqes =
        (struct io_uring_cqe *)((char *)cq_ring + params.cq_off.cqes);
    if (*cq_head != *cq_tail) {
        struct io_uring_cqe *cqe = &cqes[*cq_head & (params.cq_entries-1)];
        printf("CQE: user_data=0x%llx res=%d\\n",
               (unsigned long long)cqe->user_data, cqe->res);
        atomic_store((_Atomic unsigned *)cq_head, *cq_head + 1);
    }

    printf("\\nio_uring: shared ring buffers, kernel batch processing,\\n");
    printf("         zero-copy when used with registered buffers\\n");
    munmap(sq_ring, sq_sz); munmap(cq_ring, cq_sz);
    munmap(sqes, params.sq_entries * sizeof(*sqes));
    close(ring_fd);
    return 0;
}`,
  },

  futex: {
    name: 'futex', icon: '⚙️', chapter: 'Ch. 30+', vol: 1,
    desc: 'futex (fast userspace mutex) 是 Linux 独有的低级同步原语。在无竞争时完全在用户空间完成（通过原子 CAS），只有在有竞争时才陷入内核。pthreads 的 mutex、semaphore、条件变量都建立在 futex 之上。',
    syscalls: [
      { name: 'futex', sig: 'int futex(uint32_t *uaddr, int futex_op, uint32_t val, ...)' },
      { name: 'FUTEX_WAIT', sig: '/* sleep if *uaddr == val */' },
      { name: 'FUTEX_WAKE', sig: '/* wake N waiters on uaddr */' },
    ],
    code: `#include <stdio.h>
#include <stdint.h>
#include <unistd.h>
#include <sys/syscall.h>
#include <linux/futex.h>
#include <pthread.h>
#include <stdatomic.h>

/* 简易 futex mutex */
typedef struct { atomic_int state; } FutexMutex;

static void fm_lock(FutexMutex *m) {
    int expected = 0;
    /* 无竞争: CAS 0→1 成功，不进内核 */
    while (!atomic_compare_exchange_weak(&m->state, &expected, 1)) {
        expected = 0;
        /* 有竞争: 进入内核等待 */
        syscall(SYS_futex, &m->state, FUTEX_WAIT, 1, NULL, NULL, 0);
    }
}

static void fm_unlock(FutexMutex *m) {
    atomic_store(&m->state, 0);
    /* 唤醒至多 1 个等待者 */
    syscall(SYS_futex, &m->state, FUTEX_WAKE, 1, NULL, NULL, 0);
}

static FutexMutex g_lock = { .state = 0 };
static long counter = 0;

static void *worker(void *arg) {
    for (int i = 0; i < 100000; i++) {
        fm_lock(&g_lock);
        counter++;
        fm_unlock(&g_lock);
    }
    return NULL;
}

int main(void) {
    pthread_t t1, t2;
    pthread_create(&t1, NULL, worker, NULL);
    pthread_create(&t2, NULL, worker, NULL);
    pthread_join(t1, NULL); pthread_join(t2, NULL);
    printf("counter = %ld (expected 200000)\\n", counter);
}`,
    notes: 'futex 的关键优化：mutex 无竞争时完全是用户空间的原子操作（约 10ns），只有在 CAS 失败（即有其他线程持有锁）时才调用 FUTEX_WAIT 陷入内核（约 1μs）。这也是 glibc pthread_mutex_lock 的实现原理。',
    demoCode: `/* Demo: futex-based mutex vs atomic spinlock 性能对比 */
#include <stdio.h>
#include <stdint.h>
#include <unistd.h>
#include <sys/syscall.h>
#include <linux/futex.h>
#include <pthread.h>
#include <stdatomic.h>
#include <time.h>

typedef struct { atomic_int state; } FutexMutex;
static void fm_lock(FutexMutex *m) {
    int e=0;
    while(!atomic_compare_exchange_weak(&m->state,&e,1)){
        e=0; syscall(SYS_futex,&m->state,FUTEX_WAIT,1,NULL,NULL,0);
    }
}
static void fm_unlock(FutexMutex *m) {
    atomic_store(&m->state,0);
    syscall(SYS_futex,&m->state,FUTEX_WAKE,1,NULL,NULL,0);
}

static FutexMutex lock={.state=0};
static long cnt=0;

static void *run(void *arg) {
    for(int i=0;i<500000;i++){ fm_lock(&lock); cnt++; fm_unlock(&lock); }
    return NULL;
}

int main(){
    struct timespec t0,t1;
    pthread_t a,b;
    clock_gettime(CLOCK_MONOTONIC,&t0);
    pthread_create(&a,NULL,run,NULL);
    pthread_create(&b,NULL,run,NULL);
    pthread_join(a,NULL); pthread_join(b,NULL);
    clock_gettime(CLOCK_MONOTONIC,&t1);
    long ns=(t1.tv_sec-t0.tv_sec)*1000000000L+(t1.tv_nsec-t0.tv_nsec);
    printf("futex mutex: cnt=%ld, time=%ldms\\n",cnt,ns/1000000);
    printf("per-lock: ~%ldns\\n",ns/1000000);
    return 0;
}`,
  },

  sendfile: {
    name: 'sendfile', icon: '📤', chapter: 'Ch. 61+', vol: 2,
    desc: 'sendfile(2) 实现零拷贝文件传输：数据直接从文件系统 page cache 传到 socket 发送缓冲区，无需经过用户空间。相比 read+write 减少两次内存拷贝和两次上下文切换。HTTP 静态文件服务器的核心优化。',
    syscalls: [
      { name: 'sendfile', sig: 'ssize_t sendfile(int out_fd, int in_fd, off_t *offset, size_t count)' },
      { name: 'splice',   sig: 'ssize_t splice(int fd_in, off_t *off_in, int fd_out, off_t *off_out, size_t len, unsigned int flags)' },
    ],
    code: `#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/sendfile.h>
#include <sys/stat.h>
#include <sys/socket.h>
#include <arpa/inet.h>

/* 零拷贝文件发送：file_fd → socket_fd */
int send_file(int sock, const char *path) {
    int fd = open(path, O_RDONLY);
    if (fd < 0) return -1;
    struct stat st;
    fstat(fd, &st);
    off_t offset = 0;
    ssize_t sent = sendfile(sock, fd, &offset, st.st_size);
    close(fd);
    return sent;
}

/* 对比：传统 read+write（两次拷贝）*/
int copy_rw(int dst, const char *path) {
    int src = open(path, O_RDONLY);
    char buf[65536];
    ssize_t n, total = 0;
    while ((n = read(src, buf, sizeof(buf))) > 0) {
        write(dst, buf, n);
        total += n;
    }
    close(src);
    return total;
}`,
    notes: '传统 read+write 路径：磁盘→page cache (DMA)→用户缓冲区 (CPU copy)→socket buffer (CPU copy)→网卡 (DMA)，共 2 次 CPU 拷贝。sendfile 路径：磁盘→page cache (DMA)→socket buffer (CPU copy or DMA直传)→网卡 (DMA)，减少一次或两次 CPU 拷贝。Linux 3.14+ 支持 SPLICE_F_MOVE 进一步优化。',
    demoCode: `#define _GNU_SOURCE
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/sendfile.h>
#include <sys/stat.h>
#include <time.h>

static long now_ns() {
    struct timespec t; clock_gettime(CLOCK_MONOTONIC,&t);
    return t.tv_sec*1000000000L+t.tv_nsec;
}

int main() {
    /* 创建 4MB 测试文件 */
    const char *src="/tmp/sf_src.bin", *dst1="/tmp/sf_dst1.bin", *dst2="/tmp/sf_dst2.bin";
    {
        int f=open(src,O_WRONLY|O_CREAT|O_TRUNC,0644);
        char buf[4096]; memset(buf,'A',sizeof(buf));
        for(int i=0;i<1024;i++) write(f,buf,sizeof(buf));
        close(f);
    }
    struct stat st; stat(src,&st);
    printf("File size: %ld bytes (%.1f MB)\\n",(long)st.st_size,st.st_size/1048576.0);

    /* sendfile */
    long t0=now_ns();
    {
        int in=open(src,O_RDONLY), out=open(dst1,O_WRONLY|O_CREAT|O_TRUNC,0644);
        off_t off=0;
        sendfile(out,in,&off,st.st_size);
        close(in); close(out);
    }
    long t1=now_ns();
    printf("sendfile:  %ldμs\\n",(t1-t0)/1000);

    /* read+write */
    t0=now_ns();
    {
        int in=open(src,O_RDONLY), out=open(dst2,O_WRONLY|O_CREAT|O_TRUNC,0644);
        char buf[65536]; ssize_t n;
        while((n=read(in,buf,sizeof(buf)))>0) write(out,buf,n);
        close(in); close(out);
    }
    t1=now_ns();
    printf("read+write:%ldμs\\n",(t1-t0)/1000);

    unlink(src); unlink(dst1); unlink(dst2);
    return 0;
}`,
  },

  namespace: {
    name: 'Linux Namespaces', icon: '📦', chapter: 'Ch. 28+', vol: 1,
    desc: 'Linux 命名空间是容器技术（Docker/podman）的核心。每种命名空间隔离一类资源：PID ns 隔离进程树，Net ns 隔离网络栈，Mount ns 隔离文件系统视图，UTS ns 隔离主机名，User ns 隔离 UID/GID，IPC ns 隔离 SysV/POSIX IPC。',
    syscalls: [
      { name: 'unshare', sig: 'int unshare(int flags)  /* 进入新命名空间 */' },
      { name: 'setns',   sig: 'int setns(int fd, int nstype)  /* 加入已有命名空间 */' },
      { name: 'clone',   sig: 'int clone(fn, stack, flags|CLONE_NEW*, arg)' },
    ],
    code: `#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sched.h>
#include <sys/wait.h>
#include <sys/types.h>

/* 在新 PID 命名空间中运行 child */
static int child_fn(void *arg) {
    printf("Child PID inside ns: %d (always 1 = init)\\n", getpid());
    printf("Child PPID inside ns: %d\\n", getppid());
    return 0;
}

int main(void) {
    printf("Parent PID: %d\\n", getpid());

    /* 克隆一个新的 PID 命名空间 */
    char stack[1024*64];
    pid_t child = clone(child_fn, stack + sizeof(stack),
                        CLONE_NEWPID | SIGCHLD, NULL);
    if (child == -1) { perror("clone"); return 1; }

    printf("Child host-PID: %d\\n", child);  /* 主机命名空间中的 PID */
    waitpid(child, NULL, 0);

    /* 查看自己的命名空间 */
    char path[64];
    snprintf(path, sizeof(path), "/proc/%d/ns/pid", getpid());
    char link[256]; ssize_t n = readlink(path, link, sizeof(link)-1);
    if (n>0) { link[n]=0; printf("Parent ns: %s\\n", link); }
    return 0;
}`,
    notes: '容器 = cgroups (资源限制) + namespaces (资源隔离) + seccomp (syscall 过滤)。unshare(1) 命令行工具底层就是调用 unshare(2)。/proc/PID/ns/ 目录下的每个文件是该进程所属命名空间的描述符，可以用 setns(2) + 该 fd 进入同一命名空间（Docker exec 的原理）。',
    demoCode: `#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sched.h>
#include <sys/utsname.h>

int main() {
    /* 当前主机名 */
    struct utsname u; uname(&u);
    printf("Before: hostname=%s, pid=%d\\n", u.nodename, getpid());

    /* 进入新的 UTS + PID 命名空间 */
    if (unshare(CLONE_NEWUTS) == -1) {
        /* 可能需要 root 权限或 user ns */
        perror("unshare NEWUTS (need root or user ns)");
    } else {
        sethostname("container-demo", 14);
        uname(&u);
        printf("After:  hostname=%s\\n", u.nodename);
    }

    /* 打印所有命名空间 inode */
    const char *ns[] = {"pid","net","mnt","uts","ipc","user","time",NULL};
    printf("\\nNamespace inodes for PID %d:\\n", getpid());
    for(int i=0; ns[i]; i++) {
        char p[64], lnk[256];
        snprintf(p,sizeof(p),"/proc/self/ns/%s",ns[i]);
        ssize_t n=readlink(p,lnk,sizeof(lnk)-1);
        if(n>0){lnk[n]=0;printf("  %-6s -> %s\\n",ns[i],lnk);}
    }
    return 0;
}`,
  },

  prctl: {
    name: 'prctl', icon: '🎛️', chapter: 'Ch. 28+', vol: 1,
    desc: 'prctl(2) 是进程属性控制的瑞士军刀：设置进程名称、控制 core dump、管理子死亡信号、开启/关闭 seccomp、控制 no_new_privs 等。Docker 容器运行时、Go runtime、Chrome 沙箱大量使用。',
    syscalls: [
      { name: 'prctl', sig: 'int prctl(int option, unsigned long arg2, arg3, arg4, arg5)' },
      { name: 'PR_SET_NAME',     sig: '/* set thread name, max 15 chars */' },
      { name: 'PR_SET_DUMPABLE', sig: '/* 0=no core, 1=core, 2=root-readable */' },
      { name: 'PR_SET_NO_NEW_PRIVS', sig: '/* cannot exec setuid after this */' },
    ],
    code: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/prctl.h>
#include <pthread.h>

static void *named_thread(void *arg) {
    const char *name = (char *)arg;
    /* 设置线程名（top/htop 可见，max 15 chars）*/
    prctl(PR_SET_NAME, name, 0, 0, 0);

    char got[32] = {0};
    prctl(PR_GET_NAME, got, 0, 0, 0);
    printf("Thread name: '%s'\\n", got);

    /* 禁止 core dump */
    prctl(PR_SET_DUMPABLE, 0, 0, 0, 0);

    sleep(1);
    return NULL;
}

int main(void) {
    /* 设置主进程名 */
    prctl(PR_SET_NAME, "tlpi-demo", 0, 0, 0);
    char name[32] = {0};
    prctl(PR_GET_NAME, name, 0, 0, 0);
    printf("Process name: '%s'\\n", name);

    /* 禁止该进程及其子进程获取新权限 */
    prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0);
    printf("no_new_privs: %d\\n", prctl(PR_GET_NO_NEW_PRIVS,0,0,0,0));

    pthread_t t;
    pthread_create(&t, NULL, named_thread, "worker-1");
    pthread_join(t, NULL);
    return 0;
}`,
    notes: 'PR_SET_NO_NEW_PRIVS 是单向操作：一旦设置，fork/exec 的子进程也无法获得新权限（setuid 程序不生效）。这是 seccomp 的前置条件之一。Go 程序中每个 goroutine 对应的 OS 线程名默认是 "goroutine X"，通过 prctl(PR_SET_NAME) 设置可见于 top/htop 的 TASK 列。',
    demoCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/prctl.h>
#include <pthread.h>

static void *thr(void *arg){
    char *nm=(char*)arg;
    prctl(PR_SET_NAME,nm,0,0,0);
    char got[32]={0}; prctl(PR_GET_NAME,got,0,0,0);
    printf("  thread id=%ld name='%s'\\n",(long)pthread_self()%10000,got);
    return NULL;
}

int main(){
    prctl(PR_SET_NAME,"main-proc",0,0,0);
    char nm[32]={0}; prctl(PR_GET_NAME,nm,0,0,0);
    printf("Process name: '%s'\\n",nm);
    printf("PID: %d\\n",getpid());

    /* 创建多个具名线程 */
    const char *names[]={"io-worker","net-poller","gc-thread",NULL};
    pthread_t ts[3];
    for(int i=0;names[i];i++)
        pthread_create(&ts[i],NULL,thr,(void*)names[i]);
    for(int i=0;names[i];i++) pthread_join(ts[i],NULL);

    /* no_new_privs */
    prctl(PR_SET_NO_NEW_PRIVS,1,0,0,0);
    int v=prctl(PR_GET_NO_NEW_PRIVS,0,0,0,0);
    printf("no_new_privs=%d (cannot exec setuid now)\\n",v);

    printf("\\n$ cat /proc/%d/status | grep -i 'name\\\\|NoNewPrivs'\\n",getpid());
    char cmd[64]; snprintf(cmd,sizeof(cmd),
        "cat /proc/%d/status 2>/dev/null | grep -iE 'Name|NoNewPrivs'",getpid());
    system(cmd);
    return 0;
}`,
  },

  sigqueue: {
    name: 'sigqueue / Real-Time Signals', icon: '📬', chapter: 'Ch. 22+', vol: 1,
    desc: '实时信号（SIGRTMIN–SIGRTMAX，Linux 约 32 个）与普通信号的区别：①不丢失——多次发送会排队而非合并；②携带数据（sigval union）；③有序投递（按信号编号升序）。sigqueue(2) 是发送带数据实时信号的专用接口。',
    syscalls: [
      { name: 'sigqueue',    sig: 'int sigqueue(pid_t pid, int sig, const union sigval value)' },
      { name: 'sigwaitinfo', sig: 'int sigwaitinfo(const sigset_t *set, siginfo_t *info)' },
      { name: 'sigaction',   sig: 'int sigaction(int sig, const struct sigaction *act, ...)  /* SA_SIGINFO */' },
    ],
    code: `#include <stdio.h>
#include <stdlib.h>
#include <signal.h>
#include <unistd.h>

static void rt_handler(int sig, siginfo_t *si, void *ctx) {
    printf("Got signal %d  value=%d  pid=%d\\n",
           sig, si->si_value.sival_int, si->si_pid);
}

int main(void) {
    /* 注册 SA_SIGINFO 处理器（接收附加数据）*/
    struct sigaction sa = {
        .sa_sigaction = rt_handler,
        .sa_flags     = SA_SIGINFO,
    };
    sigemptyset(&sa.sa_mask);
    sigaction(SIGRTMIN, &sa, NULL);
    sigaction(SIGRTMIN+1, &sa, NULL);

    /* 向自己发送带数据的实时信号 */
    union sigval val;
    val.sival_int = 42;
    sigqueue(getpid(), SIGRTMIN,   val);
    val.sival_int = 99;
    sigqueue(getpid(), SIGRTMIN+1, val);
    val.sival_int = 7;
    sigqueue(getpid(), SIGRTMIN,   val);  /* 不丢失，排队 */

    /* 三个信号都会按序投递 */
    pause(); pause(); pause();
    printf("All signals delivered\\n");
    return 0;
}`,
    notes: '普通信号（SIGINT/SIGTERM 等）如果发送多次而进程未处理，只记录"有待处理信号"这一位，因此不排队。实时信号每次 sigqueue 都单独排队，siginfo_t.si_value 携带用户数据（4字节 int 或指针）。Go、Java 运行时用实时信号做内部协调（SIGRTMIN+x 触发 goroutine/GC 抢占）。',
    demoCode: `#include <stdio.h>
#include <stdlib.h>
#include <signal.h>
#include <unistd.h>
#include <string.h>

static volatile int received=0;
static void handler(int s,siginfo_t *si,void *u){
    printf("  sig=%d val=%d from pid=%d\\n",s,si->si_value.sival_int,si->si_pid);
    received++;
}

int main(){
    printf("SIGRTMIN=%d  SIGRTMAX=%d  (有%d个实时信号)\\n",
           SIGRTMIN,SIGRTMAX,SIGRTMAX-SIGRTMIN+1);

    struct sigaction sa={.sa_sigaction=handler,.sa_flags=SA_SIGINFO};
    sigemptyset(&sa.sa_mask);
    for(int s=SIGRTMIN;s<=SIGRTMIN+3;s++) sigaction(s,&sa,NULL);

    /* 屏蔽所有实时信号，先积累 */
    sigset_t mask,old;
    sigemptyset(&mask);
    for(int s=SIGRTMIN;s<=SIGRTMAX;s++) sigaddset(&mask,s);
    sigprocmask(SIG_BLOCK,&mask,&old);

    /* 发送多个实时信号（含重复）*/
    union sigval v;
    printf("\\nQueuing signals:\\n");
    for(int i=0;i<3;i++){v.sival_int=100+i;sigqueue(getpid(),SIGRTMIN+1,v);}
    v.sival_int=42; sigqueue(getpid(),SIGRTMIN,v);   /* 低编号先投递 */
    v.sival_int=99; sigqueue(getpid(),SIGRTMIN+3,v);

    printf("\\nDelivering (lowest sig first):\\n");
    sigprocmask(SIG_UNBLOCK,&mask,NULL);  /* 解除屏蔽，触发投递 */
    printf("\\nTotal received: %d\\n",received);
    return 0;
}`,
  },

  tls_thread: {
    name: 'Thread-Local Storage', icon: '🧵', chapter: 'Ch. 31', vol: 1,
    desc: '线程局部存储（TLS）让每个线程拥有变量的独立副本，无需互斥锁。有三种方式：①__thread GCC 扩展（最高效，编译时分配）；②pthread_key_create 动态 TLS（可携带析构函数）；③C11 _Thread_local。errno 本身就是 TLS 变量。',
    syscalls: [
      { name: '__thread',            sig: '__thread int tls_var;  /* GCC/Clang 编译器扩展 */' },
      { name: 'pthread_key_create',  sig: 'int pthread_key_create(pthread_key_t *key, void (*destr)(void*))' },
      { name: 'pthread_setspecific', sig: 'int pthread_setspecific(pthread_key_t key, const void *value)' },
      { name: 'pthread_getspecific', sig: 'void *pthread_getspecific(pthread_key_t key)' },
    ],
    code: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <pthread.h>

/* ① __thread — 每个线程独立副本，无锁 */
static __thread int tls_counter = 0;

/* ② pthread key — 动态 TLS，可挂析构函数 */
static pthread_key_t buf_key;

static void buf_destructor(void *p) {
    printf("TID %lu: destructor freeing buffer\\n", pthread_self() % 10000);
    free(p);
}

static void *worker(void *arg) {
    long id = (long)arg;
    /* 修改 __thread 变量 — 不影响其他线程 */
    tls_counter = id * 100;

    /* 分配线程私有 buffer */
    char *buf = malloc(64);
    snprintf(buf, 64, "thread-%ld-buffer", id);
    pthread_setspecific(buf_key, buf);

    printf("Thread %ld: tls_counter=%d, buf='%s'\\n",
           id, tls_counter, (char *)pthread_getspecific(buf_key));
    return NULL;
}

int main(void) {
    pthread_key_create(&buf_key, buf_destructor);
    pthread_t t[3];
    for (long i = 0; i < 3; i++)
        pthread_create(&t[i], NULL, worker, (void *)i);
    for (int i = 0; i < 3; i++)
        pthread_join(t[i], NULL);
    pthread_key_delete(buf_key);
    return 0;
}`,
    notes: '__thread 变量存储在 ELF TLS 段（.tdata/.tbss），每次 pthread_create 时内核/libc 为新线程复制一份；访问通过 %fs 寄存器偏移，与普通变量访问速度相同，无锁开销。pthread_key 最多 PTHREAD_KEYS_MAX 个（Linux 1024）。析构函数在线程退出时按 LIFO 顺序调用。',
    demoCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <pthread.h>
#include <errno.h>

/* errno 本身就是 TLS：每个线程独立 */
static __thread char tls_name[32]="(unset)";

static pthread_key_t ctx_key;
typedef struct { int id; char msg[64]; } ThreadCtx;

static void ctx_free(void *p){ free(p); }

static void *run(void *arg){
    int id=(int)(long)arg;
    /* __thread 变量 */
    snprintf(tls_name,sizeof(tls_name),"worker-%d",id);

    /* pthread_key 动态 TLS */
    ThreadCtx *ctx=malloc(sizeof(*ctx));
    ctx->id=id;
    snprintf(ctx->msg,sizeof(ctx->msg),"hello from thread %d",id);
    pthread_setspecific(ctx_key,ctx);

    /* 触发 errno（TLS 示例）*/
    int fd=open("/no/such/file",0);
    int saved_errno=errno;

    printf("[t%d] tls_name='%s' msg='%s' errno=%d(%s)\\n",
        id,tls_name,
        ((ThreadCtx*)pthread_getspecific(ctx_key))->msg,
        saved_errno,strerror(saved_errno));
    return NULL;
}

int main(){
    pthread_key_create(&ctx_key,ctx_free);
    pthread_t ts[4];
    for(int i=0;i<4;i++) pthread_create(&ts[i],NULL,run,(void*)(long)i);
    for(int i=0;i<4;i++) pthread_join(ts[i],NULL);
    pthread_key_delete(ctx_key);
    printf("Main tls_name='%s' (unchanged)\\n",tls_name);
    return 0;
}`,
  },

  cgroup: {
    name: 'cgroups v2', icon: '🗂️', chapter: 'Ch. 39+', vol: 2,
    desc: 'cgroups v2（Linux 4.5+）是资源限制的统一层次结构。通过写 /sys/fs/cgroup/ 下的伪文件来限制 CPU、内存、IO、进程数等资源。Docker/Kubernetes 用 cgroups 实现容器资源隔离。',
    syscalls: [
      { name: 'write("/sys/fs/cgroup/")', sig: '/* 写 cgroup 控制文件 */' },
      { name: 'openat',  sig: '/* 操作 cgroupfs 文件系统 */' },
    ],
    code: `/* cgroups v2 via cgroupfs — 不需要额外链接库 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/types.h>
#include <errno.h>

/* 将字符串写入 cgroup 控制文件 */
static int cg_write(const char *path, const char *val) {
    int fd = open(path, O_WRONLY);
    if (fd < 0) return -1;
    ssize_t n = write(fd, val, strlen(val));
    close(fd);
    return n > 0 ? 0 : -1;
}

int main(void) {
    const char *cg = "/sys/fs/cgroup/demo_cgroup";

    /* 1. 创建 cgroup 目录 */
    if (mkdir(cg, 0755) && errno != EEXIST)
        perror("mkdir cgroup");

    /* 2. 限制内存 (64MB) */
    char mem_path[256]; snprintf(mem_path, sizeof(mem_path),
        "%s/memory.max", cg);
    if (cg_write(mem_path, "67108864\\n") == 0)  /* 64 * 1024 * 1024 */
        printf("memory.max set to 64MB\\n");

    /* 3. 限制 CPU 权重 */
    char cpu_path[256]; snprintf(cpu_path, sizeof(cpu_path),
        "%s/cpu.weight", cg);
    if (cg_write(cpu_path, "100\\n") == 0)
        printf("cpu.weight set to 100\\n");

    /* 4. 将自身加入 cgroup */
    char procs_path[256]; snprintf(procs_path, sizeof(procs_path),
        "%s/cgroup.procs", cg);
    char pid_str[32]; snprintf(pid_str, sizeof(pid_str), "%d\\n", getpid());
    if (cg_write(procs_path, pid_str) == 0)
        printf("PID %d added to cgroup\\n", getpid());
    else
        printf("Add to cgroup failed (need root): %s\\n", strerror(errno));

    return 0;
}`,
    notes: 'cgroups v2 统一层次结构：每个目录代表一个 cgroup，通过写 controllers 文件启用子系统（memory、cpu、io）。与 v1 的关键区别：v2 只有一个层次，每个 cgroup 必须是叶节点才能包含进程（no internal process constraint 在 v2.1+ 中放宽）。读 /proc/self/cgroup 查看当前进程所在的 cgroup 路径。',
    demoCode: `/* Demo: 读取当前 cgroup 信息（不需要 root）*/
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>

int main(){
    printf("=== /proc/self/cgroup ===\\n");
    FILE *f=fopen("/proc/self/cgroup","r");
    if(f){char ln[256];while(fgets(ln,sizeof(ln),f))printf("%s",ln);fclose(f);}

    printf("\\n=== /sys/fs/cgroup/cgroup.controllers ===\\n");
    f=fopen("/sys/fs/cgroup/cgroup.controllers","r");
    if(f){char ln[256];fgets(ln,sizeof(ln),f);printf("%s\\n",ln);fclose(f);}
    else printf("(not mounted as cgroup v2)\\n");

    /* 读取自己的内存使用 */
    printf("\\n=== memory stats ===\\n");
    char path[128];
    /* 从 /proc/self/cgroup 解析出 cgroup 路径 */
    FILE *cg=fopen("/proc/self/cgroup","r");
    char line[256];
    if(cg&&fgets(line,sizeof(line),cg)){
        /* cgroups v2 格式: 0::<path> */
        char *p=strchr(line+2,':');
        if(p){
            p++; p[strlen(p)-1]=0;
            snprintf(path,sizeof(path),"/sys/fs/cgroup%s/memory.current",p);
            FILE *mf=fopen(path,"r");
            if(mf){long v;fscanf(mf,"%ld",&v);printf("memory.current: %ld bytes (%.1fMB)\\n",v,v/1048576.0);fclose(mf);}
        }
        fclose(cg);
    }
    return 0;
}`,
  },
}

// ─── Syscall boundary diagram ─────────────────────────────────────────────────

function SyscallBoundaryDiagram() {
  const W=540,H=194,uH=78,gapY=uH+16
  const boxes=[
    {x:14,y:16,w:120,h:46,label:'Your C code',sub:'open("f",O_RDONLY)',color:'#4d8fff'},
    {x:162,y:16,w:120,h:46,label:'glibc wrapper',sub:'open() in libc.so',color:'#4d8fff'},
    {x:312,y:16,w:150,h:46,label:'syscall instr',sub:'mov rax,2 ; syscall',color:'#e3b341'},
    {x:14,y:gapY+16,w:130,h:46,label:'system_call()',sub:'arch/x86/entry.S',color:'#3fb950'},
    {x:174,y:gapY+16,w:130,h:46,label:'sys_call_table',sub:'[NR]=do_sys_open',color:'#3fb950'},
    {x:334,y:gapY+16,w:128,h:46,label:'do_sys_open()',sub:'VFS→dentry→inode',color:'#3fb950'},
  ]
  const arrs:[number,number,number,number,string][]=[
    [134,39,160,39,'#4d8fff'],[282,39,310,39,'#e3b341'],
    [462,39,462,gapY+38,'#e3b341'],[144,gapY+39,172,gapY+39,'#3fb950'],
    [304,gapY+39,332,gapY+39,'#3fb950'],
  ]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxWidth:W,display:'block'}}>
      <defs><marker id="tlpi-arr" markerWidth={8} markerHeight={8} refX={7} refY={3.5} orient="auto">
        <path d="M0,0 L0,7 L8,3.5z" fill="#888"/>
      </marker></defs>
      <rect x={0} y={0} width={W} height={uH} fill="rgba(77,143,255,0.07)"/>
      <text x={W-8} y={13} textAnchor="end" fontSize={9} fontWeight={700} fill="rgba(77,143,255,0.55)">USER SPACE</text>
      <line x1={0} y1={uH+1} x2={W} y2={uH+1} stroke="#e3b341" strokeWidth={1.5} strokeDasharray="6 4"/>
      <text x={8} y={uH+12} fontSize={9} fill="#e3b341" fontWeight={700}>─── kernel boundary ───</text>
      <rect x={0} y={uH+14} width={W} height={82} fill="rgba(63,185,80,0.07)"/>
      <text x={W-8} y={uH+27} textAnchor="end" fontSize={9} fontWeight={700} fill="rgba(63,185,80,0.5)">KERNEL SPACE</text>
      <text x={W/2} y={H-3} textAnchor="middle" fontSize={9} fill="var(--text-muted)" fontStyle="italic">
        ← sysret restores %rip → user space continues
      </text>
      {arrs.map(([x1,y1,x2,y2,c],i)=>(
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={1.6} markerEnd="url(#tlpi-arr)"/>
      ))}
      {boxes.map((b,i)=>(
        <g key={i}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={7} fill={`${b.color}1a`} stroke={b.color} strokeWidth={1.7}/>
          <text x={b.x+b.w/2} y={b.y+17} textAnchor="middle" fontSize={10} fontWeight={700} fill={b.color}>{b.label}</text>
          <text x={b.x+b.w/2} y={b.y+32} textAnchor="middle" fontSize={8} fill="var(--text-muted)" fontFamily="monospace">{b.sub}</text>
        </g>
      ))}
    </svg>
  )
}

// ─── Header modal ─────────────────────────────────────────────────────────────

function HeaderModal({name,onClose}:{name:string;onClose:()=>void}) {
  const [content,setContent]=useState<string|null>(null)
  const [err,setErr]=useState('')
  useEffect(()=>{
    setContent(null); setErr('')
    fetch(`/api/header?name=${encodeURIComponent(name)}`)
      .then(r=>r.json())
      .then(d=>{ if(d.content) setContent(d.content); else setErr(d.error||'not found') })
      .catch(()=>setErr('network error'))
  },[name])
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{ if(e.key==='Escape') onClose() }
    window.addEventListener('keydown',h)
    return ()=>window.removeEventListener('keydown',h)
  },[onClose])
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',zIndex:2000,
      display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg-secondary)',
        border:'1px solid var(--border)',borderRadius:10,width:'min(900px,95vw)',
        maxHeight:'85vh',display:'flex',flexDirection:'column',overflow:'hidden',
        boxShadow:'0 20px 60px rgba(0,0,0,0.5)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',
          borderBottom:'1px solid var(--border)',background:'var(--bg-elevated)',flexShrink:0}}>
          <span style={{fontSize:14,color:'#58a6ff'}}>📄</span>
          <code style={{color:'#58a6ff',fontWeight:700,fontSize:13}}>&lt;{name}&gt;</code>
          <span style={{fontSize:11,color:'var(--text-muted)',marginLeft:4}}>— system header</span>
          <button onClick={onClose} style={{marginLeft:'auto',border:'none',background:'transparent',
            color:'var(--text-muted)',cursor:'pointer',fontSize:18,lineHeight:1,padding:'0 4px'}}>✕</button>
        </div>
        <pre style={{margin:0,flex:1,overflow:'auto',padding:'14px 18px',
          fontFamily:'monospace',fontSize:11,lineHeight:1.7,
          color:'var(--text-primary)',background:'var(--bg-tertiary)'}}>
          {content ?? (err ? `Error: ${err}` : 'Loading…')}
        </pre>
      </div>
    </div>
  )
}

// ─── Man page modal ───────────────────────────────────────────────────────────

function ManModal({name,onClose}:{name:string;onClose:()=>void}) {
  const [content,setContent]=useState<string|null>(null)
  const [err,setErr]=useState('')
  useEffect(()=>{
    setContent(null); setErr('')
    fetch(`/api/man?name=${encodeURIComponent(name)}`)
      .then(r=>r.json())
      .then(d=>{ if(d.content) setContent(d.content); else setErr(d.error||'not found') })
      .catch(()=>setErr('network error'))
  },[name])
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{ if(e.key==='Escape') onClose() }
    window.addEventListener('keydown',h)
    return ()=>window.removeEventListener('keydown',h)
  },[onClose])
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',zIndex:2000,
      display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg-secondary)',
        border:'1px solid var(--border)',borderRadius:10,width:'min(900px,95vw)',
        maxHeight:'85vh',display:'flex',flexDirection:'column',overflow:'hidden',
        boxShadow:'0 20px 60px rgba(0,0,0,0.5)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',
          borderBottom:'1px solid var(--border)',background:'var(--bg-elevated)',flexShrink:0}}>
          <span style={{fontSize:14}}>📖</span>
          <code style={{color:'#ffa657',fontWeight:700,fontSize:13}}>man {name}</code>
          <span style={{fontSize:11,color:'var(--text-muted)',marginLeft:4}}>— POSIX / Linux man page</span>
          <button onClick={onClose} style={{marginLeft:'auto',border:'none',background:'transparent',
            color:'var(--text-muted)',cursor:'pointer',fontSize:18,lineHeight:1,padding:'0 4px'}}>✕</button>
        </div>
        <pre style={{margin:0,flex:1,overflow:'auto',padding:'14px 18px',
          fontFamily:'monospace',fontSize:11,lineHeight:1.7,whiteSpace:'pre-wrap',
          color:'var(--text-primary)',background:'var(--bg-tertiary)'}}>
          {content ?? (err ? `Man page not found: ${name}\n\nThis syscall may not have a POSIX man page installed in this container.` : 'Loading…')}
        </pre>
      </div>
    </div>
  )
}

// ─── Code display with clickable #include lines ────────────────────────────

function ClickableCode({code,onHeaderClick}:{code:string;onHeaderClick:(n:string)=>void}) {
  const lines = code.split('\n')
  return (
    <pre style={{margin:0,padding:'14px 16px',overflow:'auto',fontSize:12,lineHeight:1.65,
      fontFamily:'monospace',background:'var(--bg-tertiary)',color:'var(--text-primary)',maxHeight:560}}>
      {lines.map((line,i)=>{
        const m = line.match(/^(\s*#include\s*<)([^>]+)(>.*)$/)
        if(m) return (
          <div key={i}>
            <span style={{color:'#d2a8ff'}}>{m[1]}</span>
            <span onClick={()=>onHeaderClick(m[2])}
              style={{color:'#79c0ff',cursor:'pointer',textDecoration:'underline',textDecorationStyle:'dotted'}}
              title={`View <${m[2]}>`}>{m[2]}</span>
            <span style={{color:'#d2a8ff'}}>{m[3]}</span>
          </div>
        )
        return <div key={i}>{line}</div>
      })}
    </pre>
  )
}

// ─── Run panel ────────────────────────────────────────────────────────────────

type RunState={status:'idle'}|{status:'running'}|{status:'ok';output:string[];stderr?:string}|{status:'err';msg:string;stderr?:string}

function ExRunPanel({ex,color,isZh}:{ex:CodeEx;color:string;isZh:boolean}) {
  const [code,setCode]=useState(ex.code)
  const [run,setRun]=useState<RunState>({status:'idle'})
  useEffect(()=>{setCode(ex.code);setRun({status:'idle'})},[ex.code])
  const handleRun=async()=>{
    setRun({status:'running'})
    try {
      const res=await runCode(code)
      if(res.error) setRun({status:'err',msg:res.error,stderr:res.stderr})
      else setRun({status:'ok',output:res.output??[],stderr:res.stderr})
    } catch(e:any){setRun({status:'err',msg:e.message||'network error'})}
  }
  const descText = !isZh && ex.desc_en ? ex.desc_en : ex.desc
  return (
    <div>
      {descText&&<div style={{padding:'6px 14px 0',fontSize:12,color:'var(--text-secondary)',lineHeight:1.5}}>{descText}</div>}
      <div style={{position:'relative'}}>
        <textarea value={code} onChange={e=>{setCode(e.target.value);setRun({status:'idle'})}}
          spellCheck={false}
          style={{display:'block',width:'100%',minHeight:400,padding:'14px 16px',
            fontFamily:'monospace',fontSize:12,lineHeight:1.65,
            background:'var(--bg-tertiary)',color:'var(--text-primary)',
            border:'none',outline:'none',resize:'vertical',boxSizing:'border-box'}}/>
        <button onClick={handleRun} disabled={run.status==='running'}
          style={{position:'absolute',top:8,right:10,padding:'5px 14px',border:'none',cursor:'pointer',
            background:run.status==='running'?'rgba(63,185,80,0.2)':'#3fb950',
            color:run.status==='running'?'#3fb950':'#fff',fontWeight:700,fontSize:12,borderRadius:6}}>
          {run.status==='running'?'⏳ …':'▶ Run'}
        </button>
      </div>
      {run.status!=='idle'&&(
        <div style={{borderTop:`1px solid ${color}30`,padding:'10px 14px',background:'var(--bg-secondary)'}}>
          {run.status==='running'&&<div style={{color:'var(--text-muted)',fontSize:12}}>compiling &amp; running…</div>}
          {run.status==='ok'&&(
            <>
              <div style={{fontSize:11,fontWeight:700,color:'#3fb950',marginBottom:6}}>✓ OUTPUT</div>
              <pre style={{margin:0,fontFamily:'monospace',fontSize:12,lineHeight:1.55,color:'#3fb950',
                background:'var(--bg-tertiary)',padding:'8px 12px',borderRadius:6,overflowX:'auto'}}>
                {run.output.length?run.output.join('\n'):'(no stdout output)'}
              </pre>
              {run.stderr&&<pre style={{margin:'6px 0 0',fontFamily:'monospace',fontSize:11,color:'#ffa657',
                padding:'6px 10px',background:'rgba(255,166,87,0.08)',borderRadius:6}}>{run.stderr}</pre>}
            </>
          )}
          {run.status==='err'&&(
            <>
              <div style={{fontSize:11,fontWeight:700,color:'#f85149',marginBottom:6}}>✗ ERROR</div>
              <pre style={{margin:0,fontFamily:'monospace',fontSize:12,color:'#f85149',whiteSpace:'pre-wrap'}}>{run.msg}</pre>
              {run.stderr&&<pre style={{margin:'6px 0 0',fontFamily:'monospace',fontSize:11,color:'#ffa657',whiteSpace:'pre-wrap'}}>{run.stderr}</pre>}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function RunPanel({bookCode,demoCode,color,examples}:{bookCode:string;demoCode:string;color:string;examples?:CodeEx[]}) {
  const { lang } = useLang()
  const isZh = lang === 'zh'
  const allExamples: CodeEx[] = [
    ...(demoCode ? [{name:'Demo',code:demoCode}] : []),
    ...(examples ?? []),
  ]
  const [tab,setTab]=useState<'book'|number>('book')
  const [headerModal,setHeaderModal]=useState<string|null>(null)

  return (
    <div style={{borderRadius:10,overflow:'hidden',border:`1px solid ${color}50`}}>
      <div style={{display:'flex',flexWrap:'wrap',borderBottom:`1px solid ${color}40`,background:`${color}10`}}>
        <button onClick={()=>setTab('book')}
          style={{padding:'7px 14px',border:'none',cursor:'pointer',fontSize:12,flexShrink:0,
            background:tab==='book'?`${color}28`:'transparent',
            color:tab==='book'?color:'var(--text-muted)',fontWeight:tab==='book'?700:400,
            borderBottom:tab==='book'?`2px solid ${color}`:'2px solid transparent'}}>📖 Book</button>
        {allExamples.map((ex,i)=>(
          <button key={i} onClick={()=>setTab(i)}
            style={{padding:'7px 12px',border:'none',cursor:'pointer',fontSize:12,flexShrink:0,
              background:tab===i?`${color}28`:'transparent',
              color:tab===i?color:'var(--text-muted)',fontWeight:tab===i?700:400,
              borderBottom:tab===i?`2px solid ${color}`:'2px solid transparent'}}>
            ▶ {(!isZh && ex.name_en) ? ex.name_en : ex.name}
          </button>
        ))}
      </div>

      {tab==='book'?(
        <ClickableCode code={bookCode} onHeaderClick={setHeaderModal}/>
      ):(
        <ExRunPanel key={tab} ex={allExamples[tab as number]} color={color} isZh={isZh}/>
      )}
      {headerModal && <HeaderModal name={headerModal} onClose={()=>setHeaderModal(null)}/>}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TLPIView() {
  const [sel,setSel]=useState('errno')
  const [showDiag,setShowDiag]=useState(true)
  const [manModal,setManModal]=useState<string|null>(null)
  const isMobile=useMobile()

  const ex=EXAMPLES[sel]
  const ch=CHAPTERS.find(c=>c.id===sel)
  const vol1=CHAPTERS.filter(c=>c.vol===1)
  const vol2=CHAPTERS.filter(c=>c.vol===2)

  // Only guard for completely unknown chapter id (programming error)
  if (!ch) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',
      height:'100%',color:'var(--text-muted)',fontSize:13}}>
      Unknown chapter: {sel}
    </div>
  )

  return (
    <div style={{display:'flex',flexDirection:isMobile?'column':'row',height:'100%',overflow:'hidden'}}>
      {/* ── Sidebar ── */}
      <div style={{
        width:isMobile?'100%':210, flexShrink:0,
        borderRight:isMobile?'none':'1px solid var(--border)',
        borderBottom:isMobile?'1px solid var(--border)':'none',
        background:'var(--bg-secondary)',
        display:'flex', flexDirection:isMobile?'row':'column',
        overflowX:isMobile?'auto':undefined,
        overflowY:isMobile?'hidden':'auto',
        maxHeight:isMobile?56:undefined,
        scrollbarWidth:'none',
      }}>
        {!isMobile && <div style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',background:'var(--bg-elevated)'}}>
          <div style={{fontSize:13,fontWeight:800,color:'var(--text-primary)'}}>📖 TLPI</div>
          <div style={{fontSize:10,color:'var(--text-muted)',marginTop:1}}>The Linux Programming Interface</div>
          <div style={{fontSize:10,color:'var(--text-muted)'}}>Michael Kerrisk · 1552 pages</div>
        </div>}
        {!isMobile && <div style={{flex:1,overflowY:'auto',padding:'4px 0'}}>
          <div style={{padding:'6px 14px 3px',fontSize:10,fontWeight:700,color:'var(--text-muted)',letterSpacing:1}}>
            VOL 1 上册 (Ch. 3–35)
          </div>
          {vol1.map(c=>(
            <button key={c.id} onClick={()=>setSel(c.id)}
              style={{display:'flex',alignItems:'center',gap:8,width:'100%',
                padding:'8px 14px',border:'none',
                borderLeft:sel===c.id?`3px solid ${c.color}`:'3px solid transparent',
                background:sel===c.id?'var(--bg-elevated)':'transparent',
                color:sel===c.id?'var(--text-primary)':'var(--text-secondary)',
                cursor:'pointer',fontSize:11,fontWeight:sel===c.id?700:400,textAlign:'left'}}>
              <span style={{fontSize:14}}>{c.icon}</span>
              <span>{c.label}</span>
            </button>
          ))}
          <div style={{padding:'10px 14px 3px',fontSize:10,fontWeight:700,color:'var(--text-muted)',letterSpacing:1,borderTop:'1px solid var(--border)',marginTop:4}}>
            VOL 2 下册 (Ch. 37–63)
          </div>
          {vol2.map(c=>(
            <button key={c.id} onClick={()=>setSel(c.id)}
              style={{display:'flex',alignItems:'center',gap:8,width:'100%',
                padding:'8px 14px',border:'none',
                borderLeft:sel===c.id?`3px solid ${c.color}`:'3px solid transparent',
                background:sel===c.id?'var(--bg-elevated)':'transparent',
                color:sel===c.id?'var(--text-primary)':'var(--text-secondary)',
                cursor:'pointer',fontSize:11,fontWeight:sel===c.id?700:400,textAlign:'left'}}>
              <span style={{fontSize:14}}>{c.icon}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>}
        {isMobile && [...vol1,...vol2].map(c=>(
          <button key={c.id} onClick={()=>setSel(c.id)}
            style={{display:'flex',alignItems:'center',gap:4,flexShrink:0,
              padding:'6px 10px',border:'none',
              borderBottom:sel===c.id?`2px solid ${c.color}`:'2px solid transparent',
              background:sel===c.id?'var(--bg-elevated)':'transparent',
              color:sel===c.id?'var(--text-primary)':'var(--text-secondary)',
              cursor:'pointer',fontSize:11,fontWeight:sel===c.id?700:400,whiteSpace:'nowrap'}}>
            <span style={{fontSize:14}}>{c.icon}</span>
          </button>
        ))}
      </div>

      {/* ── Detail ── */}
      <div style={{flex:1,overflow:'auto',padding:22}}>
        {!ex && (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
            height:'60%',gap:16,color:'var(--text-muted)'}}>
            <span style={{fontSize:48}}>{ch.icon}</span>
            <div style={{fontSize:14,fontWeight:700,color:ch.color}}>{ch.label}</div>
            <div style={{fontSize:12}}>Content coming soon…</div>
          </div>
        )}
        {ex && <>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14,
          padding:'10px 16px',borderRadius:10,
          background:`${ch.color}14`,border:`1px solid ${ch.color}50`}}>
          <span style={{fontSize:26}}>{ch.icon}</span>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:ch.color}}>{ex.name}</div>
            <div style={{fontSize:11,color:'var(--text-muted)'}}>{ex.chapter} · TLPI Vol.{ex.vol} · Michael Kerrisk</div>
          </div>
        </div>

        {/* Syscall diagram (fileio only) */}
        {sel==='fileio'&&(
          <div style={{marginBottom:14,background:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:10,overflow:'hidden'}}>
            <button onClick={()=>setShowDiag(s=>!s)}
              style={{width:'100%',padding:'8px 14px',border:'none',background:'transparent',
                cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center'}}>
              <span style={{fontSize:11,fontWeight:700,color:'var(--text-muted)'}}>SYSCALL PATH: user space → kernel</span>
              <span style={{marginLeft:'auto',fontSize:11,color:'var(--text-muted)'}}>{showDiag?'▲':'▼'}</span>
            </button>
            {showDiag&&<div style={{padding:'8px 16px 14px',display:'flex',justifyContent:'center'}}><SyscallBoundaryDiagram/></div>}
          </div>
        )}

        {/* Description */}
        <p style={{color:'var(--text-secondary)',fontSize:13,lineHeight:1.7,margin:'0 0 14px',
          padding:'10px 14px',background:'var(--bg-secondary)',borderRadius:8,border:'1px solid var(--border)'}}>
          {ex.desc}
        </p>

        {/* Syscall signatures */}
        <div style={{marginBottom:14,background:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:10,overflow:'hidden'}}>
          <div style={{padding:'7px 14px',borderBottom:'1px solid var(--border)',fontSize:11,fontWeight:700,color:'var(--text-muted)'}}>
            SYSCALL SIGNATURES
          </div>
          {(ex.syscalls ?? []).map(s=>(
            <div key={s.name} style={{display:'flex',gap:0,padding:'6px 14px',
              borderBottom:'1px solid var(--border)',alignItems:'baseline',flexWrap:'wrap'}}>
              <code onClick={()=>setManModal(s.name)}
                style={{color:ch.color,fontSize:12,fontWeight:700,marginRight:10,whiteSpace:'nowrap',
                  cursor:'pointer',textDecoration:'underline',textDecorationStyle:'dotted',
                  textDecorationColor:`${ch.color}80`}}
                title={`man ${s.name}`}>{s.name}()</code>
              <code style={{color:'var(--text-secondary)',fontSize:11,fontFamily:'monospace'}}>{s.sig}</code>
            </div>
          ))}
        </div>

        {/* Code + Run */}
        <RunPanel key={sel} bookCode={ex.code ?? ''} demoCode={ex.demoCode ?? ''} color={ch.color} examples={ex.examples}/>

        {/* Notes */}
        <div style={{marginTop:12,padding:'10px 14px',borderRadius:8,fontSize:12,lineHeight:1.65,
          background:'rgba(227,179,65,0.08)',border:'1px solid rgba(227,179,65,0.3)',
          color:'var(--text-secondary)'}}>
          <span style={{fontWeight:700,color:'#e3b341',marginRight:6}}>💡</span>{ex.notes}
        </div>
        </>}
      </div>
      {manModal && <ManModal name={manModal} onClose={()=>setManModal(null)}/>}
    </div>
  )
}
