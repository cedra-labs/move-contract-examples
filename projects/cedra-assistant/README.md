# Cedra Assistant

A privacy-focused AI assistant for Cedra accounts, transactions, and official documentation

---

## 📌 Overview

Cedra Assistant is a developer-friendly AI chatbot designed to help users interact with the Cedra ecosystem. It supports:

* 🔍 **Account exploration**
* 🔎 **Transaction analysis**
* 📚 **Official documentation Q&A** (RAG-powered, strict source usage)
* 💬 **Persistent chat history** per user
* 🔐 **Privacy-first architecture**

The assistant is built with accuracy, safety, and usability as first-class goals.

---

## 🎯 Problem Statement

Developers and users interacting with Cedra face several challenges:
* Difficulty understanding on-chain data (transactions, accounts)
* Fragmented documentation spread across multiple sources
* Risk of AI hallucinations when asking protocol-specific questions
* Poor UX in existing explorers for beginners
* Privacy concerns when storing chat history

This project solves these problems with a strict, source-grounded AI assistant that only answers Cedra-related questions using official documentation and on-chain data.

---

## ✅ Solution Summary

Cedra Assistant provides:
* **Explorer Mode:** View Cedra accounts and transactions with human-readable explanations of on-chain activity.
* **Cedra Strict Mode (RAG):** Answers only from verified Cedra sources and refuses to guess when data is missing.
* **Chat History & Sidebar:** Conversations grouped per user with persistent storage via SQLite and sidebar navigation.
* **Privacy-First Design:** No third-party analytics, local database storage, and encryption support for message content.

---

## 🧱 Architecture

### High-Level Components




Frontend (HTML/CSS/JS)
│
├── Chat UI
├── Sidebar (Conversations)
└── Explorer Cards
│
Backend (Node.js + Express)
│
├── Agent (LLM logic)
│   ├── Intent Detection
│   ├── Tool Routing
│   └── RAG (Strict Mode)
│
├── Explorer Tools
│   ├── Account Explorer
│   └── Transaction Explorer
│
├── Database (SQLite)
│   ├── Users
│   ├── Conversations
│   └── Messages
│
└── AI Layer
    ├── Gemini (LLM)
    ├── Embeddings
    └── Vector Retrieval


# 🧠 AI & RAG Design

### How RAG Works (No Keywords Required)
1. **Embedding Generation**: User questions are converted into high-dimensional vector embeddings.
2. **Semantic Retrieval**: Relevant documentation chunks are retrieved based on mathematical similarity rather than keyword matching.
3. **Grounded Generation**: The AI is forced to answer only from the retrieved chunks.
4. **Safety Fallback**: If no verified data is found, the assistant refuses to answer to prevent hallucinations.

* ✔ No keyword matching
* ✔ No prompt hacks
* ✔ Fully semantic retrieval

---

# 🔍 Explorer Features

### Account Explorer
* **Address**: Unique identifier for the account.
* **Balance**: Automatically converted from the smallest unit to a readable format.
* **Resource count**: Number of resources held on-chain.
* **Published modules**: List of smart contracts associated with the account.

### Transaction Explorer
* **Transaction hash**: Unique ID of the event.
* **Sender & receiver**: Parties involved in the transfer.
* **Amount transferred**: Value of the transaction.
* **Gas usage**: Computational cost of execution.
* **Execution status**: Success/Failure tracking.
* **Human-readable explanation**: AI-generated summary of what the transaction actually did.

---

# 🔐 Privacy & Security
* **Canonical Identity**: Conversations tied to `user.email`.
* **Local Storage**: Messages stored locally in **SQLite**.
* **Encryption**: Optional encryption layer for message content.
* **Zero External Logging**: No external logging of user conversations.
* **Access Control**: Strict ownership checks on all conversation routes.

---

# 🗃️ Database Schema

### Users
| Field | Type | Constraints |
| :--- | :--- | :--- |
| email | TEXT | PRIMARY KEY |
| name | TEXT | |
| created_at | INTEGER | |

### Conversations
| Field | Type | Constraints |
| :--- | :--- | :--- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| user_email | TEXT | FOREIGN KEY (Users.email) |
| title | TEXT | |
| updated_at | INTEGER | |

### Messages
| Field | Type | Constraints |
| :--- | :--- | :--- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| conversation_id| INTEGER | FOREIGN KEY (Conversations.id) |
| role | TEXT | |
| content | TEXT | |
| created_at | INTEGER | |

---

# 🚀 Getting Started

### 1️⃣ Prerequisites
* Node.js ≥ 18
* npm or pnpm
* Cedra REST endpoint
* Gemini API key
* Google OAuth credentials (optional but recommended)

### 2️⃣ Installation
```bash
git clone [https://github.com/your-org/cedra-assistant](https://github.com/your-org/cedra-assistant)
cd cedra-assistant
npm install

3️⃣ Environment Variables
Create a .env file in the root directory:

Code snippet

GEMINI_API_KEY=your_key_here
CEDRA_REST_URL=[https://testnet.cedra.dev](https://testnet.cedra.dev)
SESSION_SECRET=your_secret
GOOGLE_CLIENT_ID=optional
GOOGLE_CLIENT_SECRET=optional
4️⃣ Run Database Initialization
SQLite auto-initializes on the first run.

5️⃣ Start the Server
Bash

npm run dev
The server will run at: http://localhost:3000

🧪 Testing Instructions
Start server.

Login via Google OAuth or session.

Ask:

A Cedra transaction hash → Explorer card appears.

A wallet address → Account overview appears.

Cedra documentation questions → RAG answers.

Try switching chats via the sidebar.

Try invalid questions → The assistant safely refuses to answer.

📖 Usage Examples
Example 1 — Account Lookup: 0xabc123...

Example 2 — Transaction Analysis: Explain this transaction 0xdef456...

Example 3 — Documentation Question: How do I initialize a Cedra client using the TypeScript SDK?

🧰 Tech Stack
Frontend: Vanilla HTML / CSS / JavaScript

Backend: Node.js, Express

Database: SQLite (better-sqlite3)

AI: Gemini API

RAG: Embeddings + Vector Retrieval

Auth: Passport.js (Google OAuth)

🧩 Design Decisions
SQLite: Chosen for simplicity and hackathon speed.

Strict RAG Mode: Implemented to prioritize accuracy and prevent hallucinations.

Readable Output: Focused on human-readable explorer data for non-developer users.

Minimalist UI: Designed for maximum clarity and performance.

⚠️ Known Limitations
SQLite is not intended for massive scale (acceptable for hackathon).

UI animations are intentionally minimal.

Vector store is currently local (can be upgraded to a dedicated vector DB).

🛠️ Future Improvements
[ ] Streaming responses

[ ] Syntax-highlighted code blocks

[ ] Client-side encryption (true E2EE)

[ ] Advanced filtering for explorer data

[ ] Mobile-optimized UI
