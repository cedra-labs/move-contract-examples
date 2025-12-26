/**
 * @group Implementation
 * @category Network
 */
declare const NetworkToIndexerAPI: Record<string, string>;
/**
 * @group Implementation
 * @category Network
 */
declare const NetworkToNodeAPI: Record<string, string>;
/**
 * @group Implementation
 * @category Network
 */
declare const NetworkToFaucetAPI: Record<string, string>;
/**
 * @group Implementation
 * @category Network
 */
declare const NetworkToPepperAPI: Record<string, string>;
/**
 * @group Implementation
 * @category Network
 */
declare const NetworkToProverAPI: Record<string, string>;
/**
 * Different network environments for connecting to services, ranging from production to development setups.
 * @group Implementation
 * @category Network
 */
declare enum Network {
    MAINNET = "mainnet",
    TESTNET = "testnet",
    DEVNET = "devnet",
    LOCAL = "local",
    CUSTOM = "custom"
}
/**
 * @group Implementation
 * @category Network
 */
declare const NetworkToChainId: Record<string, number>;
/**
 * @group Implementation
 * @category Network
 */
declare const NetworkToNetworkName: Record<string, Network>;

export { Network, NetworkToChainId, NetworkToFaucetAPI, NetworkToIndexerAPI, NetworkToNetworkName, NetworkToNodeAPI, NetworkToPepperAPI, NetworkToProverAPI };
