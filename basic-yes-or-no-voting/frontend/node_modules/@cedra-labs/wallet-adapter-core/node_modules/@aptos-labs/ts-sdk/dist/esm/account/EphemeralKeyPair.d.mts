import { Deserializer } from '../bcs/deserializer.mjs';
import { Serializable, Serializer } from '../bcs/serializer.mjs';
import { HexInput, EphemeralPublicKeyVariant } from '../types/types.mjs';
import { PrivateKey } from '../core/crypto/privateKey.mjs';
import { EphemeralPublicKey, EphemeralSignature } from '../core/crypto/ephemeral.mjs';
import '../core/hex.mjs';
import '../core/common.mjs';
import '../types/indexer.mjs';
import '../types/generated/operations.mjs';
import '../types/generated/types.mjs';
import '../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';
import '../publicKey-CJOcUwJK.mjs';
import '../core/accountAddress.mjs';
import '../transactions/instances/transactionArgument.mjs';
import '../core/crypto/signature.mjs';
import '../api/aptosConfig.mjs';
import '../utils/const.mjs';

/**
 * Represents an ephemeral key pair used for signing transactions via the Keyless authentication scheme.
 * This key pair is temporary and includes an expiration time.
 * For more details on how this class is used, refer to the documentation:
 * https://aptos.dev/guides/keyless-accounts/#1-present-the-user-with-a-sign-in-with-idp-button-on-the-ui
 * @group Implementation
 * @category Account (On-Chain Model)
 */
declare class EphemeralKeyPair extends Serializable {
    static readonly BLINDER_LENGTH: number;
    /**
     * A byte array of length BLINDER_LENGTH used to obfuscate the public key from the IdP.
     * Used in calculating the nonce passed to the IdP and as a secret witness in proof generation.
     * @group Implementation
     * @category Account (On-Chain Model)
     */
    readonly blinder: Uint8Array;
    /**
     * A timestamp in seconds indicating when the ephemeral key pair is expired.  After expiry, a new
     * EphemeralKeyPair must be generated and a new JWT needs to be created.
     * @group Implementation
     * @category Account (On-Chain Model)
     */
    readonly expiryDateSecs: number;
    /**
     * The value passed to the IdP when the user authenticates.  It consists of a hash of the
     * ephemeral public key, expiry date, and blinder.
     * @group Implementation
     * @category Account (On-Chain Model)
     */
    readonly nonce: string;
    /**
     * A private key used to sign transactions.  This private key is not tied to any account on the chain as it
     * is ephemeral (not permanent) in nature.
     * @group Implementation
     * @category Account (On-Chain Model)
     */
    private privateKey;
    /**
     * A public key used to verify transactions.  This public key is not tied to any account on the chain as it
     * is ephemeral (not permanent) in nature.
     * @group Implementation
     * @category Account (On-Chain Model)
     */
    private publicKey;
    /**
     * Creates an instance of the class with a specified private key, optional expiry date, and optional blinder.
     * This constructor initializes the public key, sets the expiry date to a default value if not provided,
     * generates a blinder if not supplied, and calculates the nonce based on the public key, expiry date, and blinder.
     *
     * @param args - The parameters for constructing the instance.
     * @param args.privateKey - The private key used for creating the instance.
     * @param args.expiryDateSecs - Optional expiry date in seconds from the current time. Defaults to two weeks from now.
     * @param args.blinder - Optional blinder value. If not provided, a new blinder will be generated.
     * @group Implementation
     * @category Account (On-Chain Model)
     */
    constructor(args: {
        privateKey: PrivateKey;
        expiryDateSecs?: number;
        blinder?: HexInput;
    });
    /**
     * Returns the public key of the key pair.
     * @return EphemeralPublicKey
     * @group Implementation
     * @category Account (On-Chain Model)
     */
    getPublicKey(): EphemeralPublicKey;
    /**
     * Checks if the current time has surpassed the expiry date of the key pair.
     * @return boolean - Returns true if the key pair is expired, otherwise false.
     * @group Implementation
     * @category Account (On-Chain Model)
     */
    isExpired(): boolean;
    /**
     * Serializes the object's properties into a format suitable for transmission or storage.
     * This function is essential for preparing the object data for serialization processes.
     *
     * @param serializer - The serializer instance used to serialize the object's properties.
     * @group Implementation
     * @category Account (On-Chain Model)
     */
    serialize(serializer: Serializer): void;
    /**
     * Deserializes an ephemeral key pair from the provided deserializer.
     * This function helps in reconstructing an ephemeral key pair, which is essential for cryptographic operations.
     *
     * @param deserializer - The deserializer instance used to read the serialized data.
     * @group Implementation
     * @category Account (On-Chain Model)
     */
    static deserialize(deserializer: Deserializer): EphemeralKeyPair;
    /**
     * Deserialize a byte array into an EphemeralKeyPair object.
     * This function allows you to reconstruct an EphemeralKeyPair from its serialized byte representation.
     *
     * @param bytes - The byte array representing the serialized EphemeralKeyPair.
     * @group Implementation
     * @category Account (On-Chain Model)
     */
    static fromBytes(bytes: Uint8Array): EphemeralKeyPair;
    /**
     * Generates a new ephemeral key pair with an optional expiry date.
     * This function allows you to create a temporary key pair for secure operations.
     *
     * @param args - Optional parameters for key pair generation.
     * @param args.scheme - The type of key pair to use for the EphemeralKeyPair. Only Ed25519 is supported for now.
     * @param args.expiryDateSecs - The date of expiry for the key pair in seconds.
     * @returns An instance of EphemeralKeyPair containing the generated private key and expiry date.
     * @group Implementation
     * @category Account (On-Chain Model)
     */
    static generate(args?: {
        scheme?: EphemeralPublicKeyVariant;
        expiryDateSecs?: number;
    }): EphemeralKeyPair;
    /**
     * Sign the given data using the private key, returning an ephemeral signature.
     * This function is essential for creating a secure signature that can be used for authentication or verification purposes.
     *
     * @param data - The data to be signed, provided in HexInput format.
     * @returns EphemeralSignature - The resulting ephemeral signature.
     * @throws Error - Throws an error if the EphemeralKeyPair has expired.
     * @group Implementation
     * @category Account (On-Chain Model)
     */
    sign(data: HexInput): EphemeralSignature;
}

export { EphemeralKeyPair };
