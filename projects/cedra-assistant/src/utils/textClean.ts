/* =====================================================
   Text formatting & cleanup utilities
   - Handles inline * lists
   - Supports bullets vs numbered steps
   - Hybrid intro + list
   - Optional sub-steps (1.1, 1.2)
   - Voice-friendly output
   - Auto-detects & formats code answers
===================================================== */

export function formatText(
  raw: string,
  mode: "bullets" | "numbers"
): string {
  if (!raw || typeof raw !== "string") {
    return "";
  }

  const text = raw.replace(/\r\n/g, "\n").trim();

  /* =====================================================
     0️⃣ CODE DETECTION (HIGHEST PRIORITY)
  ===================================================== */

  if (looksLikeCodeAnswer(text)) {
    return formatCodeAnswer(text);
  }

  /* =====================================================
     1️⃣ LIST HANDLING
  ===================================================== */

  // Split inline asterisk-separated or markdown-style lists
  const parts = text.split(/\s\*\s+|\n[-*]\s+/);

  // No list detected → plain cleaned text
  if (parts.length === 1) {
    return voiceClean(parts[0]);
  }

  // Hybrid list: intro + items
  const intro = voiceClean(parts.shift()!);
  let items = parts.map(voiceClean).filter(Boolean);

  if (mode === "numbers") {
    items = applySubSteps(items);
  }

  let output = intro + "\n\n";
  let index = 1;

  for (const item of items) {
    if (mode === "numbers") {
      output += `${index}. ${item}\n`;
      index++;
    } else {
      output += `• ${item}\n`;
    }
  }

  return output.trim();
}

/* =====================================================
   CODE DETECTION
===================================================== */

function looksLikeCodeAnswer(text: string): boolean {
  return (
    // Code fences
    text.includes("```") ||

    // Imports / exports
    /\b(import|export)\s+/.test(text) ||

    // Common language keywords
    /\b(function|const|let|var|class|async|await|return)\b/.test(text) ||

    // SDK usage patterns
    /\b(new\s+[A-Z]|Config\(|Client\(|SDK)\b/.test(text) ||

    // Semicolons + braces density
    (text.includes("{") && text.includes("}") && text.includes(";"))
  );
}

/* =====================================================
   CODE ANSWER FORMATTER
===================================================== */

function formatCodeAnswer(text: string): string {
  // Try to split explanation vs code
  const lines = text.split("\n");

  const codeLines: string[] = [];
  const explanationLines: string[] = [];

  for (const line of lines) {
    if (
      line.trim().startsWith("import ") ||
      line.trim().startsWith("export ") ||
      line.trim().startsWith("const ") ||
      line.trim().startsWith("async ") ||
      line.trim().startsWith("function ") ||
      line.trim().startsWith("{") ||
      line.trim().startsWith("}")
    ) {
      codeLines.push(line);
    } else {
      explanationLines.push(line);
    }
  }

  const explanation = voiceClean(
    explanationLines.join(" ").trim()
  );

  const code = codeLines.join("\n").trim();

  // Guess language (basic but effective)
  const lang =
    code.includes("from \"@cedra") || code.includes("typescript")
      ? "ts"
      : "js";

  let output = "";

  if (explanation) {
    output += explanation + "\n\n";
  }

  output += "```" + lang + "\n" + code + "\n```";

  return output.trim();
}

/* =====================================================
   Sub-step detection (1.1, 1.2)
===================================================== */

function applySubSteps(items: string[]): string[] {
  const result: string[] = [];
  let major = 1;
  let minor = 1;

  for (const item of items) {
    const lower = item.toLowerCase();

    if (
      lower.startsWith("first") ||
      lower.startsWith("second") ||
      lower.startsWith("third") ||
      lower.startsWith("finally") ||
      /^step\s+\d+/.test(lower)
    ) {
      result.push(item);
      major++;
      minor = 1;
      continue;
    }

    if (
      lower.startsWith("then") ||
      lower.startsWith("this") ||
      lower.startsWith("also") ||
      lower.startsWith("next") ||
      lower.startsWith("after") ||
      lower.startsWith("additionally")
    ) {
      result.push(`${major - 1}.${minor} ${item}`);
      minor++;
      continue;
    }

    result.push(item);
  }

  return result;
}

/* =====================================================
   Voice-friendly cleanup
===================================================== */

function voiceClean(text: string): string {
  return text
    // Remove markdown emphasis / inline code
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`([^`]*)`/g, "$1")

    // Remove markdown headings
    .replace(/^#{1,6}\s+/gm, "")

    // Voice-friendly punctuation
    .replace(/:/g, " –")
    .replace(/\(/g, ", ")
    .replace(/\)/g, "")
    .replace(/\n+/g, " ")

    // Normalize spacing
    .replace(/\s{2,}/g, " ")
    .trim();
}
