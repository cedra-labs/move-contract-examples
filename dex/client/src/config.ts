import { Cedra, CedraConfig, Network } from "@cedra-labs/ts-sdk";

// Network configuration
export const NETWORK = Network.DEVNET;
export const NODE_URL = "https://testnet.cedra.dev/v1";
export const FAUCET_URL = "https://faucet-api.cedra.dev";

// Your deployed DEX module address or use commented out line for testing client
// export const MODULE_ADDRESS = "0xbeaeaff8da45012f8fff424eab43c39c5330cd8c1066cbe04542a91734468df8";
export const MODULE_ADDRESS = "_";

// Module references for easy access
export const MODULES = {
  swap: `${MODULE_ADDRESS}::swap`,
  test_tokens: `${MODULE_ADDRESS}::test_tokens`,
  slippage: `${MODULE_ADDRESS}::slippage`,
  multihop: `${MODULE_ADDRESS}::multihop`,
  math_amm: `${MODULE_ADDRESS}::math_amm`,
};

// Initialize Cedra SDK
const config = new CedraConfig({
  network: NETWORK,
  fullnode: NODE_URL,
  faucet: FAUCET_URL
});

export const cedra = new Cedra(config);