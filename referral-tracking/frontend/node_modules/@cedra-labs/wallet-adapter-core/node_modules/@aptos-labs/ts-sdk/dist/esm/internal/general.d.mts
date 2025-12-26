import { AptosConfig } from '../api/aptosConfig.mjs';
import { GetChainTopUserTransactionsResponse, GraphqlQuery, GetProcessorStatusResponse } from '../types/indexer.mjs';
import { LedgerInfo } from '../types/types.mjs';
import { ProcessorType } from '../utils/const.mjs';
import '../utils/apiEndpoints.mjs';
import '../types/generated/operations.mjs';
import '../types/generated/types.mjs';
import '@aptos-labs/script-composer-pack';

/**
 * This file contains the underlying implementations for exposed API surface in
 * the {@link api/general}. By moving the methods out into a separate file,
 * other namespaces and processes can access these methods without depending on the entire
 * general namespace and without having a dependency cycle error.
 * @group Implementation
 */

/**
 * Retrieves information about the current ledger.
 *
 * @param args - The arguments for retrieving ledger information.
 * @param args.aptosConfig - The configuration object for connecting to the Aptos network.
 * @group Implementation
 */
declare function getLedgerInfo(args: {
    aptosConfig: AptosConfig;
}): Promise<LedgerInfo>;
/**
 * Retrieves the top user transactions for a specific blockchain chain.
 *
 * @param args - The arguments for the function.
 * @param args.aptosConfig - The configuration object for Aptos.
 * @param args.limit - The maximum number of transactions to retrieve.
 * @returns An array of user transactions.
 * @group Implementation
 */
declare function getChainTopUserTransactions(args: {
    aptosConfig: AptosConfig;
    limit: number;
}): Promise<GetChainTopUserTransactionsResponse>;
/**
 * Executes a GraphQL query against the Aptos indexer and retrieves the resulting data.
 *
 * @param args - The arguments for the query.
 * @param args.aptosConfig - The configuration settings for the Aptos client.
 * @param args.query - The GraphQL query to be executed.
 * @param args.originMethod - An optional string to specify the origin method for tracking purposes.
 * @returns The data returned from the query execution.
 * @group Implementation
 */
declare function queryIndexer<T extends {}>(args: {
    aptosConfig: AptosConfig;
    query: GraphqlQuery;
    originMethod?: string;
}): Promise<T>;
/**
 * Retrieves the current statuses of processors.
 *
 * @param args - The arguments for the function.
 * @param args.aptosConfig - The configuration object for Aptos.
 * @returns The statuses of the processors.
 * @group Implementation
 */
declare function getProcessorStatuses(args: {
    aptosConfig: AptosConfig;
}): Promise<GetProcessorStatusResponse>;
/**
 * Retrieves the last success version from the indexer.
 *
 * @param args - The arguments for the function.
 * @param args.aptosConfig - The configuration object for Aptos.
 * @returns The last success version as a BigInt.
 * @group Implementation
 */
declare function getIndexerLastSuccessVersion(args: {
    aptosConfig: AptosConfig;
}): Promise<bigint>;
/**
 * Retrieves the status of a specified processor in the Aptos network.
 * This function allows you to check the current operational status of a processor, which can be useful for monitoring and troubleshooting.
 *
 * @param args - The arguments for the function.
 * @param args.aptosConfig - The configuration object for connecting to the Aptos network.
 * @param args.processorType - The type of processor whose status you want to retrieve.
 * @returns The status of the specified processor.
 * @group Implementation
 */
declare function getProcessorStatus(args: {
    aptosConfig: AptosConfig;
    processorType: ProcessorType;
}): Promise<GetProcessorStatusResponse[0]>;

export { getChainTopUserTransactions, getIndexerLastSuccessVersion, getLedgerInfo, getProcessorStatus, getProcessorStatuses, queryIndexer };
