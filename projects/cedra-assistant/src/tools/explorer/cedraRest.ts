import fetch from "node-fetch";

const BASE = process.env.CEDRA_REST_URL;

if (!BASE) {
  throw new Error("CEDRA_REST_URL is not set");
}

export async function cedraGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cedra REST error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}
