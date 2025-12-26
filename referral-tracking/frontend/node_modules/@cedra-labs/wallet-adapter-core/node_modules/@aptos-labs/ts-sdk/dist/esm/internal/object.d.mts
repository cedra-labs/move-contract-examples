import { AptosConfig } from '../api/aptosConfig.mjs';
import { AccountAddressInput } from '../core/accountAddress.mjs';
import { GetObjectDataQueryResponse } from '../types/indexer.mjs';
import { PaginationArgs, OrderByArg, WhereArg } from '../types/types.mjs';
import { CurrentObjectsBoolExp } from '../types/generated/types.mjs';
import '../utils/apiEndpoints.mjs';
import '../utils/const.mjs';
import '../types/generated/operations.mjs';
import '@aptos-labs/script-composer-pack';
import '../bcs/serializer.mjs';
import '../core/hex.mjs';
import '../core/common.mjs';
import '../bcs/deserializer.mjs';
import '../transactions/instances/transactionArgument.mjs';

/**
 * Retrieves the current objects based on specified filtering and pagination options.
 *
 * @param args - The arguments for retrieving object data.
 * @param args.aptosConfig - The configuration settings for Aptos.
 * @param [args.options] - Optional parameters for pagination and filtering.
 * @param [args.options.offset] - The number of items to skip before starting to collect the result set.
 * @param [args.options.limit] - The maximum number of items to return.
 * @param [args.options.orderBy] - The criteria for ordering the results.
 * @param [args.options.where] - The conditions to filter the results.
 * @returns The current objects that match the specified criteria.
 * @group Implementation
 */
declare function getObjectData(args: {
    aptosConfig: AptosConfig;
    options?: PaginationArgs & OrderByArg<GetObjectDataQueryResponse[0]> & WhereArg<CurrentObjectsBoolExp>;
}): Promise<GetObjectDataQueryResponse>;
/**
 * Retrieves the object data associated with a specific object address.
 * This function allows you to access detailed information about an object in the Aptos blockchain.
 *
 * @param args - The arguments for retrieving object data.
 * @param args.aptosConfig - The configuration for connecting to the Aptos blockchain.
 * @param args.objectAddress - The address of the object whose data is being retrieved.
 * @param args.options - Optional parameters for pagination and ordering of the results.
 * @group Implementation
 */
declare function getObjectDataByObjectAddress(args: {
    aptosConfig: AptosConfig;
    objectAddress: AccountAddressInput;
    options?: PaginationArgs & OrderByArg<GetObjectDataQueryResponse[0]>;
}): Promise<GetObjectDataQueryResponse[0]>;

export { getObjectData, getObjectDataByObjectAddress };
