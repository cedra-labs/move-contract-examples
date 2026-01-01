// src/db/conversations.ts
import { db } from "./sqlite.ts";

/* =====================
   TABLE INIT
===================== */

db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    title TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

/* =====================
   CREATE CONVERSATION
===================== */

export function createConversation(
  userEmail: string,
  firstMessage: string
) {
  // 🔑 Derive title from first message
  const clean = firstMessage.trim().replace(/\s+/g, " ");

  const title =
    clean.length > 40
      ? clean.slice(0, 40) + "…"
      : clean || "New chat";

  const result = db
    .prepare(`
      INSERT INTO conversations (user_email, title, updated_at)
      VALUES (?, ?, ?)
    `)
    .run(userEmail, title, Date.now());

  return {
    id: Number(result.lastInsertRowid),
    title
  };
}

/* =====================
   TOUCH CONVERSATION
===================== */

export function touchConversation(id: number) {
  db.prepare(`
    UPDATE conversations
    SET updated_at = ?
    WHERE id = ?
  `).run(Date.now(), id);
}

/* =====================
   LIST CONVERSATIONS
===================== */

export function listConversations(userEmail: string) {
  return db
    .prepare(`
      SELECT id, title, updated_at
      FROM conversations
      WHERE user_email = ?
      ORDER BY updated_at DESC
    `)
    .all(userEmail);
}

/* =====================
   GET CONVERSATION (SECURITY)
===================== */

export function getConversationById(
  id: number,
  userEmail: string
) {
  return db
    .prepare(`
      SELECT *
      FROM conversations
      WHERE id = ? AND user_email = ?
    `)
    .get(id, userEmail);
}
