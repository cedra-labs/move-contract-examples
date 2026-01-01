import fetch from "node-fetch";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!;

/* =====================================================
   TYPES
===================================================== */

export type RagChunk = {
  text: string;
  repo: string;
  path: string;
  similarity: number;
};

/* =====================================================
   RETRIEVE CHUNKS
===================================================== */

export async function retrieveCedraChunks(
  embedding: number[],
  limit = 6
): Promise<RagChunk[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/match_rag_chunks`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query_embedding: embedding,
        match_count: limit,
        repo_filter: null ,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const json = (await res.json()) as unknown;

  if (!Array.isArray(json)) {
    throw new Error("Invalid Supabase RPC response (expected array)");
  }

  // Runtime validation (lightweight, hackathon-safe)
  return json.map((row: any) => ({
    text: String(row.text),
    repo: String(row.repo),
    path: String(row.path),
    similarity: Number(row.similarity),
  }));
}
