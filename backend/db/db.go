package db

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"

	_ "github.com/lib/pq"

	"deepcode/pipeline"
)

type DB struct {
	conn *sql.DB
}

type HistoryEntry struct {
	ID        int             `json:"id"`
	Source    string          `json:"source"`
	Result    json.RawMessage `json:"result"`
	CreatedAt time.Time       `json:"createdAt"`
}

func New(connStr string) (*DB, error) {
	conn, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("db open: %w", err)
	}
	if err := conn.Ping(); err != nil {
		return nil, fmt.Errorf("db ping: %w", err)
	}
	db := &DB{conn: conn}
	if err := db.migrate(); err != nil {
		return nil, fmt.Errorf("db migrate: %w", err)
	}
	return db, nil
}

func (db *DB) migrate() error {
	_, err := db.conn.Exec(`
		CREATE TABLE IF NOT EXISTS compilation_history (
			id SERIAL PRIMARY KEY,
			source TEXT NOT NULL,
			result JSONB NOT NULL,
			created_at TIMESTAMP DEFAULT NOW()
		)
	`)
	if err != nil {
		log.Printf("migration warning: %v", err)
	}
	return nil
}

func (db *DB) Save(source string, res *pipeline.CompileResult) (int, error) {
	data, err := json.Marshal(res)
	if err != nil {
		return 0, err
	}
	var id int
	err = db.conn.QueryRow(
		`INSERT INTO compilation_history (source, result) VALUES ($1, $2) RETURNING id`,
		source, data,
	).Scan(&id)
	return id, err
}

func (db *DB) List(limit int) ([]HistoryEntry, error) {
	if limit <= 0 {
		limit = 20
	}
	rows, err := db.conn.Query(
		`SELECT id, source, result, created_at FROM compilation_history ORDER BY created_at DESC LIMIT $1`,
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []HistoryEntry
	for rows.Next() {
		var e HistoryEntry
		if err := rows.Scan(&e.ID, &e.Source, &e.Result, &e.CreatedAt); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, nil
}

func (db *DB) Get(id int) (*HistoryEntry, error) {
	var e HistoryEntry
	err := db.conn.QueryRow(
		`SELECT id, source, result, created_at FROM compilation_history WHERE id = $1`, id,
	).Scan(&e.ID, &e.Source, &e.Result, &e.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &e, nil
}

func (db *DB) SaveRaw(source string, data json.RawMessage) (int, error) {
	var id int
	err := db.conn.QueryRow(
		`INSERT INTO compilation_history (source, result) VALUES ($1, $2) RETURNING id`,
		source, data,
	).Scan(&id)
	return id, err
}

func (db *DB) Close() {
	if db.conn != nil {
		db.conn.Close()
	}
}
