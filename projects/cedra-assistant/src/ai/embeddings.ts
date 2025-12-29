import { GoogleGenerativeAI } from "@google/generative-ai";

export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "text-embedding-004"
  });

  const result = await model.embedContent(text);
  return result.embedding.values;
}
