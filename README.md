# MiniLang AST Visualizer

A full-stack tool that compiles a simple language and visualizes its AST, IR (three-address code), and bytecode.

## Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: Go (lexer, parser, IR gen, bytecode gen, stack VM)
- **Database**: PostgreSQL 16 (optional, for compilation history)

## Quick Start

```bash
# Start postgres (optional)
docker compose up -d

# Backend
cd backend
go mod tidy
DATABASE_URL="postgres://langviz:langviz@localhost:5432/langviz?sslmode=disable" go run main.go

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Language Features

Supports:
- Integer literals
- Boolean literals (true/false)
- Variables: `let x = 10;`
- Assignment: `x = x + 1;`
- Print: `print x;`
- If/Else: `if x > 5 { ... } else { ... }`
- While: `while i < 10 { ... }`
- Binary ops: `+ - * / == != < > <= >=`

## Pipeline

1. **Lexer** → tokens
2. **Parser** → AST (Abstract Syntax Tree)
3. **IR Gen** → Three-address code
4. **Code Gen** → Stack-based bytecode
5. **VM** → Executes and produces output
