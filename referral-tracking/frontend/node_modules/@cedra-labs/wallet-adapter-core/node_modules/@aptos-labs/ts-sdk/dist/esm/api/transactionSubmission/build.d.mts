import { AccountAddressInput } from '../../core/accountAddress.mjs';
import { InputGenerateTransactionPayloadData, InputGenerateTransactionOptions } from '../../transactions/types.mjs';
import { AptosConfig } from '../aptosConfig.mjs';
import { SimpleTransaction } from '../../transactions/instances/simpleTransaction.mjs';
import { MultiAgentTransaction } from '../../transactions/instances/multiAgentTransaction.mjs';
import { AptosScriptComposer } from '../../transactions/scriptComposer/index.mjs';
import '../../bcs/serializer.mjs';
import '../../core/hex.mjs';
import '../../core/common.mjs';
import '../../types/types.mjs';
import '../../types/indexer.mjs';
import '../../types/generated/operations.mjs';
import '../../types/generated/types.mjs';
import '../../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';
import '../../bcs/deserializer.mjs';
import '../../transactions/instances/transactionArgument.mjs';
import '../../bcs/serializable/moveStructs.mjs';
import '../../bcs/serializable/movePrimitives.mjs';
import '../../bcs/serializable/fixedBytes.mjs';
import '../../publicKey-CJOcUwJK.mjs';
import '../../core/crypto/signature.mjs';
import '../../transactions/authenticator/account.mjs';
import '../../core/crypto/ed25519.mjs';
import '../../core/crypto/privateKey.mjs';
import '../../utils/const.mjs';
import '../../core/crypto/multiEd25519.mjs';
import '../../core/crypto/multiKey.mjs';
import '../../core/crypto/singleKey.mjs';
import '../../core/crypto/secp256k1.mjs';
import '../../transactions/instances/rawTransaction.mjs';
import '../../transactions/instances/chainId.mjs';
import '../../transactions/instances/transactionPayload.mjs';
import '../../transactions/instances/identifier.mjs';
import '../../transactions/instances/moduleId.mjs';
import '../../transactions/typeTag/index.mjs';

/**
 * A class to handle all `Build` transaction operations.
 * @group Implementation
 */
declare class Build {
    readonly config: AptosConfig;
    /**
     * Initializes a new instance of the Aptos client with the specified configuration.
     * This allows you to interact with the Aptos blockchain using the provided settings.
     *
     * @param config - The configuration settings for the Aptos client.
     * @param config.network - The network to connect to (e.g., TESTNET, MAINNET).
     * @param config.nodeUrl - The URL of the Aptos node to connect to.
     * @param config.account - The account details for authentication.
     *
     * @example
     * ```typescript
     * import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
     *
     * async function runExample() {
     *     // Create a configuration for the Aptos client
     *     const config = new AptosConfig({
     *         network: Network.TESTNET, // specify the network
     *         nodeUrl: "https://testnet.aptos.dev", // specify the node URL
     *     });
     *
     *     // Initialize the Aptos client
     *     const aptos = new Aptos(config);
     *
     *     console.log("Aptos client initialized:", aptos);
     * }
     * runExample().catch(console.error);
     * ```
     * @group Implementation
     */
    constructor(config: AptosConfig);
    /**
     * Build a simple transaction.
     *
     * This function allows you to create a transaction with specified sender and data.
     *
     * @param args.sender - The sender account address.
     * @param args.data - The transaction data.
     * @param args.options - Optional transaction configurations.
     * @param args.withFeePayer - Whether there is a fee payer for the transaction.
     *
     * @returns SimpleTransaction
     *
     * @example
     * ```typescript
     * import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
     *
     * const config = new AptosConfig({ network: Network.TESTNET });
     * const aptos = new Aptos(config);
     *
     * async function runExample() {
     *   // Build a simple transaction
     *   const transaction = await aptos.transaction.simple({
     *     sender: "0x1", // replace with a real sender account address
     *     data: {
     *       function: "0x1::aptos_account::transfer",
     *       functionArguments: ["0x2", 100], // replace with a real destination account address
     *     },
     *     options: {
     *       gasUnitPrice: 100, // specify your own gas unit price if needed
     *       maxGasAmount: 1000, // specify your own max gas amount if needed
     *     },
     *   });
     *
     *   console.log(transaction);
     * }
     * runExample().catch(console.error);
     * ```
     * @group Implementation
     */
    simple(args: {
        sender: AccountAddressInput;
        data: InputGenerateTransactionPayloadData;
        options?: InputGenerateTransactionOptions;
        withFeePayer?: boolean;
    }): Promise<SimpleTransaction>;
    /**
     * Build a transaction from a series of Move calls.
     *
     * This function allows you to create a transaction with a list of Move calls.
     *
     * Right now we only tested this logic with single signer and we will add support
     * for mutli agent transactions if needed.
     *
     * @param args.sender - The sender account address.
     * @param args.builder - The closure to construct the list of calls.
     * @param args.options - Optional transaction configurations.
     * @param args.withFeePayer - Whether there is a fee payer for the transaction.
     *
     * @returns SimpleTransaction
     *
     * @example
     * ```typescript
     * import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
     *
     * const config = new AptosConfig({ network: Network.TESTNET });
     * const aptos = new Aptos(config);
     *
     * async function runExample() {
     *   // Build a transaction from a chained series of Move calls.
     *   const transaction = await aptos.transaction.build.scriptComposer({
     *     sender: "0x1", // replace with a real sender account address
     *     builder: builder: async (builder) => {
     *       const coin = await builder.addBatchedCalls({
     *          function: "0x1::coin::withdraw",
     *          functionArguments: [CallArgument.new_signer(0), 1],
     *          typeArguments: ["0x1::aptos_coin::AptosCoin"],
     *        });
     *
     *        // Pass the returned value from the first function call to the second call
     *        const fungibleAsset = await builder.addBatchedCalls({
     *          function: "0x1::coin::coin_to_fungible_asset",
     *          functionArguments: [coin[0]],
     *          typeArguments: ["0x1::aptos_coin::AptosCoin"],
     *        });
     *
     *        await builder.addBatchedCalls({
     *          function: "0x1::primary_fungible_store::deposit",
     *          functionArguments: [singleSignerED25519SenderAccount.accountAddress, fungibleAsset[0]],
     *          typeArguments: [],
     *        });
     *        return builder;
     *     },
     *     options: {
     *       gasUnitPrice: 100, // specify your own gas unit price if needed
     *       maxGasAmount: 1000, // specify your own max gas amount if needed
     *     },
     *   });
     *
     *   console.log(transaction);
     * }
     * runExample().catch(console.error);
     * ```
     */
    scriptComposer(args: {
        sender: AccountAddressInput;
        builder: (builder: AptosScriptComposer) => Promise<AptosScriptComposer>;
        options?: InputGenerateTransactionOptions;
        withFeePayer?: boolean;
    }): Promise<SimpleTransaction>;
    /**
     * Build a multi-agent transaction that allows multiple signers to authorize a transaction.
     *
     * @param args - The parameters for creating the multi-agent transaction.
     * @param args.sender - The sender account address.
     * @param args.data - The transaction data.
     * @param args.secondarySignerAddresses - An array of the secondary signers' account addresses.
     * @param args.options - Optional transaction configurations.
     * @param args.withFeePayer - Whether there is a fee payer for the transaction.
     *
     * @returns MultiAgentTransaction
     *
     * @example
     * ```typescript
     * import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
     *
     * const config = new AptosConfig({ network: Network.TESTNET });
     * const aptos = new Aptos(config);
     *
     * async function runExample() {
     *   // Build a multi-agent transaction
     *   const transaction = await aptos.multiAgent({
     *     sender: "0x1", // replace with a real sender account address
     *     data: {
     *       // Transaction data structure
     *       function: "0x1::aptos_account::transfer",
     *       functionArguments: ["0x2", 100], // replace with a real destination account address and amount
     *     },
     *     secondarySignerAddresses: ["0x3", "0x4"], // replace with real secondary signer addresses
     *     options: {
     *       // Optional transaction configurations
     *       maxGasAmount: "1000",
     *       gasUnitPrice: "1",
     *     },
     *   });
     *
     *   console.log(transaction);
     * }
     * runExample().catch(console.error);
     * ```
     * @group Implementation
     */
    multiAgent(args: {
        sender: AccountAddressInput;
        data: InputGenerateTransactionPayloadData;
        secondarySignerAddresses: AccountAddressInput[];
        options?: InputGenerateTransactionOptions;
        withFeePayer?: boolean;
    }): Promise<MultiAgentTransaction>;
}

export { Build };
