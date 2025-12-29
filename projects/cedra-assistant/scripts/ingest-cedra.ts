import { ingestCedra } from "../src/rag/ingest.js";

(async () => {
  const chunks = await ingestCedra();
  console.log(`Ingested ${chunks.length} chunks`);
})();
