export function octasToCed(octas: string | number): string {
  const n = typeof octas === "string" ? Number(octas) : octas;
  if (!Number.isFinite(n)) return "Unknown";

  return (n / 1e8).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8
  });
}
