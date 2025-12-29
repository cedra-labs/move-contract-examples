import { embedQuestion } from "./embed";
import { retrieveCedraChunks } from "./retrieve";
import { buildCedraPrompt } from "./prompt";
import { generateAnswer } from "./answer";

export async function answerCedra(question: string): Promise<string> {
  const embedding = await embedQuestion(question);

  const chunks = await retrieveCedraChunks(embedding, 6);

  const prompt = buildCedraPrompt(question, chunks);

  return generateAnswer(prompt);
}
