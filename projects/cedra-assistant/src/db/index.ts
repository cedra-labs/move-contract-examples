// src/db/index.ts
import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data.db");

export const db = new Database(dbPath);

// Enable WAL (better reliability)
db.pragma("journal_mode = WAL");
