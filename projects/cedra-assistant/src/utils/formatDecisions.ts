export type FormatMode = "bullets" | "numbers";

export function decideFormatMode(
  intent: string,
  message: string
): FormatMode {
  const lower = message.toLowerCase();

  // Explicit procedural / how-to language → numbers
  const proceduralKeywords = [
    "how to",
    "steps",
    "step by step",
    "guide",
    "process",
    "setup",
    "install",
    "run",
    "deploy",
    "configure",
    "initialize",
    "example",
    "implement"
  ];

  if (proceduralKeywords.some(k => lower.includes(k))) {
    return "numbers";
  }

  // Explain & summarize default to bullets (clean reading)
  if (intent === "EXPLAIN" || intent === "SUMMARIZE") {
    return "bullets";
  }

  // Default safe mode
  return "bullets";
}
