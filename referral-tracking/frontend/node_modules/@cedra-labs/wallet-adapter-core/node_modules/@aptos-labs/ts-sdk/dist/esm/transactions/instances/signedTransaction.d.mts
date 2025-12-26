import { TransactionAuthenticator } from '../authenticator/transaction.mjs';
import { Deserializer } from '../../bcs/deserializer.mjs';
import { Serializable, Serializer } from '../../bcs/serializer.mjs';
import { RawTransaction } from './rawTransaction.mjs';
import '../authenticator/account.mjs';
import '../../types/types.mjs';
import '../../types/indexer.mjs';
import '../../types/generated/operations.mjs';
import '../../types/generated/types.mjs';
import '../../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';
import '../../core/hex.mjs';
import '../../core/common.mjs';
import '../../core/crypto/ed25519.mjs';
import '../../publicKey-CJOcUwJK.mjs';
import '../../core/accountAddress.mjs';
import './transactionArgument.mjs';
import '../../core/crypto/signature.mjs';
import '../../api/aptosConfig.mjs';
import '../../utils/const.mjs';
import '../../core/crypto/privateKey.mjs';
import '../../core/crypto/multiEd25519.mjs';
import '../../core/crypto/multiKey.mjs';
import '../../core/crypto/singleKey.mjs';
import '../../core/crypto/secp256k1.mjs';
import './chainId.mjs';
import './transactionPayload.mjs';
import './identifier.mjs';
import './moduleId.mjs';
import '../typeTag/index.mjs';

/**
 * Represents a signed transaction that includes a raw transaction and an authenticator.
 * The authenticator contains a client's public key and the signature of the raw transaction.
 *
 * @see {@link https://aptos.dev/integration/creating-a-signed-transaction | Creating a Signed Transaction}
 * @param raw_txn - The raw transaction to be signed.
 * @param authenticator - Contains a client's public key and the signature of the raw transaction.
 * Authenticator can have three variations: single signature, multi-signature, and multi-agent.
 * @see {@link https://github.com/aptos-labs/aptos-core/blob/main/types/src/transaction/authenticator.rs} for details.
 * @group Implementation
 * @category Transactions
 */
declare class SignedTransaction extends Serializable {
    readonly raw_txn: RawTransaction;
    readonly authenticator: TransactionAuthenticator;
    /**
     * Represents a signed transaction that includes a raw transaction and an authenticator.
     * The authenticator contains a client's public key and the signature of the raw transaction,
     * which can be of three types: single signature, multi-signature, and multi-agent.
     *
     * @param raw_txn The raw transaction to be signed.
     * @param authenticator Contains a client's public key and the signature of the raw transaction. The authenticator has 3
     * flavors: single signature, multi-signature and multi-agent.
     * @see {@link https://aptos.dev/integration/creating-a-signed-transaction | Creating a Signed Transaction}
     * @see {@link https://github.com/aptos-labs/aptos-core/blob/main/types/src/transaction/authenticator.rs} for details.
     * @group Implementation
     * @category Transactions
     */
    constructor(raw_txn: RawTransaction, authenticator: TransactionAuthenticator);
    /**
     * Serializes the raw transaction and its authenticator using the provided serializer.
     * This function is essential for preparing the transaction data for transmission or storage.
     *
     * @param serializer - The serializer instance used to serialize the transaction and authenticator.
     * @group Implementation
     * @category Transactions
     */
    serialize(serializer: Serializer): void;
    /**
     * Deserializes a signed transaction from the provided deserializer.
     * This function allows you to reconstruct a SignedTransaction object from its serialized form, enabling further processing or validation.
     *
     * @param deserializer - The deserializer instance used to read the serialized data.
     * @group Implementation
     * @category Transactions
     */
    static deserialize(deserializer: Deserializer): SignedTransaction;
}

export { SignedTransaction };
