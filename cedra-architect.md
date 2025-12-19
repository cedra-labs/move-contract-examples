Summary

This PR adds The Cedra Architect, an AI-powered infrastructure tool designed to bridge the gap between EVM development and Cedra Move. It serves as a "Public Good" to accelerate developer migration by translating not just syntax, but entire architectural patterns.

Features

Rosetta Bridge: Translates Solidity/Rust smart contracts into idiomatic Cedra Move, automatically converting centralized mappings to decentralized Resources.

A.I.R. Optimizer: Scans generated Move code for gas inefficiencies and security flaws (e.g., missing acquires checks).

Lorekeeper: Instantly generates official-standard technical documentation for any Move module.

Zero-Setup Client: Runs entirely browser-side using the latest Gemini 3 Flash model for real-time performance.

Implementation Notes

Architecture: Built as a lightweight, single-file SPA (index.html) to ensure maximum portability and ease of hosting.

AI Engine: Leverages gemini-3-flash-preview with specialized system prompts ("God Tier" prompts) to enforce Cedra-specific resource safety rules (has key, store).

Safety: The translation logic specifically enforces the "Resource-Oriented" model, preventing common "Account-Based" logic errors during migration.

Tests

✅ Translation Test: Verified accurate conversion of Solidity mapping(address => uint) to Move struct Resource has key pattern.

✅ Audit Test: Verified detection of inefficient loops and redundant storage operations in the A.I.R. module.

✅ Docs Test: Verified generation of Markdown documentation consistent with Cedra technical standards.

Telegram: @Sinox006

Live Demo: https://sinanzx3473-web.github.io/cedra-architect/
