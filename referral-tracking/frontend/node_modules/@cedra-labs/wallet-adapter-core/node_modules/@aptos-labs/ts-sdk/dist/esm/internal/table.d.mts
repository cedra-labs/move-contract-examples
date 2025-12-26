import { AptosConfig } from '../api/aptosConfig.mjs';
import { GetTableItemsDataResponse, GetTableItemsMetadataResponse } from '../types/indexer.mjs';
import { TableItemRequest, LedgerVersionArg, PaginationArgs, WhereArg, OrderByArg } from '../types/types.mjs';
import { TableItemsBoolExp, TableMetadatasBoolExp } from '../types/generated/types.mjs';
import '../utils/apiEndpoints.mjs';
import '../utils/const.mjs';
import '../types/generated/operations.mjs';
import '@aptos-labs/script-composer-pack';

/**
 * Retrieves a specific item from a table in the Aptos blockchain.
 *
 * @param args - The arguments for retrieving the table item.
 * @param args.aptosConfig - The configuration for connecting to the Aptos blockchain.
 * @param args.handle - The identifier for the table from which to retrieve the item.
 * @param args.data - The request data for the table item.
 * @param args.options - Optional parameters for the request, including ledger version.
 * @group Implementation
 */
declare function getTableItem<T>(args: {
    aptosConfig: AptosConfig;
    handle: string;
    data: TableItemRequest;
    options?: LedgerVersionArg;
}): Promise<T>;
/**
 * Retrieves table items data based on specified conditions and pagination options.
 *
 * @param args - The arguments for retrieving table items data.
 * @param args.aptosConfig - The configuration object for Aptos.
 * @param args.options - Optional parameters for pagination and filtering.
 * @param args.options.offset - The number of items to skip before starting to collect the result set.
 * @param args.options.limit - The maximum number of items to return.
 * @param args.options.where - Conditions to filter the table items.
 * @param args.options.orderBy - The criteria to sort the results.
 * @group Implementation
 */
declare function getTableItemsData(args: {
    aptosConfig: AptosConfig;
    options?: PaginationArgs & WhereArg<TableItemsBoolExp> & OrderByArg<GetTableItemsDataResponse[0]>;
}): Promise<{
    decoded_key: any;
    decoded_value?: any | null;
    key: string;
    table_handle: string;
    transaction_version: any;
    write_set_change_index: any;
}[]>;
/**
 * Retrieves metadata for table items based on specified options.
 *
 * @param args - The arguments for retrieving table items metadata.
 * @param args.aptosConfig - The configuration object for Aptos.
 * @param args.options - Optional parameters for pagination and filtering.
 * @param args.options.offset - The number of items to skip before starting to collect the result set.
 * @param args.options.limit - The maximum number of items to return.
 * @param args.options.where - Conditions to filter the results.
 * @param args.options.orderBy - The order in which to return the results.
 * @returns A promise that resolves to an array of table metadata.
 * @group Implementation
 */
declare function getTableItemsMetadata(args: {
    aptosConfig: AptosConfig;
    options?: PaginationArgs & WhereArg<TableMetadatasBoolExp> & OrderByArg<GetTableItemsMetadataResponse[0]>;
}): Promise<GetTableItemsMetadataResponse>;

export { getTableItem, getTableItemsData, getTableItemsMetadata };
