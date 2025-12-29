// src/routes/conversationRoutes.ts

import { Router } from "express";
import {
  listConversations,
  getConversationById
} from "../db/conversations.ts";
import { getMessages } from "../db/messages.ts";

export const conversationRouter = Router();

/* =============================
   LIST CONVERSATIONS (SIDEBAR)
============================= */

conversationRouter.get("/conversations", (req, res) => {
  const user = req.user as any;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // 🔑 Canonical identity = email
  const conversations = listConversations(user.email);

  res.json(
    conversations.map((c: any) => ({
      id: c.id,
      title: c.title,
      updatedAt: c.updated_at
    }))
  );
});

/* =============================
   LOAD CONVERSATION MESSAGES
============================= */

conversationRouter.get(
  "/conversations/:id/messages",
  (req, res) => {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const convoId = Number(req.params.id);
    if (!Number.isInteger(convoId)) {
      return res.status(400).json({ error: "Invalid conversation id" });
    }

    // 🔒 Ownership check
    const convo = getConversationById(convoId, user.email);
    if (!convo) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const messages = getMessages(convoId);

    res.json({
      conversationId: convoId,
      messages
    });
  }
);

/* =============================
   DELETE CONVERSATION (OPTIONAL)
============================= */

// You don't *have* to expose this in UI yet,
// but having the API now saves pain later.
conversationRouter.delete(
  "/conversations/:id",
  (req, res) => {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const convoId = Number(req.params.id);
    if (!Number.isInteger(convoId)) {
      return res.status(400).json({ error: "Invalid conversation id" });
    }

    const convo = getConversationById(convoId, user.email);
    if (!convo) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Deleting the conversation will cascade-delete messages
    // (because of FK ON DELETE CASCADE)
    import("../db/sqlite.ts").then(({ db }) => {
      db.prepare(`DELETE FROM conversations WHERE id = ?`).run(convoId);
      res.json({ success: true });
    });
  }
);
