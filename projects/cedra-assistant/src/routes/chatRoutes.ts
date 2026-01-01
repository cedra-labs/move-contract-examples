// src/routes/chatRoutes.ts

import { Router } from "express";
import { runAgent } from "../agent/agent.ts";
import {
  createConversation,
  touchConversation
} from "../db/conversations.ts";
import {
  saveMessage,
  getMessages
} from "../db/messages.ts";

export const chatRouter = Router();

/* =====================================================
   POST /api/chat
   Create or continue a conversation
===================================================== */
/**
 * Body:
 * {
 *   message: string,
 *   conversationId?: number
 * }
 */
chatRouter.post("/chat", async (req, res) => {
  const { message, conversationId } = req.body;

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      error: "Message must be a non-empty string"
    });
  }

  const user = req.user as any;

  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  let convoId = conversationId;

  try {
    /* =============================
       CREATE / TOUCH CONVERSATION
    ============================= */

    if (!convoId) {
      const convo = createConversation(
        user.email,                 // 🔑 stable user key
        message.slice(0, 60)        // 📝 short title
      );
      convoId = convo.id;
    } else {
      touchConversation(convoId);
    }

    /* =============================
       LOAD HISTORY (DB → AGENT)
    ============================= */

    const history = await getMessages(convoId);

    /* =============================
       SAVE USER MESSAGE
    ============================= */

    await saveMessage(convoId, "user", message);

    /* =============================
       RUN AGENT
    ============================= */

    const reply = await runAgent(message, history);

    /* =============================
       SAVE ASSISTANT MESSAGE
    ============================= */

    await saveMessage(convoId, "assistant", reply);

    /* =============================
       RESPONSE
    ============================= */

    res.json({
      conversationId: convoId,
      reply
    });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({
      error: "Internal server error"
    });
  }
});

/* =====================================================
   GET /api/chat/:conversationId/messages
   Load messages for sidebar / reload
===================================================== */

chatRouter.get("/:conversationId/messages", async (req, res) => {
  const user = req.user as any;

  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const conversationId = Number(req.params.conversationId);

  if (!conversationId) {
    return res.status(400).json({
      error: "Invalid conversation id"
    });
  }

  try {
    const messages = await getMessages(conversationId);
    res.json(messages);
  } catch (err) {
    console.error("Load messages error:", err);
    res.status(500).json({
      error: "Failed to load messages"
    });
  }
});
