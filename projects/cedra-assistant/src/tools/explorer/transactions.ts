import fetch from "node-fetch";
import type { RpcTransaction } from "./rpcTypes.ts";
import type { ExplorerTransaction, ExplorerEvent } from "./types.ts";

const RPC_URL = process.env.CEDRA_REST_URL;

if (!RPC_URL) {
  throw new Error("CEDRA_REST_URL is not set");
}

export async function getTransactionByHash(
  hash: string
): Promise<ExplorerTransaction> {
  const res = await fetch(`${RPC_URL}/transactions/by_hash/${hash}`);

  if (!res.ok) {
    throw new Error("Transaction not found");
  }

  const raw = (await res.json()) as RpcTransaction;

  return {
    hash: raw.hash,
    sender: raw.sender,
    success: raw.success,
    gasUsed: Number(raw.gas_used),
    function: raw.payload?.function,
    arguments: raw.payload?.arguments,

    // 🔑 THIS IS THE IMPORTANT FIX
    events: (raw.events ?? []) as ExplorerEvent[],

    vmStatus: raw.vm_status
  };
}
