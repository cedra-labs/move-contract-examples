import { AptosConfig } from './aptosConfig.mjs';
import { GetChainTopUserTransactionsResponse, GraphqlQuery, GetProcessorStatusResponse } from '../types/indexer.mjs';
import { LedgerInfo, AnyNumber, Block, MoveValue, LedgerVersionArg } from '../types/types.mjs';
import { ProcessorType } from '../utils/const.mjs';
import { InputViewFunctionData, InputViewFunctionJsonData } from '../transactions/types.mjs';
import '../utils/apiEndpoints.mjs';
import '../types/generated/operations.mjs';
import '../types/generated/types.mjs';
import '@aptos-labs/script-composer-pack';
import '../bcs/serializable/moveStructs.mjs';
import '../bcs/serializable/movePrimitives.mjs';
import '../bcs/deserializer.mjs';
import '../bcs/serializer.mjs';
import '../core/hex.mjs';
import '../core/common.mjs';
import '../transactions/instances/transactionArgument.mjs';
import '../bcs/serializable/fixedBytes.mjs';
import '../core/accountAddress.mjs';
import '../publicKey-CJOcUwJK.mjs';
import '../core/crypto/signature.mjs';
import '../transactions/authenticator/account.mjs';
import '../core/crypto/ed25519.mjs';
import '../core/crypto/privateKey.mjs';
import '../core/crypto/multiEd25519.mjs';
import '../core/crypto/multiKey.mjs';
import '../core/crypto/singleKey.mjs';
import '../core/crypto/secp256k1.mjs';
import '../transactions/instances/rawTransaction.mjs';
import '../transactions/instances/chainId.mjs';
import '../transactions/instances/transactionPayload.mjs';
import '../transactions/instances/identifier.mjs';
import '../transactions/instances/moduleId.mjs';
import '../transactions/typeTag/index.mjs';
import '../transactions/instances/simpleTransaction.mjs';
import '../transactions/instances/multiAgentTransaction.mjs';

/**
 * A class to query various Aptos-related information and perform operations on the Aptos blockchain.
 * @group General
 */
declare class General {
    readonly config: AptosConfig;
    /**
     * Initializes a new instance of the Aptos client with the specified configuration.
     * This allows users to interact with the Aptos blockchain using the provided settings.
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
     *     const config = new AptosConfig({
     *         network: Network.TESTNET, // specify the network
     *         nodeUrl: "https://testnet.aptos.dev" // specify the node URL
     *     });
     *
     *     // Initialize the Aptos client with the configuration
     *     const aptos = new Aptos(config);
     *
     *     console.log("Aptos client initialized:", aptos);
     * }
     * runExample().catch(console.error);
     * ```
     * @group General
     */
    constructor(config: AptosConfig);
    /**
     * Queries for the Aptos ledger information.
     *
     * @returns The Aptos Ledger Info, which includes details such as chain ID, epoch, and ledger version.
     *
     * @example
     * ```typescript
     * import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
     *
     * const config = new AptosConfig({ network: Network.TESTNET });
     * const aptos = new Aptos(config);
     *
     * async function runExample() {
     *   // Fetching the ledger information
     *   const ledgerInfo = await aptos.getLedgerInfo();
     *
     *   console.log(ledgerInfo);
     * }
     * runExample().catch(console.error);
     * ```
     * @group General
     */
    getLedgerInfo(): Promise<LedgerInfo>;
    /**
     * Retrieves the chain ID of the Aptos blockchain.
     *
     * @example
     * ```typescript
     * import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
     *
     * const config = new AptosConfig({ network: Network.TESTNET });
     * const aptos = new Aptos(config);
     *
     * async function runExample() {
     *   // Fetching the chain ID
     *   const chainId = await aptos.getChainId();
     *   console.log("Chain ID:", chainId);
     * }
     * runExample().catch(console.error);
     *
     * @returns The chain ID of the Aptos blockchain.
     * ```
     * @group General
     */
    getChainId(): Promise<number>;
    /**
     * Retrieves block information by the specified ledger version.
     *
     * @param args - The arguments for retrieving the block.
     * @param args.ledgerVersion - The ledger version to lookup block information for.
     * @param args.options - Optional parameters for the request.
     * @param args.options.withTransactions - If set to true, include all transactions in the block.
     *
     * @returns Block information with optional transactions.
     *
     * @example
     * ```typescript
     * import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
     *
     * const config = new AptosConfig({ network: Network.TESTNET });
     * const aptos = new Aptos(config);
     *
     * async function runExample() {
     *   // Retrieve block information for a specific ledger version
     *   const block = await aptos.getBlockByVersion({ ledgerVersion: 5 });
     *   console.log(block);
     * }
     * runExample().catch(console.error);
     * ```
     * @group General
     */
    getBlockByVersion(args: {
        ledgerVersion: AnyNumber;
        options?: {
            withTransactions?: boolean;
        };
    }): Promise<Block>;
    /**
     * Retrieve a block by its height, allowing for the inclusion of transactions if specified.
     *
     * @param args - The parameters for the block retrieval.
     * @param args.blockHeight - The block height to look up, starting at 0.
     * @param args.options - Optional settings for the retrieval.
     * @param args.options.withTransactions - If set to true, includes all transactions in the block.
     *
     * @returns The block with optional transactions included.
     *
     * @example
     * ```typescript
     * import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
     *
     * const config = new AptosConfig({ network: Network.TESTNET });
     * const aptos = new Aptos(config);
     *
     * async function runExample() {
     *   // Retrieve the block at height 5, including transactions
     *   const block = await aptos.getBlockByHeight({ blockHeight: 5, options: { withTransactions: true } });
     *   console.log(block);
     * }
     * runExample().catch(console.error);
     * ```
     * @group General
     */
    getBlockByHeight(args: {
        blockHeight: AnyNumber;
        options?: {
            withTransactions?: boolean;
        };
    }): Promise<Block>;
    /**
     * Queries for a Move view function
     * @param args.payload Payload for the view function
     * @param args.options.ledgerVersion The ledger version to query, if not provided it will get the latest version
     *
     * @example
     * const data = await aptos.view({
     *  payload: {
     *   function: "0x1::coin::balance",
     *   typeArguments: ["0x1::aptos_coin::AptosCoin"],
     *   functionArguments: [accountAddress],
     *  }
     * })
     *
     * @returns an array of Move values
     * @group General
     */
    view<T extends Array<MoveValue>>(args: {
        payload: InputViewFunctionData;
        options?: LedgerVersionArg;
    }): Promise<T>;
    /**
     * Queries for a Move view function with JSON, this provides compatability with the old `aptos` package
     * @param args.payload Payload for the view function
     * @param args.options.ledgerVersion The ledger version to query, if not provided it will get the latest version
     *
     * @example
     * const data = await aptos.view({
     *  payload: {
     *   function: "0x1::coin::balance",
     *   typeArguments: ["0x1::aptos_coin::AptosCoin"],
     *   functionArguments: [accountAddress.toString()],
     *  }
     * })
     *
     * @returns an array of Move values
     * @group General
     */
    viewJson<T extends Array<MoveValue>>(args: {
        payload: InputViewFunctionJsonData;
        options?: LedgerVersionArg;
    }): Promise<T>;
    /**
     * Queries the top user transactions based on the specified limit.
     *
     * @param args - The arguments for querying top user transactions.
     * @param args.limit - The number of transactions to return.
     * @returns GetChainTopUserTransactionsResponse
     *
     * @example
     * ```typescript
     * import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
     *
     * const config = new AptosConfig({ network: Network.TESTNET });
     * const aptos = new Aptos(config);
     *
     * async function runExample() {
     *   // Fetch the top user transactions with a limit of 5
     *   const topUserTransactions = await aptos.getChainTopUserTransactions({ limit: 5 });
     *
     *   console.log(topUserTransactions);
     * }
     * runExample().catch(console.error);
     * ```
     * @group General
     */
    getChainTopUserTransactions(args: {
        limit: number;
    }): Promise<GetChainTopUserTransactionsResponse>;
    /**
     * Retrieves data from the Aptos Indexer using a GraphQL query.
     * This function allows you to execute complex queries to fetch specific data from the Aptos blockchain.
     *
     * @param args.query.query - A GraphQL query string.
     * @param args.query.variables - The variables for the query (optional).
     *
     * @return The provided T type.
     *
     * @example
     * ```typescript
     * import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
     *
     * const config = new AptosConfig({ network: Network.TESTNET });
     * const aptos = new Aptos(config);
     *
     * async function runExample() {
     *   // Querying the Aptos Indexer for ledger information
     *   const topUserTransactions = await aptos.queryIndexer({
     *     query: { query: `query MyQuery {
     *       ledger_infos {
     *         chain_id
     *       }
     *     }`}
     *   });
     *
     *   console.log(topUserTransactions);
     * }
     * runExample().catch(console.error);
     * ```
     * @group General
     */
    queryIndexer<T extends {}>(args: {
        query: GraphqlQuery;
    }): Promise<T>;
    /**
     * Queries for the last successful indexer version, providing insight into the ledger version the indexer is updated to, which
     * may lag behind the full nodes.
     *
     * @example
     * ```typescript
     * import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
     *
     * const config = new AptosConfig({ network: Network.TESTNET });
     * const aptos = new Aptos(config);
     *
     * async function runExample() {
     *   // Get the last successful indexer version
     *   const version = await aptos.getIndexerLastSuccessVersion();
     *   console.log(`Last successful indexer version: ${version}`);
     * }
     * runExample().catch(console.error);
     * ```
     * @group General
     */
    getIndexerLastSuccessVersion(): Promise<bigint>;
    /**
     * Query the processor status for a specific processor type.
     *
     * @param processorType The processor type to query.
     * @returns The status of the specified processor type.
     *
     * @example
     * ```typescript
     * import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
     *
     * const config = new AptosConfig({ network: Network.TESTNET });
     * const aptos = new Aptos(config);
     *
     * async function runExample() {
     *   // Get the processor status for the account transactions processor
     *   const status = await aptos.getProcessorStatus("account_transactions_processor");
     *   console.log(status);
     * }
     * runExample().catch(console.error);
     * ```
     * @group General
     */
    getProcessorStatus(processorType: ProcessorType): Promise<GetProcessorStatusResponse[0]>;
}

export { General };
