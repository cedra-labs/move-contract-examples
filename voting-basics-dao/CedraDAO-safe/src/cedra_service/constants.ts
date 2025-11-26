export const MODULE_ADDRESS = "0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8";

export const CONTRACT_MODULE = "movedao_addrx";

// Cedra Network endpoints (testnet)
export const NETWORK_CONFIG = {
  // Primary testnet endpoint with timeout settings
  fullnode: "https://testnet.cedra.dev/v1",
  // GraphQL indexer endpoint
  indexer: "https://cloud.hasura.io/public/graphiql?endpoint=https://graphql.cedra.dev/v1/graphql",
  // Block explorer
  explorer: "https://cedrascan.com",
  // Network details
  chainId: 2,

  requestTimeout: 30000, // 30 seconds
  retryAttempts: 3
};