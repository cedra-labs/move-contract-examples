import { GetObjectDataQueryResponse } from '../types/indexer.mjs';
import { AnyNumber, PaginationArgs, OrderByArg } from '../types/types.mjs';
import { AccountAddressInput } from '../core/accountAddress.mjs';
import { AptosConfig } from './aptosConfig.mjs';
import '../types/generated/operations.mjs';
import '../types/generated/types.mjs';
import '../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';
import '../bcs/serializer.mjs';
import '../core/hex.mjs';
import '../core/common.mjs';
import '../bcs/deserializer.mjs';
import '../transactions/instances/transactionArgument.mjs';
import '../utils/const.mjs';

/**
 * A class to query all `Object` related queries on Aptos.
 * @group Object
 */
declare class AptosObject {
    readonly config: AptosConfig;
    /**
     * Creates an instance of the Aptos client with the provided configuration.
     * This allows interaction with the Aptos blockchain using the specified settings.
     *
     * @param config - The configuration settings for the Aptos client.
     * @param config.network - The network to connect to (e.g., mainnet, testnet).
     * @param config.nodeUrl - The URL of the Aptos node to connect to.
     * @param config.faucetUrl - The URL of the faucet for funding accounts (optional).
     *
     * @example
     * ```typescript
     * import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
     *
     * async function runExample() {
     *     // Create a configuration for the Aptos client
     *     const config = new AptosConfig({
     *         network: Network.TESTNET, // Specify the desired network
     *         nodeUrl: "https://testnet.aptos.dev", // Replace with your node URL
     *     });
     *
     *     // Create an instance of the Aptos client
     *     const aptos = new Aptos(config);
     *
     *     console.log("Aptos client created successfully", aptos);
     * }
     * runExample().catch(console.error);
     * ```
     * @group Object
     */
    constructor(config: AptosConfig);
    /**
     * Fetches the object data based on the specified object address.
     *
     * @param args.objectAddress - The object address to retrieve data for.
     * @param args.minimumLedgerVersion - Optional minimum ledger version to wait for.
     * @param args.options - Optional configuration options for pagination and ordering.
     *
     * @returns The object data corresponding to the provided address.
     *
     * @example
     * ```typescript
     * import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
     *
     * const config = new AptosConfig({ network: Network.TESTNET });
     * const aptos = new Aptos(config);
     *
     * async function runExample() {
     *   // Fetching object data by object address
     *   const objectData = await aptos.getObjectDataByObjectAddress({
     *     objectAddress: "0x1", // replace with a real object address
     *   });
     *
     *   console.log(objectData);
     * }
     * runExample().catch(console.error);
     * ```
     * @group Object
     */
    getObjectDataByObjectAddress(args: {
        objectAddress: AccountAddressInput;
        minimumLedgerVersion?: AnyNumber;
        options?: PaginationArgs & OrderByArg<GetObjectDataQueryResponse[0]>;
    }): Promise<GetObjectDataQueryResponse[0]>;
}

export { AptosObject };
