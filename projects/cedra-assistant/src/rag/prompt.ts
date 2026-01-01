import { RagChunk } from "./retrieve";

export function buildCedraPrompt(
  question: string,
  chunks: RagChunk[]
): string {
  if (chunks.length === 0) {
    return `
You are a Cedra documentation assistant.

The user asked:
"${question}"

There is NO relevant information in the official Cedra documentation.
Reply exactly with:
"I don’t know based on the available Cedra documentation."

Do NOT guess.
`.trim();
  }

  const context = chunks
    .map(
      c =>
        `Repo: ${c.repo}\nFile: ${c.path}\nContent:\n${c.text}`
    )
    .join("\n\n---\n\n");

  return `
You are a Cedra documentation assistant.

Rules:
- Answer ONLY using the context below
- Do NOT use outside knowledge
- If the answer is incomplete, say you don't know

Context:
${context}

Question:
${question}

Answer:
`.trim();
}
