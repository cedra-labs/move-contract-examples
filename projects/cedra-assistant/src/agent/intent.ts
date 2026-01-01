/* =====================================================
   INTENT TYPES
===================================================== */

export type Intent =
  | "GENERAL"
  | "EXPLAIN"
  | "SUMMARIZE"
  | "CEDRA";

export type ToolIntent =
  | "EXPLORER_TX"
  | "EXPLORER_ACCOUNT"
  | null;

/* =====================================================
   CONVERSATION INTENT
===================================================== */

export function detectIntent(message: string): Intent {
  const t = message.toLowerCase().trim();

  if (t.startsWith("explain ")) return "EXPLAIN";
  if (t.startsWith("summarize ")) return "SUMMARIZE";
  if (t.includes("cedra")) return "CEDRA";

  return "GENERAL";
}

/* =====================================================
   TOOL INTENT (HIGHEST PRIORITY)
   — ACTION-BASED ONLY
===================================================== */

export function detectToolIntent(message: string): ToolIntent {
  const t = message.toLowerCase().trim();

  const hex = t.match(/0x[a-f0-9]+/i)?.[0];
  const hexLength = hex?.length ?? 0;

  /* -----------------------------
     ACTION VERBS (REQUIRED)
  ----------------------------- */

  const isAction =
    t.includes("check") ||
    t.includes("get") ||
    t.includes("show") ||
    t.includes("fetch") ||
    t.includes("lookup") ||
    t.includes("balance") ||
    t.includes("details");

  /* -----------------------------
     TRANSACTION LOOKUP
  ----------------------------- */

  if (
    isAction &&
    (t.includes("transaction") || t.includes("tx")) &&
    hex &&
    hexLength >= 66
  ) {
    return "EXPLORER_TX";
  }

  /* -----------------------------
     ACCOUNT / WALLET LOOKUP
  ----------------------------- */

  if (
    isAction &&
    (t.includes("account") || t.includes("wallet")) &&
    (hex || t.includes("balance"))
  ) {
    return "EXPLORER_ACCOUNT";
  }

  /* -----------------------------
     HEX-ONLY FALLBACK
     (explicit identifiers)
  ----------------------------- */

  if (hex) {
    if (hexLength >= 66) return "EXPLORER_TX";
    if (hexLength >= 34 && hexLength < 66) return "EXPLORER_ACCOUNT";
  }

  return null;
}
