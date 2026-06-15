import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'polls.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      poll_type TEXT NOT NULL CHECK(poll_type IN ('single', 'multiple')),
      max_choices INTEGER DEFAULT 1,
      expires_at TEXT,
      creator_token TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS options (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL,
      label TEXT NOT NULL,
      emoji TEXT,
      sort_order INTEGER NOT NULL,
      FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL,
      option_id TEXT NOT NULL,
      voter_fingerprint TEXT NOT NULL,
      voter_ip TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
      FOREIGN KEY (option_id) REFERENCES options(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_options_poll_id ON options(poll_id);
    CREATE INDEX IF NOT EXISTS idx_votes_poll_id ON votes(poll_id);
    CREATE INDEX IF NOT EXISTS idx_votes_poll_fp ON votes(poll_id, voter_fingerprint);
    CREATE INDEX IF NOT EXISTS idx_polls_creator_token ON polls(creator_token);
  `);

  console.log('Database initialized successfully.');
}
