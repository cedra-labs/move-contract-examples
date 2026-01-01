// src/db/users.ts
import { db } from "./sqlite.ts";

/* =====================
   TABLE INIT
===================== */

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at INTEGER NOT NULL
  );
`);

/* =====================
   TYPES
===================== */

export type User = {
  id: number;
  email: string;
  name: string;
  createdAt: number;
};

/* =====================
   GET OR CREATE USER
===================== */

export function getOrCreateUser(email: string, name: string): User {
  const existing = db
    .prepare(`SELECT * FROM users WHERE email = ?`)
    .get(email) as any;

  if (existing) {
    return {
      id: existing.id,
      email: existing.email,
      name: existing.name,
      createdAt: existing.created_at
    };
  }

  const result = db
    .prepare(`
      INSERT INTO users (email, name, created_at)
      VALUES (?, ?, ?)
    `)
    .run(email, name, Date.now());

  return {
    id: result.lastInsertRowid as number,
    email,
    name,
    createdAt: Date.now()
  };
}
