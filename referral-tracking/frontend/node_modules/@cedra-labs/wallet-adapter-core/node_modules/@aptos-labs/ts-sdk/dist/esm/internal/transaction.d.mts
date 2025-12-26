import { AptosConfig } from '../api/aptosConfig.mjs';
import { PaginationArgs, TransactionResponse, GasEstimation, AnyNumber, HexInput, WaitForTransactionOptions, CommittedTransactionResponse, Block } from '../types/types.mjs';
import { ProcessorType } from '../utils/const.mjs';
import '../utils/apiEndpoints.mjs';
import '../types/indexer.mjs';
import '../types/generated/operations.mjs';
import '../types/generated/types.mjs';
import '@aptos-labs/script-composer-pack';

/**
 * This file contains the underlying implementations for exposed API surface in
 * the {@link api/transaction}. By moving the methods out into a separate file,
 * other namespaces and processes can access these methods without depending on the entire
 * transaction namespace and without having a dependency cycle error.
 * @group Implementation
 */

/**
 * Retrieve a list of transactions based on the specified options.
 *
 * @param {Object} args - The parameters for retrieving transactions.
 * @param {Object} args.aptosConfig - The configuration object for Aptos.
 * @param {Object} args.options - The options for pagination.
 * @param {number} args.options.offset - The number of transactions to skip before starting to collect the result set.
 * @param {number} args.options.limit - The maximum number of transactions to return.
 * @group Implementation
 */
declare function getTransactions(args: {
    aptosConfig: AptosConfig;
    options?: PaginationArgs;
}): Promise<TransactionResponse[]>;
/**
 * Retrieves the estimated gas price for transactions on the Aptos network.
 * This function helps users understand the current gas price, which is essential for transaction planning and cost estimation.
 *
 * @param args - The configuration parameters for the Aptos network.
 * @param args.aptosConfig - The configuration object containing network details.
 * @group Implementation
 */
declare function getGasPriceEstimation(args: {
    aptosConfig: AptosConfig;
}): Promise<GasEstimation>;
/**
 * Retrieves the transaction details associated with a specific ledger version.
 *
 * @param args - The arguments for the transaction retrieval.
 * @param args.aptosConfig - The configuration settings for the Aptos client.
 * @param args.ledgerVersion - The ledger version for which to retrieve the transaction.
 * @returns The transaction details for the specified ledger version.
 * @group Implementation
 */
declare function getTransactionByVersion(args: {
    aptosConfig: AptosConfig;
    ledgerVersion: AnyNumber;
}): Promise<TransactionResponse>;
/**
 * Retrieves transaction details using the specified transaction hash.
 *
 * @param args - The arguments for retrieving the transaction.
 * @param args.aptosConfig - The configuration settings for the Aptos client.
 * @param args.transactionHash - The hash of the transaction to retrieve.
 * @returns A promise that resolves to the transaction details.
 * @group Implementation
 */
declare function getTransactionByHash(args: {
    aptosConfig: AptosConfig;
    transactionHash: HexInput;
}): Promise<TransactionResponse>;
/**
 * Checks if a transaction is currently pending based on its hash.
 * This function helps determine the status of a transaction in the Aptos network.
 *
 * @param args - The arguments for checking the transaction status.
 * @param args.aptosConfig - The configuration settings for connecting to the Aptos network.
 * @param args.transactionHash - The hash of the transaction to check.
 * @returns A boolean indicating whether the transaction is pending.
 * @throws An error if the transaction cannot be retrieved due to reasons other than a 404 status.
 * @group Implementation
 */
declare function isTransactionPending(args: {
    aptosConfig: AptosConfig;
    transactionHash: HexInput;
}): Promise<boolean>;
/**
 * Waits for a transaction to be confirmed by its hash.
 * This function allows you to monitor the status of a transaction until it is finalized.
 *
 * @param args - The arguments for the function.
 * @param args.aptosConfig - The configuration settings for the Aptos client.
 * @param args.transactionHash - The hash of the transaction to wait for.
 * @group Implementation
 */
declare function longWaitForTransaction(args: {
    aptosConfig: AptosConfig;
    transactionHash: HexInput;
}): Promise<TransactionResponse>;
/**
 * Waits for a transaction to be confirmed on the blockchain and handles potential errors during the process.
 * This function allows you to monitor the status of a transaction until it is either confirmed or fails.
 *
 * @param args - The arguments for waiting for a transaction.
 * @param args.aptosConfig - The configuration settings for Aptos.
 * @param args.transactionHash - The hash of the transaction to wait for.
 * @param args.options - Optional settings for waiting, including timeout and success check.
 * @param args.options.timeoutSecs - The maximum time to wait for the transaction in seconds. Defaults to a predefined value.
 * @param args.options.checkSuccess - A flag indicating whether to check the success status of the transaction. Defaults to true.
 * @returns A promise that resolves to the transaction response once the transaction is confirmed.
 * @throws WaitForTransactionError if the transaction times out or remains pending.
 * @throws FailedTransactionError if the transaction fails.
 * @group Implementation
 */
declare function waitForTransaction(args: {
    aptosConfig: AptosConfig;
    transactionHash: HexInput;
    options?: WaitForTransactionOptions;
}): Promise<CommittedTransactionResponse>;
/**
 * Waits for the indexer to sync up to the specified ledger version. The timeout is 3 seconds.
 *
 * @param args - The arguments for the function.
 * @param args.aptosConfig - The configuration object for Aptos.
 * @param args.minimumLedgerVersion - The minimum ledger version that the indexer should sync to.
 * @param args.processorType - (Optional) The type of processor to check the last success version from.
 * @group Implementation
 */
declare function waitForIndexer(args: {
    aptosConfig: AptosConfig;
    minimumLedgerVersion: AnyNumber;
    processorType?: ProcessorType;
}): Promise<void>;
/**
 * Represents an error that occurs when waiting for a transaction to complete.
 * This error is thrown by the `waitForTransaction` function when a transaction
 * times out or when the transaction response is undefined.
 *
 * @param message - A descriptive message for the error.
 * @param lastSubmittedTransaction - The last submitted transaction response, if available.
 * @group Implementation
 */
declare class WaitForTransactionError extends Error {
    readonly lastSubmittedTransaction: TransactionResponse | undefined;
    /**
     * Constructs an instance of the class with a specified message and transaction response.
     *
     * @param message - The message associated with the transaction.
     * @param lastSubmittedTransaction - The transaction response object containing details about the transaction.
     * @group Implementation
     */
    constructor(message: string, lastSubmittedTransaction: TransactionResponse | undefined);
}
/**
 * Represents an error that occurs when a transaction fails.
 * This error is thrown by the `waitForTransaction` function when the `checkSuccess` parameter is set to true.
 *
 * @param message - A description of the error.
 * @param transaction - The transaction response associated with the failure.
 * @group Implementation
 */
declare class FailedTransactionError extends Error {
    readonly transaction: TransactionResponse;
    constructor(message: string, transaction: TransactionResponse);
}
/**
 * Retrieves a block from the Aptos blockchain by its ledger version.
 * This function allows you to obtain detailed information about a specific block, including its transactions if requested.
 *
 * @param args - The arguments for retrieving the block.
 * @param args.aptosConfig - The configuration object for connecting to the Aptos node.
 * @param args.ledgerVersion - The ledger version of the block to retrieve.
 * @param args.options - Optional parameters for the request.
 * @param args.options.withTransactions - Indicates whether to include transactions in the block data.
 * @group Implementation
 */
declare function getBlockByVersion(args: {
    aptosConfig: AptosConfig;
    ledgerVersion: AnyNumber;
    options?: {
        withTransactions?: boolean;
    };
}): Promise<Block>;
/**
 * Retrieves a block from the Aptos blockchain by its height.
 *
 * @param args - The parameters for retrieving the block.
 * @param args.aptosConfig - The configuration object for connecting to the Aptos network.
 * @param args.blockHeight - The height of the block to retrieve.
 * @param args.options - Optional parameters for the request.
 * @param args.options.withTransactions - Indicates whether to include transactions in the block data.
 * @returns A promise that resolves to the block data, potentially including its transactions.
 * @group Implementation
 */
declare function getBlockByHeight(args: {
    aptosConfig: AptosConfig;
    blockHeight: AnyNumber;
    options?: {
        withTransactions?: boolean;
    };
}): Promise<Block>;

export { FailedTransactionError, WaitForTransactionError, getBlockByHeight, getBlockByVersion, getGasPriceEstimation, getTransactionByHash, getTransactionByVersion, getTransactions, isTransactionPending, longWaitForTransaction, waitForIndexer, waitForTransaction };
