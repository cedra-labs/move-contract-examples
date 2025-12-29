import fetch from "node-fetch";

const API_KEY = process.env.GEMINI_API_KEY!;
const MODEL = "models/text-embedding-004";

/* =====================================================
   TYPES
===================================================== */

type GeminiEmbedResponse = {
  embedding: {
    values: number[];
  };
};

/* =====================================================
   EMBED QUESTION
===================================================== */

export async function embedQuestion(
  question: string
): Promise<number[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: {
          parts: [{ text: question }],
        },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const json = (await res.json()) as GeminiEmbedResponse;

  if (!json.embedding || !Array.isArray(json.embedding.values)) {
    throw new Error("Invalid Gemini embedding response");
  }

  return json.embedding.values;
}
