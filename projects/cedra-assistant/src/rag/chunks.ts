/* =====================================================
   CHUNK CONFIG TYPES
===================================================== */

export type ChunkConfig = {
  size: number;
  overlap: number;
  type: "code" | "doc" | "config";
};

/* =====================================================
   FILE-TYPE–AWARE CHUNK CONFIG
===================================================== */

export function getChunkConfig(ext: string): ChunkConfig | null {
  switch (ext) {
    /* -----------------------------
       CODE FILES
    ----------------------------- */
    case ".ts":
    case ".js":
    case ".rs":
    case ".go":
    case ".py":
    case ".sol":
      return {
        size: 1200,
        overlap: 150,
        type: "code",
      };

    /* -----------------------------
       DOCUMENTATION
    ----------------------------- */
    case ".md":
    case ".mdx":
    case ".txt":
      return {
        size: 900,
        overlap: 120,
        type: "doc",
      };

    /* -----------------------------
       CONFIG FILES
       (optional but useful)
    ----------------------------- */
    case ".json":
    case ".yaml":
    case ".yml":
    case ".toml":
      return {
        size: 700,
        overlap: 100,
        type: "config",
      };

    /* -----------------------------
       SKIP EVERYTHING ELSE
    ----------------------------- */
    default:
      return null;
  }
}

/* =====================================================
   TEXT CHUNKING (SLIDING WINDOW)
===================================================== */

export function chunkText(
  text: string,
  size: number,
  overlap: number
): string[] {
  const chunks: string[] = [];

  if (text.length <= size) {
    return [text];
  }

  let start = 0;

  while (start < text.length) {
    const end = start + size;
    const chunk = text.slice(start, end);

    chunks.push(chunk);

    start += size - overlap;
  }

  return chunks;
}
