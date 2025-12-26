type ChainsId = `${string}:${string}`;
/** APTOS Devnet */
declare const APTOS_DEVNET_CHAIN = "aptos:devnet";
/** APTOS Testnet */
declare const APTOS_TESTNET_CHAIN = "aptos:testnet";
/** APTOS Localnet */
declare const APTOS_LOCALNET_CHAIN = "aptos:localnet";
/** APTOS Mainnet */
declare const APTOS_MAINNET_CHAIN = "aptos:mainnet";
declare const APTOS_CHAINS: readonly ["aptos:devnet", "aptos:testnet", "aptos:localnet", "aptos:mainnet"];
type AptosChain = typeof APTOS_DEVNET_CHAIN | typeof APTOS_TESTNET_CHAIN | typeof APTOS_LOCALNET_CHAIN | typeof APTOS_MAINNET_CHAIN;

export { APTOS_CHAINS, APTOS_DEVNET_CHAIN, APTOS_LOCALNET_CHAIN, APTOS_MAINNET_CHAIN, APTOS_TESTNET_CHAIN, AptosChain, ChainsId };
