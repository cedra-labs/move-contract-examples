import { Deserializer } from '../../bcs/deserializer.mjs';
import { Serializable, Serializer } from '../../bcs/serializer.mjs';
import { HexInput } from '../../types/types.mjs';
import { Hex } from '../../core/hex.mjs';
import { Ed25519PublicKey, Ed25519Signature } from '../../core/crypto/ed25519.mjs';
import { MultiEd25519PublicKey, MultiEd25519Signature } from '../../core/crypto/multiEd25519.mjs';
import { MultiKey, MultiKeySignature } from '../../core/crypto/multiKey.mjs';
import { AnyPublicKey, AnySignature } from '../../core/crypto/singleKey.mjs';
import '../../types/indexer.mjs';
import '../../types/generated/operations.mjs';
import '../../types/generated/types.mjs';
import '../../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';
import '../../core/common.mjs';
import '../../publicKey-CJOcUwJK.mjs';
import '../../core/accountAddress.mjs';
import '../instances/transactionArgument.mjs';
import '../../core/crypto/signature.mjs';
import '../../api/aptosConfig.mjs';
import '../../utils/const.mjs';
import '../../core/crypto/privateKey.mjs';
import '../../core/crypto/secp256k1.mjs';

/**
 * Represents an account authenticator that can handle multiple authentication variants.
 * This class serves as a base for different types of account authenticators, allowing for serialization
 * and deserialization of various authenticator types.
 *
 * @extends Serializable
 * @group Implementation
 * @category Transactions
 */
declare abstract class AccountAuthenticator extends Serializable {
    abstract serialize(serializer: Serializer): void;
    /**
     * Deserializes an AccountAuthenticator from the provided deserializer.
     * This function helps in reconstructing the AccountAuthenticator object based on the variant index.
     *
     * @param deserializer - The deserializer instance used to read the serialized data.
     * @group Implementation
     * @category Transactions
     */
    static deserialize(deserializer: Deserializer): AccountAuthenticator;
    /**
     * Determines if the current instance is an Ed25519 account authenticator.
     *
     * @returns {boolean} True if the instance is of type AccountAuthenticatorEd25519, otherwise false.
     * @group Implementation
     * @category Transactions
     */
    isEd25519(): this is AccountAuthenticatorEd25519;
    /**
     * Determines if the current instance is of type AccountAuthenticatorMultiEd25519.
     *
     * @returns {boolean} True if the instance is a multi-signature Ed25519 account authenticator, otherwise false.
     * @group Implementation
     * @category Transactions
     */
    isMultiEd25519(): this is AccountAuthenticatorMultiEd25519;
    /**
     * Determines if the current instance is of the type AccountAuthenticatorSingleKey.
     *
     * @returns {boolean} True if the instance is an AccountAuthenticatorSingleKey, otherwise false.
     * @group Implementation
     * @category Transactions
     */
    isSingleKey(): this is AccountAuthenticatorSingleKey;
    /**
     * Determine if the current instance is of type AccountAuthenticatorMultiKey.
     *
     * @returns {boolean} Returns true if the instance is an AccountAuthenticatorMultiKey, otherwise false.
     * @group Implementation
     * @category Transactions
     */
    isMultiKey(): this is AccountAuthenticatorMultiKey;
}
/**
 * Represents an Ed25519 transaction authenticator for multi-signer transactions.
 * This class encapsulates the account's Ed25519 public key and signature.
 *
 * @param public_key - The Ed25519 public key associated with the account.
 * @param signature - The Ed25519 signature for the account.
 * @group Implementation
 * @category Transactions
 */
declare class AccountAuthenticatorEd25519 extends AccountAuthenticator {
    readonly public_key: Ed25519PublicKey;
    readonly signature: Ed25519Signature;
    /**
     * Creates an instance of the class with the specified public keys and signatures.
     *
     * @param public_key The public key used for verification.
     * @param signature The signatures corresponding to the public keys.
     * @group Implementation
     * @category Transactions
     */
    constructor(public_key: Ed25519PublicKey, signature: Ed25519Signature);
    /**
     * Serializes the account authenticator data into the provided serializer.
     * This function captures the multi-key variant, public keys, and signatures for serialization.
     *
     * @param serializer - The serializer instance used to perform the serialization.
     * @group Implementation
     * @category Transactions
     */
    serialize(serializer: Serializer): void;
    /**
     * Loads an instance of AccountAuthenticatorMultiKey from the provided deserializer.
     * This function helps in reconstructing the authenticator object using the deserialized public keys and signatures.
     *
     * @param deserializer - The deserializer used to extract the necessary data for loading the authenticator.
     * @group Implementation
     * @category Transactions
     */
    static load(deserializer: Deserializer): AccountAuthenticatorEd25519;
}
/**
 * Represents a transaction authenticator for Multi Ed25519, designed for multi-signer transactions.
 *
 * @param public_key - The MultiEd25519 public key of the account.
 * @param signature - The MultiEd25519 signature of the account.
 * @group Implementation
 * @category Transactions
 */
declare class AccountAuthenticatorMultiEd25519 extends AccountAuthenticator {
    readonly public_key: MultiEd25519PublicKey;
    readonly signature: MultiEd25519Signature;
    constructor(public_key: MultiEd25519PublicKey, signature: MultiEd25519Signature);
    serialize(serializer: Serializer): void;
    static load(deserializer: Deserializer): AccountAuthenticatorMultiEd25519;
}
/**
 * Represents an account authenticator that utilizes a single key for signing.
 * This class is designed to handle authentication using a public key and its corresponding signature.
 *
 * @param public_key - The public key used for authentication.
 * @param signature - The signature associated with the public key.
 * @group Implementation
 * @category Transactions
 */
declare class AccountAuthenticatorSingleKey extends AccountAuthenticator {
    readonly public_key: AnyPublicKey;
    readonly signature: AnySignature;
    constructor(public_key: AnyPublicKey, signature: AnySignature);
    serialize(serializer: Serializer): void;
    static load(deserializer: Deserializer): AccountAuthenticatorSingleKey;
}
/**
 * Represents an account authenticator that supports multiple keys and signatures for multi-signature scenarios.
 *
 * @param public_keys - The public keys used for authentication.
 * @param signatures - The signatures corresponding to the public keys.
 * @group Implementation
 * @category Transactions
 */
declare class AccountAuthenticatorMultiKey extends AccountAuthenticator {
    readonly public_keys: MultiKey;
    readonly signatures: MultiKeySignature;
    constructor(public_keys: MultiKey, signatures: MultiKeySignature);
    serialize(serializer: Serializer): void;
    static load(deserializer: Deserializer): AccountAuthenticatorMultiKey;
}
/**
 * AccountAuthenticatorNoAccountAuthenticator for no account authenticator
 * It represents the absence of a public key for transaction simulation.
 * It allows skipping the public/auth key check during the simulation.
 */
declare class AccountAuthenticatorNoAccountAuthenticator extends AccountAuthenticator {
    serialize(serializer: Serializer): void;
    static load(deserializer: Deserializer): AccountAuthenticatorNoAccountAuthenticator;
}
declare class AccountAuthenticatorAbstraction extends AccountAuthenticator {
    readonly functionInfo: string;
    readonly signingMessageDigest: Hex;
    readonly authenticator: Uint8Array;
    /**
     * DAA, which is extended of the AA module, requires an account identity
     */
    readonly accountIdentity?: Uint8Array;
    constructor(functionInfo: string, signingMessageDigest: HexInput, authenticator: Uint8Array, accountIdentity?: Uint8Array);
    serialize(serializer: Serializer): void;
    static load(deserializer: Deserializer): AccountAuthenticatorAbstraction;
}

export { AccountAuthenticator, AccountAuthenticatorAbstraction, AccountAuthenticatorEd25519, AccountAuthenticatorMultiEd25519, AccountAuthenticatorMultiKey, AccountAuthenticatorNoAccountAuthenticator, AccountAuthenticatorSingleKey };
