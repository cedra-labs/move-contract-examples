import dotenv from "dotenv";
dotenv.config();

/* =====================
   PROCESS SAFETY
===================== */

process.on("uncaughtException", err => {
  console.error("🔥 UNCAUGHT EXCEPTION");
  console.error(err instanceof Error ? err.stack : err);
});

process.on("unhandledRejection", err => {
  console.error("🔥 UNHANDLED PROMISE REJECTION");
  console.error(err instanceof Error ? err.stack : err);
});

/* =====================
   DEBUG
===================== */

console.log(">>> INDEX.TS LOADED <<<");
console.log("Gemini key loaded:", !!process.env.GEMINI_API_KEY);
console.log("Google OAuth enabled:", !!process.env.GOOGLE_CLIENT_ID);
console.log("Passport strategies:", Object.keys((passport as any)._strategies));

/* =====================
   IMPORTS
===================== */

import express from "express";
import passport from "passport";
import session from "express-session";
import { getOrCreateUser } from "./db/users.ts";
import { mergeAnonymousChats } from "./agent/memory.ts"; // ⬅️ NEW (will add next)
import "./auth/google.ts";
import { chatRouter } from "./routes/chatRoutes.ts";
import { conversationRouter } from "./routes/conversationRoutes.ts";
/* =====================
   APP SETUP
===================== */

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false
  })
);

app.use(passport.initialize());
app.use(passport.session());

/* =====================
   AUTH ROUTES
===================== */

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    const user = req.user as any;
    const sessionId = req.sessionID;

    // Create user if first login
    getOrCreateUser(user.email, user.name);

    // 🔁 Merge anonymous chats into user chats
    mergeAnonymousChats(sessionId, user.email);

    res.redirect("/");
  }
);

app.use("/api", conversationRouter);

/* =====================
   API ROUTES
===================== */

app.use("/api", chatRouter);

/* =====================
   STATIC UI
===================== */

app.use(express.static("public"));

/* =====================
   AUTH STATE (FOR UI)
===================== */

app.get("/auth/me", (req, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }

  const user = req.user as any;

  res.json({
    user: {
      email: user.email,
      name: user.name
    }
  });
});

app.get("/auth/logout", (req, res) => {
  req.logout(() => {
    // You can destroy the session if you want:
    req.session.destroy(err => {
      res.redirect("/");
    });
  });
});


/* =====================
   START SERVER
===================== */

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
