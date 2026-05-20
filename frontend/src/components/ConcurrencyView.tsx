import React, { useState } from 'react'
import { useLang } from '../i18n/lang'
import { useMobile } from '../hooks/useMobile'
import CodeBlock from './CodeBlock'

interface Topic {
  id: string; icon: string; color: string
  label_zh: string; label_en: string
  desc_zh: string; desc_en: string
  diagram_zh: string; diagram_en: string
  code: string; codeTitle_zh: string; codeTitle_en: string
  notes_zh: string; notes_en: string
  concepts_zh: { term: string; def: string }[]
  concepts_en: { term: string; def: string }[]
}

const TOPICS: Topic[] = [
  {
    id: 'thread', icon: '🧵', color: '#58a6ff',
    label_zh: '线程与进程', label_en: 'Threads vs Processes',
    desc_zh: '进程是资源隔离单元（独立内存空间），线程是调度单元（共享进程内存）。创建线程比进程快 10~100 倍。',
    desc_en: 'A process is a resource isolation unit (own memory space); a thread is a scheduling unit (shares process memory). Creating a thread is 10-100× faster than a process.',
    diagram_zh: `<svg viewBox="0 0 480 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <!-- Process box -->
  <rect x="10" y="20" width="220" height="160" rx="10" fill="rgba(88,166,255,0.05)" stroke="#58a6ff" strokeWidth="1.4"/>
  <text x="120" y="42" textAnchor="middle" fill="#58a6ff" fontSize="12" fontWeight="700">Process A</text>
  <text x="120" y="58" textAnchor="middle" fill="#888" fontSize="9">独立虚拟地址空间</text>
  <!-- threads inside -->
  <rect x="22" y="68" width="88" height="44" rx="6" fill="rgba(88,166,255,0.1)" stroke="#58a6ff" strokeWidth="1"/>
  <text x="66" y="86" textAnchor="middle" fill="#58a6ff" fontSize="10">Thread 1</text>
  <text x="66" y="100" textAnchor="middle" fill="#888" fontSize="8">Stack+Regs</text>
  <rect x="122" y="68" width="88" height="44" rx="6" fill="rgba(88,166,255,0.1)" stroke="#58a6ff" strokeWidth="1"/>
  <text x="166" y="86" textAnchor="middle" fill="#58a6ff" fontSize="10">Thread 2</text>
  <text x="166" y="100" textAnchor="middle" fill="#888" fontSize="8">Stack+Regs</text>
  <!-- shared -->
  <rect x="22" y="124" width="188" height="44" rx="6" fill="rgba(255,255,255,0.04)" stroke="#444" strokeWidth="1"/>
  <text x="116" y="144" textAnchor="middle" fill="#ccc" fontSize="10">Shared: Heap · Code · Files · Globals</text>
  <text x="116" y="159" textAnchor="middle" fill="#888" fontSize="8">线程共享进程内所有资源</text>
  <!-- Process B (separate) -->
  <rect x="260" y="20" width="210" height="160" rx="10" fill="rgba(63,185,80,0.05)" stroke="#3fb950" strokeWidth="1.4"/>
  <text x="365" y="42" textAnchor="middle" fill="#3fb950" fontSize="12" fontWeight="700">Process B</text>
  <text x="365" y="58" textAnchor="middle" fill="#888" fontSize="9">另一个独立虚拟地址空间</text>
  <rect x="272" y="68" width="186" height="44" rx="6" fill="rgba(63,185,80,0.1)" stroke="#3fb950" strokeWidth="1"/>
  <text x="365" y="92" textAnchor="middle" fill="#3fb950" fontSize="10">Thread 1</text>
  <rect x="272" y="124" width="186" height="44" rx="6" fill="rgba(255,255,255,0.04)" stroke="#444" strokeWidth="1"/>
  <text x="365" y="150" textAnchor="middle" fill="#888" fontSize="9">独立 Heap / Files / Globals</text>
  <!-- wall between -->
  <line x1="238" y1="20" x2="238" y2="180" stroke="#333" strokeWidth="1.5" strokeDasharray="6,3"/>
  <text x="239" y="196" textAnchor="middle" fill="#555" fontSize="9">内核隔离</text>
</svg>`,
    diagram_en: `<svg viewBox="0 0 480 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <!-- Process box -->
  <rect x="10" y="20" width="220" height="160" rx="10" fill="rgba(88,166,255,0.05)" stroke="#58a6ff" strokeWidth="1.4"/>
  <text x="120" y="42" textAnchor="middle" fill="#58a6ff" fontSize="12" fontWeight="700">Process A</text>
  <text x="120" y="58" textAnchor="middle" fill="#888" fontSize="9">own virtual address space</text>
  <!-- threads inside -->
  <rect x="22" y="68" width="88" height="44" rx="6" fill="rgba(88,166,255,0.1)" stroke="#58a6ff" strokeWidth="1"/>
  <text x="66" y="86" textAnchor="middle" fill="#58a6ff" fontSize="10">Thread 1</text>
  <text x="66" y="100" textAnchor="middle" fill="#888" fontSize="8">Stack+Regs</text>
  <rect x="122" y="68" width="88" height="44" rx="6" fill="rgba(88,166,255,0.1)" stroke="#58a6ff" strokeWidth="1"/>
  <text x="166" y="86" textAnchor="middle" fill="#58a6ff" fontSize="10">Thread 2</text>
  <text x="166" y="100" textAnchor="middle" fill="#888" fontSize="8">Stack+Regs</text>
  <!-- shared -->
  <rect x="22" y="124" width="188" height="44" rx="6" fill="rgba(255,255,255,0.04)" stroke="#444" strokeWidth="1"/>
  <text x="116" y="144" textAnchor="middle" fill="#ccc" fontSize="10">Shared: Heap · Code · Files · Globals</text>
  <text x="116" y="159" textAnchor="middle" fill="#888" fontSize="8">threads share all process resources</text>
  <!-- Process B (separate) -->
  <rect x="260" y="20" width="210" height="160" rx="10" fill="rgba(63,185,80,0.05)" stroke="#3fb950" strokeWidth="1.4"/>
  <text x="365" y="42" textAnchor="middle" fill="#3fb950" fontSize="12" fontWeight="700">Process B</text>
  <text x="365" y="58" textAnchor="middle" fill="#888" fontSize="9">separate virtual address space</text>
  <rect x="272" y="68" width="186" height="44" rx="6" fill="rgba(63,185,80,0.1)" stroke="#3fb950" strokeWidth="1"/>
  <text x="365" y="92" textAnchor="middle" fill="#3fb950" fontSize="10">Thread 1</text>
  <rect x="272" y="124" width="186" height="44" rx="6" fill="rgba(255,255,255,0.04)" stroke="#444" strokeWidth="1"/>
  <text x="365" y="150" textAnchor="middle" fill="#888" fontSize="9">own Heap / Files / Globals</text>
  <!-- wall between -->
  <line x1="238" y1="20" x2="238" y2="180" stroke="#333" strokeWidth="1.5" strokeDasharray="6,3"/>
  <text x="239" y="196" textAnchor="middle" fill="#555" fontSize="9">kernel isolation</text>
</svg>`,
    code: `// POSIX pthreads
#include <pthread.h>

void* worker(void* arg) {
    int id = *(int*)arg;
    printf("Thread %d running\\n", id);
    return NULL;
}

int main() {
    pthread_t threads[4];
    int ids[4];
    for (int i = 0; i < 4; i++) {
        ids[i] = i;
        pthread_create(&threads[i], NULL, worker, &ids[i]);
    }
    for (int i = 0; i < 4; i++)
        pthread_join(threads[i], NULL);  // wait for all
    return 0;
}

// Go goroutines (green threads, M:N scheduled)
go func() {
    fmt.Println("goroutine")
}()

// Rust threads
std::thread::spawn(|| {
    println!("thread");
}).join().unwrap();`,
    codeTitle_zh: '线程创建示例', codeTitle_en: 'Thread Creation Examples',
    notes_zh: '线程切换 context switch 约 1-10μs；进程切换约 10-100μs（需要切换页表、刷 TLB）。Go goroutine 是用户态调度，切换 ~100ns，可开百万个。',
    notes_en: 'Thread context switch ~1-10μs; process switch ~10-100μs (page table swap + TLB flush). Go goroutines are user-space scheduled (~100ns switch), you can have millions.',
    concepts_zh: [
      { term: 'TID / PID', def: '线程 ID 和进程 ID。Linux 内核用 task_struct 同时表示线程和进程。' },
      { term: 'M:N 调度', def: 'M 个用户线程映射到 N 个内核线程。Go runtime 用此模型（goroutine）。' },
      { term: 'CPU 亲和性', def: 'pthread_setaffinity_np() 绑定线程到指定 CPU，减少 cache miss。' },
      { term: '绿色线程', def: '完全在用户空间调度，无内核参与。Go goroutine、Python greenlet、Rust async。' },
    ],
    concepts_en: [
      { term: 'TID / PID', def: 'Thread ID and Process ID. Linux kernel uses task_struct for both.' },
      { term: 'M:N scheduling', def: 'M user threads mapped to N kernel threads. Go runtime uses this (goroutines).' },
      { term: 'CPU affinity', def: 'pthread_setaffinity_np() pins a thread to specific CPUs to reduce cache misses.' },
      { term: 'Green threads', def: 'Scheduled entirely in user space, no kernel involvement. Go goroutines, Rust async tasks.' },
    ],
  },
  {
    id: 'mutex', icon: '🔒', color: '#f0883e',
    label_zh: '互斥锁 Mutex', label_en: 'Mutex & RWLock',
    desc_zh: 'Mutex 保证同一时刻只有一个线程进入临界区。读写锁（RWLock）允许多个并发读，写时独占。',
    desc_en: 'A mutex ensures only one thread enters the critical section at a time. RWLock allows concurrent reads but exclusive writes.',
    diagram_zh: `<svg viewBox="0 0 480 180" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <defs>
    <marker id="arrowMx" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="#888"/>
    </marker>
  </defs>
  <!-- Mutex state machine -->
  <circle cx="120" cy="90" r="50" fill="rgba(63,185,80,0.08)" stroke="#3fb950" strokeWidth="1.5"/>
  <text x="120" y="85" textAnchor="middle" fill="#3fb950" fontSize="12" fontWeight="700">UNLOCKED</text>
  <text x="120" y="102" textAnchor="middle" fill="#888" fontSize="9">free to acquire</text>
  <circle cx="360" cy="90" r="50" fill="rgba(240,136,62,0.08)" stroke="#f0883e" strokeWidth="1.5"/>
  <text x="360" y="85" textAnchor="middle" fill="#f0883e" fontSize="12" fontWeight="700">LOCKED</text>
  <text x="360" y="102" textAnchor="middle" fill="#888" fontSize="9">owner: Thread X</text>
  <!-- transitions -->
  <path d="M168,70 Q240,20 312,70" fill="none" stroke="#3fb950" strokeWidth="1.4" markerEnd="url(#arrowMx)"/>
  <text x="240" y="28" textAnchor="middle" fill="#3fb950" fontSize="10">lock() / pthread_mutex_lock()</text>
  <path d="M312,110 Q240,160 168,110" fill="none" stroke="#f0883e" strokeWidth="1.4" markerEnd="url(#arrowMx)"/>
  <text x="240" y="168" textAnchor="middle" fill="#f0883e" fontSize="10">unlock() / pthread_mutex_unlock()</text>
  <!-- waiting threads -->
  <rect x="320" y="30" width="80" height="20" rx="4" fill="#1a1f2d" stroke="#666" strokeWidth="1"/>
  <text x="360" y="44" textAnchor="middle" fill="#888" fontSize="9">T2, T3 waiting (sleep)</text>
</svg>`,
    diagram_en: `<svg viewBox="0 0 480 180" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <defs>
    <marker id="arrowMx" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="#888"/>
    </marker>
  </defs>
  <!-- Mutex state machine -->
  <circle cx="120" cy="90" r="50" fill="rgba(63,185,80,0.08)" stroke="#3fb950" strokeWidth="1.5"/>
  <text x="120" y="85" textAnchor="middle" fill="#3fb950" fontSize="12" fontWeight="700">UNLOCKED</text>
  <text x="120" y="102" textAnchor="middle" fill="#888" fontSize="9">free to acquire</text>
  <circle cx="360" cy="90" r="50" fill="rgba(240,136,62,0.08)" stroke="#f0883e" strokeWidth="1.5"/>
  <text x="360" y="85" textAnchor="middle" fill="#f0883e" fontSize="12" fontWeight="700">LOCKED</text>
  <text x="360" y="102" textAnchor="middle" fill="#888" fontSize="9">owner: Thread X</text>
  <!-- transitions -->
  <path d="M168,70 Q240,20 312,70" fill="none" stroke="#3fb950" strokeWidth="1.4" markerEnd="url(#arrowMx)"/>
  <text x="240" y="28" textAnchor="middle" fill="#3fb950" fontSize="10">lock() / pthread_mutex_lock()</text>
  <path d="M312,110 Q240,160 168,110" fill="none" stroke="#f0883e" strokeWidth="1.4" markerEnd="url(#arrowMx)"/>
  <text x="240" y="168" textAnchor="middle" fill="#f0883e" fontSize="10">unlock() / pthread_mutex_unlock()</text>
  <!-- waiting threads -->
  <rect x="320" y="30" width="80" height="20" rx="4" fill="#1a1f2d" stroke="#666" strokeWidth="1"/>
  <text x="360" y="44" textAnchor="middle" fill="#888" fontSize="9">T2, T3 waiting (sleep)</text>
</svg>`,
    code: `// C — pthread mutex
pthread_mutex_t mu = PTHREAD_MUTEX_INITIALIZER;
int counter = 0;

void increment() {
    pthread_mutex_lock(&mu);
    counter++;                    // critical section
    pthread_mutex_unlock(&mu);
}

// C — read-write lock: many readers OR one writer
pthread_rwlock_t rw = PTHREAD_RWLOCK_INITIALIZER;

void read_fn()  { pthread_rwlock_rdlock(&rw); /* read */ pthread_rwlock_unlock(&rw); }
void write_fn() { pthread_rwlock_wrlock(&rw); /* write */ pthread_rwlock_unlock(&rw); }

// Rust — Mutex<T> (compile-time enforced)
use std::sync::{Arc, Mutex};
let m = Arc::new(Mutex::new(0i32));
let guard = m.lock().unwrap();   // MutexGuard — auto-unlocks when dropped
*guard += 1;

// Go — sync.Mutex
var mu sync.Mutex
mu.Lock()
counter++
mu.Unlock()

// Go — sync.RWMutex
var rw sync.RWMutex
rw.RLock();  /* read */  rw.RUnlock()
rw.Lock();   /* write */ rw.Unlock()`,
    codeTitle_zh: 'Mutex / RWLock 代码', codeTitle_en: 'Mutex / RWLock Code',
    notes_zh: 'Rust 的 Mutex<T> 通过所有权系统在编译期保证：不拿锁就无法访问数据（MutexGuard 实现 Deref）。C 的 mutex 没有这种保证，必须靠程序员纪律。持有锁时不要调用 malloc 或 IO，会显著增加锁持有时间。',
    notes_en: 'Rust\'s Mutex<T> uses ownership to guarantee at compile time: you cannot access data without holding the lock (MutexGuard implements Deref). C mutexes have no such guarantee. Avoid malloc/IO while holding a lock — it dramatically increases hold time.',
    concepts_zh: [
      { term: 'spinlock', def: '忙等待（busy-wait）的锁，不放弃 CPU。适合极短临界区，避免 context switch 开销。' },
      { term: '优先级反转', def: '低优先级线程持锁，高优先级线程阻塞。优先级继承协议（PIP）解决此问题。' },
      { term: '锁粒度', def: '粗粒度（全局锁）简单但并发度低；细粒度（per-object 锁）并发高但容易死锁。' },
      { term: 'trylock', def: 'pthread_mutex_trylock() 失败立即返回（EBUSY），不阻塞，适合探测式加锁。' },
    ],
    concepts_en: [
      { term: 'spinlock', def: 'Busy-wait lock — keeps CPU spinning. Best for tiny critical sections to avoid context-switch cost.' },
      { term: 'priority inversion', def: 'Low-priority thread holds lock, blocking high-priority thread. Solved by Priority Inheritance Protocol.' },
      { term: 'lock granularity', def: 'Coarse (global) locks are simple but limit parallelism. Fine-grained locks allow more concurrency but risk deadlock.' },
      { term: 'trylock', def: 'pthread_mutex_trylock() fails immediately (EBUSY) instead of blocking. Good for speculative locking.' },
    ],
  },
  {
    id: 'semaphore', icon: '🚦', color: '#3fb950',
    label_zh: '信号量 Semaphore', label_en: 'Semaphore',
    desc_zh: '信号量是一个计数器，用于控制并发访问资源的数量。二值信号量（0/1）= mutex；计数信号量可控制有限资源池。',
    desc_en: 'A semaphore is a counter controlling concurrent access to resources. Binary semaphore (0/1) ≅ mutex; counting semaphore controls a resource pool.',
    diagram_zh: `<svg viewBox="0 0 480 170" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <!-- Counting semaphore with capacity 3 -->
  <rect x="10" y="20" width="460" height="130" rx="8" fill="rgba(255,255,255,0.02)" stroke="#333" strokeWidth="1"/>
  <text x="240" y="44" textAnchor="middle" fill="#ccc" fontSize="12" fontWeight="700">计数信号量 (capacity = 3)</text>
  <!-- slots -->
  <rect x="40"  y="60" width="70" height="50" rx="6" fill="rgba(63,185,80,0.15)" stroke="#3fb950" strokeWidth="1.5"/>
  <text x="75"  y="88" textAnchor="middle" fill="#3fb950" fontSize="10">Slot 1</text>
  <text x="75"  y="103" textAnchor="middle" fill="#ccc" fontSize="9">T1 using</text>
  <rect x="125" y="60" width="70" height="50" rx="6" fill="rgba(63,185,80,0.15)" stroke="#3fb950" strokeWidth="1.5"/>
  <text x="160" y="88" textAnchor="middle" fill="#3fb950" fontSize="10">Slot 2</text>
  <text x="160" y="103" textAnchor="middle" fill="#ccc" fontSize="9">T2 using</text>
  <rect x="210" y="60" width="70" height="50" rx="6" fill="rgba(255,255,255,0.04)" stroke="#444" strokeWidth="1.5"/>
  <text x="245" y="88" textAnchor="middle" fill="#888" fontSize="10">Slot 3</text>
  <text x="245" y="103" textAnchor="middle" fill="#888" fontSize="9">free</text>
  <!-- counter -->
  <rect x="320" y="55" width="130" height="60" rx="8" fill="#1a1f2d" stroke="#58a6ff" strokeWidth="1.5"/>
  <text x="385" y="78" textAnchor="middle" fill="#58a6ff" fontSize="11" fontWeight="700">count = 1</text>
  <text x="385" y="95" textAnchor="middle" fill="#888" fontSize="9">sem_wait() → count-1</text>
  <text x="385" y="108" textAnchor="middle" fill="#888" fontSize="9">sem_post() → count+1</text>
  <!-- blocked thread -->
  <rect x="310" y="130" width="150" height="15" rx="4" fill="rgba(240,136,62,0.1)" stroke="#f0883e" strokeWidth="1"/>
  <text x="385" y="142" textAnchor="middle" fill="#f0883e" fontSize="8">T3 blocked (count was 0)</text>
</svg>`,
    diagram_en: `<svg viewBox="0 0 480 170" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <!-- Counting semaphore with capacity 3 -->
  <rect x="10" y="20" width="460" height="130" rx="8" fill="rgba(255,255,255,0.02)" stroke="#333" strokeWidth="1"/>
  <text x="240" y="44" textAnchor="middle" fill="#ccc" fontSize="12" fontWeight="700">Counting Semaphore (capacity = 3)</text>
  <!-- slots -->
  <rect x="40"  y="60" width="70" height="50" rx="6" fill="rgba(63,185,80,0.15)" stroke="#3fb950" strokeWidth="1.5"/>
  <text x="75"  y="88" textAnchor="middle" fill="#3fb950" fontSize="10">Slot 1</text>
  <text x="75"  y="103" textAnchor="middle" fill="#ccc" fontSize="9">T1 using</text>
  <rect x="125" y="60" width="70" height="50" rx="6" fill="rgba(63,185,80,0.15)" stroke="#3fb950" strokeWidth="1.5"/>
  <text x="160" y="88" textAnchor="middle" fill="#3fb950" fontSize="10">Slot 2</text>
  <text x="160" y="103" textAnchor="middle" fill="#ccc" fontSize="9">T2 using</text>
  <rect x="210" y="60" width="70" height="50" rx="6" fill="rgba(255,255,255,0.04)" stroke="#444" strokeWidth="1.5"/>
  <text x="245" y="88" textAnchor="middle" fill="#888" fontSize="10">Slot 3</text>
  <text x="245" y="103" textAnchor="middle" fill="#888" fontSize="9">free</text>
  <!-- counter -->
  <rect x="320" y="55" width="130" height="60" rx="8" fill="#1a1f2d" stroke="#58a6ff" strokeWidth="1.5"/>
  <text x="385" y="78" textAnchor="middle" fill="#58a6ff" fontSize="11" fontWeight="700">count = 1</text>
  <text x="385" y="95" textAnchor="middle" fill="#888" fontSize="9">sem_wait() → count-1</text>
  <text x="385" y="108" textAnchor="middle" fill="#888" fontSize="9">sem_post() → count+1</text>
  <!-- blocked thread -->
  <rect x="310" y="130" width="150" height="15" rx="4" fill="rgba(240,136,62,0.1)" stroke="#f0883e" strokeWidth="1"/>
  <text x="385" y="142" textAnchor="middle" fill="#f0883e" fontSize="8">T3 blocked (count was 0)</text>
</svg>`,
    code: `// POSIX semaphore (Linux)
#include <semaphore.h>

sem_t sem;
sem_init(&sem, 0, 3);     // count = 3 (shared among threads)

// Acquire (P / wait) — decrements count, blocks if 0
sem_wait(&sem);
// ... use resource ...
sem_post(&sem);            // Release (V / signal) — increments count

// Named semaphore (across processes)
sem_t* s = sem_open("/myapp", O_CREAT, 0644, 1);
sem_wait(s);
/* critical section */
sem_post(s);
sem_close(s);

// Go — channel as semaphore
sem := make(chan struct{}, 3)   // buffered channel, capacity 3
sem <- struct{}{}               // acquire
defer func() { <-sem }()        // release

// Python threading
from threading import Semaphore
s = Semaphore(3)
with s:
    pass  # auto acquire/release`,
    codeTitle_zh: 'Semaphore 代码', codeTitle_en: 'Semaphore Code',
    notes_zh: 'POSIX 信号量有两种：匿名（sem_init，线程间）和命名（sem_open，进程间）。Go 习惯用 buffered channel 代替信号量。信号量不适合作为锁（unlocking thread 可以不是 locking thread），mutex 才是正确的互斥原语。',
    notes_en: 'POSIX semaphores: unnamed (sem_init, for threads) and named (sem_open, for processes). Go idiom uses buffered channels as semaphores. Semaphores are not ownership-based — any thread can post. Use mutex for mutual exclusion.',
    concepts_zh: [
      { term: 'sem_wait (P操作)', def: '减 1；若为 0 则阻塞。来自荷兰语 Proberen（尝试）。' },
      { term: 'sem_post (V操作)', def: '加 1；唤醒一个等待线程。来自荷兰语 Verhogen（增加）。' },
      { term: '生产者-消费者', def: '经典信号量用例：empty + full 两个信号量 + 一个 mutex 保护 buffer。' },
      { term: '条件变量', def: 'pthread_cond_wait() 比信号量更精准：可以等待特定条件，避免 spurious wakeup。' },
    ],
    concepts_en: [
      { term: 'sem_wait (P)', def: 'Decrements count; blocks if 0. From Dutch "Proberen" (to try).' },
      { term: 'sem_post (V)', def: 'Increments count; wakes one waiter. From Dutch "Verhogen" (to increment).' },
      { term: 'Producer-Consumer', def: 'Classic semaphore use: empty + full semaphores + mutex to protect the buffer.' },
      { term: 'Condition variable', def: 'pthread_cond_wait() is more precise: wait for a specific condition, avoiding spurious wakeups.' },
    ],
  },
  {
    id: 'deadlock', icon: '💀', color: '#f78166',
    label_zh: '死锁 Deadlock', label_en: 'Deadlock',
    desc_zh: '死锁：4 个 Coffman 条件同时满足。预防：破坏任一条件，最常见方式是固定锁顺序。',
    desc_en: 'Deadlock occurs when all 4 Coffman conditions hold simultaneously. Prevention: break any one condition; most common fix is consistent lock ordering.',
    diagram_zh: `<svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:400px">
  <defs>
    <marker id="arrowDL" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="#f78166"/>
    </marker>
  </defs>
  <!-- T1 holds R1, wants R2 -->
  <circle cx="100" cy="80" r="36" fill="#1a1f2d" stroke="#58a6ff" strokeWidth="1.5"/>
  <text x="100" y="75" textAnchor="middle" fill="#58a6ff" fontSize="11" fontWeight="700">Thread 1</text>
  <text x="100" y="91" textAnchor="middle" fill="#888" fontSize="8">holds R1</text>
  <!-- T2 holds R2, wants R1 -->
  <circle cx="300" cy="80" r="36" fill="#1a1f2d" stroke="#3fb950" strokeWidth="1.5"/>
  <text x="300" y="75" textAnchor="middle" fill="#3fb950" fontSize="11" fontWeight="700">Thread 2</text>
  <text x="300" y="91" textAnchor="middle" fill="#888" fontSize="8">holds R2</text>
  <!-- R1 -->
  <rect x="70" y="150" width="60" height="32" rx="6" fill="#1a1f2d" stroke="#f78166" strokeWidth="1.5"/>
  <text x="100" y="170" textAnchor="middle" fill="#f78166" fontSize="10" fontWeight="700">Lock R1</text>
  <!-- R2 -->
  <rect x="270" y="150" width="60" height="32" rx="6" fill="#1a1f2d" stroke="#f78166" strokeWidth="1.5"/>
  <text x="300" y="170" textAnchor="middle" fill="#f78166" fontSize="10" fontWeight="700">Lock R2</text>
  <!-- arrows: holds -->
  <line x1="100" y1="116" x2="100" y2="148" stroke="#58a6ff" strokeWidth="1.5"/>
  <text x="60" y="136" fill="#58a6ff" fontSize="8">holds</text>
  <line x1="300" y1="116" x2="300" y2="148" stroke="#3fb950" strokeWidth="1.5"/>
  <text x="304" y="136" fill="#3fb950" fontSize="8">holds</text>
  <!-- arrows: wants (circular) -->
  <path d="M134,65 Q200,10 266,65" fill="none" stroke="#f78166" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrowDL)"/>
  <path d="M266,95 Q200,160 134,95" fill="none" stroke="#f78166" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrowDL)"/>
  <text x="200" y="22" textAnchor="middle" fill="#f78166" fontSize="9">T1 wants R2</text>
  <text x="200" y="188" textAnchor="middle" fill="#f78166" fontSize="9">T2 wants R1</text>
</svg>`,
    diagram_en: `<svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:400px">
  <defs>
    <marker id="arrowDL" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="#f78166"/>
    </marker>
  </defs>
  <!-- T1 holds R1, wants R2 -->
  <circle cx="100" cy="80" r="36" fill="#1a1f2d" stroke="#58a6ff" strokeWidth="1.5"/>
  <text x="100" y="75" textAnchor="middle" fill="#58a6ff" fontSize="11" fontWeight="700">Thread 1</text>
  <text x="100" y="91" textAnchor="middle" fill="#888" fontSize="8">holds R1</text>
  <!-- T2 holds R2, wants R1 -->
  <circle cx="300" cy="80" r="36" fill="#1a1f2d" stroke="#3fb950" strokeWidth="1.5"/>
  <text x="300" y="75" textAnchor="middle" fill="#3fb950" fontSize="11" fontWeight="700">Thread 2</text>
  <text x="300" y="91" textAnchor="middle" fill="#888" fontSize="8">holds R2</text>
  <!-- R1 -->
  <rect x="70" y="150" width="60" height="32" rx="6" fill="#1a1f2d" stroke="#f78166" strokeWidth="1.5"/>
  <text x="100" y="170" textAnchor="middle" fill="#f78166" fontSize="10" fontWeight="700">Lock R1</text>
  <!-- R2 -->
  <rect x="270" y="150" width="60" height="32" rx="6" fill="#1a1f2d" stroke="#f78166" strokeWidth="1.5"/>
  <text x="300" y="170" textAnchor="middle" fill="#f78166" fontSize="10" fontWeight="700">Lock R2</text>
  <!-- arrows: holds -->
  <line x1="100" y1="116" x2="100" y2="148" stroke="#58a6ff" strokeWidth="1.5"/>
  <text x="60" y="136" fill="#58a6ff" fontSize="8">holds</text>
  <line x1="300" y1="116" x2="300" y2="148" stroke="#3fb950" strokeWidth="1.5"/>
  <text x="304" y="136" fill="#3fb950" fontSize="8">holds</text>
  <!-- arrows: wants (circular) -->
  <path d="M134,65 Q200,10 266,65" fill="none" stroke="#f78166" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrowDL)"/>
  <path d="M266,95 Q200,160 134,95" fill="none" stroke="#f78166" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrowDL)"/>
  <text x="200" y="22" textAnchor="middle" fill="#f78166" fontSize="9">T1 wants R2</text>
  <text x="200" y="188" textAnchor="middle" fill="#f78166" fontSize="9">T2 wants R1</text>
</svg>`,
    code: `// DEADLOCK — classic lock ordering bug
// Thread 1: lock(A) → lock(B)
// Thread 2: lock(B) → lock(A)   ← opposite order → deadlock!

// FIX 1: consistent lock ordering (always A before B)
void thread1() { lock(A); lock(B); /* ... */ unlock(B); unlock(A); }
void thread2() { lock(A); lock(B); /* ... */ unlock(B); unlock(A); }

// FIX 2: trylock with backoff
void thread() {
    while (true) {
        lock(A);
        if (trylock(B) == EBUSY) { unlock(A); sleep_random(); continue; }
        // got both locks
        unlock(B); unlock(A); break;
    }
}

// FIX 3: lock timeout (C++ timed_mutex)
#include <chrono>
if (mu.try_lock_for(std::chrono::milliseconds(100))) {
    /* got lock */
} else { /* timed out */ }

// Go — context with timeout prevents indefinite block
ctx, cancel := context.WithTimeout(ctx, time.Second)
defer cancel()
select {
case sem <- struct{}{}: // acquired
case <-ctx.Done():      // timed out
}`,
    codeTitle_zh: '死锁预防', codeTitle_en: 'Deadlock Prevention',
    notes_zh: 'Coffman 4 条件：互斥、持有并等待、不可抢占、循环等待。破坏"循环等待"最实用——全局固定锁的获取顺序。Rust 借用检查器在编译期阻止了大多数数据竞争，但无法阻止逻辑死锁。',
    notes_en: 'Coffman conditions: mutual exclusion, hold-and-wait, no preemption, circular wait. Breaking circular wait is most practical — enforce a global lock acquisition order. Rust\'s borrow checker prevents data races at compile time but cannot prevent logical deadlocks.',
    concepts_zh: [
      { term: 'livelock', def: '两个线程都在响应对方，但没有推进。类似走廊互让：都在动，但都没走过去。' },
      { term: 'starvation', def: '线程永远得不到资源，因为其他线程持续抢占。公平调度可解决。' },
      { term: 'ABBA 死锁', def: '最常见模式：T1 先 lock(A) 再 lock(B)，T2 先 lock(B) 再 lock(A)。' },
      { term: '银行家算法', def: 'Dijkstra 提出的死锁避免算法：在分配资源前检查是否存在"安全序列"。' },
    ],
    concepts_en: [
      { term: 'livelock', def: 'Both threads respond to each other but make no progress. Like two people dodging in a hallway.' },
      { term: 'starvation', def: 'A thread never gets resources because others continuously preempt. Fixed by fair scheduling.' },
      { term: 'ABBA deadlock', def: 'Most common: T1 locks A then B; T2 locks B then A — opposite orders cause deadlock.' },
      { term: "Banker's algorithm", def: "Dijkstra's deadlock avoidance: check for a 'safe sequence' before granting resources." },
    ],
  },
  {
    id: 'channel', icon: '📡', color: '#79c0ff',
    label_zh: 'Channel / CSP', label_en: 'Channel / CSP',
    desc_zh: "Go 的 channel 实现了 CSP（通信顺序进程）模型——「不要通过共享内存通信，而应通过通信来共享内存」。",
    desc_en: 'Go channels implement CSP (Communicating Sequential Processes) — "Do not communicate by sharing memory; share memory by communicating."',
    diagram_zh: `<svg viewBox="0 0 480 160" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <defs>
    <marker id="arrowCh" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="#79c0ff"/>
    </marker>
  </defs>
  <!-- Goroutine A -->
  <rect x="10" y="50" width="110" height="60" rx="8" fill="rgba(121,192,255,0.08)" stroke="#79c0ff" strokeWidth="1.4"/>
  <text x="65" y="75" textAnchor="middle" fill="#79c0ff" fontSize="11" fontWeight="700">Goroutine A</text>
  <text x="65" y="92" textAnchor="middle" fill="#888" fontSize="9">ch ← data</text>
  <!-- buffered channel -->
  <rect x="150" y="44" width="180" height="72" rx="8" fill="rgba(255,255,255,0.03)" stroke="#79c0ff" strokeWidth="1.4"/>
  <text x="240" y="62" textAnchor="middle" fill="#79c0ff" fontSize="10" fontWeight="600">channel (buffer=3)</text>
  <rect x="160" y="68" width="40" height="36" rx="4" fill="rgba(121,192,255,0.2)" stroke="#79c0ff" strokeWidth="1"/>
  <text x="180" y="92" textAnchor="middle" fill="#79c0ff" fontSize="9">v1</text>
  <rect x="202" y="68" width="40" height="36" rx="4" fill="rgba(121,192,255,0.2)" stroke="#79c0ff" strokeWidth="1"/>
  <text x="222" y="92" textAnchor="middle" fill="#79c0ff" fontSize="9">v2</text>
  <rect x="244" y="68" width="40" height="36" rx="4" fill="rgba(255,255,255,0.04)" stroke="#444" strokeWidth="1"/>
  <text x="264" y="92" textAnchor="middle" fill="#555" fontSize="9">empty</text>
  <!-- Goroutine B -->
  <rect x="360" y="50" width="110" height="60" rx="8" fill="rgba(121,192,255,0.08)" stroke="#79c0ff" strokeWidth="1.4"/>
  <text x="415" y="75" textAnchor="middle" fill="#79c0ff" fontSize="11" fontWeight="700">Goroutine B</text>
  <text x="415" y="92" textAnchor="middle" fill="#888" fontSize="9">v := ← ch</text>
  <!-- arrows -->
  <line x1="122" y1="80" x2="148" y2="80" stroke="#79c0ff" strokeWidth="1.5" markerEnd="url(#arrowCh)"/>
  <line x1="332" y1="80" x2="358" y2="80" stroke="#79c0ff" strokeWidth="1.5" markerEnd="url(#arrowCh)"/>
  <!-- unbuffered label -->
  <text x="240" y="140" textAnchor="middle" fill="#888" fontSize="9">unbuffered(0): sender blocks until receiver ready (rendezvous)</text>
</svg>`,
    diagram_en: `<svg viewBox="0 0 480 160" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <defs>
    <marker id="arrowCh" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="#79c0ff"/>
    </marker>
  </defs>
  <!-- Goroutine A -->
  <rect x="10" y="50" width="110" height="60" rx="8" fill="rgba(121,192,255,0.08)" stroke="#79c0ff" strokeWidth="1.4"/>
  <text x="65" y="75" textAnchor="middle" fill="#79c0ff" fontSize="11" fontWeight="700">Goroutine A</text>
  <text x="65" y="92" textAnchor="middle" fill="#888" fontSize="9">ch ← data</text>
  <!-- buffered channel -->
  <rect x="150" y="44" width="180" height="72" rx="8" fill="rgba(255,255,255,0.03)" stroke="#79c0ff" strokeWidth="1.4"/>
  <text x="240" y="62" textAnchor="middle" fill="#79c0ff" fontSize="10" fontWeight="600">channel (buffer=3)</text>
  <rect x="160" y="68" width="40" height="36" rx="4" fill="rgba(121,192,255,0.2)" stroke="#79c0ff" strokeWidth="1"/>
  <text x="180" y="92" textAnchor="middle" fill="#79c0ff" fontSize="9">v1</text>
  <rect x="202" y="68" width="40" height="36" rx="4" fill="rgba(121,192,255,0.2)" stroke="#79c0ff" strokeWidth="1"/>
  <text x="222" y="92" textAnchor="middle" fill="#79c0ff" fontSize="9">v2</text>
  <rect x="244" y="68" width="40" height="36" rx="4" fill="rgba(255,255,255,0.04)" stroke="#444" strokeWidth="1"/>
  <text x="264" y="92" textAnchor="middle" fill="#555" fontSize="9">empty</text>
  <!-- Goroutine B -->
  <rect x="360" y="50" width="110" height="60" rx="8" fill="rgba(121,192,255,0.08)" stroke="#79c0ff" strokeWidth="1.4"/>
  <text x="415" y="75" textAnchor="middle" fill="#79c0ff" fontSize="11" fontWeight="700">Goroutine B</text>
  <text x="415" y="92" textAnchor="middle" fill="#888" fontSize="9">v := ← ch</text>
  <!-- arrows -->
  <line x1="122" y1="80" x2="148" y2="80" stroke="#79c0ff" strokeWidth="1.5" markerEnd="url(#arrowCh)"/>
  <line x1="332" y1="80" x2="358" y2="80" stroke="#79c0ff" strokeWidth="1.5" markerEnd="url(#arrowCh)"/>
  <!-- unbuffered label -->
  <text x="240" y="140" textAnchor="middle" fill="#888" fontSize="9">unbuffered(0): sender blocks until receiver ready (rendezvous)</text>
</svg>`,
    code: `// Go channels
ch := make(chan int)       // unbuffered — synchronous rendezvous
ch := make(chan int, 10)   // buffered — async up to 10 items

// Send / Receive
go func() { ch <- 42 }()
val := <-ch

// select — multiplex over multiple channels
select {
case msg := <-ch1:
    fmt.Println("ch1:", msg)
case ch2 <- 99:
    fmt.Println("sent to ch2")
case <-time.After(time.Second):
    fmt.Println("timeout")
}

// Pipeline pattern
gen  := func(nums ...int) <-chan int { ... }
sq   := func(in <-chan int) <-chan int { ... }

// Fan-out / fan-in
func fanOut(in <-chan int, n int) []<-chan int { ... }
func merge(cs ...<-chan int) <-chan int { ... }

// Done channel for cancellation
done := make(chan struct{})
go worker(done, ch)
close(done)   // broadcast cancel to all goroutines watching done`,
    codeTitle_zh: 'Go Channel 用法', codeTitle_en: 'Go Channel Patterns',
    notes_zh: '无缓冲 channel 是"汇合点"（rendezvous）：发送方和接收方必须同时就绪。关闭 channel 会向所有接收方广播信号（常用于取消）。别通过 channel 发送指针再修改原始数据——违反了 CSP 的"ownership transfer"语义。',
    notes_en: 'Unbuffered channel is a rendezvous: sender and receiver must both be ready simultaneously. Closing a channel broadcasts to all receivers (used for cancellation). Don\'t send a pointer then mutate the original — it violates CSP\'s ownership-transfer semantics.',
    concepts_zh: [
      { term: 'CSP', def: 'Communicating Sequential Processes。Hoare 1978 年提出，Go/Erlang/Clojure 的并发模型基础。' },
      { term: 'select 语句', def: '类似 I/O 多路复用的 select/epoll，但用于 channel 操作。default 分支使其非阻塞。' },
      { term: 'done channel', def: '惯用取消模式：close(done) 同时通知所有监听该 channel 的 goroutine 退出。' },
      { term: 'channel direction', def: 'func f(in <-chan int, out chan<- int) 限制参数只读/只写，防止误用。' },
    ],
    concepts_en: [
      { term: 'CSP', def: 'Communicating Sequential Processes. Hoare 1978. Foundation of Go/Erlang/Clojure concurrency.' },
      { term: 'select statement', def: 'Like I/O multiplexing select/epoll but for channels. default branch makes it non-blocking.' },
      { term: 'done channel', def: 'Idiom for cancellation: close(done) notifies all goroutines watching it to exit.' },
      { term: 'channel direction', def: 'func f(in <-chan int, out chan<- int) restricts read/write direction — prevents misuse.' },
    ],
  },
  {
    id: 'async', icon: '⚡', color: '#d2a8ff',
    label_zh: 'Async / Await', label_en: 'Async / Await',
    desc_zh: 'Async/await 是协程（coroutine）的语法糖。单线程事件循环处理大量并发 I/O，无需多线程同步开销。',
    desc_en: 'Async/await is syntax sugar for coroutines. A single-threaded event loop handles massive concurrent I/O with no multi-thread synchronization overhead.',
    diagram_zh: `<svg viewBox="0 0 480 180" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <!-- Event loop -->
  <rect x="10" y="20" width="460" height="150" rx="8" fill="rgba(255,255,255,0.02)" stroke="#333" strokeWidth="1"/>
  <text x="240" y="42" textAnchor="middle" fill="#ccc" fontSize="12" fontWeight="700">Event Loop (single thread)</text>
  <!-- task queue -->
  <rect x="20" y="56" width="200" height="100" rx="6" fill="rgba(210,168,255,0.05)" stroke="#d2a8ff" strokeWidth="1.2"/>
  <text x="120" y="74" textAnchor="middle" fill="#d2a8ff" fontSize="10" fontWeight="600">Task Queue</text>
  <rect x="30" y="80" width="80" height="26" rx="4" fill="rgba(210,168,255,0.15)"/>
  <text x="70" y="97" textAnchor="middle" fill="#d2a8ff" fontSize="9">fetch() done</text>
  <rect x="120" y="80" width="88" height="26" rx="4" fill="rgba(210,168,255,0.15)"/>
  <text x="164" y="97" textAnchor="middle" fill="#d2a8ff" fontSize="9">timer fired</text>
  <rect x="30" y="116" width="80" height="26" rx="4" fill="rgba(210,168,255,0.08)"/>
  <text x="70" y="133" textAnchor="middle" fill="#888" fontSize="9">I/O ready</text>
  <!-- executor -->
  <rect x="250" y="56" width="210" height="100" rx="6" fill="rgba(255,255,255,0.03)" stroke="#444" strokeWidth="1.2"/>
  <text x="355" y="74" textAnchor="middle" fill="#ccc" fontSize="10" fontWeight="600">Executor / Reactor</text>
  <text x="355" y="92" textAnchor="middle" fill="#888" fontSize="9">poll futures until Ready</text>
  <text x="355" y="108" textAnchor="middle" fill="#888" fontSize="9">register wakers (epoll)</text>
  <text x="355" y="124" textAnchor="middle" fill="#3fb950" fontSize="9">no blocking — yield on await</text>
  <text x="355" y="140" textAnchor="middle" fill="#888" fontSize="9">Rust: tokio / async-std</text>
</svg>`,
    diagram_en: `<svg viewBox="0 0 480 180" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <!-- Event loop -->
  <rect x="10" y="20" width="460" height="150" rx="8" fill="rgba(255,255,255,0.02)" stroke="#333" strokeWidth="1"/>
  <text x="240" y="42" textAnchor="middle" fill="#ccc" fontSize="12" fontWeight="700">Event Loop (single thread)</text>
  <!-- task queue -->
  <rect x="20" y="56" width="200" height="100" rx="6" fill="rgba(210,168,255,0.05)" stroke="#d2a8ff" strokeWidth="1.2"/>
  <text x="120" y="74" textAnchor="middle" fill="#d2a8ff" fontSize="10" fontWeight="600">Task Queue</text>
  <rect x="30" y="80" width="80" height="26" rx="4" fill="rgba(210,168,255,0.15)"/>
  <text x="70" y="97" textAnchor="middle" fill="#d2a8ff" fontSize="9">fetch() done</text>
  <rect x="120" y="80" width="88" height="26" rx="4" fill="rgba(210,168,255,0.15)"/>
  <text x="164" y="97" textAnchor="middle" fill="#d2a8ff" fontSize="9">timer fired</text>
  <rect x="30" y="116" width="80" height="26" rx="4" fill="rgba(210,168,255,0.08)"/>
  <text x="70" y="133" textAnchor="middle" fill="#888" fontSize="9">I/O ready</text>
  <!-- executor -->
  <rect x="250" y="56" width="210" height="100" rx="6" fill="rgba(255,255,255,0.03)" stroke="#444" strokeWidth="1.2"/>
  <text x="355" y="74" textAnchor="middle" fill="#ccc" fontSize="10" fontWeight="600">Executor / Reactor</text>
  <text x="355" y="92" textAnchor="middle" fill="#888" fontSize="9">poll futures until Ready</text>
  <text x="355" y="108" textAnchor="middle" fill="#888" fontSize="9">register wakers (epoll)</text>
  <text x="355" y="124" textAnchor="middle" fill="#3fb950" fontSize="9">no blocking — yield on await</text>
  <text x="355" y="140" textAnchor="middle" fill="#888" fontSize="9">Rust: tokio / async-std</text>
</svg>`,
    code: `// JavaScript async/await
async function fetchData(url) {
    const res  = await fetch(url)           // yields control, resumes when ready
    const data = await res.json()
    return data
}

// Parallel async (don't await serially!)
const [a, b] = await Promise.all([fetch(url1), fetch(url2)])

// Rust async/await (zero-cost abstractions)
async fn fetch(url: &str) -> Result<String> {
    let body = reqwest::get(url).await?.text().await?;
    Ok(body)
}

#[tokio::main]  // macro that sets up the executor
async fn main() {
    let (a, b) = tokio::join!(fetch("url1"), fetch("url2"));
}

// Python asyncio
import asyncio, aiohttp

async def fetch(session, url):
    async with session.get(url) as resp:
        return await resp.text()

async def main():
    async with aiohttp.ClientSession() as session:
        results = await asyncio.gather(fetch(session, u) for u in urls)`,
    codeTitle_zh: 'Async/Await 代码', codeTitle_en: 'Async/Await Code',
    notes_zh: 'async fn 不立即执行——返回一个 Future。必须由 executor（tokio/asyncio）驱动（poll）。在 async 函数中调用阻塞操作（如 std::fs::read）会阻塞整个线程——应使用 tokio::fs 或 spawn_blocking。',
    notes_en: 'async fn does not execute immediately — it returns a Future. The executor (tokio/asyncio) must drive it (poll). Calling a blocking operation (like std::fs::read) inside async blocks the entire thread — use tokio::fs or spawn_blocking instead.',
    concepts_zh: [
      { term: 'Future / Promise', def: '代表未来某时刻完成的值。Rust: Future trait (poll 返回 Ready/Pending)。JS: Promise。' },
      { term: 'waker', def: 'Rust Future 系统中，当 I/O 就绪时内核通知 executor 重新 poll 对应 task 的机制。' },
      { term: 'async runtime', def: '提供 executor + reactor 的库：Rust 有 tokio/async-std，JS 内置，Python 有 asyncio。' },
      { term: 'green thread vs async', def: 'Green thread：有栈，调度器负责切换，开销 ~KB/栈。Async：无栈，状态机，开销 ~几百 bytes。' },
    ],
    concepts_en: [
      { term: 'Future / Promise', def: 'A value available at some future point. Rust: Future trait (poll → Ready/Pending). JS: Promise.' },
      { term: 'waker', def: 'In Rust\'s Future system, the mechanism to notify the executor to re-poll a task when I/O is ready.' },
      { term: 'async runtime', def: 'Library providing executor + reactor: Rust has tokio/async-std; JS is built-in; Python has asyncio.' },
      { term: 'green thread vs async', def: 'Green thread: has stack, scheduler switches (~KB each). Async: stackless state machine (~hundreds of bytes).' },
    ],
  },
  {
    id: 'atomics', icon: '⚛', color: '#f0883e',
    label_zh: '原子操作 & CAS', label_en: 'Atomics & CAS',
    desc_zh: '原子操作是不可分割的 CPU 指令，无需锁即可实现线程安全的计数器、标志位等。CAS（Compare-And-Swap）是无锁数据结构的基础。',
    desc_en: 'Atomic operations are indivisible CPU instructions enabling lock-free counters and flags. CAS (Compare-And-Swap) is the foundation of lock-free data structures.',
    diagram_zh: `<svg viewBox="0 0 480 160" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <!-- CAS diagram -->
  <text x="240" y="24" textAnchor="middle" fill="#ccc" fontSize="12" fontWeight="700">CAS(addr, expected, desired) — 原子的</text>
  <!-- step 1: read -->
  <rect x="10" y="40" width="140" height="50" rx="6" fill="rgba(88,166,255,0.08)" stroke="#58a6ff" strokeWidth="1.2"/>
  <text x="80" y="60" textAnchor="middle" fill="#58a6ff" fontSize="10" fontWeight="600">1. Read *addr</text>
  <text x="80" y="78" textAnchor="middle" fill="#888" fontSize="9">*addr == expected?</text>
  <!-- step 2: compare success -->
  <rect x="170" y="40" width="140" height="50" rx="6" fill="rgba(63,185,80,0.08)" stroke="#3fb950" strokeWidth="1.2"/>
  <text x="240" y="60" textAnchor="middle" fill="#3fb950" fontSize="10" fontWeight="600">2a. YES → Write</text>
  <text x="240" y="78" textAnchor="middle" fill="#888" fontSize="9">*addr = desired; return true</text>
  <!-- step 2 fail -->
  <rect x="330" y="40" width="140" height="50" rx="6" fill="rgba(240,136,62,0.08)" stroke="#f0883e" strokeWidth="1.2"/>
  <text x="400" y="60" textAnchor="middle" fill="#f0883e" fontSize="10" fontWeight="600">2b. NO → Fail</text>
  <text x="400" y="78" textAnchor="middle" fill="#888" fontSize="9">return false; retry loop</text>
  <!-- arrows -->
  <line x1="150" y1="65" x2="168" y2="65" stroke="#3fb950" strokeWidth="1.2"/>
  <line x1="150" y1="65" x2="168" y2="65" stroke="#3fb950" strokeWidth="1.2"/>
  <line x1="310" y1="65" x2="328" y2="65" stroke="#f0883e" strokeWidth="1.2"/>
  <!-- ABA note -->
  <rect x="10" y="110" width="460" height="40" rx="6" fill="rgba(247,129,102,0.06)" stroke="#f78166" strokeWidth="1"/>
  <text x="240" y="128" textAnchor="middle" fill="#f78166" fontSize="10" fontWeight="600">ABA 问题</text>
  <text x="240" y="144" textAnchor="middle" fill="#888" fontSize="9">值从 A→B→A，CAS 认为未变化实则已变。解决：版本号 (tagged pointer) 或 hazard pointer</text>
</svg>`,
    diagram_en: `<svg viewBox="0 0 480 160" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <!-- CAS diagram -->
  <text x="240" y="24" textAnchor="middle" fill="#ccc" fontSize="12" fontWeight="700">CAS(addr, expected, desired) — atomic</text>
  <!-- step 1: read -->
  <rect x="10" y="40" width="140" height="50" rx="6" fill="rgba(88,166,255,0.08)" stroke="#58a6ff" strokeWidth="1.2"/>
  <text x="80" y="60" textAnchor="middle" fill="#58a6ff" fontSize="10" fontWeight="600">1. Read *addr</text>
  <text x="80" y="78" textAnchor="middle" fill="#888" fontSize="9">*addr == expected?</text>
  <!-- step 2: compare success -->
  <rect x="170" y="40" width="140" height="50" rx="6" fill="rgba(63,185,80,0.08)" stroke="#3fb950" strokeWidth="1.2"/>
  <text x="240" y="60" textAnchor="middle" fill="#3fb950" fontSize="10" fontWeight="600">2a. YES → Write</text>
  <text x="240" y="78" textAnchor="middle" fill="#888" fontSize="9">*addr = desired; return true</text>
  <!-- step 2 fail -->
  <rect x="330" y="40" width="140" height="50" rx="6" fill="rgba(240,136,62,0.08)" stroke="#f0883e" strokeWidth="1.2"/>
  <text x="400" y="60" textAnchor="middle" fill="#f0883e" fontSize="10" fontWeight="600">2b. NO → Fail</text>
  <text x="400" y="78" textAnchor="middle" fill="#888" fontSize="9">return false; retry loop</text>
  <!-- arrows -->
  <line x1="150" y1="65" x2="168" y2="65" stroke="#3fb950" strokeWidth="1.2"/>
  <line x1="150" y1="65" x2="168" y2="65" stroke="#3fb950" strokeWidth="1.2"/>
  <line x1="310" y1="65" x2="328" y2="65" stroke="#f0883e" strokeWidth="1.2"/>
  <!-- ABA note -->
  <rect x="10" y="110" width="460" height="40" rx="6" fill="rgba(247,129,102,0.06)" stroke="#f78166" strokeWidth="1"/>
  <text x="240" y="128" textAnchor="middle" fill="#f78166" fontSize="10" fontWeight="600">ABA Problem</text>
  <text x="240" y="144" textAnchor="middle" fill="#888" fontSize="9">Value changes A→B→A; CAS falsely sees no change. Fix: tagged pointer (version) or hazard pointer</text>
</svg>`,
    code: `// C++ atomics (C++11)
#include <atomic>
std::atomic<int> counter{0};
counter.fetch_add(1, std::memory_order_relaxed);  // atomic increment
counter++;                                          // shorthand

// CAS loop — lock-free increment
int old = counter.load();
while (!counter.compare_exchange_weak(old, old + 1)) {}

// Memory ordering
std::atomic<bool> ready{false};
std::atomic<int>  data{0};

// Producer
data.store(42, std::memory_order_release);
ready.store(true, std::memory_order_release);

// Consumer
while (!ready.load(std::memory_order_acquire)) {}
assert(data.load() == 42);   // guaranteed to see 42

// Rust atomics
use std::sync::atomic::{AtomicI32, Ordering};
static COUNTER: AtomicI32 = AtomicI32::new(0);
COUNTER.fetch_add(1, Ordering::Relaxed);

// Go sync/atomic
import "sync/atomic"
var counter int64
atomic.AddInt64(&counter, 1)
val := atomic.LoadInt64(&counter)`,
    codeTitle_zh: '原子操作代码', codeTitle_en: 'Atomics Code',
    notes_zh: 'memory_order_relaxed 最快（仅保证原子性，无同步保证）；memory_order_seq_cst 最安全（全局顺序一致）但最慢。现代 x86 对大多数操作自动保证 seq_cst（TSO 模型），但 ARM/RISC-V 是弱内存序——必须显式使用 memory fence。',
    notes_en: 'memory_order_relaxed is fastest (only atomicity, no sync guarantee); memory_order_seq_cst is safest (global sequential consistency) but slowest. x86 (TSO) mostly guarantees seq_cst automatically, but ARM/RISC-V are weakly ordered — must use explicit memory fences.',
    concepts_zh: [
      { term: 'CAS (Compare-And-Swap)', def: 'CPU 指令 CMPXCHG。原子地：读值、比较、相等则写新值。是无锁算法的核心原语。' },
      { term: 'ABA 问题', def: '值 A→B→A 后 CAS 误判。解决：带版本号的 tagged pointer，或 hazard pointer。' },
      { term: 'memory order', def: '控制编译器/CPU 可以重排指令的范围。relaxed < acquire/release < seq_cst。' },
      { term: 'lock-free vs wait-free', def: 'lock-free：至少一个线程总在推进。wait-free：每个线程都保证在有限步内完成（更强）。' },
    ],
    concepts_en: [
      { term: 'CAS (Compare-And-Swap)', def: 'CPU instruction CMPXCHG. Atomically: read, compare, write if equal. Core primitive for lock-free algorithms.' },
      { term: 'ABA problem', def: 'Value A→B→A; CAS falsely sees no change. Fix: tagged pointer with version, or hazard pointer.' },
      { term: 'memory order', def: 'Controls how much the compiler/CPU can reorder. relaxed < acquire/release < seq_cst.' },
      { term: 'lock-free vs wait-free', def: 'lock-free: at least one thread always progresses. wait-free: every thread finishes in bounded steps (stronger).' },
    ],
  },
  {
    id: 'model', icon: '🧩', color: '#888',
    label_zh: '内存模型 & 数据竞争', label_en: 'Memory Model & Data Races',
    desc_zh: '内存模型定义多线程程序中读写的可见性规则。数据竞争（data race）是未定义行为——编译器可能生成任意错误代码。',
    desc_en: "The memory model defines visibility rules for reads and writes in multi-threaded programs. Data races are undefined behavior — the compiler may generate any code it wants.",
    diagram_zh: `<svg viewBox="0 0 480 160" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <!-- happens-before chain -->
  <text x="240" y="22" textAnchor="middle" fill="#ccc" fontSize="12" fontWeight="700">Happens-Before 关系</text>
  <rect x="20"  y="40" width="100" height="40" rx="6" fill="#1a1f2d" stroke="#58a6ff" strokeWidth="1.2"/>
  <text x="70"  y="65" textAnchor="middle" fill="#58a6ff" fontSize="10">Thread 1 write x=1</text>
  <rect x="180" y="40" width="120" height="40" rx="6" fill="#1a1f2d" stroke="#3fb950" strokeWidth="1.2"/>
  <text x="240" y="65" textAnchor="middle" fill="#3fb950" fontSize="10">mutex unlock (release)</text>
  <rect x="360" y="40" width="100" height="40" rx="6" fill="#1a1f2d" stroke="#d2a8ff" strokeWidth="1.2"/>
  <text x="410" y="65" textAnchor="middle" fill="#d2a8ff" fontSize="10">mutex lock (acquire)</text>
  <!-- chain arrow -->
  <line x1="120" y1="60" x2="178" y2="60" stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowDL)"/>
  <line x1="300" y1="60" x2="358" y2="60" stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowDL)"/>
  <!-- thread 2 read -->
  <rect x="360" y="100" width="100" height="40" rx="6" fill="#1a1f2d" stroke="#f0883e" strokeWidth="1.2"/>
  <text x="410" y="125" textAnchor="middle" fill="#f0883e" fontSize="10">Thread 2 read x → 1</text>
  <line x1="410" y1="80" x2="410" y2="98" stroke="#888" strokeWidth="1.2"/>
  <text x="240" y="148" textAnchor="middle" fill="#888" fontSize="9">happens-before 链保证 T2 看到 T1 的写入</text>
  <defs>
    <marker id="arrowDL" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="#888"/>
    </marker>
  </defs>
</svg>`,
    diagram_en: `<svg viewBox="0 0 480 160" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <!-- happens-before chain -->
  <text x="240" y="22" textAnchor="middle" fill="#ccc" fontSize="12" fontWeight="700">Happens-Before Relationship</text>
  <rect x="20"  y="40" width="100" height="40" rx="6" fill="#1a1f2d" stroke="#58a6ff" strokeWidth="1.2"/>
  <text x="70"  y="65" textAnchor="middle" fill="#58a6ff" fontSize="10">Thread 1 write x=1</text>
  <rect x="180" y="40" width="120" height="40" rx="6" fill="#1a1f2d" stroke="#3fb950" strokeWidth="1.2"/>
  <text x="240" y="65" textAnchor="middle" fill="#3fb950" fontSize="10">mutex unlock (release)</text>
  <rect x="360" y="40" width="100" height="40" rx="6" fill="#1a1f2d" stroke="#d2a8ff" strokeWidth="1.2"/>
  <text x="410" y="65" textAnchor="middle" fill="#d2a8ff" fontSize="10">mutex lock (acquire)</text>
  <!-- chain arrow -->
  <line x1="120" y1="60" x2="178" y2="60" stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowDL)"/>
  <line x1="300" y1="60" x2="358" y2="60" stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowDL)"/>
  <!-- thread 2 read -->
  <rect x="360" y="100" width="100" height="40" rx="6" fill="#1a1f2d" stroke="#f0883e" strokeWidth="1.2"/>
  <text x="410" y="125" textAnchor="middle" fill="#f0883e" fontSize="10">Thread 2 read x → 1</text>
  <line x1="410" y1="80" x2="410" y2="98" stroke="#888" strokeWidth="1.2"/>
  <text x="240" y="148" textAnchor="middle" fill="#888" fontSize="9">happens-before chain guarantees T2 sees T1's write</text>
  <defs>
    <marker id="arrowDL" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="#888"/>
    </marker>
  </defs>
</svg>`,
    code: `// DATA RACE — undefined behavior!
int x = 0;
// Thread 1: x = 1;         // no sync
// Thread 2: printf("%d", x); // no sync → UB

// FIX 1: mutex
pthread_mutex_lock(&mu);
x = 1;
pthread_mutex_unlock(&mu);

// FIX 2: atomic
std::atomic<int> x{0};
x.store(1, std::memory_order_release);
int v = x.load(std::memory_order_acquire);  // guaranteed to see 1

// FIX 3: happens-before via channel (Go)
ch := make(chan int, 1)
go func() { x = 1; ch <- 1 }()
<-ch     // receiving establishes happens-before
fmt.Println(x)  // safe: sees 1

// Detect races (tools)
// Go:   go run -race main.go
// C/C++: clang -fsanitize=thread
// Rust:  can't data-race (borrow checker prevents it)`,
    codeTitle_zh: '数据竞争检测与修复', codeTitle_en: 'Data Race Detection & Fix',
    notes_zh: 'Rust 通过所有权和借用规则在编译期完全阻止数据竞争（Send+Sync trait）。Go race detector 是运行时工具，性能开销约 5-10x，但能精准报告竞争。C/C++ 的 ThreadSanitizer (TSan) 同理。',
    notes_en: "Rust's ownership + borrow rules (Send + Sync traits) prevent all data races at compile time. Go's -race flag is a runtime tool with ~5-10× overhead but precise reporting. C/C++ ThreadSanitizer works the same way.",
    concepts_zh: [
      { term: 'happens-before', def: '如果 A happens-before B，则 B 能看到 A 的所有写入。mutex/channel/atomic release/acquire 建立此关系。' },
      { term: 'data race', def: '两个线程并发访问同一内存，至少一个是写，且没有同步原语。在 C/C++ 中是 UB，结果不可预测。' },
      { term: 'TSO (Total Store Order)', def: 'x86 的内存模型。写操作进入 store buffer，对本线程立即可见，对其他线程稍后可见。' },
      { term: 'sequential consistency', def: '最强内存模型：所有线程看到相同的全局操作顺序。Java volatile / C++ seq_cst。' },
    ],
    concepts_en: [
      { term: 'happens-before', def: 'If A happens-before B, then B sees all of A\'s writes. Established by mutex/channel/atomic release-acquire.' },
      { term: 'data race', def: 'Two concurrent accesses to the same memory, at least one a write, with no synchronization. UB in C/C++.' },
      { term: 'TSO (Total Store Order)', def: "x86's memory model. Writes go through a store buffer — visible to owning thread immediately, others with delay." },
      { term: 'sequential consistency', def: 'Strongest model: all threads see the same global order. Java volatile / C++ seq_cst.' },
    ],
  },
]

export default function ConcurrencyView() {
  const { lang } = useLang()
  const isMobile = useMobile()
  const [selected, setSelected] = useState(TOPICS[0].id)
  const [showDetail, setShowDetail] = useState(false)
  const topic = TOPICS.find(t => t.id === selected)!
  const isZh = lang === 'zh'

  const label   = (t: Topic) => isZh ? t.label_zh   : t.label_en
  const desc    = (t: Topic) => isZh ? t.desc_zh     : t.desc_en
  const notes   = (t: Topic) => isZh ? t.notes_zh    : t.notes_en
  const concepts = (t: Topic) => isZh ? t.concepts_zh : t.concepts_en
  const codeTitle = (t: Topic) => isZh ? t.codeTitle_zh : t.codeTitle_en
  const diagram = (t: Topic) => isZh ? t.diagram_zh : t.diagram_en

  const select = (id: string) => { setSelected(id); if (isMobile) setShowDetail(true) }

  const sidebar = (
    <div style={{ width: isMobile ? '100%' : 200, flexShrink: 0, borderRight: isMobile ? 'none' : '1px solid var(--border)', overflowY: 'auto', display: isMobile && showDetail ? 'none' : 'block' }}>
      <div style={{ padding: '12px 10px 6px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.6, textTransform: 'uppercase' }}>
        {isZh ? '并发原理' : 'Concurrency'}
      </div>
      {TOPICS.map(t => (
        <button key={t.id} onClick={() => select(t.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: 'none', textAlign: 'left', cursor: 'pointer', background: selected === t.id ? 'var(--surface)' : 'transparent', borderLeft: selected === t.id ? `3px solid ${t.color}` : '3px solid transparent', color: selected === t.id ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: 13, fontWeight: selected === t.id ? 600 : 400, transition: 'background 0.15s' }}>
          <span style={{ fontSize: 18 }}>{t.icon}</span>
          <span>{label(t)}</span>
        </button>
      ))}
    </div>
  )

  const detail = (
    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? 16 : 24, display: isMobile && !showDetail ? 'none' : 'block' }}>
      {isMobile && showDetail && (
        <button onClick={() => setShowDetail(false)} style={{ marginBottom: 16, fontSize: 13, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          ← {isZh ? '返回' : 'Back'}
        </button>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 28 }}>{topic.icon}</span>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: topic.color }}>{label(topic)}</h2>
      </div>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>{desc(topic)}</p>
      <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '16px 20px', marginBottom: 20, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>{isZh ? '示意图' : 'Diagram'}</div>
        <div dangerouslySetInnerHTML={{ __html: diagram(topic) }} />
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
