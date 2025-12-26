import { AptosConfig } from '../api/aptosConfig.mjs';
import { AccountAddressInput } from '../core/accountAddress.mjs';
import { GetNumberOfDelegatorsResponse, GetDelegatedStakingActivitiesResponse } from '../types/indexer.mjs';
import { OrderByArg } from '../types/types.mjs';
import '../utils/apiEndpoints.mjs';
import '../utils/const.mjs';
import '../types/generated/operations.mjs';
import '../types/generated/types.mjs';
import '@aptos-labs/script-composer-pack';
import '../bcs/serializer.mjs';
import '../core/hex.mjs';
import '../core/common.mjs';
import '../bcs/deserializer.mjs';
import '../transactions/instances/transactionArgument.mjs';

/**
 * This file contains the underlying implementations for exposed API surface in
 * the {@link api/staking}. By moving the methods out into a separate file,
 * other namespaces and processes can access these methods without depending on the entire
 * staking namespace and without having a dependency cycle error.
 * @group Implementation
 */

/**
 * Retrieves the number of active delegators for a specified pool address.
 *
 * @param args - The arguments for the function.
 * @param args.aptosConfig - The configuration object for Aptos.
 * @param args.poolAddress - The address of the pool for which to retrieve the number of delegators.
 * @returns The number of active delegators for the specified pool address.
 * @group Implementation
 */
declare function getNumberOfDelegators(args: {
    aptosConfig: AptosConfig;
    poolAddress: AccountAddressInput;
}): Promise<number>;
/**
 * Retrieves the number of active delegators for all pools.
 *
 * @param args - The arguments for the function.
 * @param args.aptosConfig - The configuration for the Aptos client.
 * @param [args.options] - Optional parameters for ordering the results.
 * @param args.options.orderBy - Specifies the order in which to return the results.
 * @returns The number of active delegators per pool.
 * @group Implementation
 */
declare function getNumberOfDelegatorsForAllPools(args: {
    aptosConfig: AptosConfig;
    options?: OrderByArg<GetNumberOfDelegatorsResponse[0]>;
}): Promise<GetNumberOfDelegatorsResponse>;
/**
 * Retrieves the delegated staking activities for a specified delegator and pool.
 *
 * @param args - The parameters for the query.
 * @param args.aptosConfig - The configuration object for Aptos.
 * @param args.delegatorAddress - The address of the delegator whose activities are being queried.
 * @param args.poolAddress - The address of the pool associated with the delegated staking activities.
 * @returns The delegated staking activities for the specified delegator and pool.
 * @group Implementation
 */
declare function getDelegatedStakingActivities(args: {
    aptosConfig: AptosConfig;
    delegatorAddress: AccountAddressInput;
    poolAddress: AccountAddressInput;
}): Promise<GetDelegatedStakingActivitiesResponse>;

export { getDelegatedStakingActivities, getNumberOfDelegators, getNumberOfDelegatorsForAllPools };
