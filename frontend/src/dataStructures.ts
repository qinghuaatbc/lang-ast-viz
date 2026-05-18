export interface DSLang {
  code: string
}

export interface DSEntry {
  id: string
  name: string
  icon: string
  description: string
  complexity: { time: string; space: string }
  langs: Record<string, DSLang>
}

export const DS_LANGS = ['c', 'cpp', 'java', 'rust', 'go', 'javascript', 'python'] as const
export type DSLangId = typeof DS_LANGS[number]

export const DS_LANG_LABELS: Record<DSLangId, string> = {
  c: 'C', cpp: 'C++', java: 'Java', rust: 'Rust', go: 'Go', javascript: 'JavaScript', python: 'Python',
}

export const DS_LIST: DSEntry[] = [
  // ─── Linked List ──────────────────────────────────────────────────────────────
  {
    id: 'linkedlist',
    name: 'Linked List',
    icon: '🔗',
    description: 'A singly linked list where each node holds data and a pointer to the next node. Supports O(1) prepend and traversal.',
    complexity: { time: 'Push O(1) · Search O(n)', space: 'O(n)' },
    langs: {
      c: { code: `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int data;
    struct Node* next;
} Node;

Node* newNode(int data) {
    Node* n = (Node*)malloc(sizeof(Node));
    n->data = data;
    n->next = NULL;
    return n;
}

void push(Node** head, int data) {
    Node* n = newNode(data);
    n->next = *head;
    *head = n;
}

int pop(Node** head) {
    if (!*head) return -1;
    Node* top = *head;
    int val = top->data;
    *head = top->next;
    free(top);
    return val;
}

void printList(Node* head) {
    while (head) {
        printf("%d -> ", head->data);
        head = head->next;
    }
    printf("NULL\\n");
}

int main() {
    Node* head = NULL;
    push(&head, 1);
    push(&head, 2);
    push(&head, 3);
    printList(head);          /* 3 -> 2 -> 1 -> NULL */
    printf("pop: %d\\n", pop(&head)); /* pop: 3 */
    printList(head);          /* 2 -> 1 -> NULL */
    return 0;
}` },
      cpp: { code: `#include <iostream>
#include <memory>

template<typename T>
struct Node {
    T data;
    Node* next;
    explicit Node(T d) : data(std::move(d)), next(nullptr) {}
};

template<typename T>
class LinkedList {
    Node<T>* head_ = nullptr;
public:
    ~LinkedList() {
        while (head_) {
            Node<T>* tmp = head_;
            head_ = head_->next;
            delete tmp;
        }
    }

    void push(T val) {
        auto* n = new Node<T>(std::move(val));
        n->next = head_;
        head_ = n;
    }

    T pop() {
        Node<T>* tmp = head_;
        T val = std::move(tmp->data);
        head_ = head_->next;
        delete tmp;
        return val;
    }

    void print() const {
        for (const Node<T>* p = head_; p; p = p->next)
            std::cout << p->data << " -> ";
        std::cout << "nullptr\\n";
    }
};

int main() {
    LinkedList<int> list;
    list.push(1);
    list.push(2);
    list.push(3);
    list.print();              // 3 -> 2 -> 1 -> nullptr
    std::cout << "pop: " << list.pop() << "\\n"; // pop: 3
    list.print();              // 2 -> 1 -> nullptr
}` },
      java: { code: `public class LinkedList<T> {
    private static class Node<T> {
        T data;
        Node<T> next;
        Node(T data) { this.data = data; }
    }

    private Node<T> head;
    private int size;

    public void push(T data) {
        Node<T> node = new Node<>(data);
        node.next = head;
        head = node;
        size++;
    }

    public T pop() {
        if (head == null) throw new RuntimeException("Empty list");
        T val = head.data;
        head = head.next;
        size--;
        return val;
    }

    public boolean contains(T val) {
        for (Node<T> p = head; p != null; p = p.next)
            if (p.data.equals(val)) return true;
        return false;
    }

    public void print() {
        for (Node<T> p = head; p != null; p = p.next)
            System.out.print(p.data + " -> ");
        System.out.println("null");
    }

    public static void main(String[] args) {
        LinkedList<Integer> list = new LinkedList<>();
        list.push(1);
        list.push(2);
        list.push(3);
        list.print();            // 3 -> 2 -> 1 -> null
        System.out.println("pop: " + list.pop()); // pop: 3
        list.print();            // 2 -> 1 -> null
    }
}` },
      rust: { code: `type Link<T> = Option<Box<Node<T>>>;

struct Node<T> {
    data: T,
    next: Link<T>,
}

pub struct LinkedList<T> {
    head: Link<T>,
    len: usize,
}

impl<T> LinkedList<T> {
    pub fn new() -> Self {
        LinkedList { head: None, len: 0 }
    }

    pub fn push(&mut self, data: T) {
        self.head = Some(Box::new(Node {
            data,
            next: self.head.take(),
        }));
        self.len += 1;
    }

    pub fn pop(&mut self) -> Option<T> {
        self.head.take().map(|node| {
            self.head = node.next;
            self.len -= 1;
            node.data
        })
    }

    pub fn len(&self) -> usize { self.len }
}

impl<T: std::fmt::Display> LinkedList<T> {
    pub fn print(&self) {
        let mut cur = &self.head;
        while let Some(node) = cur {
            print!("{} -> ", node.data);
            cur = &node.next;
        }
        println!("None");
    }
}

fn main() {
    let mut list = LinkedList::new();
    list.push(1);
    list.push(2);
    list.push(3);
    list.print();               // 3 -> 2 -> 1 -> None
    println!("pop: {:?}", list.pop()); // pop: Some(3)
    list.print();               // 2 -> 1 -> None
}` },
      go: { code: `package main

import "fmt"

type node[T any] struct {
    data T
    next *node[T]
}

type LinkedList[T any] struct {
    head *node[T]
    len  int
}

func (l *LinkedList[T]) Push(data T) {
    l.head = &node[T]{data: data, next: l.head}
    l.len++
}

func (l *LinkedList[T]) Pop() (T, bool) {
    if l.head == nil {
        var zero T
        return zero, false
    }
    val := l.head.data
    l.head = l.head.next
    l.len--
    return val, true
}

func (l *LinkedList[T]) Print(format func(T) string) {
    for p := l.head; p != nil; p = p.next {
        fmt.Print(format(p.data) + " -> ")
    }
    fmt.Println("nil")
}

func main() {
    list := &LinkedList[int]{}
    list.Push(1)
    list.Push(2)
    list.Push(3)
    list.Print(func(v int) string { return fmt.Sprintf("%d", v) })
    // 3 -> 2 -> 1 -> nil
    if val, ok := list.Pop(); ok {
        fmt.Println("pop:", val) // pop: 3
    }
    list.Print(func(v int) string { return fmt.Sprintf("%d", v) })
    // 2 -> 1 -> nil
}` },
      javascript: { code: `class Node {
  constructor(data) {
    this.data = data;
    this.next = null;
  }
}

class LinkedList {
  constructor() {
    this.head = null;
    this.length = 0;
  }

  push(data) {
    const node = new Node(data);
    node.next = this.head;
    this.head = node;
    this.length++;
  }

  pop() {
    if (!this.head) return undefined;
    const val = this.head.data;
    this.head = this.head.next;
    this.length--;
    return val;
  }

  contains(val) {
    for (let p = this.head; p; p = p.next)
      if (p.data === val) return true;
    return false;
  }

  toArray() {
    const arr = [];
    for (let p = this.head; p; p = p.next) arr.push(p.data);
    return arr;
  }

  toString() {
    return this.toArray().join(' -> ') + ' -> null';
  }
}

const list = new LinkedList();
list.push(1);
list.push(2);
list.push(3);
console.log(list.toString()); // 3 -> 2 -> 1 -> null
console.log('pop:', list.pop()); // pop: 3
console.log(list.toString()); // 2 -> 1 -> null` },
      python: { code: `from __future__ import annotations
from typing import Generic, TypeVar, Optional

T = TypeVar('T')


class Node(Generic[T]):
    def __init__(self, data: T) -> None:
        self.data = data
        self.next: Optional[Node[T]] = None


class LinkedList(Generic[T]):
    def __init__(self) -> None:
        self.head: Optional[Node[T]] = None
        self.length = 0

    def push(self, data: T) -> None:
        node = Node(data)
        node.next = self.head
        self.head = node
        self.length += 1

    def pop(self) -> Optional[T]:
        if not self.head:
            return None
        val = self.head.data
        self.head = self.head.next
        self.length -= 1
        return val

    def __contains__(self, val: T) -> bool:
        p = self.head
        while p:
            if p.data == val:
                return True
            p = p.next
        return False

    def __repr__(self) -> str:
        parts, p = [], self.head
        while p:
            parts.append(str(p.data))
            p = p.next
        return ' -> '.join(parts) + ' -> None'


lst: LinkedList[int] = LinkedList()
lst.push(1)
lst.push(2)
lst.push(3)
print(lst)             # 3 -> 2 -> 1 -> None
print('pop:', lst.pop())  # pop: 3
print(lst)             # 2 -> 1 -> None` },
    },
  },

  // ─── Stack ────────────────────────────────────────────────────────────────────
  {
    id: 'stack',
    name: 'Stack',
    icon: '📚',
    description: 'Last-In-First-Out (LIFO) collection. Think of a stack of plates — you add and remove only from the top.',
    complexity: { time: 'Push/Pop/Peek O(1)', space: 'O(n)' },
    langs: {
      c: { code: `#include <stdio.h>
#include <stdlib.h>
#include <assert.h>

#define MAX_SIZE 256

typedef struct {
    int data[MAX_SIZE];
    int top;
} Stack;

void stack_init(Stack* s) { s->top = -1; }

int  stack_empty(const Stack* s) { return s->top < 0; }

void stack_push(Stack* s, int val) {
    assert(s->top < MAX_SIZE - 1 && "stack overflow");
    s->data[++s->top] = val;
}

int  stack_pop(Stack* s) {
    assert(!stack_empty(s) && "stack underflow");
    return s->data[s->top--];
}

int  stack_peek(const Stack* s) {
    assert(!stack_empty(s) && "stack empty");
    return s->data[s->top];
}

int main() {
    Stack s;
    stack_init(&s);
    stack_push(&s, 10);
    stack_push(&s, 20);
    stack_push(&s, 30);
    printf("peek: %d\\n", stack_peek(&s)); /* 30 */
    printf("pop:  %d\\n", stack_pop(&s));  /* 30 */
    printf("pop:  %d\\n", stack_pop(&s));  /* 20 */
    return 0;
}` },
      cpp: { code: `#include <iostream>
#include <vector>
#include <stdexcept>

template<typename T>
class Stack {
    std::vector<T> data_;
public:
    void push(T val) { data_.push_back(std::move(val)); }

    T pop() {
        if (empty()) throw std::underflow_error("stack underflow");
        T val = std::move(data_.back());
        data_.pop_back();
        return val;
    }

    const T& peek() const {
        if (empty()) throw std::underflow_error("stack empty");
        return data_.back();
    }

    bool empty() const { return data_.empty(); }
    size_t size() const { return data_.size(); }
};

int main() {
    Stack<int> s;
    s.push(10);
    s.push(20);
    s.push(30);
    std::cout << "peek: " << s.peek() << "\\n"; // peek: 30
    std::cout << "pop:  " << s.pop()  << "\\n"; // pop:  30
    std::cout << "pop:  " << s.pop()  << "\\n"; // pop:  20
    std::cout << "size: " << s.size() << "\\n"; // size: 1
}` },
      java: { code: `import java.util.EmptyStackException;

public class Stack<T> {
    private Object[] data;
    private int top = -1;

    @SuppressWarnings("unchecked")
    public Stack(int capacity) {
        data = new Object[capacity];
    }

    public Stack() { this(16); }

    public void push(T val) {
        ensureCapacity();
        data[++top] = val;
    }

    @SuppressWarnings("unchecked")
    public T pop() {
        if (isEmpty()) throw new EmptyStackException();
        T val = (T) data[top];
        data[top--] = null; // help GC
        return val;
    }

    @SuppressWarnings("unchecked")
    public T peek() {
        if (isEmpty()) throw new EmptyStackException();
        return (T) data[top];
    }

    public boolean isEmpty() { return top < 0; }
    public int size() { return top + 1; }

    private void ensureCapacity() {
        if (top + 1 == data.length) {
            Object[] newData = new Object[data.length * 2];
            System.arraycopy(data, 0, newData, 0, data.length);
            data = newData;
        }
    }

    public static void main(String[] args) {
        Stack<Integer> s = new Stack<>();
        s.push(10);
        s.push(20);
        s.push(30);
        System.out.println("peek: " + s.peek()); // peek: 30
        System.out.println("pop:  " + s.pop());  // pop:  30
        System.out.println("pop:  " + s.pop());  // pop:  20
        System.out.println("size: " + s.size()); // size: 1
    }
}` },
      rust: { code: `pub struct Stack<T> {
    data: Vec<T>,
}

impl<T> Stack<T> {
    pub fn new() -> Self {
        Stack { data: Vec::new() }
    }

    pub fn push(&mut self, val: T) {
        self.data.push(val);
    }

    pub fn pop(&mut self) -> Option<T> {
        self.data.pop()
    }

    pub fn peek(&self) -> Option<&T> {
        self.data.last()
    }

    pub fn is_empty(&self) -> bool { self.data.is_empty() }
    pub fn size(&self) -> usize { self.data.len() }
}

fn main() {
    let mut s: Stack<i32> = Stack::new();
    s.push(10);
    s.push(20);
    s.push(30);
    println!("peek: {:?}", s.peek()); // peek: Some(30)
    println!("pop:  {:?}", s.pop());  // pop:  Some(30)
    println!("pop:  {:?}", s.pop());  // pop:  Some(20)
    println!("size: {}",   s.size()); // size: 1
}` },
      go: { code: `package main

import (
    "errors"
    "fmt"
)

type Stack[T any] struct {
    data []T
}

func (s *Stack[T]) Push(val T) {
    s.data = append(s.data, val)
}

func (s *Stack[T]) Pop() (T, error) {
    if s.IsEmpty() {
        var zero T
        return zero, errors.New("stack underflow")
    }
    top := s.data[len(s.data)-1]
    s.data = s.data[:len(s.data)-1]
    return top, nil
}

func (s *Stack[T]) Peek() (T, error) {
    if s.IsEmpty() {
        var zero T
        return zero, errors.New("stack empty")
    }
    return s.data[len(s.data)-1], nil
}

func (s *Stack[T]) IsEmpty() bool { return len(s.data) == 0 }
func (s *Stack[T]) Size() int     { return len(s.data) }

func main() {
    s := &Stack[int]{}
    s.Push(10)
    s.Push(20)
    s.Push(30)
    if v, _ := s.Peek(); true { fmt.Println("peek:", v) } // peek: 30
    if v, _ := s.Pop(); true  { fmt.Println("pop: ", v) } // pop:  30
    if v, _ := s.Pop(); true  { fmt.Println("pop: ", v) } // pop:  20
    fmt.Println("size:", s.Size())                         // size: 1
}` },
      javascript: { code: `class Stack {
  #data = [];

  push(val) {
    this.#data.push(val);
  }

  pop() {
    if (this.isEmpty()) throw new Error('stack underflow');
    return this.#data.pop();
  }

  peek() {
    if (this.isEmpty()) throw new Error('stack empty');
    return this.#data[this.#data.length - 1];
  }

  isEmpty() { return this.#data.length === 0; }
  get size() { return this.#data.length; }
}

const s = new Stack();
s.push(10);
s.push(20);
s.push(30);
console.log('peek:', s.peek()); // peek: 30
console.log('pop: ', s.pop());  // pop:  30
console.log('pop: ', s.pop());  // pop:  20
console.log('size:', s.size);   // size: 1` },
      python: { code: `from typing import Generic, TypeVar, Optional

T = TypeVar('T')


class Stack(Generic[T]):
    def __init__(self) -> None:
        self._data: list[T] = []

    def push(self, val: T) -> None:
        self._data.append(val)

    def pop(self) -> T:
        if not self._data:
            raise IndexError('stack underflow')
        return self._data.pop()

    def peek(self) -> T:
        if not self._data:
            raise IndexError('stack empty')
        return self._data[-1]

    def is_empty(self) -> bool:
        return not self._data

    def __len__(self) -> int:
        return len(self._data)


s: Stack[int] = Stack()
s.push(10)
s.push(20)
s.push(30)
print('peek:', s.peek())  # peek: 30
print('pop: ', s.pop())   # pop:  30
print('pop: ', s.pop())   # pop:  20
print('size:', len(s))    # size: 1` },
    },
  },

  // ─── Queue ────────────────────────────────────────────────────────────────────
  {
    id: 'queue',
    name: 'Queue',
    icon: '🎟️',
    description: 'First-In-First-Out (FIFO) collection. Items enqueue at the back and dequeue from the front, like a line at a ticket counter.',
    complexity: { time: 'Enqueue/Dequeue O(1)', space: 'O(n)' },
    langs: {
      c: { code: `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int data;
    struct Node* next;
} Node;

typedef struct {
    Node* head;
    Node* tail;
    int size;
} Queue;

void queue_init(Queue* q) { q->head = q->tail = NULL; q->size = 0; }

void enqueue(Queue* q, int val) {
    Node* n = (Node*)malloc(sizeof(Node));
    n->data = val;
    n->next = NULL;
    if (q->tail) q->tail->next = n;
    else q->head = n;
    q->tail = n;
    q->size++;
}

int dequeue(Queue* q) {
    Node* tmp = q->head;
    int val = tmp->data;
    q->head = tmp->next;
    if (!q->head) q->tail = NULL;
    free(tmp);
    q->size--;
    return val;
}

int main() {
    Queue q;
    queue_init(&q);
    enqueue(&q, 1);
    enqueue(&q, 2);
    enqueue(&q, 3);
    printf("dequeue: %d\\n", dequeue(&q)); /* 1 */
    printf("dequeue: %d\\n", dequeue(&q)); /* 2 */
    printf("size: %d\\n", q.size);         /* 1 */
    return 0;
}` },
      cpp: { code: `#include <iostream>
#include <deque>
#include <stdexcept>

template<typename T>
class Queue {
    std::deque<T> data_;
public:
    void enqueue(T val) { data_.push_back(std::move(val)); }

    T dequeue() {
        if (empty()) throw std::underflow_error("queue underflow");
        T val = std::move(data_.front());
        data_.pop_front();
        return val;
    }

    const T& front() const {
        if (empty()) throw std::underflow_error("queue empty");
        return data_.front();
    }

    bool   empty() const { return data_.empty(); }
    size_t size()  const { return data_.size(); }
};

int main() {
    Queue<int> q;
    q.enqueue(1);
    q.enqueue(2);
    q.enqueue(3);
    std::cout << "front:   " << q.front()   << "\\n"; // front:   1
    std::cout << "dequeue: " << q.dequeue() << "\\n"; // dequeue: 1
    std::cout << "dequeue: " << q.dequeue() << "\\n"; // dequeue: 2
    std::cout << "size:    " << q.size()    << "\\n"; // size:    1
}` },
      java: { code: `import java.util.NoSuchElementException;

public class Queue<T> {
    private static class Node<T> {
        T data;
        Node<T> next;
        Node(T data) { this.data = data; }
    }

    private Node<T> head, tail;
    private int size;

    public void enqueue(T data) {
        Node<T> node = new Node<>(data);
        if (tail != null) tail.next = node;
        tail = node;
        if (head == null) head = node;
        size++;
    }

    public T dequeue() {
        if (isEmpty()) throw new NoSuchElementException();
        T val = head.data;
        head = head.next;
        if (head == null) tail = null;
        size--;
        return val;
    }

    public T peek() {
        if (isEmpty()) throw new NoSuchElementException();
        return head.data;
    }

    public boolean isEmpty() { return head == null; }
    public int size() { return size; }

    public static void main(String[] args) {
        Queue<Integer> q = new Queue<>();
        q.enqueue(1);
        q.enqueue(2);
        q.enqueue(3);
        System.out.println("peek:    " + q.peek());    // peek:    1
        System.out.println("dequeue: " + q.dequeue()); // dequeue: 1
        System.out.println("dequeue: " + q.dequeue()); // dequeue: 2
        System.out.println("size:    " + q.size());    // size:    1
    }
}` },
      rust: { code: `use std::collections::VecDeque;

pub struct Queue<T> {
    data: VecDeque<T>,
}

impl<T> Queue<T> {
    pub fn new() -> Self {
        Queue { data: VecDeque::new() }
    }

    pub fn enqueue(&mut self, val: T) {
        self.data.push_back(val);
    }

    pub fn dequeue(&mut self) -> Option<T> {
        self.data.pop_front()
    }

    pub fn peek(&self) -> Option<&T> {
        self.data.front()
    }

    pub fn is_empty(&self) -> bool { self.data.is_empty() }
    pub fn len(&self) -> usize { self.data.len() }
}

fn main() {
    let mut q: Queue<i32> = Queue::new();
    q.enqueue(1);
    q.enqueue(2);
    q.enqueue(3);
    println!("peek:    {:?}", q.peek());    // peek:    Some(1)
    println!("dequeue: {:?}", q.dequeue()); // dequeue: Some(1)
    println!("dequeue: {:?}", q.dequeue()); // dequeue: Some(2)
    println!("len:     {}",   q.len());     // len:     1
}` },
      go: { code: `package main

import (
    "errors"
    "fmt"
)

type Queue[T any] struct {
    data []T
    head int
}

func (q *Queue[T]) Enqueue(val T) {
    q.data = append(q.data, val)
}

func (q *Queue[T]) Dequeue() (T, error) {
    if q.IsEmpty() {
        var zero T
        return zero, errors.New("queue underflow")
    }
    val := q.data[q.head]
    q.head++
    // compact when half the slice is wasted
    if q.head > len(q.data)/2 {
        q.data = q.data[q.head:]
        q.head = 0
    }
    return val, nil
}

func (q *Queue[T]) Peek() (T, error) {
    if q.IsEmpty() {
        var zero T
        return zero, errors.New("queue empty")
    }
    return q.data[q.head], nil
}

func (q *Queue[T]) IsEmpty() bool { return q.head >= len(q.data) }
func (q *Queue[T]) Size() int     { return len(q.data) - q.head }

func main() {
    q := &Queue[int]{}
    q.Enqueue(1)
    q.Enqueue(2)
    q.Enqueue(3)
    if v, _ := q.Peek(); true    { fmt.Println("peek:   ", v) } // peek:    1
    if v, _ := q.Dequeue(); true { fmt.Println("dequeue:", v) } // dequeue: 1
    if v, _ := q.Dequeue(); true { fmt.Println("dequeue:", v) } // dequeue: 2
    fmt.Println("size:", q.Size())                               // size:    1
}` },
      javascript: { code: `class Queue {
  #data = [];
  #head = 0;

  enqueue(val) {
    this.#data.push(val);
  }

  dequeue() {
    if (this.isEmpty()) throw new Error('queue underflow');
    const val = this.#data[this.#head++];
    // compact when half the array is wasted
    if (this.#head > this.#data.length / 2) {
      this.#data = this.#data.slice(this.#head);
      this.#head = 0;
    }
    return val;
  }

  peek() {
    if (this.isEmpty()) throw new Error('queue empty');
    return this.#data[this.#head];
  }

  isEmpty() { return this.#head >= this.#data.length; }
  get size() { return this.#data.length - this.#head; }
}

const q = new Queue();
q.enqueue(1);
q.enqueue(2);
q.enqueue(3);
console.log('peek:   ', q.peek());    // peek:    1
console.log('dequeue:', q.dequeue()); // dequeue: 1
console.log('dequeue:', q.dequeue()); // dequeue: 2
console.log('size:   ', q.size);      // size:    1` },
      python: { code: `from collections import deque
from typing import Generic, TypeVar, Optional

T = TypeVar('T')


class Queue(Generic[T]):
    def __init__(self) -> None:
        self._data: deque[T] = deque()

    def enqueue(self, val: T) -> None:
        self._data.append(val)

    def dequeue(self) -> T:
        if not self._data:
            raise IndexError('queue underflow')
        return self._data.popleft()

    def peek(self) -> T:
        if not self._data:
            raise IndexError('queue empty')
        return self._data[0]

    def is_empty(self) -> bool:
        return not self._data

    def __len__(self) -> int:
        return len(self._data)


q: Queue[int] = Queue()
q.enqueue(1)
q.enqueue(2)
q.enqueue(3)
print('peek:   ', q.peek())     # peek:    1
print('dequeue:', q.dequeue())  # dequeue: 1
print('dequeue:', q.dequeue())  # dequeue: 2
print('size:   ', len(q))       # size:    1` },
    },
  },

  // ─── Binary Search Tree ───────────────────────────────────────────────────────
  {
    id: 'bst',
    name: 'Binary Search Tree',
    icon: '🌳',
    description: 'A BST keeps nodes sorted: left subtree < node < right subtree. Enables fast insert, search and in-order traversal.',
    complexity: { time: 'Insert/Search O(log n) avg · O(n) worst', space: 'O(n)' },
    langs: {
      c: { code: `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int key;
    struct Node *left, *right;
} Node;

Node* newNode(int key) {
    Node* n = (Node*)malloc(sizeof(Node));
    n->key = key;
    n->left = n->right = NULL;
    return n;
}

Node* insert(Node* root, int key) {
    if (!root) return newNode(key);
    if (key < root->key)      root->left  = insert(root->left,  key);
    else if (key > root->key) root->right = insert(root->right, key);
    return root;
}

int search(Node* root, int key) {
    if (!root) return 0;
    if (key == root->key) return 1;
    return key < root->key ? search(root->left, key)
                           : search(root->right, key);
}

void inorder(Node* root) {
    if (!root) return;
    inorder(root->left);
    printf("%d ", root->key);
    inorder(root->right);
}

int main() {
    Node* root = NULL;
    int keys[] = {5, 3, 7, 1, 4, 6, 8};
    for (int i = 0; i < 7; i++)
        root = insert(root, keys[i]);
    inorder(root);              /* 1 3 4 5 6 7 8 */
    printf("\\n");
    printf("search 4: %d\\n", search(root, 4)); /* 1 */
    printf("search 9: %d\\n", search(root, 9)); /* 0 */
    return 0;
}` },
      cpp: { code: `#include <iostream>
#include <optional>

template<typename T>
class BST {
    struct Node {
        T key;
        Node *left = nullptr, *right = nullptr;
        explicit Node(T k) : key(std::move(k)) {}
    };
    Node* root_ = nullptr;

    Node* insert_(Node* n, T key) {
        if (!n) return new Node(std::move(key));
        if (key < n->key)      n->left  = insert_(n->left,  std::move(key));
        else if (key > n->key) n->right = insert_(n->right, std::move(key));
        return n;
    }
    bool search_(Node* n, const T& key) const {
        if (!n) return false;
        if (key == n->key) return true;
        return key < n->key ? search_(n->left, key) : search_(n->right, key);
    }
    void inorder_(Node* n) const {
        if (!n) return;
        inorder_(n->left);
        std::cout << n->key << " ";
        inorder_(n->right);
    }
public:
    void insert(T key) { root_ = insert_(root_, std::move(key)); }
    bool search(const T& key) const { return search_(root_, key); }
    void inorder() const { inorder_(root_); std::cout << "\\n"; }
};

int main() {
    BST<int> tree;
    for (int k : {5, 3, 7, 1, 4, 6, 8}) tree.insert(k);
    tree.inorder();                              // 1 3 4 5 6 7 8
    std::cout << tree.search(4) << "\\n";        // 1
    std::cout << tree.search(9) << "\\n";        // 0
}` },
      java: { code: `public class BST<T extends Comparable<T>> {
    private class Node {
        T key;
        Node left, right;
        Node(T key) { this.key = key; }
    }

    private Node root;

    public void insert(T key) {
        root = insert(root, key);
    }

    private Node insert(Node node, T key) {
        if (node == null) return new Node(key);
        int cmp = key.compareTo(node.key);
        if      (cmp < 0) node.left  = insert(node.left,  key);
        else if (cmp > 0) node.right = insert(node.right, key);
        return node;
    }

    public boolean search(T key) {
        return search(root, key);
    }

    private boolean search(Node node, T key) {
        if (node == null) return false;
        int cmp = key.compareTo(node.key);
        if (cmp == 0) return true;
        return cmp < 0 ? search(node.left, key) : search(node.right, key);
    }

    public void inorder() {
        inorder(root);
        System.out.println();
    }

    private void inorder(Node node) {
        if (node == null) return;
        inorder(node.left);
        System.out.print(node.key + " ");
        inorder(node.right);
    }

    public static void main(String[] args) {
        BST<Integer> tree = new BST<>();
        for (int k : new int[]{5, 3, 7, 1, 4, 6, 8}) tree.insert(k);
        tree.inorder();                          // 1 3 4 5 6 7 8
        System.out.println(tree.search(4));      // true
        System.out.println(tree.search(9));      // false
    }
}` },
      rust: { code: `pub enum BST<T: Ord> {
    Empty,
    Node { key: T, left: Box<BST<T>>, right: Box<BST<T>> },
}

impl<T: Ord> BST<T> {
    pub fn new() -> Self { BST::Empty }

    pub fn insert(self, val: T) -> Self {
        match self {
            BST::Empty => BST::Node {
                key: val,
                left: Box::new(BST::Empty),
                right: Box::new(BST::Empty),
            },
            BST::Node { key, left, right } => {
                if val < key {
                    BST::Node { key, left: Box::new(left.insert(val)), right }
                } else if val > key {
                    BST::Node { key, left, right: Box::new(right.insert(val)) }
                } else {
                    BST::Node { key, left, right }
                }
            }
        }
    }

    pub fn contains(&self, val: &T) -> bool {
        match self {
            BST::Empty => false,
            BST::Node { key, left, right } => {
                if val == key { true }
                else if val < key { left.contains(val) }
                else { right.contains(val) }
            }
        }
    }
}

impl<T: Ord + std::fmt::Display> BST<T> {
    pub fn inorder(&self) {
        if let BST::Node { key, left, right } = self {
            left.inorder();
            print!("{} ", key);
            right.inorder();
        }
    }
}

fn main() {
    let tree = [5, 3, 7, 1, 4, 6, 8]
        .into_iter()
        .fold(BST::new(), |t, k| t.insert(k));
    tree.inorder();                   // 1 3 4 5 6 7 8
    println!();
    println!("{}", tree.contains(&4)); // true
    println!("{}", tree.contains(&9)); // false
}` },
      go: { code: `package main

import "fmt"

type node struct {
    key         int
    left, right *node
}

type BST struct{ root *node }

func (t *BST) Insert(key int) {
    t.root = insert(t.root, key)
}

func insert(n *node, key int) *node {
    if n == nil { return &node{key: key} }
    switch {
    case key < n.key: n.left  = insert(n.left,  key)
    case key > n.key: n.right = insert(n.right, key)
    }
    return n
}

func (t *BST) Search(key int) bool {
    return search(t.root, key)
}

func search(n *node, key int) bool {
    if n == nil     { return false }
    if key == n.key { return true }
    if key < n.key  { return search(n.left,  key) }
    return search(n.right, key)
}

func (t *BST) Inorder() {
    inorder(t.root)
    fmt.Println()
}

func inorder(n *node) {
    if n == nil { return }
    inorder(n.left)
    fmt.Printf("%d ", n.key)
    inorder(n.right)
}

func main() {
    t := &BST{}
    for _, k := range []int{5, 3, 7, 1, 4, 6, 8} {
        t.Insert(k)
    }
    t.Inorder()                          // 1 3 4 5 6 7 8
    fmt.Println(t.Search(4))             // true
    fmt.Println(t.Search(9))             // false
}` },
      javascript: { code: `class BST {
  #root = null;

  insert(key) {
    this.#root = this.#insert(this.#root, key);
  }

  #insert(node, key) {
    if (!node) return { key, left: null, right: null };
    if      (key < node.key) node.left  = this.#insert(node.left,  key);
    else if (key > node.key) node.right = this.#insert(node.right, key);
    return node;
  }

  search(key) {
    return this.#search(this.#root, key);
  }

  #search(node, key) {
    if (!node) return false;
    if (key === node.key) return true;
    return key < node.key
      ? this.#search(node.left,  key)
      : this.#search(node.right, key);
  }

  inorder() {
    const result = [];
    const walk = (n) => {
      if (!n) return;
      walk(n.left);
      result.push(n.key);
      walk(n.right);
    };
    walk(this.#root);
    return result;
  }
}

const tree = new BST();
[5, 3, 7, 1, 4, 6, 8].forEach(k => tree.insert(k));
console.log(tree.inorder().join(' ')); // 1 3 4 5 6 7 8
console.log(tree.search(4));           // true
console.log(tree.search(9));           // false` },
      python: { code: `from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, Generic, TypeVar

T = TypeVar('T')


@dataclass
class Node(Generic[T]):
    key: T
    left:  Optional[Node[T]] = field(default=None, repr=False)
    right: Optional[Node[T]] = field(default=None, repr=False)


class BST(Generic[T]):
    def __init__(self) -> None:
        self._root: Optional[Node[T]] = None

    def insert(self, key: T) -> None:
        self._root = self._insert(self._root, key)

    def _insert(self, node: Optional[Node[T]], key: T) -> Node[T]:
        if node is None:
            return Node(key)
        if key < node.key:    # type: ignore[operator]
            node.left  = self._insert(node.left,  key)
        elif key > node.key:  # type: ignore[operator]
            node.right = self._insert(node.right, key)
        return node

    def search(self, key: T) -> bool:
        node = self._root
        while node:
            if key == node.key:   return True
            elif key < node.key:  node = node.left   # type: ignore
            else:                 node = node.right
        return False

    def inorder(self) -> list[T]:
        result: list[T] = []
        def walk(n: Optional[Node[T]]) -> None:
            if n is None: return
            walk(n.left); result.append(n.key); walk(n.right)
        walk(self._root)
        return result


tree: BST[int] = BST()
for k in [5, 3, 7, 1, 4, 6, 8]:
    tree.insert(k)
print(tree.inorder())      # [1, 3, 4, 5, 6, 7, 8]
print(tree.search(4))      # True
print(tree.search(9))      # False` },
    },
  },

  // ─── Hash Table ───────────────────────────────────────────────────────────────
  {
    id: 'hashtable',
    name: 'Hash Table',
    icon: '#️⃣',
    description: 'Maps keys to values using a hash function. Separate chaining resolves collisions with linked lists at each bucket.',
    complexity: { time: 'Get/Set O(1) avg · O(n) worst', space: 'O(n)' },
    langs: {
      c: { code: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define BUCKETS 16

typedef struct Entry {
    char* key;
    int   value;
    struct Entry* next;
} Entry;

typedef struct {
    Entry* buckets[BUCKETS];
} HashMap;

unsigned hash(const char* key) {
    unsigned h = 5381;
    while (*key) h = h * 33 ^ (unsigned char)*key++;
    return h % BUCKETS;
}

void hm_set(HashMap* m, const char* key, int val) {
    unsigned idx = hash(key);
    for (Entry* e = m->buckets[idx]; e; e = e->next)
        if (!strcmp(e->key, key)) { e->value = val; return; }
    Entry* e = (Entry*)malloc(sizeof(Entry));
    e->key   = strdup(key);
    e->value = val;
    e->next  = m->buckets[idx];
    m->buckets[idx] = e;
}

int hm_get(HashMap* m, const char* key, int* out) {
    for (Entry* e = m->buckets[hash(key)]; e; e = e->next)
        if (!strcmp(e->key, key)) { *out = e->value; return 1; }
    return 0;
}

int main() {
    HashMap m = {0};
    hm_set(&m, "alpha", 1);
    hm_set(&m, "beta",  2);
    hm_set(&m, "gamma", 3);
    int v;
    if (hm_get(&m, "beta",  &v)) printf("beta:  %d\\n", v); /* 2 */
    if (hm_get(&m, "delta", &v)) printf("delta: %d\\n", v);
    else printf("delta: not found\\n");
    return 0;
}` },
      cpp: { code: `#include <iostream>
#include <vector>
#include <list>
#include <stdexcept>
#include <functional>
#include <string>

template<typename K, typename V>
class HashMap {
    static constexpr size_t BUCKETS = 16;
    using Pair = std::pair<K, V>;
    std::vector<std::list<Pair>> buckets_;
    size_t size_ = 0;

    size_t idx(const K& key) const {
        return std::hash<K>{}(key) % BUCKETS;
    }
public:
    HashMap() : buckets_(BUCKETS) {}

    void set(const K& key, V val) {
        auto& bucket = buckets_[idx(key)];
        for (auto& [k, v] : bucket)
            if (k == key) { v = std::move(val); return; }
        bucket.emplace_back(key, std::move(val));
        size_++;
    }

    V* get(const K& key) {
        for (auto& [k, v] : buckets_[idx(key)])
            if (k == key) return &v;
        return nullptr;
    }

    bool erase(const K& key) {
        auto& bucket = buckets_[idx(key)];
        for (auto it = bucket.begin(); it != bucket.end(); ++it)
            if (it->first == key) { bucket.erase(it); size_--; return true; }
        return false;
    }

    size_t size() const { return size_; }
};

int main() {
    HashMap<std::string, int> m;
    m.set("alpha", 1);
    m.set("beta",  2);
    m.set("gamma", 3);
    if (auto* v = m.get("beta"))  std::cout << "beta:  " << *v << "\\n"; // 2
    if (auto* v = m.get("delta")) std::cout << "delta: " << *v << "\\n";
    else                          std::cout << "delta: not found\\n";
    std::cout << "size: " << m.size() << "\\n"; // size: 3
}` },
      java: { code: `public class HashMap<K, V> {
    private static final int DEFAULT_CAPACITY = 16;
    private static final float LOAD_FACTOR = 0.75f;

    @SuppressWarnings("unchecked")
    private Entry<K, V>[] buckets = new Entry[DEFAULT_CAPACITY];
    private int size;

    private static class Entry<K, V> {
        final K key;
        V value;
        Entry<K, V> next;
        Entry(K key, V value) { this.key = key; this.value = value; }
    }

    private int idx(K key) {
        return Math.abs(key.hashCode()) % buckets.length;
    }

    public void put(K key, V value) {
        int i = idx(key);
        for (Entry<K,V> e = buckets[i]; e != null; e = e.next)
            if (e.key.equals(key)) { e.value = value; return; }
        Entry<K,V> entry = new Entry<>(key, value);
        entry.next = buckets[i];
        buckets[i] = entry;
        size++;
    }

    public V get(K key) {
        for (Entry<K,V> e = buckets[idx(key)]; e != null; e = e.next)
            if (e.key.equals(key)) return e.value;
        return null;
    }

    public boolean containsKey(K key) { return get(key) != null; }
    public int size() { return size; }

    public static void main(String[] args) {
        HashMap<String, Integer> m = new HashMap<>();
        m.put("alpha", 1);
        m.put("beta",  2);
        m.put("gamma", 3);
        System.out.println("beta:  " + m.get("beta"));  // beta:  2
        System.out.println("delta: " + m.get("delta")); // delta: null
        System.out.println("size:  " + m.size());       // size:  3
    }
}` },
      rust: { code: `use std::collections::LinkedList;

const BUCKETS: usize = 16;

pub struct HashMap<K, V> {
    buckets: Vec<LinkedList<(K, V)>>,
    size: usize,
}

impl<K: Eq + std::hash::Hash, V> HashMap<K, V> {
    pub fn new() -> Self {
        HashMap {
            buckets: (0..BUCKETS).map(|_| LinkedList::new()).collect(),
            size: 0,
        }
    }

    fn idx(&self, key: &K) -> usize {
        use std::hash::{Hash, Hasher};
        let mut h = std::collections::hash_map::DefaultHasher::new();
        key.hash(&mut h);
        (h.finish() as usize) % BUCKETS
    }

    pub fn insert(&mut self, key: K, value: V) {
        let i = self.idx(&key);
        for (k, v) in self.buckets[i].iter_mut() {
            if k == &key { *v = value; return; }
        }
        self.buckets[i].push_front((key, value));
        self.size += 1;
    }

    pub fn get(&self, key: &K) -> Option<&V> {
        let i = self.idx(key);
        self.buckets[i].iter().find(|(k, _)| k == key).map(|(_, v)| v)
    }

    pub fn len(&self) -> usize { self.size }
}

fn main() {
    let mut m: HashMap<&str, i32> = HashMap::new();
    m.insert("alpha", 1);
    m.insert("beta",  2);
    m.insert("gamma", 3);
    println!("beta:  {:?}", m.get(&"beta"));  // beta:  Some(2)
    println!("delta: {:?}", m.get(&"delta")); // delta: None
    println!("len:   {}",   m.len());         // len:   3
}` },
      go: { code: `package main

import (
    "fmt"
    "hash/fnv"
)

const numBuckets = 16

type entry struct {
    key   string
    value int
    next  *entry
}

type HashMap struct {
    buckets [numBuckets]*entry
    size    int
}

func (m *HashMap) idx(key string) int {
    h := fnv.New32a()
    h.Write([]byte(key))
    return int(h.Sum32()) % numBuckets
}

func (m *HashMap) Set(key string, val int) {
    i := m.idx(key)
    for e := m.buckets[i]; e != nil; e = e.next {
        if e.key == key { e.value = val; return }
    }
    m.buckets[i] = &entry{key: key, value: val, next: m.buckets[i]}
    m.size++
}

func (m *HashMap) Get(key string) (int, bool) {
    for e := m.buckets[m.idx(key)]; e != nil; e = e.next {
        if e.key == key { return e.value, true }
    }
    return 0, false
}

func main() {
    m := &HashMap{}
    m.Set("alpha", 1)
    m.Set("beta",  2)
    m.Set("gamma", 3)
    if v, ok := m.Get("beta");  ok { fmt.Println("beta: ", v) } // beta:  2
    if _, ok := m.Get("delta"); !ok { fmt.Println("delta: not found") }
    fmt.Println("size:", m.size) // size: 3
}` },
      javascript: { code: `class HashMap {
  #buckets;
  #size = 0;
  static #CAPACITY = 16;

  constructor() {
    this.#buckets = Array.from({ length: HashMap.#CAPACITY }, () => []);
  }

  #hash(key) {
    let h = 5381;
    for (const c of String(key)) h = ((h << 5) + h) ^ c.charCodeAt(0);
    return Math.abs(h) % HashMap.#CAPACITY;
  }

  set(key, value) {
    const bucket = this.#buckets[this.#hash(key)];
    const entry = bucket.find(e => e[0] === key);
    if (entry) { entry[1] = value; return; }
    bucket.push([key, value]);
    this.#size++;
  }

  get(key) {
    const entry = this.#buckets[this.#hash(key)].find(e => e[0] === key);
    return entry ? entry[1] : undefined;
  }

  has(key) { return this.get(key) !== undefined; }
  delete(key) {
    const bucket = this.#buckets[this.#hash(key)];
    const idx = bucket.findIndex(e => e[0] === key);
    if (idx === -1) return false;
    bucket.splice(idx, 1);
    this.#size--;
    return true;
  }
  get size() { return this.#size; }
}

const m = new HashMap();
m.set('alpha', 1);
m.set('beta',  2);
m.set('gamma', 3);
console.log('beta: ',  m.get('beta'));  // beta:  2
console.log('delta:',  m.get('delta')); // delta: undefined
console.log('size:',   m.size);         // size:  3` },
      python: { code: `from __future__ import annotations
from typing import Generic, TypeVar, Optional

K = TypeVar('K')
V = TypeVar('V')

_BUCKETS = 16


class HashMap(Generic[K, V]):
    def __init__(self) -> None:
        self._table: list[list[tuple[K, V]]] = [[] for _ in range(_BUCKETS)]
        self._size = 0

    def _idx(self, key: K) -> int:
        return hash(key) % _BUCKETS

    def __setitem__(self, key: K, value: V) -> None:
        bucket = self._table[self._idx(key)]
        for i, (k, _) in enumerate(bucket):
            if k == key:
                bucket[i] = (key, value)
                return
        bucket.append((key, value))
        self._size += 1

    def __getitem__(self, key: K) -> V:
        for k, v in self._table[self._idx(key)]:
            if k == key:
                return v
        raise KeyError(key)

    def get(self, key: K, default: Optional[V] = None) -> Optional[V]:
        try:
            return self[key]
        except KeyError:
            return default

    def __contains__(self, key: object) -> bool:
        return any(k == key for k, _ in self._table[self._idx(key)])  # type: ignore

    def __len__(self) -> int:
        return self._size


m: HashMap[str, int] = HashMap()
m['alpha'] = 1
m['beta']  = 2
m['gamma'] = 3
print('beta: ', m['beta'])         # beta:  2
print('delta:', m.get('delta'))    # delta: None
print('size: ', len(m))            # size:  3` },
    },
  },

  // ─── Min Heap ─────────────────────────────────────────────────────────────────
  {
    id: 'heap',
    name: 'Min Heap',
    icon: '⛰️',
    description: 'A complete binary tree where every parent ≤ its children. The minimum element is always at the root. Used for priority queues.',
    complexity: { time: 'Push O(log n) · Pop O(log n) · Peek O(1)', space: 'O(n)' },
    langs: {
      c: { code: `#include <stdio.h>

#define MAX 64

typedef struct {
    int data[MAX];
    int size;
} MinHeap;

void heap_init(MinHeap* h) { h->size = 0; }

void heap_push(MinHeap* h, int val) {
    int i = h->size++;
    h->data[i] = val;
    while (i > 0) {
        int p = (i - 1) / 2;
        if (h->data[p] <= h->data[i]) break;
        int tmp = h->data[p]; h->data[p] = h->data[i]; h->data[i] = tmp;
        i = p;
    }
}

int heap_pop(MinHeap* h) {
    int min = h->data[0];
    h->data[0] = h->data[--h->size];
    int i = 0;
    for (;;) {
        int l = 2*i+1, r = 2*i+2, s = i;
        if (l < h->size && h->data[l] < h->data[s]) s = l;
        if (r < h->size && h->data[r] < h->data[s]) s = r;
        if (s == i) break;
        int tmp = h->data[i]; h->data[i] = h->data[s]; h->data[s] = tmp;
        i = s;
    }
    return min;
}

int main() {
    MinHeap h;
    heap_init(&h);
    int vals[] = {5, 2, 8, 1, 9, 3};
    for (int i = 0; i < 6; i++) heap_push(&h, vals[i]);
    while (h.size > 0)
        printf("%d ", heap_pop(&h)); /* 1 2 3 5 8 9 */
    printf("\\n");
    return 0;
}` },
      cpp: { code: `#include <iostream>
#include <vector>
#include <algorithm>
#include <functional>

template<typename T, typename Cmp = std::less<T>>
class Heap {
    std::vector<T> data_;
    Cmp cmp_;

    void siftUp(size_t i) {
        while (i > 0) {
            size_t p = (i - 1) / 2;
            if (!cmp_(data_[i], data_[p])) break;
            std::swap(data_[i], data_[p]);
            i = p;
        }
    }
    void siftDown(size_t i) {
        size_t n = data_.size();
        for (;;) {
            size_t l = 2*i+1, r = 2*i+2, s = i;
            if (l < n && cmp_(data_[l], data_[s])) s = l;
            if (r < n && cmp_(data_[r], data_[s])) s = r;
            if (s == i) break;
            std::swap(data_[i], data_[s]);
            i = s;
        }
    }
public:
    void push(T val) { data_.push_back(std::move(val)); siftUp(data_.size() - 1); }

    T pop() {
        T top = std::move(data_[0]);
        data_[0] = std::move(data_.back());
        data_.pop_back();
        if (!data_.empty()) siftDown(0);
        return top;
    }

    const T& top() const { return data_[0]; }
    bool   empty()  const { return data_.empty(); }
    size_t size()   const { return data_.size(); }
};

int main() {
    Heap<int> h; // min-heap
    for (int v : {5, 2, 8, 1, 9, 3}) h.push(v);
    while (!h.empty()) std::cout << h.pop() << " "; // 1 2 3 5 8 9
    std::cout << "\\n";
}` },
      java: { code: `public class MinHeap {
    private int[] data;
    private int size;

    public MinHeap(int capacity) {
        data = new int[capacity];
    }

    public void push(int val) {
        data[size] = val;
        siftUp(size++);
    }

    public int pop() {
        int min = data[0];
        data[0] = data[--size];
        siftDown(0);
        return min;
    }

    public int peek() { return data[0]; }
    public boolean isEmpty() { return size == 0; }
    public int size() { return size; }

    private void siftUp(int i) {
        while (i > 0) {
            int p = (i - 1) / 2;
            if (data[p] <= data[i]) break;
            swap(i, p);
            i = p;
        }
    }

    private void siftDown(int i) {
        while (true) {
            int l = 2*i+1, r = 2*i+2, s = i;
            if (l < size && data[l] < data[s]) s = l;
            if (r < size && data[r] < data[s]) s = r;
            if (s == i) break;
            swap(i, s);
            i = s;
        }
    }

    private void swap(int a, int b) {
        int t = data[a]; data[a] = data[b]; data[b] = t;
    }

    public static void main(String[] args) {
        MinHeap h = new MinHeap(64);
        for (int v : new int[]{5, 2, 8, 1, 9, 3}) h.push(v);
        while (!h.isEmpty()) System.out.print(h.pop() + " "); // 1 2 3 5 8 9
        System.out.println();
    }
}` },
      rust: { code: `pub struct MinHeap<T: Ord> {
    data: Vec<T>,
}

impl<T: Ord> MinHeap<T> {
    pub fn new() -> Self { MinHeap { data: Vec::new() } }

    pub fn push(&mut self, val: T) {
        self.data.push(val);
        let mut i = self.data.len() - 1;
        while i > 0 {
            let p = (i - 1) / 2;
            if self.data[p] <= self.data[i] { break; }
            self.data.swap(i, p);
            i = p;
        }
    }

    pub fn pop(&mut self) -> Option<T> {
        if self.data.is_empty() { return None; }
        let n = self.data.len() - 1;
        self.data.swap(0, n);
        let min = self.data.pop();
        self.sift_down(0);
        min
    }

    pub fn peek(&self) -> Option<&T> { self.data.first() }

    fn sift_down(&mut self, mut i: usize) {
        let n = self.data.len();
        loop {
            let (l, r) = (2*i+1, 2*i+2);
            let mut s = i;
            if l < n && self.data[l] < self.data[s] { s = l; }
            if r < n && self.data[r] < self.data[s] { s = r; }
            if s == i { break; }
            self.data.swap(i, s);
            i = s;
        }
    }

    pub fn len(&self) -> usize { self.data.len() }
    pub fn is_empty(&self) -> bool { self.data.is_empty() }
}

fn main() {
    let mut h = MinHeap::new();
    for v in [5, 2, 8, 1, 9, 3] { h.push(v); }
    let mut out = Vec::new();
    while let Some(v) = h.pop() { out.push(v.to_string()); }
    println!("{}", out.join(" ")); // 1 2 3 5 8 9
}` },
      go: { code: `package main

import "fmt"

type MinHeap struct{ data []int }

func (h *MinHeap) Push(val int) {
    h.data = append(h.data, val)
    i := len(h.data) - 1
    for i > 0 {
        p := (i - 1) / 2
        if h.data[p] <= h.data[i] { break }
        h.data[p], h.data[i] = h.data[i], h.data[p]
        i = p
    }
}

func (h *MinHeap) Pop() int {
    n := len(h.data) - 1
    min := h.data[0]
    h.data[0] = h.data[n]
    h.data = h.data[:n]
    h.siftDown(0)
    return min
}

func (h *MinHeap) siftDown(i int) {
    n := len(h.data)
    for {
        l, r, s := 2*i+1, 2*i+2, i
        if l < n && h.data[l] < h.data[s] { s = l }
        if r < n && h.data[r] < h.data[s] { s = r }
        if s == i { break }
        h.data[i], h.data[s] = h.data[s], h.data[i]
        i = s
    }
}

func (h *MinHeap) Peek() int    { return h.data[0] }
func (h *MinHeap) Len() int     { return len(h.data) }
func (h *MinHeap) Empty() bool  { return len(h.data) == 0 }

func main() {
    h := &MinHeap{}
    for _, v := range []int{5, 2, 8, 1, 9, 3} { h.Push(v) }
    for !h.Empty() { fmt.Printf("%d ", h.Pop()) } // 1 2 3 5 8 9
    fmt.Println()
}` },
      javascript: { code: `class MinHeap {
  #data = [];

  push(val) {
    this.#data.push(val);
    this.#siftUp(this.#data.length - 1);
  }

  pop() {
    if (this.isEmpty()) return undefined;
    const min = this.#data[0];
    const last = this.#data.pop();
    if (this.#data.length > 0) {
      this.#data[0] = last;
      this.#siftDown(0);
    }
    return min;
  }

  peek() { return this.#data[0]; }
  isEmpty() { return this.#data.length === 0; }
  get size() { return this.#data.length; }

  #siftUp(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.#data[p] <= this.#data[i]) break;
      [this.#data[p], this.#data[i]] = [this.#data[i], this.#data[p]];
      i = p;
    }
  }

  #siftDown(i) {
    const n = this.#data.length;
    for (;;) {
      let s = i, l = 2*i+1, r = 2*i+2;
      if (l < n && this.#data[l] < this.#data[s]) s = l;
      if (r < n && this.#data[r] < this.#data[s]) s = r;
      if (s === i) break;
      [this.#data[s], this.#data[i]] = [this.#data[i], this.#data[s]];
      i = s;
    }
  }
}

const h = new MinHeap();
[5, 2, 8, 1, 9, 3].forEach(v => h.push(v));
const out = [];
while (!h.isEmpty()) out.push(h.pop());
console.log(out.join(' ')); // 1 2 3 5 8 9` },
      python: { code: `import heapq
from typing import Generic, TypeVar, Optional

T = TypeVar('T')


class MinHeap(Generic[T]):
    """Thin wrapper around heapq for a typed min-heap."""

    def __init__(self) -> None:
        self._data: list[T] = []

    def push(self, val: T) -> None:
        heapq.heappush(self._data, val)  # type: ignore[misc]

    def pop(self) -> T:
        if not self._data:
            raise IndexError('heap underflow')
        return heapq.heappop(self._data)  # type: ignore[misc]

    def peek(self) -> T:
        if not self._data:
            raise IndexError('heap empty')
        return self._data[0]

    def is_empty(self) -> bool:
        return not self._data

    def __len__(self) -> int:
        return len(self._data)


h: MinHeap[int] = MinHeap()
for v in [5, 2, 8, 1, 9, 3]:
    h.push(v)

out: list[int] = []
while not h.is_empty():
    out.append(h.pop())
print(out)  # [1, 2, 3, 5, 8, 9]` },
    },
  },

  // ─── Graph BFS ────────────────────────────────────────────────────────────────
  {
    id: 'graph',
    name: 'Graph (BFS)',
    icon: '🕸️',
    description: 'Adjacency-list graph with Breadth-First Search. BFS explores all neighbors level by level and finds shortest paths in unweighted graphs.',
    complexity: { time: 'BFS O(V + E)', space: 'O(V + E)' },
    langs: {
      c: { code: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_V 8
#define MAX_E 32

typedef struct {
    int adj[MAX_V][MAX_V];
    int deg[MAX_V];
    int n;
} Graph;

void graph_init(Graph* g, int n) {
    g->n = n;
    memset(g->adj, 0, sizeof(g->adj));
    memset(g->deg, 0, sizeof(g->deg));
}

void add_edge(Graph* g, int u, int v) {
    g->adj[u][g->deg[u]++] = v;
    g->adj[v][g->deg[v]++] = u;
}

void bfs(Graph* g, int start) {
    int visited[MAX_V] = {0};
    int queue[MAX_V], head = 0, tail = 0;
    queue[tail++] = start;
    visited[start] = 1;
    while (head < tail) {
        int u = queue[head++];
        printf("%d ", u);
        for (int i = 0; i < g->deg[u]; i++) {
            int v = g->adj[u][i];
            if (!visited[v]) {
                visited[v] = 1;
                queue[tail++] = v;
            }
        }
    }
    printf("\\n");
}

int main() {
    Graph g;
    graph_init(&g, 6);
    add_edge(&g, 0, 1); add_edge(&g, 0, 2);
    add_edge(&g, 1, 3); add_edge(&g, 1, 4);
    add_edge(&g, 2, 5);
    bfs(&g, 0); /* 0 1 2 3 4 5 */
    return 0;
}` },
      cpp: { code: `#include <iostream>
#include <vector>
#include <queue>

class Graph {
    int n_;
    std::vector<std::vector<int>> adj_;
public:
    explicit Graph(int n) : n_(n), adj_(n) {}

    void addEdge(int u, int v) {
        adj_[u].push_back(v);
        adj_[v].push_back(u);
    }

    std::vector<int> bfs(int start) const {
        std::vector<bool> visited(n_, false);
        std::vector<int> order;
        std::queue<int> q;
        q.push(start);
        visited[start] = true;
        while (!q.empty()) {
            int u = q.front(); q.pop();
            order.push_back(u);
            for (int v : adj_[u])
                if (!visited[v]) { visited[v] = true; q.push(v); }
        }
        return order;
    }

    // Shortest hops from start (-1 = unreachable)
    std::vector<int> shortestPath(int start) const {
        std::vector<int> dist(n_, -1);
        std::queue<int> q;
        dist[start] = 0;
        q.push(start);
        while (!q.empty()) {
            int u = q.front(); q.pop();
            for (int v : adj_[u])
                if (dist[v] == -1) { dist[v] = dist[u] + 1; q.push(v); }
        }
        return dist;
    }
};

int main() {
    Graph g(6);
    g.addEdge(0, 1); g.addEdge(0, 2);
    g.addEdge(1, 3); g.addEdge(1, 4);
    g.addEdge(2, 5);
    for (int v : g.bfs(0)) std::cout << v << " "; // 0 1 2 3 4 5
    std::cout << "\\n";
    auto dist = g.shortestPath(0);
    for (int i = 0; i < 6; i++)
        std::cout << "dist[" << i << "]=" << dist[i] << " "; // 0 1 1 2 2 2
    std::cout << "\\n";
}` },
      java: { code: `import java.util.*;

public class Graph {
    private final int n;
    private final List<List<Integer>> adj;

    public Graph(int n) {
        this.n = n;
        adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
    }

    public void addEdge(int u, int v) {
        adj.get(u).add(v);
        adj.get(v).add(u);
    }

    public List<Integer> bfs(int start) {
        boolean[] visited = new boolean[n];
        List<Integer> order = new ArrayList<>();
        Queue<Integer> q = new ArrayDeque<>();
        q.offer(start);
        visited[start] = true;
        while (!q.isEmpty()) {
            int u = q.poll();
            order.add(u);
            for (int v : adj.get(u))
                if (!visited[v]) { visited[v] = true; q.offer(v); }
        }
        return order;
    }

    public int[] shortestPath(int start) {
        int[] dist = new int[n];
        Arrays.fill(dist, -1);
        Queue<Integer> q = new ArrayDeque<>();
        dist[start] = 0;
        q.offer(start);
        while (!q.isEmpty()) {
            int u = q.poll();
            for (int v : adj.get(u))
                if (dist[v] == -1) { dist[v] = dist[u] + 1; q.offer(v); }
        }
        return dist;
    }

    public static void main(String[] args) {
        Graph g = new Graph(6);
        g.addEdge(0, 1); g.addEdge(0, 2);
        g.addEdge(1, 3); g.addEdge(1, 4);
        g.addEdge(2, 5);
        System.out.println(g.bfs(0));              // [0, 1, 2, 3, 4, 5]
        System.out.println(Arrays.toString(g.shortestPath(0))); // [0,1,1,2,2,2]
    }
}` },
      rust: { code: `use std::collections::VecDeque;

pub struct Graph {
    adj: Vec<Vec<usize>>,
}

impl Graph {
    pub fn new(n: usize) -> Self {
        Graph { adj: vec![vec![]; n] }
    }

    pub fn add_edge(&mut self, u: usize, v: usize) {
        self.adj[u].push(v);
        self.adj[v].push(u);
    }

    pub fn bfs(&self, start: usize) -> Vec<usize> {
        let n = self.adj.len();
        let mut visited = vec![false; n];
        let mut order   = Vec::new();
        let mut queue   = VecDeque::new();
        queue.push_back(start);
        visited[start] = true;
        while let Some(u) = queue.pop_front() {
            order.push(u);
            for &v in &self.adj[u] {
                if !visited[v] {
                    visited[v] = true;
                    queue.push_back(v);
                }
            }
        }
        order
    }

    pub fn shortest_path(&self, start: usize) -> Vec<i64> {
        let n = self.adj.len();
        let mut dist = vec![-1i64; n];
        let mut queue = VecDeque::new();
        dist[start] = 0;
        queue.push_back(start);
        while let Some(u) = queue.pop_front() {
            for &v in &self.adj[u] {
                if dist[v] == -1 {
                    dist[v] = dist[u] + 1;
                    queue.push_back(v);
                }
            }
        }
        dist
    }
}

fn main() {
    let mut g = Graph::new(6);
    g.add_edge(0, 1); g.add_edge(0, 2);
    g.add_edge(1, 3); g.add_edge(1, 4);
    g.add_edge(2, 5);
    println!("{:?}", g.bfs(0));           // [0, 1, 2, 3, 4, 5]
    println!("{:?}", g.shortest_path(0)); // [0, 1, 1, 2, 2, 2]
}` },
      go: { code: `package main

import "fmt"

type Graph struct {
    adj [][]int
}

func NewGraph(n int) *Graph {
    adj := make([][]int, n)
    for i := range adj { adj[i] = []int{} }
    return &Graph{adj: adj}
}

func (g *Graph) AddEdge(u, v int) {
    g.adj[u] = append(g.adj[u], v)
    g.adj[v] = append(g.adj[v], u)
}

func (g *Graph) BFS(start int) []int {
    n := len(g.adj)
    visited := make([]bool, n)
    order   := []int{}
    queue   := []int{start}
    visited[start] = true
    for len(queue) > 0 {
        u := queue[0]; queue = queue[1:]
        order = append(order, u)
        for _, v := range g.adj[u] {
            if !visited[v] {
                visited[v] = true
                queue = append(queue, v)
            }
        }
    }
    return order
}

func (g *Graph) ShortestPath(start int) []int {
    n    := len(g.adj)
    dist := make([]int, n)
    for i := range dist { dist[i] = -1 }
    dist[start] = 0
    queue := []int{start}
    for len(queue) > 0 {
        u := queue[0]; queue = queue[1:]
        for _, v := range g.adj[u] {
            if dist[v] == -1 {
                dist[v] = dist[u] + 1
                queue = append(queue, v)
            }
        }
    }
    return dist
}

func main() {
    g := NewGraph(6)
    g.AddEdge(0, 1); g.AddEdge(0, 2)
    g.AddEdge(1, 3); g.AddEdge(1, 4)
    g.AddEdge(2, 5)
    fmt.Println(g.BFS(0))           // [0 1 2 3 4 5]
    fmt.Println(g.ShortestPath(0))  // [0 1 1 2 2 2]
}` },
      javascript: { code: `class Graph {
  #adj;
  constructor(n) {
    this.#adj = Array.from({ length: n }, () => []);
  }

  addEdge(u, v) {
    this.#adj[u].push(v);
    this.#adj[v].push(u);
  }

  bfs(start) {
    const visited = new Array(this.#adj.length).fill(false);
    const order = [];
    const queue = [start];
    visited[start] = true;
    while (queue.length > 0) {
      const u = queue.shift();
      order.push(u);
      for (const v of this.#adj[u]) {
        if (!visited[v]) {
          visited[v] = true;
          queue.push(v);
        }
      }
    }
    return order;
  }

  shortestPath(start) {
    const dist = new Array(this.#adj.length).fill(-1);
    dist[start] = 0;
    const queue = [start];
    while (queue.length > 0) {
      const u = queue.shift();
      for (const v of this.#adj[u]) {
        if (dist[v] === -1) {
          dist[v] = dist[u] + 1;
          queue.push(v);
        }
      }
    }
    return dist;
  }
}

const g = new Graph(6);
g.addEdge(0, 1); g.addEdge(0, 2);
g.addEdge(1, 3); g.addEdge(1, 4);
g.addEdge(2, 5);
console.log(g.bfs(0));          // [0, 1, 2, 3, 4, 5]
console.log(g.shortestPath(0)); // [0, 1, 1, 2, 2, 2]` },
      python: { code: `from collections import deque


class Graph:
    def __init__(self, n: int) -> None:
        self.adj: list[list[int]] = [[] for _ in range(n)]

    def add_edge(self, u: int, v: int) -> None:
        self.adj[u].append(v)
        self.adj[v].append(u)

    def bfs(self, start: int) -> list[int]:
        visited = [False] * len(self.adj)
        order: list[int] = []
        queue: deque[int] = deque([start])
        visited[start] = True
        while queue:
            u = queue.popleft()
            order.append(u)
            for v in self.adj[u]:
                if not visited[v]:
                    visited[v] = True
                    queue.append(v)
        return order

    def shortest_path(self, start: int) -> list[int]:
        dist = [-1] * len(self.adj)
        dist[start] = 0
        queue: deque[int] = deque([start])
        while queue:
            u = queue.popleft()
            for v in self.adj[u]:
                if dist[v] == -1:
                    dist[v] = dist[u] + 1
                    queue.append(v)
        return dist


g = Graph(6)
g.add_edge(0, 1); g.add_edge(0, 2)
g.add_edge(1, 3); g.add_edge(1, 4)
g.add_edge(2, 5)
print(g.bfs(0))            # [0, 1, 2, 3, 4, 5]
print(g.shortest_path(0))  # [0, 1, 1, 2, 2, 2]` },
    },
  },
  // ─── AVL Tree ─────────────────────────────────────────────────────────────────
  {
    id: 'avl',
    name: 'AVL Tree',
    icon: '⚖️',
    description: 'Self-balancing BST. Every node maintains a balance factor (left height - right height) in {-1,0,1}. Rotations restore balance after insert/delete: O(log n) guaranteed for all operations.',
    complexity: { time: 'Insert/Delete/Search O(log n)', space: 'O(n)' },
    langs: {
      c: { code: `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int key, height;
    struct Node *left, *right;
} Node;

int height(Node *n) { return n ? n->height : 0; }
int max2(int a, int b) { return a > b ? a : b; }
int bf(Node *n) { return n ? height(n->left) - height(n->right) : 0; }

Node *newNode(int key) {
    Node *n = calloc(1, sizeof(Node));
    n->key = key; n->height = 1;
    return n;
}

void updH(Node *n) {
    if (n) n->height = 1 + max2(height(n->left), height(n->right));
}

Node *rotR(Node *y) {   /* right rotation */
    Node *x = y->left, *T2 = x->right;
    x->right = y; y->left = T2;
    updH(y); updH(x);
    return x;
}

Node *rotL(Node *x) {   /* left rotation */
    Node *y = x->right, *T2 = y->left;
    y->left = x; x->right = T2;
    updH(x); updH(y);
    return y;
}

Node *insert(Node *n, int key) {
    if (!n) return newNode(key);
    if (key < n->key)      n->left  = insert(n->left,  key);
    else if (key > n->key) n->right = insert(n->right, key);
    else return n;  /* duplicate */
    updH(n);
    int b = bf(n);
    if (b > 1  && key < n->left->key)  return rotR(n);       /* LL */
    if (b < -1 && key > n->right->key) return rotL(n);       /* RR */
    if (b > 1  && key > n->left->key)  { n->left  = rotL(n->left);  return rotR(n); } /* LR */
    if (b < -1 && key < n->right->key) { n->right = rotR(n->right); return rotL(n); } /* RL */
    return n;
}

void inorder(Node *n) {
    if (!n) return;
    inorder(n->left);
    printf("%d(h%d) ", n->key, n->height);
    inorder(n->right);
}

int main(void) {
    Node *root = NULL;
    int keys[] = {10, 20, 30, 40, 50, 25};
    for (int i = 0; i < 6; i++) root = insert(root, keys[i]);
    inorder(root);   /* balanced: 10 20 25 30 40 50 */
    printf("\\nroot=%d height=%d\\n", root->key, root->height);
    return 0;
}` },
      cpp: { code: `#include <iostream>
#include <algorithm>
using namespace std;

struct Node {
    int key, height;
    Node *l = nullptr, *r = nullptr;
    Node(int k) : key(k), height(1) {}
};

int h(Node *n) { return n ? n->height : 0; }
void upd(Node *n) { if(n) n->height = 1 + max(h(n->l), h(n->r)); }
int bf(Node *n)   { return n ? h(n->l) - h(n->r) : 0; }

Node *rotR(Node *y) { Node *x=y->l; y->l=x->r; x->r=y; upd(y); upd(x); return x; }
Node *rotL(Node *x) { Node *y=x->r; x->r=y->l; y->l=x; upd(x); upd(y); return y; }

Node *balance(Node *n) {
    upd(n); int b = bf(n);
    if (b > 1)  { if (bf(n->l) < 0) n->l = rotL(n->l); return rotR(n); }
    if (b < -1) { if (bf(n->r) > 0) n->r = rotR(n->r); return rotL(n); }
    return n;
}

Node *insert(Node *n, int key) {
    if (!n) return new Node(key);
    if (key < n->key) n->l = insert(n->l, key);
    else if (key > n->key) n->r = insert(n->r, key);
    return balance(n);
}

void inorder(Node *n) {
    if (!n) return;
    inorder(n->l);
    cout << n->key << "(h" << n->height << ") ";
    inorder(n->r);
}

int main() {
    Node *root = nullptr;
    for (int k : {10,20,30,40,50,25}) root = insert(root, k);
    inorder(root);  // 10 20 25 30 40 50
    cout << "\\nroot=" << root->key << " h=" << root->height << endl;
}` },
      java: { code: `public class AVLTree {
    static class Node {
        int key, height = 1;
        Node left, right;
        Node(int k) { key = k; }
    }

    static int h(Node n) { return n == null ? 0 : n.height; }
    static void upd(Node n) { if (n != null) n.height = 1 + Math.max(h(n.left), h(n.right)); }
    static int bf(Node n)   { return n == null ? 0 : h(n.left) - h(n.right); }

    static Node rotR(Node y) { Node x=y.left; y.left=x.right; x.right=y; upd(y); upd(x); return x; }
    static Node rotL(Node x) { Node y=x.right; x.right=y.left; y.left=x; upd(x); upd(y); return y; }

    static Node insert(Node n, int key) {
        if (n == null) return new Node(key);
        if      (key < n.key) n.left  = insert(n.left,  key);
        else if (key > n.key) n.right = insert(n.right, key);
        else return n;
        upd(n);
        int b = bf(n);
        if (b > 1)  { if (bf(n.left)  < 0) n.left  = rotL(n.left);  return rotR(n); }
        if (b < -1) { if (bf(n.right) > 0) n.right = rotR(n.right); return rotL(n); }
        return n;
    }

    static void inorder(Node n) {
        if (n == null) return;
        inorder(n.left);
        System.out.print(n.key + "(h" + n.height + ") ");
        inorder(n.right);
    }

    public static void main(String[] args) {
        Node root = null;
        for (int k : new int[]{10,20,30,40,50,25}) root = insert(root, k);
        inorder(root);  // 10 20 25 30 40 50
        System.out.println("\\nroot=" + root.key + " h=" + root.height);
    }
}` },
      rust: { code: `type Link = Option<Box<Node>>;

#[derive(Default)]
struct Node { key: i32, height: i32, left: Link, right: Link }

fn h(n: &Link) -> i32 { n.as_ref().map_or(0, |n| n.height) }
fn bf(n: &Node) -> i32 { h(&n.left) - h(&n.right) }
fn upd(n: &mut Node)   { n.height = 1 + h(&n.left).max(h(&n.right)); }

fn rot_r(mut y: Box<Node>) -> Box<Node> {
    let mut x = y.left.take().unwrap();
    y.left = x.right.take(); upd(&mut y);
    x.right = Some(y); upd(&mut x); x
}
fn rot_l(mut x: Box<Node>) -> Box<Node> {
    let mut y = x.right.take().unwrap();
    x.right = y.left.take(); upd(&mut x);
    y.left = Some(x); upd(&mut y); y
}

fn balance(mut n: Box<Node>) -> Box<Node> {
    upd(&mut n);
    let b = bf(&n);
    if b > 1 {
        if bf(n.left.as_ref().unwrap()) < 0 { n.left = Some(rot_l(n.left.take().unwrap())); }
        return rot_r(n);
    }
    if b < -1 {
        if bf(n.right.as_ref().unwrap()) > 0 { n.right = Some(rot_r(n.right.take().unwrap())); }
        return rot_l(n);
    }
    n
}

fn insert(node: Link, key: i32) -> Link {
    let mut n = node.unwrap_or_else(|| Box::new(Node { key, height: 1, ..Default::default() }));
    if key < n.key      { n.left  = insert(n.left.take(),  key); }
    else if key > n.key { n.right = insert(n.right.take(), key); }
    Some(balance(n))
}

fn inorder(n: &Link) {
    if let Some(n) = n { inorder(&n.left); print!("{}(h{}) ", n.key, n.height); inorder(&n.right); }
}

fn main() {
    let mut root: Link = None;
    for k in [10,20,30,40,50,25] { root = insert(root, k); }
    inorder(&root);  // 10(h1) 20(h2) 25(h1) 30(h3) 40(h2) 50(h1)
}` },
      go: { code: `package main
import "fmt"

type Node struct{ key, h int; l, r *Node }

func ht(n *Node) int { if n == nil { return 0 }; return n.h }
func bf(n *Node) int { return ht(n.l) - ht(n.r) }
func upd(n *Node)    { if n != nil { n.h = 1 + max(ht(n.l), ht(n.r)) } }
func max(a, b int) int { if a > b { return a }; return b }

func rotR(y *Node) *Node { x := y.l; y.l = x.r; x.r = y; upd(y); upd(x); return x }
func rotL(x *Node) *Node { y := x.r; x.r = y.l; y.l = x; upd(x); upd(y); return y }

func insert(n *Node, key int) *Node {
    if n == nil { return &Node{key: key, h: 1} }
    if key < n.key { n.l = insert(n.l, key) } else if key > n.key { n.r = insert(n.r, key) } else { return n }
    upd(n)
    if b := bf(n); b > 1 {
        if bf(n.l) < 0 { n.l = rotL(n.l) }
        return rotR(n)
    } else if b < -1 {
        if bf(n.r) > 0 { n.r = rotR(n.r) }
        return rotL(n)
    }
    return n
}

func inorder(n *Node) {
    if n == nil { return }
    inorder(n.l); fmt.Printf("%d(h%d) ", n.key, n.h); inorder(n.r)
}

func main() {
    var root *Node
    for _, k := range []int{10,20,30,40,50,25} { root = insert(root, k) }
    inorder(root)  // 10 20 25 30 40 50
    fmt.Printf("\\nroot=%d h=%d\\n", root.key, root.h)
}` },
      javascript: { code: `class AVLNode {
  constructor(key) { this.key = key; this.h = 1; this.l = this.r = null; }
}

const h  = n => n ? n.h : 0;
const bf = n => n ? h(n.l) - h(n.r) : 0;
const upd = n => { if(n) n.h = 1 + Math.max(h(n.l), h(n.r)); };

function rotR(y) { let x=y.l; y.l=x.r; x.r=y; upd(y); upd(x); return x; }
function rotL(x) { let y=x.r; x.r=y.l; y.l=x; upd(x); upd(y); return y; }

function insert(n, key) {
  if (!n) return new AVLNode(key);
  if      (key < n.key) n.l = insert(n.l, key);
  else if (key > n.key) n.r = insert(n.r, key);
  else return n;
  upd(n);
  const b = bf(n);
  if (b > 1)  { if (bf(n.l) < 0) n.l = rotL(n.l); return rotR(n); }
  if (b < -1) { if (bf(n.r) > 0) n.r = rotR(n.r); return rotL(n); }
  return n;
}

function inorder(n, res=[]) { if(n){ inorder(n.l,res); res.push(n.key); inorder(n.r,res); } return res; }

let root = null;
for (const k of [10,20,30,40,50,25]) root = insert(root, k);
console.log(inorder(root));  // [10,20,25,30,40,50]
console.log("root=" + root.key + " h=" + root.h);` },
      python: { code: `class Node:
    def __init__(self, key):
        self.key = key; self.h = 1
        self.l = self.r = None

def h(n):   return n.h if n else 0
def bf(n):  return h(n.l) - h(n.r) if n else 0
def upd(n):
    if n: n.h = 1 + max(h(n.l), h(n.r))

def rot_r(y):
    x = y.l; y.l = x.r; x.r = y; upd(y); upd(x); return x
def rot_l(x):
    y = x.r; x.r = y.l; y.l = x; upd(x); upd(y); return y

def insert(n, key):
    if not n: return Node(key)
    if   key < n.key: n.l = insert(n.l, key)
    elif key > n.key: n.r = insert(n.r, key)
    else: return n
    upd(n)
    b = bf(n)
    if b > 1:
        if bf(n.l) < 0: n.l = rot_l(n.l)
        return rot_r(n)
    if b < -1:
        if bf(n.r) > 0: n.r = rot_r(n.r)
        return rot_l(n)
    return n

def inorder(n, res=[]):
    if n: inorder(n.l, res); res.append(n.key); inorder(n.r, res)
    return res

root = None
for k in [10,20,30,40,50,25]: root = insert(root, k)
print(inorder(root, []))  # [10, 20, 25, 30, 40, 50]
print(f"root={root.key} h={root.h}")` },
    },
  },
  // ─── Trie ─────────────────────────────────────────────────────────────────────
  {
    id: 'trie',
    name: 'Trie (Prefix Tree)',
    icon: '🌲',
    description: 'A tree where each node represents a character. Root-to-leaf paths spell words. insert/search/startsWith all run in O(L) where L is the word length. Used in autocomplete, spell-check, IP routing (LPM).',
    complexity: { time: 'Insert/Search O(L) · L=word length', space: 'O(ALPHABET × N)' },
    langs: {
      c: { code: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

#define ALPHA 26

typedef struct Trie {
    struct Trie *children[ALPHA];
    bool is_end;
} Trie;

Trie *newTrie(void) { return calloc(1, sizeof(Trie)); }

void insert(Trie *root, const char *word) {
    Trie *cur = root;
    for (; *word; word++) {
        int idx = *word - 'a';
        if (!cur->children[idx]) cur->children[idx] = newTrie();
        cur = cur->children[idx];
    }
    cur->is_end = true;
}

bool search(Trie *root, const char *word) {
    Trie *cur = root;
    for (; *word; word++) {
        int idx = *word - 'a';
        if (!cur->children[idx]) return false;
        cur = cur->children[idx];
    }
    return cur->is_end;
}

bool startsWith(Trie *root, const char *prefix) {
    Trie *cur = root;
    for (; *prefix; prefix++) {
        int idx = *prefix - 'a';
        if (!cur->children[idx]) return false;
        cur = cur->children[idx];
    }
    return true;
}

/* Print all words with given prefix (autocomplete) */
void autocomplete(Trie *n, char *buf, int depth) {
    if (n->is_end) { buf[depth] = '\\0'; printf("  %s\\n", buf); }
    for (int i = 0; i < ALPHA; i++) {
        if (n->children[i]) {
            buf[depth] = 'a' + i;
            autocomplete(n->children[i], buf, depth + 1);
        }
    }
}

int main(void) {
    Trie *root = newTrie();
    const char *words[] = {"apple","app","apply","apt","bat","ball","band"};
    for (int i = 0; i < 7; i++) insert(root, words[i]);

    printf("search('app'): %s\\n",   search(root, "app")   ? "true" : "false");  /* true */
    printf("search('ap'):  %s\\n",   search(root, "ap")    ? "true" : "false");  /* false */
    printf("startsWith('ap'): %s\\n",startsWith(root,"ap") ? "true" : "false");  /* true */

    printf("Autocomplete 'ap':\\n");
    Trie *cur = root;
    char buf[100]; const char *pf = "ap";
    strncpy(buf, pf, strlen(pf));
    for (; *pf; pf++) cur = cur->children[*pf - 'a'];
    autocomplete(cur, buf, strlen(buf));  /* app, apple, apply, apt */
    return 0;
}` },
      cpp: { code: `#include <iostream>
#include <string>
#include <array>
#include <memory>
using namespace std;

struct Trie {
    array<unique_ptr<Trie>, 26> ch{};
    bool end = false;
    void insert(const string &w) {
        Trie *cur = this;
        for (char c : w) {
            int i = c - 'a';
            if (!cur->ch[i]) cur->ch[i] = make_unique<Trie>();
            cur = cur->ch[i].get();
        }
        cur->end = true;
    }
    bool search(const string &w) const {
        const Trie *cur = this;
        for (char c : w) {
            int i = c - 'a';
            if (!cur->ch[i]) return false;
            cur = cur->ch[i].get();
        }
        return cur->end;
    }
    bool startsWith(const string &p) const {
        const Trie *cur = this;
        for (char c : p) {
            int i = c - 'a';
            if (!cur->ch[i]) return false;
            cur = cur->ch[i].get();
        }
        return true;
    }
};

int main() {
    Trie t;
    for (auto &w : {"apple","app","apply","bat","ball"}) t.insert(w);
    cout << t.search("app")     << "\\n";  // 1
    cout << t.search("ap")      << "\\n";  // 0
    cout << t.startsWith("app") << "\\n";  // 1
}` },
      java: { code: `import java.util.HashMap;

public class Trie {
    private final HashMap<Character, Trie> children = new HashMap<>();
    private boolean isEnd = false;

    public void insert(String word) {
        Trie cur = this;
        for (char c : word.toCharArray()) {
            cur.children.putIfAbsent(c, new Trie());
            cur = cur.children.get(c);
        }
        cur.isEnd = true;
    }

    public boolean search(String word) {
        Trie cur = this;
        for (char c : word.toCharArray()) {
            if (!cur.children.containsKey(c)) return false;
            cur = cur.children.get(c);
        }
        return cur.isEnd;
    }

    public boolean startsWith(String prefix) {
        Trie cur = this;
        for (char c : prefix.toCharArray()) {
            if (!cur.children.containsKey(c)) return false;
            cur = cur.children.get(c);
        }
        return true;
    }

    public static void main(String[] args) {
        Trie t = new Trie();
        for (String w : new String[]{"apple","app","apply","bat","ball"}) t.insert(w);
        System.out.println(t.search("app"));      // true
        System.out.println(t.search("ap"));       // false
        System.out.println(t.startsWith("app"));  // true
    }
}` },
      rust: { code: `use std::collections::HashMap;

#[derive(Default)]
struct Trie { children: HashMap<char, Trie>, is_end: bool }

impl Trie {
    fn insert(&mut self, word: &str) {
        let mut cur = self;
        for c in word.chars() { cur = cur.children.entry(c).or_default(); }
        cur.is_end = true;
    }
    fn search(&self, word: &str) -> bool {
        let mut cur = self;
        for c in word.chars() { cur = cur.children.get(&c)?; }
        Some(cur.is_end).unwrap_or(false)
    }
    fn starts_with(&self, prefix: &str) -> bool {
        let mut cur = self;
        for c in prefix.chars() { cur = if let Some(n) = cur.children.get(&c) { n } else { return false }; }
        true
    }
}

fn main() {
    let mut t = Trie::default();
    for w in ["apple","app","apply","bat","ball"] { t.insert(w); }
    println!("{}", t.search("app"));      // true
    println!("{}", t.search("ap"));       // false
    println!("{}", t.starts_with("app")); // true
}` },
      go: { code: `package main
import "fmt"

type Trie struct {
    children map[rune]*Trie
    isEnd    bool
}
func newTrie() *Trie { return &Trie{children: make(map[rune]*Trie)} }

func (t *Trie) Insert(word string) {
    cur := t
    for _, c := range word {
        if cur.children[c] == nil { cur.children[c] = newTrie() }
        cur = cur.children[c]
    }
    cur.isEnd = true
}
func (t *Trie) Search(word string) bool {
    cur := t
    for _, c := range word {
        if cur.children[c] == nil { return false }
        cur = cur.children[c]
    }
    return cur.isEnd
}
func (t *Trie) StartsWith(prefix string) bool {
    cur := t
    for _, c := range prefix {
        if cur.children[c] == nil { return false }
        cur = cur.children[c]
    }
    return true
}
func main() {
    t := newTrie()
    for _, w := range []string{"apple","app","apply","bat"} { t.Insert(w) }
    fmt.Println(t.Search("app"))      // true
    fmt.Println(t.Search("ap"))       // false
    fmt.Println(t.StartsWith("app"))  // true
}` },
      javascript: { code: `class TrieNode {
  constructor() { this.children = {}; this.isEnd = false; }
}

class Trie {
  constructor() { this.root = new TrieNode(); }

  insert(word) {
    let cur = this.root;
    for (const c of word) {
      if (!cur.children[c]) cur.children[c] = new TrieNode();
      cur = cur.children[c];
    }
    cur.isEnd = true;
  }

  search(word) {
    let cur = this.root;
    for (const c of word) {
      if (!cur.children[c]) return false;
      cur = cur.children[c];
    }
    return cur.isEnd;
  }

  startsWith(prefix) {
    let cur = this.root;
    for (const c of prefix) {
      if (!cur.children[c]) return false;
      cur = cur.children[c];
    }
    return true;
  }

  // Autocomplete: return all words with given prefix
  autocomplete(prefix) {
    let cur = this.root;
    for (const c of prefix) {
      if (!cur.children[c]) return [];
      cur = cur.children[c];
    }
    const results = [];
    const dfs = (node, path) => {
      if (node.isEnd) results.push(prefix + path);
      for (const [c, child] of Object.entries(node.children)) dfs(child, path + c);
    };
    dfs(cur, '');
    return results;
  }
}

const t = new Trie();
['apple','app','apply','apt','bat','ball'].forEach(w => t.insert(w));
console.log(t.search('app'));          // true
console.log(t.search('ap'));           // false
console.log(t.startsWith('ap'));       // true
console.log(t.autocomplete('ap'));     // ['app','apple','apply','apt']` },
      python: { code: `class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        cur = self.root
        for c in word:
            if c not in cur.children:
                cur.children[c] = TrieNode()
            cur = cur.children[c]
        cur.is_end = True

    def search(self, word: str) -> bool:
        cur = self.root
        for c in word:
            if c not in cur.children: return False
            cur = cur.children[c]
        return cur.is_end

    def starts_with(self, prefix: str) -> bool:
        cur = self.root
        for c in prefix:
            if c not in cur.children: return False
            cur = cur.children[c]
        return True

    def autocomplete(self, prefix: str) -> list:
        cur = self.root
        for c in prefix:
            if c not in cur.children: return []
            cur = cur.children[c]
        res = []
        def dfs(node, path):
            if node.is_end: res.append(prefix + path)
            for c, child in node.children.items(): dfs(child, path + c)
        dfs(cur, '')
        return res

t = Trie()
for w in ['apple','app','apply','apt','bat','ball']: t.insert(w)
print(t.search('app'))          # True
print(t.search('ap'))           # False
print(t.starts_with('ap'))      # True
print(t.autocomplete('ap'))     # ['app', 'apple', 'apply', 'apt']` },
    },
  },
  // ─── Skip List ────────────────────────────────────────────────────────────────
  {
    id: 'skiplist',
    name: 'Skip List',
    icon: '🎯',
    description: 'Probabilistic multi-level linked list. Each element is promoted to higher levels with probability p=0.5. Redis Sorted Set (ZSET) uses skip list internally. Expected O(log n) search/insert/delete without rotations.',
    complexity: { time: 'Search/Insert/Delete O(log n) expected', space: 'O(n log n) expected' },
    langs: {
      c: { code: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#define MAX_LEVEL 8
#define P 0.5

typedef struct SLNode {
    int key;
    struct SLNode *forward[MAX_LEVEL]; /* forward[i] = next node at level i */
} SLNode;

typedef struct { SLNode *header; int level; } SkipList;

SLNode *newNode(int key, int lvl) {
    SLNode *n = calloc(1, sizeof(SLNode));
    n->key = key;
    return n;
}

int randLevel(void) {
    int lvl = 1;
    while ((double)rand()/RAND_MAX < P && lvl < MAX_LEVEL) lvl++;
    return lvl;
}

SkipList *slCreate(void) {
    SkipList *sl = malloc(sizeof(SkipList));
    sl->header = newNode(INT_MIN, MAX_LEVEL);
    sl->level = 1;
    srand(time(NULL));
    return sl;
}

void slInsert(SkipList *sl, int key) {
    SLNode *update[MAX_LEVEL];
    SLNode *cur = sl->header;
    for (int i = sl->level - 1; i >= 0; i--) {
        while (cur->forward[i] && cur->forward[i]->key < key)
            cur = cur->forward[i];
        update[i] = cur;
    }
    int lvl = randLevel();
    if (lvl > sl->level) {
        for (int i = sl->level; i < lvl; i++) update[i] = sl->header;
        sl->level = lvl;
    }
    SLNode *n = newNode(key, lvl);
    for (int i = 0; i < lvl; i++) {
        n->forward[i] = update[i]->forward[i];
        update[i]->forward[i] = n;
    }
}

int slSearch(SkipList *sl, int key) {
    SLNode *cur = sl->header;
    for (int i = sl->level - 1; i >= 0; i--)
        while (cur->forward[i] && cur->forward[i]->key < key)
            cur = cur->forward[i];
    cur = cur->forward[0];
    return cur && cur->key == key;
}

void slPrint(SkipList *sl) {
    for (int i = sl->level - 1; i >= 0; i--) {
        SLNode *n = sl->header->forward[i];
        printf("L%d: ", i);
        while (n) { printf("%d -> ", n->key); n = n->forward[i]; }
        printf("NULL\\n");
    }
}

int main(void) {
    SkipList *sl = slCreate();
    for (int k : (int[]){3,6,7,9,12,19,17,26}) slInsert(sl, k);
    slPrint(sl);
    printf("search(9): %d\\n", slSearch(sl, 9));   /* 1 */
    printf("search(5): %d\\n", slSearch(sl, 5));   /* 0 */
    return 0;
}` },
      cpp: { code: `#include <iostream>
#include <vector>
#include <cstdlib>
#include <ctime>
#include <climits>
using namespace std;

struct SLNode {
    int key;
    vector<SLNode*> fwd;
    SLNode(int k, int lvl) : key(k), fwd(lvl, nullptr) {}
};

class SkipList {
    int maxLvl, level;
    float p;
    SLNode *header;
    int randLevel() {
        int lvl = 1;
        while ((float)rand()/RAND_MAX < p && lvl < maxLvl) lvl++;
        return lvl;
    }
public:
    SkipList(int ml=8, float p=0.5) : maxLvl(ml), level(1), p(p) {
        header = new SLNode(INT_MIN, ml); srand(time(0));
    }
    void insert(int key) {
        vector<SLNode*> upd(maxLvl, header);
        SLNode *cur = header;
        for (int i = level-1; i >= 0; i--)
            while (cur->fwd[i] && cur->fwd[i]->key < key) cur = cur->fwd[i], upd[i] = cur;
        int lvl = randLevel();
        if (lvl > level) { level = lvl; }
        SLNode *n = new SLNode(key, lvl);
        for (int i = 0; i < lvl; i++) { n->fwd[i] = upd[i]->fwd[i]; upd[i]->fwd[i] = n; }
    }
    bool search(int key) {
        SLNode *cur = header;
        for (int i = level-1; i >= 0; i--)
            while (cur->fwd[i] && cur->fwd[i]->key < key) cur = cur->fwd[i];
        cur = cur->fwd[0];
        return cur && cur->key == key;
    }
    void print() {
        for (int i = level-1; i >= 0; i--) {
            SLNode *n = header->fwd[i];
            cout << "L" << i << ": ";
            while (n) { cout << n->key << " -> "; n = n->fwd[i]; }
            cout << "NULL\\n";
        }
    }
};

int main() {
    SkipList sl;
    for (int k : {3,6,7,9,12,19,17,26}) sl.insert(k);
    sl.print();
    cout << "search(9): " << sl.search(9) << "\\n";  // 1
    cout << "search(5): " << sl.search(5) << "\\n";  // 0
}` },
      java: { code: `import java.util.Random;

public class SkipList {
    static final int MAX_LEVEL = 8;
    static final double P = 0.5;

    static class Node {
        int key;
        Node[] fwd;
        Node(int key, int level) { this.key = key; fwd = new Node[level]; }
    }

    Node header = new Node(Integer.MIN_VALUE, MAX_LEVEL);
    int level = 1;
    Random rand = new Random();

    int randLevel() {
        int lvl = 1;
        while (rand.nextDouble() < P && lvl < MAX_LEVEL) lvl++;
        return lvl;
    }

    void insert(int key) {
        Node[] update = new Node[MAX_LEVEL];
        Node cur = header;
        for (int i = level-1; i >= 0; i--) {
            while (cur.fwd[i] != null && cur.fwd[i].key < key) cur = cur.fwd[i];
            update[i] = cur;
        }
        int lvl = randLevel();
        if (lvl > level) { for (int i = level; i < lvl; i++) update[i] = header; level = lvl; }
        Node n = new Node(key, lvl);
        for (int i = 0; i < lvl; i++) { n.fwd[i] = update[i].fwd[i]; update[i].fwd[i] = n; }
    }

    boolean search(int key) {
        Node cur = header;
        for (int i = level-1; i >= 0; i--)
            while (cur.fwd[i] != null && cur.fwd[i].key < key) cur = cur.fwd[i];
        cur = cur.fwd[0];
        return cur != null && cur.key == key;
    }

    public static void main(String[] args) {
        SkipList sl = new SkipList();
        for (int k : new int[]{3,6,7,9,12,19,17,26}) sl.insert(k);
        System.out.println(sl.search(9));  // true
        System.out.println(sl.search(5));  // false
    }
}` },
      rust: { code: `use rand::Rng;
const MAX: usize = 8;

struct Node { key: i32, fwd: Vec<*mut Node> }
impl Node {
    fn new(key: i32, lvl: usize) -> *mut Self {
        Box::into_raw(Box::new(Node { key, fwd: vec![std::ptr::null_mut(); lvl] }))
    }
}

struct SkipList { header: *mut Node, level: usize }
impl SkipList {
    fn new() -> Self { SkipList { header: Node::new(i32::MIN, MAX), level: 1 } }
    fn rand_level() -> usize {
        let mut rng = rand::thread_rng(); let mut lvl = 1;
        while lvl < MAX && rng.gen::<f64>() < 0.5 { lvl += 1; } lvl
    }
    fn insert(&mut self, key: i32) {
        let mut upd = vec![self.header; MAX];
        let mut cur = self.header;
        for i in (0..self.level).rev() {
            unsafe { while !(*cur).fwd[i].is_null() && (*(*cur).fwd[i]).key < key { cur = (*cur).fwd[i]; } }
            upd[i] = cur;
        }
        let lvl = Self::rand_level();
        if lvl > self.level { self.level = lvl; }
        let n = Node::new(key, lvl);
        for i in 0..lvl {
            unsafe { (*n).fwd[i] = (*upd[i]).fwd[i]; (*upd[i]).fwd[i] = n; }
        }
    }
    fn search(&self, key: i32) -> bool {
        let mut cur = self.header;
        for i in (0..self.level).rev() {
            unsafe { while !(*cur).fwd[i].is_null() && (*(*cur).fwd[i]).key < key { cur = (*cur).fwd[i]; } }
        }
        unsafe { let n = (*cur).fwd[0]; !n.is_null() && (*n).key == key }
    }
}

fn main() {
    let mut sl = SkipList::new();
    for k in [3,6,7,9,12,19,17,26] { sl.insert(k); }
    println!("{}", sl.search(9));  // true
    println!("{}", sl.search(5));  // false
}` },
      go: { code: `package main
import ("fmt"; "math"; "math/rand")

const maxLevel = 8
const p = 0.5

type Node struct { key int; fwd [maxLevel]*Node }
type SkipList struct { header *Node; level int }

func newSL() *SkipList { return &SkipList{header: &Node{key: math.MinInt64}, level: 1} }

func randLevel() int {
    lvl := 1
    for lvl < maxLevel && rand.Float64() < p { lvl++ }
    return lvl
}

func (sl *SkipList) Insert(key int) {
    var upd [maxLevel]*Node
    cur := sl.header
    for i := sl.level - 1; i >= 0; i-- {
        for cur.fwd[i] != nil && cur.fwd[i].key < key { cur = cur.fwd[i] }
        upd[i] = cur
    }
    lvl := randLevel()
    if lvl > sl.level { for i := sl.level; i < lvl; i++ { upd[i] = sl.header }; sl.level = lvl }
    n := &Node{key: key}
    for i := 0; i < lvl; i++ { n.fwd[i] = upd[i].fwd[i]; upd[i].fwd[i] = n }
}

func (sl *SkipList) Search(key int) bool {
    cur := sl.header
    for i := sl.level - 1; i >= 0; i-- {
        for cur.fwd[i] != nil && cur.fwd[i].key < key { cur = cur.fwd[i] }
    }
    n := cur.fwd[0]
    return n != nil && n.key == key
}

func main() {
    sl := newSL()
    for _, k := range []int{3,6,7,9,12,19,17,26} { sl.Insert(k) }
    fmt.Println(sl.Search(9))  // true
    fmt.Println(sl.Search(5))  // false
}` },
      javascript: { code: `class SLNode {
  constructor(key, level) {
    this.key = key;
    this.fwd = new Array(level).fill(null);
  }
}

class SkipList {
  constructor(maxLevel = 8, p = 0.5) {
    this.maxLevel = maxLevel; this.p = p; this.level = 1;
    this.header = new SLNode(-Infinity, maxLevel);
  }
  randLevel() {
    let lvl = 1;
    while (Math.random() < this.p && lvl < this.maxLevel) lvl++;
    return lvl;
  }
  insert(key) {
    const update = new Array(this.maxLevel).fill(this.header);
    let cur = this.header;
    for (let i = this.level - 1; i >= 0; i--) {
      while (cur.fwd[i] && cur.fwd[i].key < key) cur = cur.fwd[i];
      update[i] = cur;
    }
    const lvl = this.randLevel();
    if (lvl > this.level) this.level = lvl;
    const n = new SLNode(key, lvl);
    for (let i = 0; i < lvl; i++) { n.fwd[i] = update[i].fwd[i]; update[i].fwd[i] = n; }
  }
  search(key) {
    let cur = this.header;
    for (let i = this.level - 1; i >= 0; i--)
      while (cur.fwd[i] && cur.fwd[i].key < key) cur = cur.fwd[i];
    cur = cur.fwd[0];
    return cur !== null && cur.key === key;
  }
  print() {
    for (let i = this.level - 1; i >= 0; i--) {
      let n = this.header.fwd[i], s = \`L\${i}: \`;
      while (n) { s += n.key + ' -> '; n = n.fwd[i]; }
      console.log(s + 'null');
    }
  }
}

const sl = new SkipList();
[3,6,7,9,12,19,17,26].forEach(k => sl.insert(k));
sl.print();
console.log(sl.search(9));  // true
console.log(sl.search(5));  // false` },
      python: { code: `import random

MAX_LEVEL = 8
P = 0.5

class SLNode:
    def __init__(self, key, level):
        self.key = key
        self.fwd = [None] * level  # fwd[i] = next node at level i

class SkipList:
    def __init__(self):
        self.header = SLNode(float('-inf'), MAX_LEVEL)
        self.level = 1

    def rand_level(self):
        lvl = 1
        while random.random() < P and lvl < MAX_LEVEL: lvl += 1
        return lvl

    def insert(self, key):
        update = [self.header] * MAX_LEVEL
        cur = self.header
        for i in range(self.level - 1, -1, -1):
            while cur.fwd[i] and cur.fwd[i].key < key: cur = cur.fwd[i]
            update[i] = cur
        lvl = self.rand_level()
        if lvl > self.level: self.level = lvl
        n = SLNode(key, lvl)
        for i in range(lvl):
            n.fwd[i] = update[i].fwd[i]
            update[i].fwd[i] = n

    def search(self, key) -> bool:
        cur = self.header
        for i in range(self.level - 1, -1, -1):
            while cur.fwd[i] and cur.fwd[i].key < key: cur = cur.fwd[i]
        cur = cur.fwd[0]
        return cur is not None and cur.key == key

    def print_list(self):
        for i in range(self.level - 1, -1, -1):
            n = self.header.fwd[i]
            print(f"L{i}:", end=" ")
            while n: print(n.key, "->", end=" "); n = n.fwd[i]
            print("None")

sl = SkipList()
for k in [3, 6, 7, 9, 12, 19, 17, 26]: sl.insert(k)
sl.print_list()
print(sl.search(9))  # True
print(sl.search(5))  # False
# Redis ZSET 用 skip list 实现有序集合（O(log n) 范围查询）` },
    },
  },
  // ─── Bloom Filter ─────────────────────────────────────────────────────────────
  {
    id: 'bloomfilter',
    name: 'Bloom Filter',
    icon: '🌸',
    description: 'Space-efficient probabilistic set. Uses k hash functions over a bit array of size m. No false negatives, tunable false positive rate. Used in: Redis (key existence), Cassandra (row existence), CDN cache, browser malware URL check.',
    complexity: { time: 'Insert/Query O(k)', space: 'O(m bits) — much smaller than hash set' },
    langs: {
      c: { code: `#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include <stdbool.h>

#define BITS  (1 << 17)   /* 128 KB bit array */
#define K     4            /* 4 hash functions */

static uint8_t bit_arr[BITS / 8];

/* FNV-1a 变种用作 k 个独立哈希 */
uint32_t hash_k(const char *s, uint32_t seed) {
    uint32_t h = 2166136261u ^ seed;
    for (; *s; s++) { h ^= (uint8_t)*s; h *= 16777619u; }
    return h % BITS;
}

void bf_set(uint32_t bit)  { bit_arr[bit/8] |=  (1u << (bit%8)); }
int  bf_get(uint32_t bit)  { return (bit_arr[bit/8] >> (bit%8)) & 1; }

void bloom_add(const char *item) {
    for (int i = 0; i < K; i++) bf_set(hash_k(item, i * 0x9e3779b9));
}

bool bloom_contains(const char *item) {
    for (int i = 0; i < K; i++)
        if (!bf_get(hash_k(item, i * 0x9e3779b9))) return false;
    return true;  /* might be false positive! */
}

int main(void) {
    const char *db[] = {"apple","banana","cherry","date","elderberry"};
    for (int i = 0; i < 5; i++) bloom_add(db[i]);

    /* Test set members — should be true */
    printf("apple:    %s\\n", bloom_contains("apple")    ? "YES" : "NO");
    printf("cherry:   %s\\n", bloom_contains("cherry")   ? "YES" : "NO");
    /* Test non-members — should be NO, rarely false positive */
    printf("mango:    %s\\n", bloom_contains("mango")    ? "YES(FP?)" : "NO");
    printf("kiwi:     %s\\n", bloom_contains("kiwi")     ? "YES(FP?)" : "NO");
    /* FALSE NEGATIVES are IMPOSSIBLE in a bloom filter */
    printf("\\nFalse negative rate: 0%% guaranteed\\n");
    printf("False positive rate ≈ (1-e^(-kn/m))^k\\n");
    return 0;
}` },
      cpp: { code: `#include <iostream>
#include <bitset>
#include <string>
#include <functional>
using namespace std;

template<size_t M, int K = 4>
class BloomFilter {
    bitset<M> bits;

    size_t hash_k(const string &s, int seed) const {
        size_t h = hash<string>{}(s + to_string(seed));
        return h % M;
    }

public:
    void add(const string &item) {
        for (int i = 0; i < K; i++) bits.set(hash_k(item, i));
    }

    bool contains(const string &item) const {
        for (int i = 0; i < K; i++)
            if (!bits.test(hash_k(item, i))) return false;
        return true;
    }

    double falsePositiveRate(int n) const {
        // p = (1 - e^(-kn/m))^k
        double exp_val = 1.0 - exp(-(double)K * n / M);
        double p = pow(exp_val, K);
        return p;
    }
};

int main() {
    BloomFilter<(1<<17), 4> bf;
    for (auto &w : {"apple","banana","cherry","date","elderberry"}) bf.add(w);

    cout << "apple: "  << bf.contains("apple")  << "\\n"; // 1
    cout << "cherry: " << bf.contains("cherry") << "\\n"; // 1
    cout << "mango: "  << bf.contains("mango")  << "\\n"; // 0 (usually)
    cout << "FP rate (n=5): " << bf.falsePositiveRate(5) * 100 << "%\\n";
}` },
      java: { code: `import java.util.BitSet;

public class BloomFilter {
    private final BitSet bits;
    private final int m;  // bit array size
    private final int k;  // number of hash functions

    public BloomFilter(int m, int k) {
        this.m = m; this.k = k;
        this.bits = new BitSet(m);
    }

    private int hash(String item, int seed) {
        int h = 0;
        for (char c : item.toCharArray()) h = h * 31 + c;
        return Math.abs((h ^ (seed * 0x9e3779b9)) % m);
    }

    public void add(String item) {
        for (int i = 0; i < k; i++) bits.set(hash(item, i));
    }

    public boolean contains(String item) {
        for (int i = 0; i < k; i++)
            if (!bits.get(hash(item, i))) return false;
        return true;
    }

    public static void main(String[] args) {
        BloomFilter bf = new BloomFilter(1 << 17, 4);
        for (String w : new String[]{"apple","banana","cherry","date","elderberry"})
            bf.add(w);
        System.out.println(bf.contains("apple"));   // true
        System.out.println(bf.contains("cherry"));  // true
        System.out.println(bf.contains("mango"));   // false (prob)
        System.out.println(bf.contains("kiwi"));    // false (prob)
    }
}` },
      rust: { code: `use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

struct BloomFilter { bits: Vec<bool>, m: usize, k: usize }

impl BloomFilter {
    fn new(m: usize, k: usize) -> Self { BloomFilter { bits: vec![false; m], m, k } }

    fn hash(&self, item: &str, seed: u64) -> usize {
        let mut h = DefaultHasher::new();
        item.hash(&mut h); seed.hash(&mut h);
        (h.finish() as usize) % self.m
    }

    fn add(&mut self, item: &str) {
        for i in 0..self.k { let idx = self.hash(item, i as u64); self.bits[idx] = true; }
    }

    fn contains(&self, item: &str) -> bool {
        (0..self.k).all(|i| self.bits[self.hash(item, i as u64)])
    }
}

fn main() {
    let mut bf = BloomFilter::new(1 << 17, 4);
    for w in ["apple","banana","cherry","date","elderberry"] { bf.add(w); }
    println!("{}", bf.contains("apple"));   // true
    println!("{}", bf.contains("cherry"));  // true
    println!("{}", bf.contains("mango"));   // false (usually)
    println!("{}", bf.contains("kiwi"));    // false (usually)
}` },
      go: { code: `package main

import (
    "fmt"
    "hash/fnv"
)

type BloomFilter struct {
    bits []byte
    m, k uint
}

func NewBloomFilter(m, k uint) *BloomFilter {
    return &BloomFilter{bits: make([]byte, (m+7)/8), m: m, k: k}
}

func (bf *BloomFilter) hash(item string, seed uint) uint {
    h := fnv.New32a()
    fmt.Fprintf(h, "%s%d", item, seed)
    return uint(h.Sum32()) % bf.m
}

func (bf *BloomFilter) Add(item string) {
    for i := uint(0); i < bf.k; i++ {
        pos := bf.hash(item, i)
        bf.bits[pos/8] |= 1 << (pos % 8)
    }
}

func (bf *BloomFilter) Contains(item string) bool {
    for i := uint(0); i < bf.k; i++ {
        pos := bf.hash(item, i)
        if bf.bits[pos/8]&(1<<(pos%8)) == 0 { return false }
    }
    return true
}

func main() {
    bf := NewBloomFilter(1<<17, 4)
    for _, w := range []string{"apple","banana","cherry","date","elderberry"} { bf.Add(w) }
    fmt.Println(bf.Contains("apple"))   // true
    fmt.Println(bf.Contains("cherry"))  // true
    fmt.Println(bf.Contains("mango"))   // false (prob)
}` },
      javascript: { code: `class BloomFilter {
  constructor(m = 1 << 17, k = 4) {
    this.m = m; this.k = k;
    this.bits = new Uint8Array(Math.ceil(m / 8));
  }

  // FNV-like hash with seed
  _hash(str, seed) {
    let h = 2166136261 ^ seed;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;  // uint32
    }
    return h % this.m;
  }

  add(item) {
    for (let i = 0; i < this.k; i++) {
      const pos = this._hash(item, i * 0x9e3779b9);
      this.bits[pos >> 3] |= (1 << (pos & 7));
    }
  }

  contains(item) {
    for (let i = 0; i < this.k; i++) {
      const pos = this._hash(item, i * 0x9e3779b9);
      if (!(this.bits[pos >> 3] & (1 << (pos & 7)))) return false;
    }
    return true;  // might be false positive!
  }

  // Optimal parameters: m = -n*ln(p) / (ln2)^2,  k = (m/n)*ln2
  static optimalParams(n, p) {
    const m = Math.ceil(-n * Math.log(p) / (Math.LN2 ** 2));
    const k = Math.round((m / n) * Math.LN2);
    return { m, k, fpRate: (1 - Math.exp(-k * n / m)) ** k };
  }
}

const bf = new BloomFilter();
['apple','banana','cherry','date','elderberry'].forEach(w => bf.add(w));
console.log(bf.contains('apple'));   // true
console.log(bf.contains('cherry'));  // true
console.log(bf.contains('mango'));   // false (prob)
console.log(BloomFilter.optimalParams(1000, 0.01));
// { m: 9586, k: 7, fpRate: ~0.01 }` },
      python: { code: `import math
import hashlib

class BloomFilter:
    def __init__(self, m: int = 1 << 17, k: int = 4):
        self.m = m   # bit array size
        self.k = k   # number of hash functions
        self.bits = bytearray(math.ceil(m / 8))

    def _hash(self, item: str, seed: int) -> int:
        data = f"{item}{seed}".encode()
        h = int(hashlib.md5(data).hexdigest(), 16)
        return h % self.m

    def _set(self, pos: int):   self.bits[pos >> 3] |= (1 << (pos & 7))
    def _test(self, pos: int):  return bool(self.bits[pos >> 3] & (1 << (pos & 7)))

    def add(self, item: str) -> None:
        for i in range(self.k): self._set(self._hash(item, i))

    def contains(self, item: str) -> bool:
        return all(self._test(self._hash(item, i)) for i in range(self.k))

    @staticmethod
    def optimal_params(n: int, p: float) -> dict:
        """Compute optimal m and k for n elements and false positive rate p."""
        m = math.ceil(-n * math.log(p) / math.log(2)**2)
        k = round((m / n) * math.log(2))
        fp = (1 - math.exp(-k * n / m)) ** k
        return {"m": m, "k": k, "fp_rate": round(fp, 4)}

bf = BloomFilter()
for w in ["apple","banana","cherry","date","elderberry"]: bf.add(w)

print(bf.contains("apple"))   # True
print(bf.contains("cherry"))  # True
print(bf.contains("mango"))   # False (very likely)
print(bf.contains("kiwi"))    # False (very likely)
# No false negatives — ever!

print(BloomFilter.optimal_params(1000, 0.01))
# {'m': 9586, 'k': 7, 'fp_rate': 0.0101}` },
    },
  },
]
