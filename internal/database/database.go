package database

import (
	"database/sql"
	"fmt"
	"log/slog"

	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

type DB struct {
	*sqlx.DB
}

func Open(dbPath string) (*DB, error) {
	db, err := sqlx.Open("sqlite", dbPath)
	if err != nil {
		slog.Error("failed to open sqlite", "path", dbPath, "error", err)
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	if err := applyPragmas(db); err != nil {
		slog.Error("failed to apply pragmas", "error", err)
		_ = db.Close()
		return nil, err
	}

	if err := createTables(db); err != nil {
		slog.Error("failed to create tables", "error", err)
		_ = db.Close()
		return nil, err
	}

	if err := runMigrations(db); err != nil {
		slog.Error("failed to run migrations", "error", err)
		_ = db.Close()
		return nil, err
	}

	slog.Info("database ready", "path", dbPath)
	return &DB{db}, nil
}

func applyPragmas(db *sqlx.DB) error {
	pragmas := []string{
		"PRAGMA journal_mode = WAL",
		"PRAGMA synchronous = NORMAL",
		"PRAGMA cache_size = -64000",
		"PRAGMA temp_store = MEMORY",
		"PRAGMA mmap_size = 134217728",
		"PRAGMA page_size = 4096",
		"PRAGMA foreign_keys = ON",
	}
	for _, p := range pragmas {
		if _, err := db.Exec(p); err != nil {
			return fmt.Errorf("pragma %q: %w", p, err)
		}
	}
	return nil
}

func createTables(db *sqlx.DB) error {
	ddl := []string{
		`CREATE TABLE IF NOT EXISTS competitions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			description TEXT DEFAULT '',
			settings TEXT DEFAULT '{}',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS teams (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			competition_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS participants (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			team_id INTEGER NOT NULL,
			full_name TEXT NOT NULL,
			gender TEXT CHECK (gender IN ('М','Ж')),
			birth_date TEXT,
			age INTEGER NOT NULL CHECK(age >= 0),
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS stages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			competition_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(competition_id, name),
			FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS stage_results (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			stage_id INTEGER NOT NULL,
			participant_id INTEGER NOT NULL,
			time_seconds REAL NOT NULL DEFAULT 0,
			penalty_points INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(stage_id, participant_id),
			FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE CASCADE,
			FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
		)`,
		`CREATE INDEX IF NOT EXISTS idx_teams_competition ON teams(competition_id)`,
		`CREATE INDEX IF NOT EXISTS idx_participants_team ON participants(team_id)`,
		`CREATE INDEX IF NOT EXISTS idx_stages_competition ON stages(competition_id)`,
		`CREATE INDEX IF NOT EXISTS idx_results_stage ON stage_results(stage_id)`,
		`CREATE INDEX IF NOT EXISTS idx_results_participant ON stage_results(participant_id)`,
		`CREATE INDEX IF NOT EXISTS idx_results_stage_participant ON stage_results(stage_id, participant_id)`,
		`CREATE INDEX IF NOT EXISTS idx_results_participant_stage ON stage_results(participant_id, stage_id)`,
		`CREATE INDEX IF NOT EXISTS idx_teams_competition_name ON teams(competition_id, name)`,
		`CREATE INDEX IF NOT EXISTS idx_participants_age ON participants(age)`,
		`CREATE INDEX IF NOT EXISTS idx_participants_gender ON participants(gender)`,
		`CREATE INDEX IF NOT EXISTS idx_results_penalties ON stage_results(penalty_points)`,
		`CREATE INDEX IF NOT EXISTS idx_results_time ON stage_results(time_seconds)`,
	}

	for _, stmt := range ddl {
		if _, err := db.Exec(stmt); err != nil {
			return fmt.Errorf("create table/index: %w", err)
		}
	}
	return nil
}

func runMigrations(db *sqlx.DB) error {
	migrations := []struct {
		sql string
	}{
		{"ALTER TABLE competitions ADD COLUMN description TEXT DEFAULT ''"},
		{"ALTER TABLE competitions ADD COLUMN settings TEXT DEFAULT '{}'"},
		{"ALTER TABLE participants ADD COLUMN birth_date TEXT"},
	}

	for _, m := range migrations {
		// already applied — skip silently
		_, _ = db.Exec(m.sql)
	}

	// Migrate stages: add order_index
	var hasOrderIndex bool
	rows, err := db.Query("PRAGMA table_info(stages)")
	if err != nil {
		return fmt.Errorf("check stages schema: %w", err)
	}
	defer func() { _ = rows.Close() }()
	for rows.Next() {
		var cid int
		var name, ctype string
		var notnull, pk int
		var dflt sql.NullString
		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dflt, &pk); err != nil {
			return fmt.Errorf("scan stages schema: %w", err)
		}
		if name == "order_index" {
			hasOrderIndex = true
		}
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate stages schema: %w", err)
	}
	if !hasOrderIndex {
		if _, err := db.Exec("ALTER TABLE stages ADD COLUMN order_index INTEGER DEFAULT 0"); err != nil {
			return fmt.Errorf("add order_index: %w", err)
		}
		if _, err := db.Exec("UPDATE stages SET order_index = id WHERE order_index = 0"); err != nil {
			return fmt.Errorf("update order_index: %w", err)
		}
		slog.Info("migration applied", "column", "order_index")
	}

	if _, err := db.Exec("CREATE INDEX IF NOT EXISTS idx_stages_competition_order ON stages(competition_id, order_index)"); err != nil {
		return fmt.Errorf("create stages order index: %w", err)
	}

	return nil
}

func (db *DB) Close() error {
	return db.DB.Close()
}
