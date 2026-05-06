.PHONY: build run dev clean

all: build

build: backend frontend

backend:
	cd backend && go build -o ../bin/server .

frontend:
	cd frontend && npm install && npm run build

run:
	./bin/server

dev-backend:
	cd backend && go run main.go

dev-frontend:
	cd frontend && npm run dev

clean:
	rm -rf bin/ frontend/dist/
