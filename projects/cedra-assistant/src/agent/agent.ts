import type {
  ExplorerTransaction,
  ExplorerAccount
} from "../tools/explorer/types.ts";

import { detectIntent, detectToolIntent } from "./intent.ts";
import { SYSTEM_PROMPT } from "./prompts.ts";
import { generateText } from "../ai/gemini.ts";
import { retrieveCedraChunks } from "../rag/retrieve.ts";
import { embedText } from "../ai/embeddings.ts";
import type { ChatMessage } from "../types/chat.ts";
import { formatText } from "../utils/textClean.ts";
import { decideFormatMode } from "../utils/formatDecisions.ts";
import { runTool } from "../tools/index.ts";

import { decodeTransfer } from "../tools/explorer/eventDecoder.ts";
import { octasToCed } from "../tools/explorer/utils.ts";
import { explainTransaction } from "../tools/explorer/explain.ts";

/* =====================================================
   OUTPUT SANITIZER (CRITICAL)
===================================================== */

function sanitizeLLMOutput(raw: string): string {
  if (!raw) return "";

  return raw
    // Fix broken protocol separators
    .replace(/https?\s*[–—-]\s*\/\//g, "https://")

    // Fix TypeScript object syntax mistakes
    .replace(/\b(\w+)\s*=\s*/g, "$1: ")

    // Normalize smart quotes
    .replace(/[“”]/g, `"`)
    .replace(/[‘’]/g, `'`)

    // Remove empty fenced code blocks
    .replace(/```[a-z]*\s*```/gi, "")

    // Trim excess whitespace
    .trim();
}

/* =====================================================
   MAIN AGENT
===================================================== */

export async function runAgent(
  message: string,
  history: ChatMessage[]
): Promise<string> {
  const intent = detectIntent(message);
  const toolIntent = detectToolIntent(message);

  const formatMode = decideFormatMode(intent, message);

  /* =============================
     ACCOUNT EXPLORER
  ============================= */

  if (toolIntent === "EXPLORER_ACCOUNT") {
    const address = message.match(/0x[a-f0-9]{40,}/i)?.[0];

    if (!address) {
      return "Please provide a valid Cedra account address.";
    }

    try {
      const acc = (await runTool(
        "EXPLORER_ACCOUNT",
        address
      )) as ExplorerAccount;

      let output = `Cedra Account Overview\n\n`;
      output += `Address: ${acc.address}\n`;

      if (acc.balance) {
        output += `Balance: ${octasToCed(acc.balance)} CED\n`;
      } else {
        output += `Balance: Not available\n`;
      }

      output += `Resources: ${acc.resources.length}\n`;
      output += `Published Modules: ${acc.modules.length}\n`;

      if (acc.modules.length > 0) {
        output += `\nModules:\n`;
        for (const m of acc.modules) {
          output += `• ${m.name}\n`;
        }
      }

      return formatText(sanitizeLLMOutput(output), formatMode);
    } catch {
      return "I couldn’t find this account on the Cedra network. Please check the address and try again.";
    }
  }

  /* =============================
     TRANSACTION EXPLORER
  ============================= */

  if (toolIntent === "EXPLORER_TX") {
    const txHash = message.match(/0x[a-f0-9]{40,}/i)?.[0];

    if (!txHash) {
      return "Please provide a valid Cedra transaction hash.";
    }

    try {
      const tx = (await runTool(
        "EXPLORER_TX",
        txHash
      )) as ExplorerTransaction;

      const transfer = decodeTransfer(tx);

      let output = `Here’s what happened in this transaction:\n\n`;
      output += `Transaction Hash: ${tx.hash}\n`;
      output += `Sender: ${tx.sender}\n`;
      output += `Status: ${tx.success ? "Success" : "Failed"}\n`;
      output += `Gas Used: ${tx.gasUsed}\n`;

      if (tx.function) {
        output += `Executed Function: ${tx.function}\n`;
      }

      if (transfer.amountOctas) {
        output += `Amount Transferred: ${octasToCed(
          transfer.amountOctas
        )} CED\n`;
      }

      if (transfer.receiver) {
        output += `Receiver: ${transfer.receiver}\n`;
      }

      if (!tx.success && tx.vmStatus) {
        output += `Failure Reason: ${tx.vmStatus}\n`;
      }

      output += `\nExplanation:\n${explainTransaction(tx)}\n`;

      return formatText(sanitizeLLMOutput(output), formatMode);
    } catch {
      return "I couldn’t find this transaction on the Cedra network. Please check the hash and try again.";
    }
  }

  /* =============================
     CEDRA STRICT MODE (RAG)
  ============================= */

  if (intent === "CEDRA") {
    const queryEmbedding = await embedText(message);
    const chunks = await retrieveCedraChunks(queryEmbedding);

    if (chunks.length === 0) {
      return (
        "I don’t have verified Cedra documentation to answer this question yet. " +
        "I prefer not to guess."
      );
    }

    let context = "Use ONLY the following official Cedra documentation:\n\n";
    for (const chunk of chunks) {
      context += `${chunk.text}\n\n`;
    }

    const cedraPrompt =
      SYSTEM_PROMPT +
      "\n\n" +
      context +
      `Answer strictly using the sources above.\n` +
      `Question: ${message}\n` +
      `Answer:`;

    const raw = await generateText(cedraPrompt);
    return formatText(sanitizeLLMOutput(raw), formatMode);
  }

  /* =============================
     GENERAL MODE
  ============================= */

  let prompt = SYSTEM_PROMPT.trim() + "\n\n";

  for (const msg of history) {
    prompt += `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}\n`;
  }

  prompt += "User: ";

  switch (intent) {
    case "EXPLAIN":
      prompt += `Explain clearly:\n${message.replace(/^explain\s+/i, "")}`;
      break;
    case "SUMMARIZE":
      prompt += `Summarize concisely:\n${message.replace(/^summarize\s+/i, "")}`;
      break;
    default:
      prompt += message;
  }

  prompt += "\nAssistant:";

  const raw = await generateText(prompt);
  return formatText(sanitizeLLMOutput(raw), formatMode);
}
