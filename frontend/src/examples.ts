export interface Example { name: string; code: string }

const go: Example[] = [
  { name: 'Interface + Impl', code: `package main

type Animal interface {
	Sound() string
	Move()  string
}

type Dog struct { Name string; Age int }
func (d *Dog) Sound() string { return "woof" }
func (d *Dog) Move()  string { return "run" }

type Cat struct { Name string; Indoor bool }
func (c *Cat) Sound() string { return "meow" }
func (c *Cat) Move()  string { return "sneak" }` },

  { name: 'Repository Pattern', code: `package main

type User struct { ID int; Name string; Email string }

type UserRepository interface {
	FindByID(id int) (*User, error)
	Save(u *User) error
}

type PostgresUserRepo struct { db *DB }

func (r *PostgresUserRepo) FindByID(id int) (*User, error) {
	return r.db.QueryUser(id)
}
func (r *PostgresUserRepo) Save(u *User) error {
	return r.db.Exec("INSERT INTO users ...", u.Name, u.Email)
}

type UserService struct { repo UserRepository }

func (s *UserService) GetUser(id int) (*User, error) {
	return s.repo.FindByID(id)
}` },

  { name: 'Observer Pattern', code: `package main

type Event struct { Type string; Data interface{} }

type Handler interface { Handle(e Event) }

type EventBus struct { handlers map[string][]Handler }

func (b *EventBus) Subscribe(eventType string, h Handler) {
	b.handlers[eventType] = append(b.handlers[eventType], h)
}
func (b *EventBus) Publish(e Event) {
	for _, h := range b.handlers[e.Type] { h.Handle(e) }
}

type Logger struct{}
func (l *Logger) Handle(e Event) { println("LOG:", e.Type) }` },

  { name: 'Strategy Pattern', code: `package main

type SortStrategy interface { Sort(data []int) []int }

type QuickSort struct{}
func (q *QuickSort) Sort(data []int) []int { return data }

type MergeSort struct{}
func (m *MergeSort) Sort(data []int) []int { return data }

type Sorter struct { strategy SortStrategy }

func (s *Sorter) SetStrategy(st SortStrategy) { s.strategy = st }
func (s *Sorter) Sort(data []int) []int       { return s.strategy.Sort(data) }` },

  { name: 'Worker Pool', code: `package main

type Job    struct { ID int; Data []byte }
type Result struct { JobID int; Out []byte; Err error }

type Worker struct {
	ID      int
	jobs    <-chan Job
	results chan<- Result
}

func (w *Worker) Run() {
	for job := range w.jobs {
		w.results <- Result{JobID: job.ID}
	}
}

type Pool struct { workers []*Worker; jobs chan Job; results chan Result }
func (p *Pool) Submit(j Job) { p.jobs <- j }` },

  { name: 'Middleware Chain', code: `package main

import "net/http"

type Middleware func(http.Handler) http.Handler

type Router struct {
	mux         *http.ServeMux
	middlewares []Middleware
}

func (r *Router) Use(m Middleware) { r.middlewares = append(r.middlewares, m) }

func (r *Router) wrap(h http.Handler) http.Handler {
	for i := len(r.middlewares) - 1; i >= 0; i-- {
		h = r.middlewares[i](h)
	}
	return h
}

type AuthMiddleware struct { secret string }
func (a *AuthMiddleware) Handler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") == "" {
			http.Error(w, "unauthorized", 401); return
		}
		next.ServeHTTP(w, r)
	})
}

type LogMiddleware struct{}
func (l *LogMiddleware) Handler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		println("GET", r.URL.Path)
		next.ServeHTTP(w, r)
	})
}` },

  { name: 'Builder Pattern', code: `package main

type Query struct {
	table  string
	where  []string
	limit  int
	offset int
}

type QueryBuilder struct { q Query }

func NewQueryBuilder(table string) *QueryBuilder {
	return &QueryBuilder{q: Query{table: table}}
}
func (b *QueryBuilder) Where(cond string) *QueryBuilder {
	b.q.where = append(b.q.where, cond); return b
}
func (b *QueryBuilder) Limit(n int) *QueryBuilder  { b.q.limit = n; return b }
func (b *QueryBuilder) Offset(n int) *QueryBuilder { b.q.offset = n; return b }
func (b *QueryBuilder) Build() Query               { return b.q }

type UserQuery struct { builder *QueryBuilder }
func (u *UserQuery) ActiveUsers() Query {
	return NewQueryBuilder("users").Where("active = true").Limit(100).Build()
}` },

  { name: 'Decorator Pattern', code: `package main

type Cache interface {
	Get(key string) (string, bool)
	Set(key, val string)
}

type MemCache struct { data map[string]string }
func (m *MemCache) Get(key string) (string, bool) { v, ok := m.data[key]; return v, ok }
func (m *MemCache) Set(key, val string)            { m.data[key] = val }

type LoggedCache struct {
	inner Cache
}
func (l *LoggedCache) Get(key string) (string, bool) {
	v, ok := l.inner.Get(key)
	println("GET", key, "hit=", ok)
	return v, ok
}
func (l *LoggedCache) Set(key, val string) {
	println("SET", key)
	l.inner.Set(key, val)
}

type MetricCache struct {
	inner Cache
	hits  int
}
func (m *MetricCache) Get(key string) (string, bool) {
	v, ok := m.inner.Get(key)
	if ok { m.hits++ }
	return v, ok
}
func (m *MetricCache) Set(key, val string) { m.inner.Set(key, val) }` },

  { name: 'State Machine', code: `package main

type State int
const (
	StateIdle State = iota
	StateRunning
	StatePaused
	StateDone
)

type Job struct {
	state   State
	payload []byte
}

type Transition struct { from, to State }

type StateMachine struct {
	job         *Job
	transitions map[Transition]bool
}

func (sm *StateMachine) Transition(to State) bool {
	t := Transition{sm.job.state, to}
	if !sm.transitions[t] { return false }
	sm.job.state = to
	return true
}

func (sm *StateMachine) Start()  bool { return sm.Transition(StateRunning) }
func (sm *StateMachine) Pause()  bool { return sm.Transition(StatePaused) }
func (sm *StateMachine) Resume() bool { return sm.Transition(StateRunning) }
func (sm *StateMachine) Done()   bool { return sm.Transition(StateDone) }` },

  { name: 'Dependency Injection', code: `package main

type Logger interface { Log(msg string) }
type DB     interface { Exec(sql string) error }
type Mailer interface { Send(to, body string) error }

type StdLogger struct{}
func (l *StdLogger) Log(msg string) { println(msg) }

type PostgresDB struct { dsn string }
func (d *PostgresDB) Exec(sql string) error { return nil }

type SMTPMailer struct { host string }
func (m *SMTPMailer) Send(to, body string) error { return nil }

type Container struct {
	logger Logger
	db     DB
	mailer Mailer
}

type OrderService struct {
	log    Logger
	db     DB
	mailer Mailer
}

func (c *Container) OrderService() *OrderService {
	return &OrderService{log: c.logger, db: c.db, mailer: c.mailer}
}

func (s *OrderService) PlaceOrder(userID int, item string) error {
	s.log.Log("placing order")
	if err := s.db.Exec("INSERT INTO orders..."); err != nil { return err }
	return s.mailer.Send("user@example.com", "Order confirmed: "+item)
}` },
]

const python: Example[] = [
  { name: 'Class Inheritance', code: `class Shape:
    def __init__(self, color):
        self.color = color

    def area(self):
        raise NotImplementedError

class Circle(Shape):
    def __init__(self, color, radius):
        super().__init__(color)
        self.radius = radius

    def area(self):
        return 3.14159 * self.radius ** 2

class Rectangle(Shape):
    def __init__(self, color, w, h):
        super().__init__(color)
        self.width = w
        self.height = h

    def area(self):
        return self.width * self.height` },

  { name: 'Repository + Service', code: `class UserRepository:
    def __init__(self, db):
        self.db = db

    def find_by_id(self, user_id):
        return self.db.query("SELECT * FROM users WHERE id=?", user_id)

    def save(self, user):
        return self.db.execute("INSERT INTO users ...", user)

class EmailService:
    def __init__(self, smtp):
        self.smtp = smtp

    def send_welcome(self, user):
        return self.smtp.send(user["email"], "Welcome!")

class UserService:
    def __init__(self, repo, email_svc):
        self.repo = repo
        self.email_svc = email_svc

    def register(self, name, email):
        user = self.repo.save({"name": name, "email": email})
        self.email_svc.send_welcome(user)
        return user` },

  { name: 'Observer Pattern', code: `class EventEmitter:
    def __init__(self):
        self.listeners = {}

    def on(self, event, callback):
        if event not in self.listeners:
            self.listeners[event] = []
        self.listeners[event].append(callback)

    def emit(self, event, *args):
        for cb in self.listeners.get(event, []):
            cb(*args)

class OrderService(EventEmitter):
    def __init__(self):
        super().__init__()
        self.orders = []

    def place_order(self, item, qty):
        order = {"item": item, "qty": qty}
        self.orders.append(order)
        self.emit("order_placed", order)
        return order` },

  { name: 'Decorator Pattern', code: `import functools

class Cache:
    def __init__(self):
        self._store = {}

    def get(self, key):
        return self._store.get(key)

    def set(self, key, value, ttl=60):
        self._store[key] = value

class RateLimiter:
    def __init__(self, max_calls, window=60):
        self.max_calls = max_calls
        self.window = window
        self._calls = {}

    def is_allowed(self, user_id):
        count = self._calls.get(user_id, 0)
        if count >= self.max_calls:
            return False
        self._calls[user_id] = count + 1
        return True

class ProductService:
    def __init__(self, db, cache, limiter):
        self.db = db
        self.cache = cache
        self.limiter = limiter

    def get_product(self, user_id, product_id):
        if not self.limiter.is_allowed(user_id):
            raise Exception("rate limit exceeded")
        cached = self.cache.get(product_id)
        if cached:
            return cached
        product = self.db.find(product_id)
        self.cache.set(product_id, product)
        return product` },

  { name: 'Abstract Factory', code: `from abc import ABC, abstractmethod

class Button(ABC):
    @abstractmethod
    def render(self): pass
    @abstractmethod
    def on_click(self, handler): pass

class TextInput(ABC):
    @abstractmethod
    def render(self): pass
    @abstractmethod
    def get_value(self): pass

class UIFactory(ABC):
    @abstractmethod
    def create_button(self, label) -> Button: pass
    @abstractmethod
    def create_input(self, placeholder) -> TextInput: pass

class WebButton(Button):
    def __init__(self, label): self.label = label
    def render(self): return f'<button>{self.label}</button>'
    def on_click(self, handler): pass

class WebInput(TextInput):
    def __init__(self, placeholder): self.placeholder = placeholder
    def render(self): return f'<input placeholder="{self.placeholder}"/>'
    def get_value(self): return ""

class WebUIFactory(UIFactory):
    def create_button(self, label): return WebButton(label)
    def create_input(self, placeholder): return WebInput(placeholder)` },

  { name: 'Command Pattern', code: `class Command:
    def execute(self): raise NotImplementedError
    def undo(self):    raise NotImplementedError

class TextEditor:
    def __init__(self):
        self.content = ""

    def insert(self, pos, text):
        self.content = self.content[:pos] + text + self.content[pos:]

    def delete(self, pos, length):
        self.content = self.content[:pos] + self.content[pos+length:]

class InsertCommand(Command):
    def __init__(self, editor, pos, text):
        self.editor = editor
        self.pos = pos
        self.text = text

    def execute(self): self.editor.insert(self.pos, self.text)
    def undo(self):    self.editor.delete(self.pos, len(self.text))

class CommandHistory:
    def __init__(self):
        self.history = []

    def execute(self, cmd):
        cmd.execute()
        self.history.append(cmd)

    def undo(self):
        if self.history:
            self.history.pop().undo()` },

  { name: 'Context Manager', code: `class DatabaseTransaction:
    def __init__(self, connection):
        self.conn = connection
        self.savepoint = None

    def __enter__(self):
        self.savepoint = self.conn.savepoint()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            self.conn.commit()
        else:
            self.conn.rollback(self.savepoint)
        return False

class OrderRepository:
    def __init__(self, db):
        self.db = db

    def create_order(self, user_id, items):
        with DatabaseTransaction(self.db) as tx:
            order_id = self.db.insert("orders", {"user_id": user_id})
            for item in items:
                self.db.insert("order_items", {"order_id": order_id, "item": item})
            return order_id` },

  { name: 'Proxy Pattern', code: `class ImageLoader:
    def load(self, path):
        print(f"Loading image from disk: {path}")
        return {"path": path, "data": b"..."}

class LazyImageProxy:
    def __init__(self, path):
        self.path = path
        self._image = None
        self._loader = ImageLoader()

    def load(self):
        if self._image is None:
            self._image = self._loader.load(self.path)
        return self._image

class ProtectedResource:
    def __init__(self, resource, acl):
        self._resource = resource
        self._acl = acl

    def read(self, user):
        if not self._acl.can_read(user):
            raise PermissionError(f"{user} cannot read")
        return self._resource.read()

    def write(self, user, data):
        if not self._acl.can_write(user):
            raise PermissionError(f"{user} cannot write")
        return self._resource.write(data)` },
]

const java: Example[] = [
  { name: 'Interface + Impl', code: `interface Repository<T> {
    T findById(int id);
    void save(T entity);
}

class User {
    int id;
    String name;
    String email;
    User(int id, String name, String email) {
        this.id = id; this.name = name; this.email = email;
    }
}

class UserRepository implements Repository<User> {
    private Database db;
    UserRepository(Database db) { this.db = db; }

    public User findById(int id) {
        return db.query("SELECT * FROM users WHERE id=?", id);
    }
    public void save(User user) {
        db.execute("INSERT INTO users ...", user);
    }
}

class UserService {
    private UserRepository repo;
    UserService(UserRepository repo) { this.repo = repo; }

    public User getUser(int id) { return repo.findById(id); }
}` },

  { name: 'Factory Pattern', code: `interface Shape {
    double area();
    String type();
}

class Circle implements Shape {
    private double radius;
    Circle(double radius) { this.radius = radius; }
    public double area()  { return Math.PI * radius * radius; }
    public String type()  { return "Circle"; }
}

class Rectangle implements Shape {
    private double width, height;
    Rectangle(double w, double h) { width = w; height = h; }
    public double area()  { return width * height; }
    public String type()  { return "Rectangle"; }
}

class ShapeFactory {
    public static Shape create(String type, double... p) {
        if (type.equals("circle")) return new Circle(p[0]);
        return new Rectangle(p[0], p[1]);
    }
}` },

  { name: 'Builder Pattern', code: `class HttpRequest {
    private final String method;
    private final String url;
    private final Map<String,String> headers;
    private final String body;

    private HttpRequest(Builder b) {
        this.method = b.method; this.url = b.url;
        this.headers = b.headers; this.body = b.body;
    }

    static class Builder {
        String method = "GET";
        String url;
        Map<String,String> headers = new HashMap<>();
        String body;

        Builder url(String url)               { this.url = url; return this; }
        Builder method(String method)         { this.method = method; return this; }
        Builder header(String k, String v)    { headers.put(k,v); return this; }
        Builder body(String body)             { this.body = body; return this; }
        HttpRequest build()                   { return new HttpRequest(this); }
    }
}

class HttpClient {
    public Response send(HttpRequest req) { return new Response(200, "OK"); }
}` },

  { name: 'Observer Pattern', code: `import java.util.*;

interface Observer<T> { void update(T event); }

class EventBus<T> {
    private List<Observer<T>> observers = new ArrayList<>();

    public void subscribe(Observer<T> o)   { observers.add(o); }
    public void unsubscribe(Observer<T> o) { observers.remove(o); }

    public void publish(T event) {
        for (Observer<T> o : observers) o.update(event);
    }
}

class OrderEvent {
    String type; int orderId;
    OrderEvent(String type, int orderId) { this.type = type; this.orderId = orderId; }
}

class AuditLogger implements Observer<OrderEvent> {
    public void update(OrderEvent e) { System.out.println("AUDIT: " + e.type); }
}

class NotificationService implements Observer<OrderEvent> {
    public void update(OrderEvent e) { System.out.println("NOTIFY: order " + e.orderId); }
}` },

  { name: 'Decorator Pattern', code: `interface TextProcessor {
    String process(String text);
}

class PlainProcessor implements TextProcessor {
    public String process(String text) { return text; }
}

class TrimProcessor implements TextProcessor {
    private TextProcessor inner;
    TrimProcessor(TextProcessor inner) { this.inner = inner; }
    public String process(String text) { return inner.process(text.trim()); }
}

class UpperCaseProcessor implements TextProcessor {
    private TextProcessor inner;
    UpperCaseProcessor(TextProcessor inner) { this.inner = inner; }
    public String process(String text) { return inner.process(text).toUpperCase(); }
}

class HtmlEscapeProcessor implements TextProcessor {
    private TextProcessor inner;
    HtmlEscapeProcessor(TextProcessor inner) { this.inner = inner; }
    public String process(String text) {
        return inner.process(text).replace("<","&lt;").replace(">","&gt;");
    }
}` },

  { name: 'Chain of Responsibility', code: `abstract class Handler {
    protected Handler next;

    public Handler setNext(Handler next) { this.next = next; return next; }

    public abstract boolean handle(HttpRequest req);
}

class AuthHandler extends Handler {
    public boolean handle(HttpRequest req) {
        if (req.getHeader("Authorization") == null) {
            req.respond(401, "Unauthorized"); return false;
        }
        return next == null || next.handle(req);
    }
}

class RateLimitHandler extends Handler {
    private Map<String, Integer> counts = new HashMap<>();
    public boolean handle(HttpRequest req) {
        String ip = req.getRemoteAddr();
        int count = counts.getOrDefault(ip, 0);
        if (count > 100) { req.respond(429, "Too Many Requests"); return false; }
        counts.put(ip, count + 1);
        return next == null || next.handle(req);
    }
}

class LogHandler extends Handler {
    public boolean handle(HttpRequest req) {
        System.out.println("LOG " + req.getMethod() + " " + req.getPath());
        return next == null || next.handle(req);
    }
}` },

  { name: 'Composite Pattern', code: `import java.util.*;

interface FileSystemNode {
    String name();
    long size();
    void print(String indent);
}

class File implements FileSystemNode {
    private String name;
    private long size;
    File(String name, long size) { this.name = name; this.size = size; }
    public String name() { return name; }
    public long size()   { return size; }
    public void print(String indent) { System.out.println(indent + name + " (" + size + "B)"); }
}

class Directory implements FileSystemNode {
    private String name;
    private List<FileSystemNode> children = new ArrayList<>();
    Directory(String name) { this.name = name; }
    public void add(FileSystemNode node) { children.add(node); }
    public String name() { return name; }
    public long size()   { return children.stream().mapToLong(FileSystemNode::size).sum(); }
    public void print(String indent) {
        System.out.println(indent + "[" + name + "]");
        children.forEach(c -> c.print(indent + "  "));
    }
}` },

  { name: 'Proxy + Cache', code: `interface ProductRepository {
    Product findById(int id);
    List<Product> findAll();
}

class DatabaseProductRepo implements ProductRepository {
    private DataSource ds;
    DatabaseProductRepo(DataSource ds) { this.ds = ds; }
    public Product findById(int id)    { return ds.query("SELECT...", id); }
    public List<Product> findAll()     { return ds.queryList("SELECT..."); }
}

class CachedProductRepo implements ProductRepository {
    private ProductRepository origin;
    private Map<Integer, Product> cache = new ConcurrentHashMap<>();

    CachedProductRepo(ProductRepository origin) { this.origin = origin; }

    public Product findById(int id) {
        return cache.computeIfAbsent(id, origin::findById);
    }
    public List<Product> findAll() { return origin.findAll(); }
    public void evict(int id)      { cache.remove(id); }
}` },
]

const typescript: Example[] = [
  { name: 'Generic Repository', code: `interface Entity { id: string }

interface Repository<T extends Entity> {
  findById(id: string): Promise<T | null>
  save(entity: T): Promise<T>
}

class User implements Entity {
  id: string; name: string; email: string
  constructor(id: string, name: string, email: string) {
    this.id = id; this.name = name; this.email = email
  }
}

class UserRepository implements Repository<User> {
  private db: Database
  constructor(db: Database) { this.db = db }

  async findById(id: string): Promise<User | null> {
    return this.db.query('SELECT * FROM users WHERE id = ?', [id])
  }
  async save(user: User): Promise<User> {
    return this.db.execute('INSERT INTO users ...', user)
  }
}

class UserService {
  private repo: UserRepository
  constructor(repo: UserRepository) { this.repo = repo }

  async getUser(id: string) { return this.repo.findById(id) }
}` },

  { name: 'Event System', code: `type EventMap = {
  'user:created': { id: string; name: string }
  'order:placed': { orderId: string; total: number }
}

class TypedEventEmitter<E extends Record<string, unknown>> {
  private listeners: Partial<{ [K in keyof E]: ((d: E[K]) => void)[] }> = {}

  on<K extends keyof E>(event: K, handler: (d: E[K]) => void) {
    if (!this.listeners[event]) this.listeners[event] = []
    this.listeners[event]!.push(handler)
  }

  emit<K extends keyof E>(event: K, data: E[K]) {
    this.listeners[event]?.forEach(h => h(data))
  }
}

class UserService extends TypedEventEmitter<EventMap> {
  private repo: UserRepository
  constructor(repo: UserRepository) { super(); this.repo = repo }

  async createUser(name: string, email: string) {
    const user = await this.repo.save(new User(crypto.randomUUID(), name, email))
    this.emit('user:created', { id: user.id, name: user.name })
    return user
  }
}` },

  { name: 'Middleware Pipeline', code: `type Next = () => Promise<void>
type MiddlewareFn<T> = (ctx: T, next: Next) => Promise<void>

class Pipeline<T> {
  private middlewares: MiddlewareFn<T>[] = []

  use(fn: MiddlewareFn<T>): this { this.middlewares.push(fn); return this }

  async run(ctx: T): Promise<void> {
    let i = 0
    const next = async () => {
      if (i < this.middlewares.length) await this.middlewares[i++](ctx, next)
    }
    await next()
  }
}

interface RequestCtx {
  path: string; userId?: string; body?: unknown; response?: unknown
}

class AuthMiddleware {
  async handle(ctx: RequestCtx, next: Next) {
    ctx.userId = 'user_123'
    await next()
  }
}

class LogMiddleware {
  async handle(ctx: RequestCtx, next: Next) {
    console.log('→', ctx.path)
    await next()
    console.log('←', ctx.path)
  }
}` },

  { name: 'Builder Pattern', code: `class QueryBuilder {
  private table = ''
  private conditions: string[] = []
  private columns = '*'
  private limitVal?: number
  private offsetVal?: number

  from(table: string): this      { this.table = table; return this }
  select(cols: string): this     { this.columns = cols; return this }
  where(cond: string): this      { this.conditions.push(cond); return this }
  limit(n: number): this         { this.limitVal = n; return this }
  offset(n: number): this        { this.offsetVal = n; return this }

  build(): string {
    let sql = \`SELECT \${this.columns} FROM \${this.table}\`
    if (this.conditions.length) sql += ' WHERE ' + this.conditions.join(' AND ')
    if (this.limitVal)  sql += \` LIMIT \${this.limitVal}\`
    if (this.offsetVal) sql += \` OFFSET \${this.offsetVal}\`
    return sql
  }
}

class UserQueryService {
  activeAdmins() {
    return new QueryBuilder()
      .from('users').select('id, name, email')
      .where('active = true').where('role = "admin"')
      .limit(50).build()
  }
}` },

  { name: 'Decorator Pattern', code: `interface Logger {
  log(level: string, message: string, meta?: object): void
}

class ConsoleLogger implements Logger {
  log(level: string, message: string, meta?: object) {
    console.log(\`[\${level}] \${message}\`, meta ?? '')
  }
}

class TimestampLogger implements Logger {
  constructor(private inner: Logger) {}
  log(level: string, message: string, meta?: object) {
    this.inner.log(level, \`[\${new Date().toISOString()}] \${message}\`, meta)
  }
}

class SamplingLogger implements Logger {
  constructor(private inner: Logger, private rate = 0.1) {}
  log(level: string, message: string, meta?: object) {
    if (Math.random() < this.rate || level === 'error')
      this.inner.log(level, message, meta)
  }
}

class BatchLogger implements Logger {
  private buffer: { level: string; message: string; meta?: object }[] = []
  constructor(private inner: Logger, private batchSize = 10) {}
  log(level: string, message: string, meta?: object) {
    this.buffer.push({ level, message, meta })
    if (this.buffer.length >= this.batchSize) this.flush()
  }
  flush() { this.buffer.forEach(e => this.inner.log(e.level, e.message, e.meta)); this.buffer = [] }
}` },

  { name: 'State Machine', code: `type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'

interface Transition {
  from: OrderStatus | OrderStatus[]
  to: OrderStatus
  guard?: (order: Order) => boolean
}

class OrderStateMachine {
  private transitions: Map<string, Transition> = new Map([
    ['confirm',  { from: 'pending',   to: 'confirmed' }],
    ['ship',     { from: 'confirmed', to: 'shipped'   }],
    ['deliver',  { from: 'shipped',   to: 'delivered' }],
    ['cancel',   { from: ['pending', 'confirmed'], to: 'cancelled' }],
  ])

  transition(order: Order, action: string): boolean {
    const t = this.transitions.get(action)
    if (!t) return false
    const fromStates = Array.isArray(t.from) ? t.from : [t.from]
    if (!fromStates.includes(order.status)) return false
    if (t.guard && !t.guard(order)) return false
    order.status = t.to
    return true
  }
}

class OrderService {
  constructor(private fsm: OrderStateMachine, private repo: OrderRepository) {}
  async confirm(orderId: string) {
    const order = await this.repo.findById(orderId)
    if (!this.fsm.transition(order, 'confirm')) throw new Error('invalid transition')
    return this.repo.save(order)
  }
}` },

  { name: 'Dependency Injection', code: `interface Container {
  get<T>(token: symbol): T
}

class DIContainer implements Container {
  private registry = new Map<symbol, () => unknown>()

  register<T>(token: symbol, factory: () => T): void {
    this.registry.set(token, factory)
  }

  get<T>(token: symbol): T {
    const factory = this.registry.get(token)
    if (!factory) throw new Error(\`No provider for \${String(token)}\`)
    return factory() as T
  }
}

const TOKENS = {
  DB:      Symbol('DB'),
  Cache:   Symbol('Cache'),
  Logger:  Symbol('Logger'),
  UserSvc: Symbol('UserService'),
}

class AppModule {
  static configure(c: DIContainer) {
    c.register(TOKENS.DB,      () => new PostgresDB(process.env.DB_URL!))
    c.register(TOKENS.Cache,   () => new RedisCache(process.env.REDIS_URL!))
    c.register(TOKENS.Logger,  () => new ConsoleLogger())
    c.register(TOKENS.UserSvc, () => new UserService(c.get(TOKENS.DB), c.get(TOKENS.Cache)))
  }
}` },

  { name: 'Composite + Visitor', code: `interface Expr { accept<T>(v: Visitor<T>): T }

class Num implements Expr {
  constructor(public value: number) {}
  accept<T>(v: Visitor<T>) { return v.visitNum(this) }
}
class Add implements Expr {
  constructor(public left: Expr, public right: Expr) {}
  accept<T>(v: Visitor<T>) { return v.visitAdd(this) }
}
class Mul implements Expr {
  constructor(public left: Expr, public right: Expr) {}
  accept<T>(v: Visitor<T>) { return v.visitMul(this) }
}

interface Visitor<T> {
  visitNum(n: Num): T
  visitAdd(a: Add): T
  visitMul(m: Mul): T
}

class Evaluator implements Visitor<number> {
  visitNum(n: Num) { return n.value }
  visitAdd(a: Add) { return a.left.accept(this) + a.right.accept(this) }
  visitMul(m: Mul) { return m.left.accept(this) * m.right.accept(this) }
}

class Printer implements Visitor<string> {
  visitNum(n: Num) { return String(n.value) }
  visitAdd(a: Add) { return \`(\${a.left.accept(this)} + \${a.right.accept(this)})\` }
  visitMul(m: Mul) { return \`(\${m.left.accept(this)} * \${m.right.accept(this)})\` }
}` },
]

const cpp: Example[] = [
  { name: 'Virtual Inheritance', code: `#include <string>

class Animal {
public:
    std::string name;
    Animal(const std::string& name) : name(name) {}
    virtual std::string sound() const = 0;
    virtual std::string move()  const = 0;
    virtual ~Animal() = default;
};

class Dog : public Animal {
public:
    Dog(const std::string& name) : Animal(name) {}
    std::string sound() const override { return "woof"; }
    std::string move()  const override { return "run";  }
};

class Cat : public Animal {
public:
    Cat(const std::string& name) : Animal(name) {}
    std::string sound() const override { return "meow";  }
    std::string move()  const override { return "sneak"; }
};` },

  { name: 'CRTP Pattern', code: `template <typename Derived>
class Serializable {
public:
    std::string serialize() const {
        return static_cast<const Derived*>(this)->toJson();
    }
};

class User : public Serializable<User> {
public:
    int id;
    std::string name;
    User(int id, const std::string& name) : id(id), name(name) {}
    std::string toJson() const {
        return "{\"id\":" + std::to_string(id) + "}";
    }
};

class Order : public Serializable<Order> {
public:
    int orderId;
    std::string toJson() const {
        return "{\"orderId\":" + std::to_string(orderId) + "}";
    }
};` },

  { name: 'Observer Pattern', code: `#include <vector>
#include <functional>

template<typename T>
class Signal {
    std::vector<std::function<void(const T&)>> slots;
public:
    void connect(std::function<void(const T&)> slot) {
        slots.push_back(std::move(slot));
    }
    void emit(const T& value) const {
        for (auto& slot : slots) slot(value);
    }
};

struct OrderEvent { int id; std::string type; };

class OrderService {
public:
    Signal<OrderEvent> onPlaced;
    Signal<OrderEvent> onCancelled;

    void placeOrder(int id) {
        onPlaced.emit({id, "placed"});
    }
    void cancelOrder(int id) {
        onCancelled.emit({id, "cancelled"});
    }
};

class AuditLog {
public:
    void record(const OrderEvent& e) { /* write to log */ }
};` },

  { name: 'Singleton + RAII', code: `#include <mutex>
#include <memory>

class Config {
    Config() = default;
    static std::once_flag initFlag;
    static std::unique_ptr<Config> instance;

    std::string dbUrl;
    int maxConnections = 10;
public:
    static Config& get() {
        std::call_once(initFlag, []{ instance.reset(new Config()); });
        return *instance;
    }
    const std::string& getDbUrl() const   { return dbUrl; }
    int getMaxConnections() const          { return maxConnections; }
    void setDbUrl(const std::string& url)  { dbUrl = url; }
};

class ConnectionPool {
    Config& cfg;
    std::vector<Connection> pool;
public:
    explicit ConnectionPool(Config& cfg) : cfg(cfg) {
        pool.reserve(cfg.getMaxConnections());
    }
    Connection acquire();
    void release(Connection c);
};` },

  { name: 'Strategy + Policy', code: `#include <vector>
#include <algorithm>

struct SortAscending {
    bool operator()(int a, int b) const { return a < b; }
};

struct SortDescending {
    bool operator()(int a, int b) const { return a > b; }
};

template<typename Compare = SortAscending>
class Sorter {
    Compare cmp;
public:
    explicit Sorter(Compare c = {}) : cmp(c) {}
    void sort(std::vector<int>& v) { std::sort(v.begin(), v.end(), cmp); }
};

class DataProcessor {
    std::vector<int> data;
public:
    void loadData(std::vector<int> d)    { data = std::move(d); }
    std::vector<int> sortAsc()  const    { auto d = data; Sorter<>().sort(d); return d; }
    std::vector<int> sortDesc() const    { auto d = data; Sorter<SortDescending>().sort(d); return d; }
};` },

  { name: 'Factory Method', code: `#include <memory>
#include <string>

class Connection {
public:
    virtual bool connect(const std::string& url) = 0;
    virtual bool execute(const std::string& sql) = 0;
    virtual ~Connection() = default;
};

class PostgresConn : public Connection {
public:
    bool connect(const std::string& url) override { return true; }
    bool execute(const std::string& sql) override { return true; }
};

class MySQLConn : public Connection {
public:
    bool connect(const std::string& url) override { return true; }
    bool execute(const std::string& sql) override { return true; }
};

class ConnectionFactory {
public:
    static std::unique_ptr<Connection> create(const std::string& driver) {
        if (driver == "postgres") return std::make_unique<PostgresConn>();
        if (driver == "mysql")    return std::make_unique<MySQLConn>();
        throw std::runtime_error("unknown driver: " + driver);
    }
};` },

  { name: 'Command Pattern', code: `#include <stack>
#include <memory>

class Command {
public:
    virtual void execute() = 0;
    virtual void undo()    = 0;
    virtual ~Command()     = default;
};

class TextBuffer {
    std::string text;
public:
    void insert(size_t pos, const std::string& s) {
        text.insert(pos, s);
    }
    void erase(size_t pos, size_t len) {
        text.erase(pos, len);
    }
    const std::string& get() const { return text; }
};

class InsertCommand : public Command {
    TextBuffer& buf;
    size_t pos;
    std::string text;
public:
    InsertCommand(TextBuffer& b, size_t p, std::string t)
        : buf(b), pos(p), text(std::move(t)) {}
    void execute() override { buf.insert(pos, text); }
    void undo()    override { buf.erase(pos, text.size()); }
};

class CommandManager {
    std::stack<std::unique_ptr<Command>> history;
public:
    void execute(std::unique_ptr<Command> cmd) {
        cmd->execute(); history.push(std::move(cmd));
    }
    void undo() {
        if (!history.empty()) { history.top()->undo(); history.pop(); }
    }
};` },

  { name: 'Template Method', code: `#include <string>
#include <vector>

class DataMigration {
public:
    // Template method
    void run() {
        auto data = extract();
        auto transformed = transform(data);
        validate(transformed);
        load(transformed);
    }
protected:
    virtual std::vector<std::string> extract() = 0;
    virtual std::vector<std::string> transform(const std::vector<std::string>& data) { return data; }
    virtual void validate(const std::vector<std::string>& data) { /* default: no-op */ }
    virtual void load(const std::vector<std::string>& data) = 0;
};

class CsvToJsonMigration : public DataMigration {
protected:
    std::vector<std::string> extract() override { return {"row1", "row2"}; }
    std::vector<std::string> transform(const std::vector<std::string>& rows) override {
        std::vector<std::string> json;
        for (auto& r : rows) json.push_back("{\"data\":\"" + r + "\"}");
        return json;
    }
    void load(const std::vector<std::string>& data) override { /* write JSON */ }
};` },
]

export const examplesByLang: Record<string, Example[]> = {
  go, python, java, typescript, cpp,
  rust: go,
  c: cpp,
}
