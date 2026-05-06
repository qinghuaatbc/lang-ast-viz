package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"lang-ast-viz/db"
	"lang-ast-viz/handler"
)

func main() {
	connStr := os.Getenv("DATABASE_URL")

	var database *db.DB
	if connStr != "" {
		var err error
		database, err = db.New(connStr)
		if err != nil {
			log.Printf("postgres not available: %v (running without db)", err)
			database = nil
		} else {
			defer database.Close()
			log.Println("connected to postgres")
		}
	} else {
		log.Println("DATABASE_URL not set, running without persistence")
	}

	h := handler.New(database)
	mux := http.NewServeMux()
	h.Register(mux)

	fs := http.FileServer(http.Dir("./frontend/dist"))
	mux.Handle("/", fs)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8010"
	}

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      http.TimeoutHandler(handler.CORS(mux), 10*time.Second, "request timed out"),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("server listening on :%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	<-quit
	log.Println("shutting down...")

	h.Stop()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("forced shutdown: %v", err)
	}
	log.Println("server stopped")
}
