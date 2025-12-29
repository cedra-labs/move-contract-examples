import type { ExplorerTransaction } from "./types.ts";
import { octasToCed } from "./utils.ts";
import { decodeTransfer } from "./eventDecoder.ts";

export function explainTransaction(tx: ExplorerTransaction): string {
  if (!tx.success) {
    return `This transaction failed during execution.`;
  }

  if (tx.function?.includes("cedra_account::transfer")) {
    const { receiver, amountOctas } = decodeTransfer(tx);

    if (!receiver || !amountOctas) {
      return `This transaction executed a token transfer, but the exact amount could not be decoded.`;
    }

    const ced = octasToCed(amountOctas);

    return (
      `This transaction transferred ${ced} CED ` +
      `from ${tx.sender} to ${receiver}.`
    );
  }

  return `This transaction executed a smart contract function successfully.`;
}
