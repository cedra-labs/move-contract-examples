import { GetNumberOfDelegatorsResponse, GetDelegatedStakingActivitiesResponse } from '../types/indexer.mjs';
import { AnyNumber, OrderByArg } from '../types/types.mjs';
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
 * A class to query all `Staking` related queries on Aptos.
 * @group Staking
 */
declare class Staking {
    readonly config: AptosConfig;
    /**
     * Creates an instance of the Aptos client with the specified configuration.
     * This allows you to interact with the Aptos blockchain using the provided settings.
     *
     * @param config - The configuration settings for the Aptos client.
     * @param config.network - The network to connect to (e.g., TESTNET, MAINNET).
     * @param config.nodeUrl - The URL of the Aptos node to connect to.
     *
     * @example
     * ```typescript
     * import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
     *
     * async function runExample() {
     *     // Create a configuration for the Aptos client
     *     const config = new AptosConfig({ network: Network.TESTNET }); // Specify your network
     *
     *     // Initialize the Aptos client with the configuration
     *     const aptos = new Aptos(config);
     *
     *     console.log("Aptos client initialized:", aptos);
     * }
     * runExample().catch(console.error);
     * ```
     * @group Staking
     */
    constructor(config: AptosConfig);
    /**
     * Queries the current number of delegators in a specified pool. Throws an error if the pool is not found.
     *
     * @param args - The parameters for the query.
     * @param args.poolAddress - The address of the pool to query.
     * @param args.minimumLedgerVersion - Optional ledger version to sync up to before querying.
     * @returns The number of delegators for the given pool.
     *
     * @example
     * ```typescript
     * import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
     *
     * const config = new AptosConfig({ network: Network.TESTNET });
     * const aptos = new Aptos(config);
     *
     * async function runExample() {
     *   // Get the number of delegators for a specific pool
     *   const delegators = await aptos.getNumberOfDelegators({ poolAddress: "0x1" }); // replace with a real pool address
     *   console.log(`Number of delegators: ${delegators}`);
     * }
     * runExample().catch(console.error);
     * ```
     * @group Staking
     */
    getNumberOfDelegators(args: {
        poolAddress: AccountAddressInput;
        minimumLedgerVersion?: AnyNumber;
    }): Promise<number>;
    /**
     * Retrieves the current number of delegators across all pools.
     *
     * @param args Optional parameters for the query.
     * @param args.minimumLedgerVersion Optional ledger version to sync up to before querying.
     * @param args.options Optional ordering options for the response.
     * @returns GetNumberOfDelegatorsForAllPoolsResponse response type containing the number of delegators per pool.
     *
     * @example
     * ```typescript
     * import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
     *
     * const config = new AptosConfig({ network: Network.TESTNET });
     * const aptos = new Aptos(config);
     *
     * async function runExample() {
     *   // Retrieve the number of delegators for all pools
     *   const delegators = await aptos.getNumberOfDelegatorsForAllPools();
     *   console.log(delegators);
     * }
     * runExample().catch(console.error);
     * ```
     * @group Staking
     */
    getNumberOfDelegatorsForAllPools(args?: {
        minimumLedgerVersion?: AnyNumber;
        options?: OrderByArg<GetNumberOfDelegatorsResponse[0]>;
    }): Promise<GetNumberOfDelegatorsResponse>;
    /**
     * Queries delegated staking activities for a specific delegator and pool.
     *
     * @param args - The arguments for querying delegated staking activities.
     * @param args.delegatorAddress - The address of the delegator.
     * @param args.poolAddress - The address of the staking pool.
     * @param args.minimumLedgerVersion - Optional ledger version to sync up to before querying.
     * @returns The response containing delegated staking activities.
     *
     * @example
     * ```typescript
     * import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
     *
     * const config = new AptosConfig({ network: Network.TESTNET });
     * const aptos = new Aptos(config);
     *
     * async function runExample() {
     *   // Get delegated staking activities for a specific delegator and pool
     *   const activities = await aptos.getDelegatedStakingActivities({
     *     delegatorAddress: "0x1", // replace with a real delegator address
     *     poolAddress: "0x2", // replace with a real pool address
     *     minimumLedgerVersion: 1, // specify your own if needed
     *   });
     *
     *   console.log(activities);
     * }
     * runExample().catch(console.error);
     * ```
     * @group Staking
     */
    getDelegatedStakingActivities(args: {
        delegatorAddress: AccountAddressInput;
        poolAddress: AccountAddressInput;
        minimumLedgerVersion?: AnyNumber;
    }): Promise<GetDelegatedStakingActivitiesResponse>;
}

export { Staking };
