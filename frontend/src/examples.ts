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
]

export const examplesByLang: Record<string, Example[]> = {
  go, python, java, typescript, cpp,
  rust: go,
  c: cpp,
}
