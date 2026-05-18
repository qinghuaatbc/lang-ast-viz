import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SyscallEx {
  name: string; icon: string; chapter: string; desc: string
  syscalls: { name: string; sig: string }[]
  code: string; notes: string
  demoCode: string
}

async function runCode(code: string): Promise<{ output: string[]; stderr?: string; error?: string }> {
  const res = await fetch('/api/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, language: 'c' }),
  })
  return res.json()
}

// ─── Chapters nav ─────────────────────────────────────────────────────────────

const CHAPTERS: { id: string; label: string; icon: string; color: string }[] = [
  { id: 'fileio',   label: 'File I/O',        icon: '📄', color: '#4d8fff' },
  { id: 'process',  label: 'Processes',        icon: '🌿', color: '#3fb950' },
  { id: 'signals',  label: 'Signals',          icon: '🚨', color: '#f85149' },
  { id: 'mmap',     label: 'Memory Mapping',   icon: '🗺️', color: '#a371f7' },
  { id: 'threads',  label: 'Threads',          icon: '🧵', color: '#ffa657' },
  { id: 'timerfd',  label: 'Timers',           icon: '⏱️', color: '#e3b341' },
  { id: 'epoll',    label: 'I/O Multiplexing', icon: '⚡', color: '#39d353' },
  { id: 'socket',   label: 'Sockets',          icon: '🔌', color: '#79c0ff' },
]

// ─── Examples ─────────────────────────────────────────────────────────────────

const EXAMPLES: Record<string, SyscallEx> = {
  fileio: {
    name: 'File I/O', icon: '📄', chapter: 'Ch. 4–5',
    desc: 'Every I/O operation in Linux goes through five fundamental syscalls. open() allocates a struct file in the kernel and returns the lowest unused file descriptor — an index into the process\'s fd table inside files_struct.',
    syscalls: [
      { name: 'open',  sig: 'int open(const char *path, int flags, mode_t mode)' },
      { name: 'read',  sig: 'ssize_t read(int fd, void *buf, size_t count)' },
      { name: 'write', sig: 'ssize_t write(int fd, const void *buf, size_t count)' },
      { name: 'lseek', sig: 'off_t lseek(int fd, off_t offset, int whence)' },
      { name: 'close', sig: 'int close(int fd)' },
    ],
    code: `/* TLPI §4.1 — file copy (book excerpt) */
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
    notes: 'After fork(), parent and child share the same open file description — same offset, same flags. O_APPEND makes each write atomic with the seek update: safe for concurrent log writers. The page cache sits between read()/write() and disk.',
    demoCode: `/* Runnable demo: open / write / lseek / read / close */
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

int main() {
    const char *path = "/tmp/tlpi_io_demo.txt";
    const char *msg  = "Hello from TLPI open/read/write!\n";

    /* write */
    int fd = open(path, O_WRONLY | O_CREAT | O_TRUNC, S_IRUSR | S_IWUSR);
    write(fd, msg, strlen(msg));
    close(fd);
    printf("Written %zu bytes to %s\n", strlen(msg), path);

    /* read back */
    fd = open(path, O_RDONLY);
    char buf[256];
    ssize_t n = read(fd, buf, sizeof(buf) - 1);
    buf[n] = '\0';
    printf("Read back: %s", buf);

    /* lseek to offset 6, read "from TLPI..." */
    lseek(fd, 6, SEEK_SET);
    n = read(fd, buf, sizeof(buf) - 1);
    buf[n] = '\0';
    printf("After lseek(6): %s", buf);
    close(fd);

    unlink(path);
    return 0;
}`,
  },

  process: {
    name: 'Processes', icon: '🌿', chapter: 'Ch. 24–26',
    desc: 'The process lifecycle triad. fork() clones the calling process using copy-on-write page tables. execve() replaces the process image. waitpid() reaps zombie children.',
    syscalls: [
      { name: 'fork',    sig: 'pid_t fork(void)' },
      { name: 'execve', sig: 'int execve(const char *path, char *const argv[], char *const envp[])' },
      { name: 'waitpid',sig: 'pid_t waitpid(pid_t pid, int *wstatus, int options)' },
      { name: 'getpid',  sig: 'pid_t getpid(void)' },
      { name: '_exit',   sig: 'void _exit(int status)' },
    ],
    code: `/* TLPI §24.1 — fork + exec + wait (book excerpt) */
#include <unistd.h>
#include <sys/wait.h>
#include <stdio.h>

int main() {
    pid_t cpid = fork();

    if (cpid == 0) {           /* child */
        char *args[] = { "ls", "-lh", NULL };
        execvp("ls", args);    /* replaces child image */
        _exit(127);
    }

    /* parent */
    int status;
    waitpid(cpid, &status, 0);
    if (WIFEXITED(status))
        printf("child exited: %d\n", WEXITSTATUS(status));
}`,
    notes: 'fork() is copy-on-write: child shares parent\'s page tables until either writes a page. A zombie is an exited child whose task_struct is kept until the parent calls wait(). SIGCHLD is sent to parent on child state change.',
    demoCode: `/* Runnable demo: fork + execvp(echo) + waitpid */
#include <unistd.h>
#include <sys/wait.h>
#include <stdio.h>

int main() {
    printf("parent PID = %d\n", getpid());

    pid_t cpid = fork();
    if (cpid == 0) {
        printf("child  PID = %d  (ppid=%d)\n", getpid(), getppid());
        char *args[] = { "echo", "Hello from execvp!", NULL };
        execvp("echo", args);
        _exit(127);
    }

    int status;
    waitpid(cpid, &status, 0);
    if (WIFEXITED(status))
        printf("child exited with code %d\n", WEXITSTATUS(status));
    else if (WIFSIGNALED(status))
        printf("child killed by signal %d\n", WTERMSIG(status));
    return 0;
}`,
  },

  signals: {
    name: 'Signals', icon: '🚨', chapter: 'Ch. 20–22',
    desc: 'Reliable signal handling via sigaction(2). Unlike signal(3), it provides full control: SA_RESTART auto-restarts interrupted syscalls, SA_SIGINFO delivers sender PID and extra context.',
    syscalls: [
      { name: 'sigaction',   sig: 'int sigaction(int sig, const struct sigaction *act, struct sigaction *oldact)' },
      { name: 'sigprocmask', sig: 'int sigprocmask(int how, const sigset_t *set, sigset_t *oldset)' },
      { name: 'sigsuspend',  sig: 'int sigsuspend(const sigset_t *mask)' },
      { name: 'kill',        sig: 'int kill(pid_t pid, int sig)' },
    ],
    code: `/* TLPI §20.13 — sigaction with SA_SIGINFO (book excerpt) */
#include <signal.h>
#include <stdio.h>
#include <unistd.h>

static void handler(int sig, siginfo_t *si, void *ctx) {
    printf("signal %d from pid %d\n", sig, (int)si->si_pid);
}

int main() {
    struct sigaction sa = {
        .sa_sigaction = handler,
        .sa_flags     = SA_SIGINFO | SA_RESTART,
    };
    sigemptyset(&sa.sa_mask);
    sigaction(SIGUSR1, &sa, NULL);

    printf("PID %d — send: kill -USR1 %d\n", getpid(), getpid());
    pause();   /* sleep until signal */
    return 0;
}`,
    notes: 'Signals live in task_struct.pending (per-thread) and signal->shared_pending (thread group). Standard signals do NOT queue if already pending — use SIGRTMIN+n for queuing. Only async-signal-safe functions may be called inside a handler.',
    demoCode: `/* Runnable demo: send SIGALRM to self, catch with SA_SIGINFO */
#include <signal.h>
#include <stdio.h>
#include <unistd.h>

static volatile int caught = 0;

static void handler(int sig, siginfo_t *si, void *ctx) {
    caught++;
    /* write() is async-signal-safe; printf() is NOT */
    const char msg[] = "handler: SIGALRM caught!\n";
    write(STDOUT_FILENO, msg, sizeof(msg) - 1);
}

int main() {
    struct sigaction sa = {
        .sa_sigaction = handler,
        .sa_flags     = SA_SIGINFO | SA_RESTART,
    };
    sigemptyset(&sa.sa_mask);
    sigaction(SIGALRM, &sa, NULL);

    printf("PID %d — sending SIGALRM to self\n", getpid());
    kill(getpid(), SIGALRM);   /* deliver immediately */

    printf("back in main, caught=%d\n", caught);
    return 0;
}`,
  },

  mmap: {
    name: 'Memory Mapping', icon: '🗺️', chapter: 'Ch. 49–50',
    desc: 'Maps a file or anonymous region directly into the virtual address space. The kernel creates a vm_area_struct (VMA) in mm_struct.mmap. File-backed maps go through the page cache — zero-copy between user space and disk.',
    syscalls: [
      { name: 'mmap',    sig: 'void *mmap(void *addr, size_t len, int prot, int flags, int fd, off_t offset)' },
      { name: 'munmap',  sig: 'int munmap(void *addr, size_t len)' },
      { name: 'mprotect',sig: 'int mprotect(void *addr, size_t len, int prot)' },
      { name: 'msync',   sig: 'int msync(void *addr, size_t len, int flags)' },
    ],
    code: `/* TLPI §49.2 — memory-mapped file I/O (book excerpt) */
#include <sys/mman.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <stdio.h>
#include <unistd.h>

int main(int argc, char *argv[]) {
    int fd = open(argv[1], O_RDWR);
    struct stat st;
    fstat(fd, &st);
    size_t len = st.st_size;

    char *p = mmap(NULL, len, PROT_READ | PROT_WRITE,
                   MAP_SHARED, fd, 0);
    close(fd);   /* fd not needed after mmap */

    for (size_t i = 0; i < len; i++)
        if (p[i] >= 'a' && p[i] <= 'z')
            p[i] -= 32;   /* uppercase in-place */

    msync(p, len, MS_SYNC);
    munmap(p, len);
}`,
    notes: 'MAP_PRIVATE creates copy-on-write mapping: writes create anonymous private pages, visible only to this process. MAP_SHARED writes are visible to all processes mapping the same file. madvise(MADV_SEQUENTIAL) hints aggressive read-ahead.',
    demoCode: `/* Runnable demo: write a temp file, mmap read-write, verify */
#include <sys/mman.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <stdio.h>
#include <unistd.h>
#include <string.h>

int main() {
    const char *path = "/tmp/tlpi_mmap_demo.txt";
    const char *content = "hello from mmap demo";
    size_t len = strlen(content);

    /* create file */
    int fd = open(path, O_RDWR | O_CREAT | O_TRUNC, 0600);
    write(fd, content, len);
    close(fd);

    /* mmap shared read-write */
    fd = open(path, O_RDWR);
    char *p = mmap(NULL, len, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
    close(fd);

    printf("before: %.*s\n", (int)len, p);

    /* uppercase in-place via pointer (no read/write syscall!) */
    for (size_t i = 0; i < len; i++)
        if (p[i] >= 'a' && p[i] <= 'z') p[i] -= 32;

    msync(p, len, MS_SYNC);
    printf("after:  %.*s\n", (int)len, p);
    munmap(p, len);

    unlink(path);
    return 0;
}`,
  },

  threads: {
    name: 'Threads (pthreads)', icon: '🧵', chapter: 'Ch. 29–33',
    desc: 'POSIX threads share the process address space (same mm_struct) but each has its own kernel task_struct, stack VMA, and register set. Mutexes are futex(2)-based — only enter the kernel on contention.',
    syscalls: [
      { name: 'pthread_create',     sig: 'int pthread_create(pthread_t *tid, const pthread_attr_t *attr, void *(*fn)(void*), void *arg)' },
      { name: 'pthread_join',       sig: 'int pthread_join(pthread_t tid, void **retval)' },
      { name: 'pthread_mutex_lock', sig: 'int pthread_mutex_lock(pthread_mutex_t *m)' },
      { name: 'pthread_cond_wait',  sig: 'int pthread_cond_wait(pthread_cond_t *cv, pthread_mutex_t *m)' },
    ],
    code: `/* TLPI §30.2 — producer–consumer with mutex + cond var (book excerpt) */
#include <pthread.h>
#include <stdio.h>

static pthread_mutex_t mtx = PTHREAD_MUTEX_INITIALIZER;
static pthread_cond_t  cond = PTHREAD_COND_INITIALIZER;
static int item = 0, ready = 0;

static void *producer(void *_) {
    pthread_mutex_lock(&mtx);
    item = 42; ready = 1;
    pthread_cond_signal(&cond);
    pthread_mutex_unlock(&mtx);
    return NULL;
}
static void *consumer(void *_) {
    pthread_mutex_lock(&mtx);
    while (!ready)
        pthread_cond_wait(&cond, &mtx);
    printf("consumed: %d\n", item);
    pthread_mutex_unlock(&mtx);
    return NULL;
}
int main() {
    pthread_t p, c;
    pthread_create(&c, NULL, consumer, NULL);
    pthread_create(&p, NULL, producer, NULL);
    pthread_join(p, NULL);
    pthread_join(c, NULL);
}`,
    notes: 'Threads are created via clone(CLONE_VM|CLONE_FILES|CLONE_SIGHAND|…). pthread_mutex is futex(2)-based: fast in userspace when uncontended. Always guard pthread_cond_wait in a while loop to handle spurious wakeups.',
    demoCode: `/* Runnable demo: 2 threads race on a counter (with vs without mutex) */
#include <pthread.h>
#include <stdio.h>

static pthread_mutex_t mtx = PTHREAD_MUTEX_INITIALIZER;
static long safe_count = 0;

static void *inc(void *arg) {
    int n = *(int *)arg;
    for (int i = 0; i < n; i++) {
        pthread_mutex_lock(&mtx);
        safe_count++;
        pthread_mutex_unlock(&mtx);
    }
    return NULL;
}

int main() {
    int each = 500000;
    pthread_t t1, t2;
    pthread_create(&t1, NULL, inc, &each);
    pthread_create(&t2, NULL, inc, &each);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);
    printf("expected: %d\n", each * 2);
    printf("got:      %ld\n", safe_count);
    printf("correct:  %s\n", safe_count == each * 2 ? "YES" : "NO");
    return 0;
}`,
  },

  timerfd: {
    name: 'Timers', icon: '⏱️', chapter: 'Ch. 23',
    desc: 'timerfd_create() exposes a POSIX timer as a file descriptor. When the timer fires, the fd becomes readable — integrates natively with epoll, no signal-handler gymnastics.',
    syscalls: [
      { name: 'timerfd_create',  sig: 'int timerfd_create(int clockid, int flags)' },
      { name: 'timerfd_settime', sig: 'int timerfd_settime(int fd, int flags, const struct itimerspec *new, struct itimerspec *old)' },
      { name: 'read (timerfd)',  sig: 'ssize_t read(int fd, uint64_t *buf, 8)  /* returns expiry count */' },
    ],
    code: `/* TLPI §23.6 — timerfd periodic ticks (book excerpt) */
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
        printf("tick %d (exp=%llu)\n", i+1, (unsigned long long)exp);
    }
    close(tfd);
}`,
    notes: 'read() returns the number of expirations since last read — missed ticks accumulate. CLOCK_MONOTONIC never jumps backward — prefer it for timeouts and intervals. Combine with epoll for multi-timer event-driven loops.',
    demoCode: `/* Runnable demo: 4 ticks at 200ms intervals (~0.8s total) */
#include <sys/timerfd.h>
#include <unistd.h>
#include <stdio.h>
#include <stdint.h>
#include <time.h>

int main() {
    int tfd = timerfd_create(CLOCK_MONOTONIC, 0);

    struct itimerspec ts = {
        .it_interval = { .tv_sec = 0, .tv_nsec = 200000000 },  /* 200 ms */
        .it_value    = { .tv_sec = 0, .tv_nsec = 200000000 },
    };
    timerfd_settime(tfd, 0, &ts, NULL);

    struct timespec t0;
    clock_gettime(CLOCK_MONOTONIC, &t0);

    for (int i = 0; i < 4; i++) {
        uint64_t exp;
        read(tfd, &exp, 8);

        struct timespec now;
        clock_gettime(CLOCK_MONOTONIC, &now);
        long ms = (now.tv_sec - t0.tv_sec) * 1000
                + (now.tv_nsec - t0.tv_nsec) / 1000000;
        printf("tick %d at +%ld ms (expirations: %llu)\n",
               i+1, ms, (unsigned long long)exp);
    }
    close(tfd);
    return 0;
}`,
  },

  epoll: {
    name: 'I/O Multiplexing (epoll)', icon: '⚡', chapter: 'Ch. 63',
    desc: 'epoll is O(1) per ready event vs select/poll\'s O(n) scan. Internally uses a red-black tree for the interest list and a ready-event linked list. Powers nginx, Node.js event loop, Redis.',
    syscalls: [
      { name: 'epoll_create1', sig: 'int epoll_create1(int flags)' },
      { name: 'epoll_ctl',     sig: 'int epoll_ctl(int epfd, int op, int fd, struct epoll_event *ev)' },
      { name: 'epoll_wait',    sig: 'int epoll_wait(int epfd, struct epoll_event *evs, int maxevents, int timeout_ms)' },
    ],
    code: `/* TLPI §63.4 — epoll echo server (book excerpt) */
#include <sys/epoll.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#define MAX_EV 64

int main() {
    int srv = socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK, 0);
    struct sockaddr_in addr = {
        .sin_family = AF_INET, .sin_port = htons(8080),
    };
    bind(srv, (struct sockaddr*)&addr, sizeof addr);
    listen(srv, SOMAXCONN);

    int epfd = epoll_create1(0);
    struct epoll_event ev = { .events = EPOLLIN, .data.fd = srv };
    epoll_ctl(epfd, EPOLL_CTL_ADD, srv, &ev);

    struct epoll_event evs[MAX_EV];
    for (;;) {
        int n = epoll_wait(epfd, evs, MAX_EV, -1);
        for (int i = 0; i < n; i++) {
            if (evs[i].data.fd == srv) {
                int conn = accept4(srv, NULL, NULL, SOCK_NONBLOCK);
                ev.data.fd = conn;
                epoll_ctl(epfd, EPOLL_CTL_ADD, conn, &ev);
            } else {
                char buf[1024];
                ssize_t r = read(evs[i].data.fd, buf, sizeof buf);
                if (r <= 0) { close(evs[i].data.fd); }
                else { write(evs[i].data.fd, buf, r); }
            }
        }
    }
}`,
    notes: 'EPOLLET (edge-triggered) fires only on state transitions — requires non-blocking fds and fully draining the fd each time. Level-triggered (default) fires whenever the fd is readable — simpler and safer.',
    demoCode: `/* Runnable demo: epoll monitoring a self-pipe */
#include <sys/epoll.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>
#define MAX_EV 8

int main() {
    int pfd[2];
    pipe(pfd);  /* pfd[0]=read end, pfd[1]=write end */

    int epfd = epoll_create1(0);

    /* add read end to interest list */
    struct epoll_event ev = { .events = EPOLLIN, .data.fd = pfd[0] };
    epoll_ctl(epfd, EPOLL_CTL_ADD, pfd[0], &ev);

    /* write 3 messages then close write end */
    const char *msgs[] = { "alpha", "beta", "gamma" };
    for (int i = 0; i < 3; i++)
        write(pfd[1], msgs[i], strlen(msgs[i]) + 1);
    close(pfd[1]);

    struct epoll_event evs[MAX_EV];
    int done = 0;
    while (!done) {
        int n = epoll_wait(epfd, evs, MAX_EV, 500 /* ms */);
        if (n == 0) break;
        for (int i = 0; i < n; i++) {
            char buf[64];
            ssize_t r = read(evs[i].data.fd, buf, sizeof buf);
            if (r <= 0) { done = 1; break; }
            printf("epoll event: read %zd bytes: \"%s\"\n", r, buf);
        }
    }
    close(pfd[0]); close(epfd);
    return 0;
}`,
  },

  socket: {
    name: 'Sockets', icon: '🔌', chapter: 'Ch. 56–61',
    desc: 'Sockets are the universal IPC and network API. AF_UNIX domain sockets stay entirely in the kernel — no network stack overhead. TCP (AF_INET) provides reliable ordered byte streams over a network.',
    syscalls: [
      { name: 'socket',  sig: 'int socket(int domain, int type, int protocol)' },
      { name: 'bind',    sig: 'int bind(int fd, const struct sockaddr *addr, socklen_t len)' },
      { name: 'listen',  sig: 'int listen(int fd, int backlog)' },
      { name: 'accept',  sig: 'int accept(int fd, struct sockaddr *addr, socklen_t *len)' },
      { name: 'connect', sig: 'int connect(int fd, const struct sockaddr *addr, socklen_t len)' },
      { name: 'send',    sig: 'ssize_t send(int fd, const void *buf, size_t len, int flags)' },
      { name: 'recv',    sig: 'ssize_t recv(int fd, void *buf, size_t len, int flags)' },
    ],
    code: `/* TLPI §56 — TCP echo server (book excerpt) */
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#include <stdio.h>

void run_server(uint16_t port) {
    int srv = socket(AF_INET, SOCK_STREAM, 0);
    int opt = 1;
    setsockopt(srv, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof opt);

    struct sockaddr_in addr = {
        .sin_family = AF_INET,
        .sin_port   = htons(port),
        .sin_addr.s_addr = INADDR_ANY,
    };
    bind(srv, (struct sockaddr*)&addr, sizeof addr);
    listen(srv, 5);

    for (;;) {
        struct sockaddr_in cli;
        socklen_t cli_len = sizeof cli;
        int conn = accept(srv, (struct sockaddr*)&cli, &cli_len);
        char buf[256];
        ssize_t n;
        while ((n = recv(conn, buf, sizeof buf, 0)) > 0)
            send(conn, buf, n, 0);   /* echo */
        close(conn);
    }
}`,
    notes: 'The three-way handshake (SYN→SYN-ACK→ACK) happens inside listen()+accept(). SO_REUSEADDR lets you rebind immediately after restart (avoids TIME_WAIT). For AF_UNIX replace sockaddr_in with sockaddr_un and use a file path.',
    demoCode: `/* Runnable demo: socketpair() — bidirectional AF_UNIX stream */
#include <sys/socket.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

int main() {
    int sv[2];
    /* Creates a connected pair — like pipe() but bidirectional */
    socketpair(AF_UNIX, SOCK_STREAM, 0, sv);

    /* sv[0] sends, sv[1] receives */
    const char *msg1 = "Hello from sv[0]!";
    send(sv[0], msg1, strlen(msg1), 0);

    char buf[64];
    ssize_t n = recv(sv[1], buf, sizeof(buf) - 1, 0);
    buf[n] = '\0';
    printf("sv[1] received: %s\n", buf);

    /* reply the other way */
    const char *msg2 = "Acknowledged by sv[1]";
    send(sv[1], msg2, strlen(msg2), 0);
    n = recv(sv[0], buf, sizeof(buf) - 1, 0);
    buf[n] = '\0';
    printf("sv[0] received: %s\n", buf);

    close(sv[0]); close(sv[1]);
    return 0;
}`,
  },
}

// ─── Syscall boundary diagram ─────────────────────────────────────────────────

function SyscallBoundaryDiagram() {
  const W = 540, H = 194
  const uH = 78, gapY = uH + 16
  const boxes = [
    { x: 14,  y: 16, w: 120, h: 46, label: 'Your C code', sub: 'open("f", O_RDONLY)', color: '#4d8fff' },
    { x: 162, y: 16, w: 120, h: 46, label: 'glibc wrapper', sub: 'open() in libc.so', color: '#4d8fff' },
    { x: 312, y: 16, w: 150, h: 46, label: 'syscall instr', sub: 'mov rax,2 ; syscall', color: '#e3b341' },
    { x: 14,  y: gapY+16, w: 130, h: 46, label: 'system_call()', sub: 'arch/x86/entry.S', color: '#3fb950' },
    { x: 174, y: gapY+16, w: 130, h: 46, label: 'sys_call_table', sub: '[NR_open]=do_sys_open', color: '#3fb950' },
    { x: 334, y: gapY+16, w: 128, h: 46, label: 'do_sys_open()', sub: 'VFS → dentry → inode', color: '#3fb950' },
  ]
  const arrs: [number,number,number,number,string][] = [
    [134, 39, 160, 39, '#4d8fff'],
    [282, 39, 310, 39, '#e3b341'],
    [462, 39, 462, gapY+38, '#e3b341'],
    [144, gapY+39, 172, gapY+39, '#3fb950'],
    [304, gapY+39, 332, gapY+39, '#3fb950'],
  ]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block' }}>
      <defs>
        <marker id="tlpi-arr" markerWidth={8} markerHeight={8} refX={7} refY={3.5} orient="auto">
          <path d="M0,0 L0,7 L8,3.5z" fill="#888" />
        </marker>
      </defs>
      <rect x={0} y={0} width={W} height={uH} fill="rgba(77,143,255,0.07)" />
      <text x={W-8} y={13} textAnchor="end" fontSize={9} fontWeight={700} fill="rgba(77,143,255,0.55)">USER SPACE</text>
      <line x1={0} y1={uH+1} x2={W} y2={uH+1} stroke="#e3b341" strokeWidth={1.5} strokeDasharray="6 4" />
      <text x={8} y={uH+12} fontSize={9} fill="#e3b341" fontWeight={700}>─── kernel boundary ───</text>
      <rect x={0} y={uH+14} width={W} height={82} fill="rgba(63,185,80,0.07)" />
      <text x={W-8} y={uH+27} textAnchor="end" fontSize={9} fontWeight={700} fill="rgba(63,185,80,0.5)">KERNEL SPACE</text>
      <text x={W/2} y={H-3} textAnchor="middle" fontSize={9} fill="var(--text-muted)" fontStyle="italic">
        ← sysret restores %rip → user space continues after syscall instruction
      </text>
      {arrs.map(([x1,y1,x2,y2,c],i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={c} strokeWidth={1.6} markerEnd="url(#tlpi-arr)" />
      ))}
      {boxes.map((b,i) => (
        <g key={i}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={7}
            fill={`${b.color}1a`} stroke={b.color} strokeWidth={1.7} />
          <text x={b.x+b.w/2} y={b.y+17} textAnchor="middle" fontSize={10} fontWeight={700} fill={b.color}>{b.label}</text>
          <text x={b.x+b.w/2} y={b.y+32} textAnchor="middle" fontSize={8} fill="var(--text-muted)" fontFamily="monospace">{b.sub}</text>
        </g>
      ))}
    </svg>
  )
}

// ─── Run panel ────────────────────────────────────────────────────────────────

type RunState = { status: 'idle' } | { status: 'running' } | { status: 'ok'; output: string[]; stderr?: string } | { status: 'err'; msg: string; stderr?: string }

function RunPanel({ bookCode, demoCode, color }: { bookCode: string; demoCode: string; color: string }) {
  const [tab, setTab] = useState<'book' | 'demo'>('book')
  const [editedCode, setEditedCode] = useState(demoCode)
  const [run, setRun] = useState<RunState>({ status: 'idle' })

  const handleRun = async () => {
    setRun({ status: 'running' })
    try {
      const res = await runCode(editedCode)
      if (res.error) {
        setRun({ status: 'err', msg: res.error, stderr: res.stderr })
      } else {
        setRun({ status: 'ok', output: res.output ?? [], stderr: res.stderr })
      }
    } catch (e: any) {
      setRun({ status: 'err', msg: e.message || 'network error' })
    }
  }

  // reset run state when code changes
  const onChange = (v: string) => { setEditedCode(v); setRun({ status: 'idle' }) }

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${color}50` }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${color}40`, background: `${color}10` }}>
        {([['book', '📖 Book code'], ['demo', '▶ Demo (editable + runnable)']] as const).map(([id, lbl]) => (
          <button key={id} onClick={() => { setTab(id as any); if (id === 'demo') setEditedCode(demoCode) }}
            style={{
              padding: '7px 14px', border: 'none', cursor: 'pointer', fontSize: 12,
              background: tab === id ? `${color}28` : 'transparent',
              color: tab === id ? color : 'var(--text-muted)',
              fontWeight: tab === id ? 700 : 400,
              borderBottom: tab === id ? `2px solid ${color}` : '2px solid transparent',
            }}>{lbl}</button>
        ))}
        {tab === 'demo' && (
          <button onClick={handleRun} disabled={run.status === 'running'}
            style={{
              marginLeft: 'auto', padding: '6px 14px', border: 'none', cursor: 'pointer',
              background: run.status === 'running' ? 'rgba(63,185,80,0.2)' : '#3fb950',
              color: run.status === 'running' ? '#3fb950' : '#fff',
              fontWeight: 700, fontSize: 12, borderRadius: 0,
            }}>
            {run.status === 'running' ? '⏳ Compiling…' : '▶ Run'}
          </button>
        )}
      </div>

      {/* Code area */}
      {tab === 'book' ? (
        <pre style={{
          margin: 0, padding: '14px 16px', overflow: 'auto', fontSize: 12,
          lineHeight: 1.65, fontFamily: 'monospace',
          background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
          maxHeight: 340,
        }}>{bookCode}
        </pre>
      ) : (
        <textarea
          value={editedCode}
          onChange={e => onChange(e.target.value)}
          spellCheck={false}
          style={{
            display: 'block', width: '100%', minHeight: 260, padding: '14px 16px',
            fontFamily: 'monospace', fontSize: 12, lineHeight: 1.65,
            background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
            border: 'none', outline: 'none', resize: 'vertical', boxSizing: 'border-box',
          }}
        />
      )}

      {/* Output */}
      {tab === 'demo' && run.status !== 'idle' && (
        <div style={{ borderTop: `1px solid ${color}30`, padding: '10px 14px', background: 'var(--bg-secondary)' }}>
          {run.status === 'running' && (
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>compiling & running…</div>
          )}
          {run.status === 'ok' && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#3fb950', marginBottom: 6 }}>
                ✓ OUTPUT
              </div>
              <pre style={{
                margin: 0, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.55,
                color: '#3fb950', background: 'var(--bg-tertiary)',
                padding: '8px 12px', borderRadius: 6,
              }}>
                {run.output.length ? run.output.join('\n') : '(no output)'}
              </pre>
              {run.stderr && (
                <pre style={{ margin: '6px 0 0', fontFamily: 'monospace', fontSize: 11, color: '#ffa657', padding: '6px 10px', background: 'rgba(255,166,87,0.08)', borderRadius: 6 }}>
                  {run.stderr}
                </pre>
              )}
            </>
          )}
          {run.status === 'err' && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#f85149', marginBottom: 6 }}>✗ ERROR</div>
              <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: 12, color: '#f85149' }}>{run.msg}</pre>
              {run.stderr && (
                <pre style={{ margin: '6px 0 0', fontFamily: 'monospace', fontSize: 11, color: '#ffa657', whiteSpace: 'pre-wrap' }}>{run.stderr}</pre>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TLPIView() {
  const [sel, setSel] = useState('fileio')
  const ex = EXAMPLES[sel]
  const ch = CHAPTERS.find(c => c.id === sel)!
  const [showDiagram, setShowDiagram] = useState(true)

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Sidebar ── */}
      <div style={{
        width: 190, flexShrink: 0, borderRight: '1px solid var(--border)',
        background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>📖 TLPI</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>The Linux Programming Interface</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Michael Kerrisk</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {CHAPTERS.map(c => (
            <button key={c.id} onClick={() => setSel(c.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 14px', border: 'none',
                borderLeft: sel === c.id ? `3px solid ${c.color}` : '3px solid transparent',
                background: sel === c.id ? 'var(--bg-elevated)' : 'transparent',
                color: sel === c.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 12, fontWeight: sel === c.id ? 700 : 400,
                textAlign: 'left',
              }}>
              <span style={{ fontSize: 16 }}>{c.icon}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Detail panel ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: 22 }}>
        {/* Chapter header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16,
          padding: '10px 16px', borderRadius: 10,
          background: `${ch.color}14`, border: `1px solid ${ch.color}50`,
        }}>
          <span style={{ fontSize: 28 }}>{ch.icon}</span>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: ch.color }}>{ex.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ex.chapter} · The Linux Programming Interface · Michael Kerrisk</div>
          </div>
        </div>

        {/* Syscall path diagram (File I/O section only) */}
        {sel === 'fileio' && (
          <div style={{ marginBottom: 16, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <button onClick={() => setShowDiagram(s => !s)}
              style={{
                width: '100%', padding: '8px 14px', border: 'none',
                background: 'transparent', cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center',
              }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>SYSCALL PATH: user space → kernel</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{showDiagram ? '▲' : '▼'}</span>
            </button>
            {showDiagram && (
              <div style={{ padding: '8px 16px 14px', display: 'flex', justifyContent: 'center' }}>
                <SyscallBoundaryDiagram />
              </div>
            )}
          </div>
        )}

        {/* Description */}
        <p style={{
          color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7, margin: '0 0 16px',
          padding: '10px 14px', background: 'var(--bg-secondary)',
          borderRadius: 8, border: '1px solid var(--border)',
        }}>{ex.desc}</p>

        {/* Syscall signatures */}
        <div style={{ marginBottom: 16, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
            SYSCALL SIGNATURES
          </div>
          {ex.syscalls.map(s => (
            <div key={s.name} style={{ display: 'flex', gap: 0, padding: '7px 14px', borderBottom: '1px solid var(--border)', alignItems: 'baseline', flexWrap: 'wrap' }}>
              <code style={{ color: ch.color, fontSize: 12, fontWeight: 700, marginRight: 10, whiteSpace: 'nowrap' }}>{s.name}()</code>
              <code style={{ color: 'var(--text-secondary)', fontSize: 11, fontFamily: 'monospace' }}>{s.sig}</code>
            </div>
          ))}
        </div>

        {/* Code + Run panel */}
        <RunPanel key={sel} bookCode={ex.code} demoCode={ex.demoCode} color={ch.color} />

        {/* Notes */}
        <div style={{
          marginTop: 14, padding: '10px 14px', borderRadius: 8, fontSize: 12, lineHeight: 1.65,
          background: 'rgba(227,179,65,0.08)', border: '1px solid rgba(227,179,65,0.3)',
          color: 'var(--text-secondary)',
        }}>
          <span style={{ fontWeight: 700, color: '#e3b341', marginRight: 6 }}>💡 Notes:</span>
          {ex.notes}
        </div>
      </div>
    </div>
  )
}
