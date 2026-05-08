.PHONY: build run dev clean

all: build

build: backend frontend

backend:
	cd backend && go build -ldflags=-s -w -o ../server .

frontend:
	cd frontend && npm install && npm run build

run:
	./server

dev-backend:
	cd backend && go run main.go

dev-frontend:
	cd frontend && npm run dev

clean:
	rm -f server
	rm -rf frontend/dist/
	rm -rf frontend/node_modules/.vite
