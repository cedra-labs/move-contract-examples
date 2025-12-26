import { AptosConfig } from '../api/aptosConfig.mjs';
import { AccountAddressInput } from '../core/accountAddress.mjs';
import { AnyNumber, MoveStructId } from '../types/types.mjs';
import { InputGenerateTransactionOptions } from '../transactions/types.mjs';
import { SimpleTransaction } from '../transactions/instances/simpleTransaction.mjs';
import '../utils/apiEndpoints.mjs';
import '../utils/const.mjs';
import '../types/indexer.mjs';
import '../types/generated/operations.mjs';
import '../types/generated/types.mjs';
import '@aptos-labs/script-composer-pack';
import '../bcs/serializer.mjs';
import '../core/hex.mjs';
import '../core/common.mjs';
import '../bcs/deserializer.mjs';
import '../transactions/instances/transactionArgument.mjs';
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

/**
 * Generates a transaction to transfer coins from one account to another.
 * This function allows you to specify the sender, recipient, amount, and coin type for the transaction.
 *
 * @param args - The parameters for the transaction.
 * @param args.aptosConfig - The Aptos configuration object.
 * @param args.sender - The address of the account sending the coins.
 * @param args.recipient - The address of the account receiving the coins.
 * @param args.amount - The amount of coins to transfer.
 * @param args.coinType - (Optional) The type of coin to transfer, defaults to Aptos Coin if not specified.
 * @param args.options - (Optional) Options for generating the transaction.
 * @group Implementation
 */
declare function transferCoinTransaction(args: {
    aptosConfig: AptosConfig;
    sender: AccountAddressInput;
    recipient: AccountAddressInput;
    amount: AnyNumber;
    coinType?: MoveStructId;
    options?: InputGenerateTransactionOptions;
}): Promise<SimpleTransaction>;

export { transferCoinTransaction };
