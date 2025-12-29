export interface NetworkInfo {
  name: string;
  status: string;
  consensus: string;
  nodeTypes: string[];
  notes: string;
}

export async function getNetworkInfo(): Promise<NetworkInfo> {
  // 🔒 Deterministic, safe, demo-ready
  // Replace with real RPC later if needed

  return {
    name: "Cedra Network",
    status: "Active",
    consensus: "Proof of Stake",
    nodeTypes: [
      "Validator Nodes",
      "Validator Fullnodes (VFNs)",
      "Public Fullnodes (PFNs)"
    ],
    notes:
      "Validators participate in consensus. Fullnodes distribute blockchain data and support ecosystem services."
  };
}
