import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import passport from "passport";

import "./auth/google.ts"; // ✅ MUST be .js
import { chatRouter } from "./routes/chatRoutes.ts";

export function createServer() {
  const app = express();

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  app.use(cors());
  app.use(express.json());

  // Sessions
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "dev-secret",
      resave: false,
      saveUninitialized: false
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // Serve frontend
  app.use(express.static(path.join(__dirname, "../public")));

  // 🔐 Google OAuth routes (REQUIRED)
  app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/" }),
    (req, res) => {
      res.redirect("/");
    }
  );

  // Auth helpers
  app.get("/auth/me", (req, res) => {
    res.json({ user: req.user ?? null });
  });

  app.get("/auth/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });

  // API routes
  app.use("/api/chat", chatRouter);

  return app;
}
