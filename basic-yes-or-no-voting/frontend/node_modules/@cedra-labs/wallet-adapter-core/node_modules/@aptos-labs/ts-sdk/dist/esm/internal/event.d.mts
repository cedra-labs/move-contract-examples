import { AptosConfig } from '../api/aptosConfig.mjs';
import { AccountAddressInput } from '../core/accountAddress.mjs';
import { GetEventsResponse } from '../types/indexer.mjs';
import { MoveStructId, PaginationArgs, OrderByArg, AnyNumber, WhereArg } from '../types/types.mjs';
import { EventsBoolExp } from '../types/generated/types.mjs';
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
 * This file contains the underlying implementations for exposed API surface in
 * the {@link api/event}. By moving the methods out into a separate file,
 * other namespaces and processes can access these methods without depending on the entire
 * event namespace and without having a dependency cycle error.
 * @group Implementation
 */

/**
 * Retrieves events associated with a specific module event type.
 * This function allows you to filter events based on the event type and pagination options.
 *
 * @param args - The arguments for retrieving module events.
 * @param args.aptosConfig - The configuration object for Aptos.
 * @param args.eventType - The MoveStructId representing the type of event to retrieve.
 * @param [args.options] - Optional pagination and ordering parameters for the event retrieval.
 * @group Implementation
 */
declare function getModuleEventsByEventType(args: {
    aptosConfig: AptosConfig;
    eventType: MoveStructId;
    options?: PaginationArgs & OrderByArg<GetEventsResponse[0]>;
}): Promise<GetEventsResponse>;
/**
 * Retrieve events associated with a specific account and creation number.
 *
 * @param args - The parameters for retrieving account events.
 * @param args.aptosConfig - The configuration settings for the Aptos client.
 * @param args.accountAddress - The address of the account for which events are being retrieved.
 * @param args.creationNumber - The creation number to filter events.
 * @param args.options - Optional pagination and ordering parameters for the event retrieval.
 * @group Implementation
 */
declare function getAccountEventsByCreationNumber(args: {
    aptosConfig: AptosConfig;
    accountAddress: AccountAddressInput;
    creationNumber: AnyNumber;
    options?: PaginationArgs & OrderByArg<GetEventsResponse[0]>;
}): Promise<GetEventsResponse>;
/**
 * Retrieves events associated with a specific account and event type.
 *
 * @param args - The parameters for retrieving account events.
 * @param args.aptosConfig - The configuration for connecting to the Aptos blockchain.
 * @param args.accountAddress - The address of the account for which to retrieve events.
 * @param args.eventType - The type of event to filter by.
 * @param args.options - Optional pagination and ordering parameters for the event retrieval.
 * @group Implementation
 */
declare function getAccountEventsByEventType(args: {
    aptosConfig: AptosConfig;
    accountAddress: AccountAddressInput;
    eventType: MoveStructId;
    options?: PaginationArgs & OrderByArg<GetEventsResponse[0]>;
}): Promise<GetEventsResponse>;
/**
 * Retrieves a list of events based on specified filtering and pagination options.
 *
 * @param args - The arguments for retrieving events.
 * @param args.aptosConfig - The configuration for connecting to the Aptos network.
 * @param [args.options] - Optional parameters for pagination and filtering.
 * @param [args.options.offset] - The number of records to skip before starting to collect the result set.
 * @param [args.options.limit] - The maximum number of records to return.
 * @param [args.options.orderBy] - Defines the order in which to return the events.
 * @param [args.options.where] - Conditions to filter the events.
 * @param [args.options.where.indexed_type] - Filters events by the indexed type.
 * @group Implementation
 */
declare function getEvents(args: {
    aptosConfig: AptosConfig;
    options?: PaginationArgs & OrderByArg<GetEventsResponse[0]> & WhereArg<EventsBoolExp>;
}): Promise<GetEventsResponse>;

export { getAccountEventsByCreationNumber, getAccountEventsByEventType, getEvents, getModuleEventsByEventType };
