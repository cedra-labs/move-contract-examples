import { AccountAuthenticator } from './account.mjs';
import { Deserializer } from '../../bcs/deserializer.mjs';
import { Serializable, Serializer } from '../../bcs/serializer.mjs';
import { AccountAddress } from '../../core/accountAddress.mjs';
import { MultiEd25519PublicKey, MultiEd25519Signature } from '../../core/crypto/multiEd25519.mjs';
import { Ed25519PublicKey, Ed25519Signature } from '../../core/crypto/ed25519.mjs';
import '../../types/types.mjs';
import '../../types/indexer.mjs';
import '../../types/generated/operations.mjs';
import '../../types/generated/types.mjs';
import '../../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';
import '../../core/hex.mjs';
import '../../core/common.mjs';
import '../../core/crypto/multiKey.mjs';
import '../../publicKey-CJOcUwJK.mjs';
import '../../core/crypto/signature.mjs';
import '../../api/aptosConfig.mjs';
import '../../utils/const.mjs';
import '../../core/crypto/singleKey.mjs';
import '../../core/crypto/secp256k1.mjs';
import '../../core/crypto/privateKey.mjs';
import '../instances/transactionArgument.mjs';

/**
 * Represents an abstract base class for transaction authenticators.
 * This class provides methods for serializing and deserializing different types of transaction authenticators.
 *
 * @extends Serializable
 * @group Implementation
 * @category Transactions
 */
declare abstract class TransactionAuthenticator extends Serializable {
    abstract serialize(serializer: Serializer): void;
    /**
     * Deserializes a TransactionAuthenticator from the provided deserializer.
     * This function helps in reconstructing the TransactionAuthenticator based on the variant index found in the serialized data.
     *
     * @param deserializer - The deserializer instance used to read the serialized data.
     * @group Implementation
     * @category Transactions
     */
    static deserialize(deserializer: Deserializer): TransactionAuthenticator;
    isEd25519(): this is TransactionAuthenticatorEd25519;
    isMultiEd25519(): this is TransactionAuthenticatorMultiEd25519;
    isMultiAgent(): this is TransactionAuthenticatorMultiAgent;
    isFeePayer(): this is TransactionAuthenticatorFeePayer;
    isSingleSender(): this is TransactionAuthenticatorSingleSender;
}
/**
 * Represents a transaction authenticator using Ed25519 for a single signer transaction.
 * This class encapsulates the client's public key and the Ed25519 signature of a raw transaction.
 *
 * @param public_key - The client's public key.
 * @param signature - The Ed25519 signature of a raw transaction.
 * @see {@link https://aptos.dev/integration/creating-a-signed-transaction | Creating a Signed Transaction}
 * for details about generating a signature.
 * @group Implementation
 * @category Transactions
 */
declare class TransactionAuthenticatorEd25519 extends TransactionAuthenticator {
    readonly public_key: Ed25519PublicKey;
    readonly signature: Ed25519Signature;
    /**
     * Creates an instance of the class with the specified account authenticator.
     *
     * @param public_key - The Ed25519PublicKey that will be used for authentication.
     * @param signature - The Ed25519Signature that will be used for authentication.
     * @group Implementation
     * @category Transactions
     */
    constructor(public_key: Ed25519PublicKey, signature: Ed25519Signature);
    /**
     * Serializes the transaction authenticator by encoding the sender information.
     *
     * @param serializer - The serializer instance used to perform the serialization.
     * @group Implementation
     * @category Transactions
     */
    serialize(serializer: Serializer): void;
    /**
     * Loads a TransactionAuthenticatorSingleSender instance from the provided deserializer.
     * This function helps in deserializing the sender information to create a transaction authenticator.
     *
     * @param deserializer - The deserializer used to extract the sender data.
     * @group Implementation
     * @category Transactions
     */
    static load(deserializer: Deserializer): TransactionAuthenticatorEd25519;
}
/**
 * Represents a transaction authenticator for multi-signature transactions using Ed25519.
 * This class is used to validate transactions that require multiple signatures from different signers.
 *
 * @param public_key - The public key of the client involved in the transaction.
 * @param signature - The multi-signature of the raw transaction.
 * @group Implementation
 * @category Transactions
 */
declare class TransactionAuthenticatorMultiEd25519 extends TransactionAuthenticator {
    readonly public_key: MultiEd25519PublicKey;
    readonly signature: MultiEd25519Signature;
    constructor(public_key: MultiEd25519PublicKey, signature: MultiEd25519Signature);
    serialize(serializer: Serializer): void;
    static load(deserializer: Deserializer): TransactionAuthenticatorMultiEd25519;
}
/**
 * Represents a transaction authenticator for a multi-agent transaction.
 *
 * This class manages the authentication process involving a primary sender and multiple secondary signers.
 *
 * @param sender - The authenticator for the sender account.
 * @param secondary_signer_addresses - An array of addresses for the secondary signers.
 * @param secondary_signers - An array of authenticators for the secondary signer accounts.
 * @group Implementation
 * @category Transactions
 */
declare class TransactionAuthenticatorMultiAgent extends TransactionAuthenticator {
    readonly sender: AccountAuthenticator;
    readonly secondary_signer_addresses: Array<AccountAddress>;
    readonly secondary_signers: Array<AccountAuthenticator>;
    constructor(sender: AccountAuthenticator, secondary_signer_addresses: Array<AccountAddress>, secondary_signers: Array<AccountAuthenticator>);
    serialize(serializer: Serializer): void;
    static load(deserializer: Deserializer): TransactionAuthenticatorMultiAgent;
}
/**
 * Represents a transaction authenticator specifically for fee payer transactions.
 * It encapsulates the sender's account authenticator, addresses of secondary signers,
 * their respective authenticators, and the fee payer's account information.
 *
 * @param sender - The authenticator for the sender's account.
 * @param secondary_signer_addresses - An array of addresses for secondary signers.
 * @param secondary_signers - An array of authenticators for secondary signers' accounts.
 * @param fee_payer - An object containing the fee payer's account address and authenticator.
 * @group Implementation
 * @category Transactions
 */
declare class TransactionAuthenticatorFeePayer extends TransactionAuthenticator {
    readonly sender: AccountAuthenticator;
    readonly secondary_signer_addresses: Array<AccountAddress>;
    readonly secondary_signers: Array<AccountAuthenticator>;
    readonly fee_payer: {
        address: AccountAddress;
        authenticator: AccountAuthenticator;
    };
    constructor(sender: AccountAuthenticator, secondary_signer_addresses: Array<AccountAddress>, secondary_signers: Array<AccountAuthenticator>, fee_payer: {
        address: AccountAddress;
        authenticator: AccountAuthenticator;
    });
    serialize(serializer: Serializer): void;
    static load(deserializer: Deserializer): TransactionAuthenticatorMultiAgent;
}
/**
 * Represents a single sender authenticator for transactions that require a single signer.
 * This class is responsible for managing the authentication of a transaction initiated by a single sender.
 *
 * @param sender - An instance of AccountAuthenticator that represents the account of the sender.
 * @group Implementation
 * @category Transactions
 */
declare class TransactionAuthenticatorSingleSender extends TransactionAuthenticator {
    readonly sender: AccountAuthenticator;
    constructor(sender: AccountAuthenticator);
    serialize(serializer: Serializer): void;
    static load(deserializer: Deserializer): TransactionAuthenticatorSingleSender;
}

export { TransactionAuthenticator, TransactionAuthenticatorEd25519, TransactionAuthenticatorFeePayer, TransactionAuthenticatorMultiAgent, TransactionAuthenticatorMultiEd25519, TransactionAuthenticatorSingleSender };
