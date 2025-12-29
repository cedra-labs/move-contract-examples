import fetch from "node-fetch";

const API_KEY = process.env.GEMINI_API_KEY!;

/* =====================================================
   TYPES
===================================================== */

type GeminiGenerateResponse = {
  candidates?: {
    content?: {
      parts?: {
        text?: string;
      }[];
    };
  }[];
};

/* =====================================================
   GENERATE ANSWER
===================================================== */

export async function generateAnswer(
  prompt: string
): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const json = (await res.json()) as GeminiGenerateResponse;

  const text =
    json.candidates?.[0]?.content?.parts?.[0]?.text;

  if (typeof text === "string" && text.trim().length > 0) {
    return text;
  }

  return "I don’t know based on the available Cedra documentation.";
}
