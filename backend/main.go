package main

import (
	"log"
	"net/http"
	"os"

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

	log.Printf("server listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, handler.CORS(mux)))
}
