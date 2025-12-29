import type { ExplorerTransaction } from "./types.ts";

export function decodeTransfer(tx: ExplorerTransaction): {
  receiver?: string;
  amountOctas?: string;
} {
  if (!tx.function?.includes("cedra_account::transfer")) {
    return {};
  }

  const args = tx.arguments;
  if (!args || args.length < 2) return {};

  return {
    receiver: args[0],
    amountOctas: args[1]
  };
}
