import { ProcessorType } from '../utils/const.mjs';
import { AnyNumber } from '../types/types.mjs';
import { AptosConfig } from './aptosConfig.mjs';
import '../types/indexer.mjs';
import '../types/generated/operations.mjs';
import '../types/generated/types.mjs';
import '../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';

/**
 * Waits for the indexer to reach a specified ledger version, allowing for synchronization with the blockchain.
 * This function is useful for ensuring that your application is working with the most up-to-date data before proceeding.
 *
 * @param args - The parameters for waiting on the indexer.
 * @param args.config - The configuration object for Aptos.
 * @param [args.minimumLedgerVersion] - The minimum ledger version to wait for. If not specified, the function will not wait.
 * @param args.processorType - The type of processor to wait for.
 *
 * @example
 * ```typescript
 * import { Aptos, AptosConfig, Network, ProcessorType } from "@aptos-labs/ts-sdk";
 *
 * const config = new AptosConfig({ network: Network.TESTNET });
 * const aptos = new Aptos(config);
 *
 * async function runExample() {
 *   // Wait for the indexer to reach a specific ledger version
 *   await aptos.waitForIndexerOnVersion({
 *     config: config,
 *     minimumLedgerVersion: 1000n, // replace with a real ledger version
 *     processorType: ProcessorType.DEFAULT,
 *   });
 *
 *   console.log("Indexer is synced to the specified ledger version.");
 * }
 * runExample().catch(console.error);
 * ```
 * @group Implementation
 */
declare function waitForIndexerOnVersion(args: {
    config: AptosConfig;
    minimumLedgerVersion?: AnyNumber;
    processorType: ProcessorType;
}): Promise<void>;

export { waitForIndexerOnVersion };
