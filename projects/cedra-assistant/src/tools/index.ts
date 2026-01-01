import { getTransactionByHash } from "./explorer/transactions.ts";
import { getAccount } from "./explorer/account.ts";
import type {
  ExplorerTransaction,
  ExplorerAccount
} from "./explorer/types.ts";

export type ToolName =
  | "EXPLORER_TX"
  | "EXPLORER_ACCOUNT";

export async function runTool(
  tool: ToolName,
  input: string
): Promise<ExplorerTransaction | ExplorerAccount> {
  switch (tool) {
    case "EXPLORER_TX":
      return getTransactionByHash(input);

    case "EXPLORER_ACCOUNT":
      return getAccount(input);

    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
}
