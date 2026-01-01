// src/db/messages.ts
import { db } from "./sqlite.ts";

/* =====================
   TYPES
===================== */

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

/* =====================
   TABLE INIT
===================== */

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );
`);

/* =====================
   SAVE MESSAGE
===================== */

export function saveMessage(
  conversationId: number,
  role: "user" | "assistant",
  text: string
) {
  return db
    .prepare(`
      INSERT INTO messages
      (conversation_id, role, content, created_at)
      VALUES (?, ?, ?, ?)
    `)
    .run(conversationId, role, text, Date.now());
}

/* =====================
   GET MESSAGES
===================== */

export function getMessages(
  conversationId: number
): ChatMessage[] {
  return db
    .prepare(`
      SELECT role, content
      FROM messages
      WHERE conversation_id = ?
      ORDER BY id ASC
    `)
    .all(conversationId) as ChatMessage[];
}
