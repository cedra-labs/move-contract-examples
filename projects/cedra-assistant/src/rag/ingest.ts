import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import fetch from "node-fetch";
import { fileURLToPath } from "url";

import { walkFiles } from "./walk.ts";
import { chunkText, getChunkConfig } from "./chunks.ts";
import { CEDRA_REPOS } from "./sources.ts";

/* =====================================================
   ESM FIXES
===================================================== */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =====================================================
   ENV (SERVICE ROLE REQUIRED)
===================================================== */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

/* =====================================================
   CONFIG
===================================================== */

const BASE_DIR = path.join(__dirname, ".rag-repos");
const MAX_BATCH_SIZE = 50;

/* =====================================================
   TYPES
===================================================== */

type GeminiBatchEmbedResponse = {
  embeddings: {
    values: number[];
  }[];
};

type VectorRow = {
  id: string;
  text: string;
  embedding: number[];
  repo: string;
  path: string;
  branch: string;
  type: string;
  chunk_index: number;
};

/* =====================================================
   GEMINI — BATCH EMBEDDINGS
===================================================== */

async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: texts.map(text => ({
          model: "models/text-embedding-004",
          content: { parts: [{ text }] },
        })),
      }),
    }
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const json = (await res.json()) as GeminiBatchEmbedResponse;

  if (!Array.isArray(json.embeddings)) {
    throw new Error("Invalid Gemini embedding response");
  }

  return json.embeddings.map(e => e.values);
}

/* =====================================================
   SUPABASE UPSERT
===================================================== */

async function upsert(rows: VectorRow[]) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/rag_chunks?on_conflict=id`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(rows),
    }
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }
}

/* =====================================================
   INGEST SINGLE REPO
===================================================== */

async function ingestRepo(repo: {
  name: string;
  url: string;
  branch: string;
}) {
  const repoDir = path.join(BASE_DIR, repo.name);

  if (!fs.existsSync(BASE_DIR)) {
    fs.mkdirSync(BASE_DIR);
  }

  if (!fs.existsSync(repoDir)) {
    console.log(`📥 Cloning ${repo.name}...`);
    execSync(
      `git clone --depth=1 -b ${repo.branch} ${repo.url} ${repoDir}`,
      { stdio: "inherit" }
    );
  } else {
    console.log(`🔄 Updating ${repo.name}...`);
    execSync(`git -C ${repoDir} pull`, { stdio: "inherit" });
  }

  const files = walkFiles(repoDir);
  console.log(`📄 Eligible files: ${files.length}`);

  let buffer: Omit<VectorRow, "embedding">[] = [];

  for (const f of files) {
    let raw = "";
    try {
      raw = fs.readFileSync(f.fullPath, "utf-8");
    } catch {
      continue;
    }

    if (!raw.trim()) continue;

    const ext = path.extname(f.fullPath);
    const cfg = getChunkConfig(ext);
    if (!cfg) continue;

    const chunks = chunkText(raw, cfg.size, cfg.overlap);

    for (let i = 0; i < chunks.length; i++) {
      buffer.push({
        id: `${repo.name}:${f.relPath}:${i}`,
        text: chunks[i],
        repo: repo.name,
        path: f.relPath,
        branch: repo.branch,
        type: cfg.type,
        chunk_index: i,
      });

      if (buffer.length === MAX_BATCH_SIZE) {
        await flush(buffer);
        buffer = [];
      }
    }
  }

  if (buffer.length > 0) {
    await flush(buffer);
  }
}

/* =====================================================
   FLUSH (HARDENED)
===================================================== */

async function flush(
  buffer: Omit<VectorRow, "embedding">[]
) {
  console.log(`🔹 Embedding ${buffer.length} chunks...`);

  let embeddings: number[][];
  try {
    embeddings = await embedBatch(buffer.map(b => b.text));
  } catch (err) {
    console.error("❌ Embedding batch failed, skipping batch");
    console.error(err);
    return;
  }

  const rows: VectorRow[] = [];

  for (let i = 0; i < buffer.length; i++) {
    const emb = embeddings[i];

    if (!Array.isArray(emb) || emb.length !== 768) {
      console.warn(
        `⚠️ Skipping invalid embedding for`,
        buffer[i].id
      );
      continue;
    }

    rows.push({
      ...buffer[i],
      embedding: emb,
    });
  }

  if (rows.length === 0) {
    console.warn("⚠️ No valid vectors in batch, skipping upsert");
    return;
  }

  try {
    await upsert(rows);
    console.log(`✅ Upserted ${rows.length} vectors`);
  } catch (err) {
    console.error("❌ Supabase upsert failed, skipping batch");
    console.error(err);
  }
}

/* =====================================================
   RUN (REPO-LEVEL ISOLATION)
===================================================== */

(async () => {
  console.log("🚀 Starting ingestion...");

  for (const repo of CEDRA_REPOS) {
    try {
      console.log(`\n📦 Processing ${repo.name}`);
      await ingestRepo(repo);
    } catch (err) {
      console.error(`❌ Repo failed: ${repo.name}`);
      console.error(err);
      console.log("➡️ Continuing with next repo...");
      continue;
    }
  }

  console.log("✅ Ingestion finished (with possible skips)");
  process.exit(0);
})();
