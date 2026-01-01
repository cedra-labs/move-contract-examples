import fetch from "node-fetch";
import type { ExplorerAccount } from "./types.ts";

const REST_URL = process.env.CEDRA_REST_URL!;

export async function getAccount(address: string): Promise<ExplorerAccount> {
  const [resourcesRes, modulesRes] = await Promise.all([
    fetch(`${REST_URL}/accounts/${address}/resources`),
    fetch(`${REST_URL}/accounts/${address}/modules`)
  ]);

  if (!resourcesRes.ok) {
    throw new Error("Account not found");
  }

  const resourcesRaw = (await resourcesRes.json()) as any[];
  const modulesRaw = modulesRes.ok ? ((await modulesRes.json()) as any[]) : [];

  let balance: string | undefined;

  for (const r of resourcesRaw) {
    if (typeof r.type === "string" && r.type.includes("CoinStore")) {
      balance = r.data?.coin?.value;
      break;
    }
  }

  return {
    address,
    balance,
    resources: resourcesRaw.map(r => ({
      type: r.type,
      data: r.data
    })),
    modules: modulesRaw.map(m => ({
      name: m.abi?.name ?? "Unknown"
    }))
  };
}
