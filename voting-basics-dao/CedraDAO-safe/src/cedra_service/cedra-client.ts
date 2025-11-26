/**
 * Cedra Blockchain Client
 *
 * Initializes and exports the Cedra client for interacting with the Cedra blockchain.
 * Uses @cedra-labs/ts-sdk for type-safe blockchain operations.
 *
 * @see https://docs.cedra.network/sdks/typescript-sdk
 */

import { Cedra, CedraConfig, Network } from "@cedra-labs/ts-sdk";
import { NETWORK_CONFIG } from "./constants";

/**
 * Cedra client configuration
 *
 * Configured for Cedra testnet with custom fullnode endpoint.
 * The CedraConfig allows customization of network parameters.
 */
const cedraConfig = new CedraConfig({
  network: Network.TESTNET,
  fullnode: NETWORK_CONFIG.fullnode,
});

/**
 * Primary Cedra client instance
 *
 * Use this client for all blockchain operations:
 * - Reading blockchain data (view functions, account info, modules)
 * - Building and submitting transactions (entry functions)
 * - Querying transaction history
 *
 * @example
 * // Get account information
 * const account = await cedraClient.getAccountInfo({ accountAddress: "0x1" });
 *
 * @example
 * // Call a view function
 * const result = await cedraClient.view({
 *   function: "0x1::coin::balance",
 *   type_arguments: ["0x1::cedra_coin::CedraCoin"],
 *   arguments: [accountAddress],
 * });
 */
const cedraClient = new Cedra(cedraConfig);

export { cedraClient };