import { AccountAddressInput } from '../core/accountAddress.mjs';
import { AnyNumber, MoveStructId } from '../types/types.mjs';
import { InputGenerateTransactionOptions } from '../transactions/types.mjs';
import { AptosConfig } from './aptosConfig.mjs';
import { SimpleTransaction } from '../transactions/instances/simpleTransaction.mjs';
import '../bcs/serializer.mjs';
import '../core/hex.mjs';
import '../core/common.mjs';
import '../bcs/deserializer.mjs';
import '../transactions/instances/transactionArgument.mjs';
import '../types/indexer.mjs';
import '../types/generated/operations.mjs';
import '../types/generated/types.mjs';
import '../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';
import '../bcs/serializable/moveStructs.mjs';
import '../bcs/serializable/movePrimitives.mjs';
import '../bcs/serializable/fixedBytes.mjs';
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
import '../transactions/instances/multiAgentTransaction.mjs';
import '../utils/const.mjs';

/**
 * A class to handle all `Coin` operations.
 * @group Coin
 */
declare class Coin {
    readonly config: AptosConfig;
    /**
     * Initializes a new instance of the Aptos client with the specified configuration.
     * This allows you to interact with the Aptos blockchain using the provided settings.
     *
     * @param config - The configuration settings for the Aptos client.
     *
     * @example
     * ```typescript
     * import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
     *
     * async function runExample() {
     *     // Create a new Aptos client with testnet configuration
     *     const config = new AptosConfig({ network: Network.TESTNET });
     *     const aptos = new Aptos(config);
     *
     *     console.log("Aptos client initialized:", aptos);
     * }
     * runExample().catch(console.error);
     * ```
     * @group Coin
     */
    constructor(config: AptosConfig);
    /**
     * Generate a transfer coin transaction that can be simulated, signed, and submitted.
     * This function helps you create a transaction to transfer a specified amount of coins
     * from one account to another within the Aptos network.
     *
     * @param args The arguments for the transfer transaction.
     * @param args.sender The sender account address.
     * @param args.recipient The recipient account address.
     * @param args.amount The amount of coins to transfer.
     * @param args.coinType Optional. The coin struct type to transfer. Defaults to 0x1::aptos_coin::AptosCoin.
     * @param args.options Optional. Additional options for generating the transaction.
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
     *   // Generate a transfer coin transaction
     *   const transaction = await aptos.transferCoinTransaction({
     *     sender: "0x1", // replace with a real sender account address
     *     recipient: "0x2", // replace with a real recipient account address
     *     amount: 10,
     *   });
     *
     *   console.log(transaction);
     * }
     * runExample().catch(console.error);
     * ```
     * @group Coin
     */
    transferCoinTransaction(args: {
        sender: AccountAddressInput;
        recipient: AccountAddressInput;
        amount: AnyNumber;
        coinType?: MoveStructId;
        options?: InputGenerateTransactionOptions;
    }): Promise<SimpleTransaction>;
}

export { Coin };
