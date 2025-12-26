import { HexInput, AuthenticationKeyScheme } from './types/types.mjs';
import { Serializable, Serializer } from './bcs/serializer.mjs';
import { AccountAddress } from './core/accountAddress.mjs';
import { Deserializer } from './bcs/deserializer.mjs';
import { Hex } from './core/hex.mjs';
import { Signature } from './core/crypto/signature.mjs';
import { AptosConfig } from './api/aptosConfig.mjs';

/**
 * Represents an authentication key used for account management. Each account stores an authentication key that enables account
 * owners to rotate their private key(s) without changing the address that hosts their account. The authentication key is a
 * SHA3-256 hash of data and is always 32 bytes in length.
 *
 * @see {@link https://aptos.dev/concepts/accounts | Account Basics}
 *
 * Account addresses can be derived from the AuthenticationKey.
 * @group Implementation
 * @category Serialization
 */
declare class AuthenticationKey extends Serializable {
    /**
     * An authentication key is always a SHA3-256 hash of data, and is always 32 bytes.
     *
     * The data to hash depends on the underlying public key type and the derivation scheme.
     * @group Implementation
     * @category Serialization
     */
    static readonly LENGTH: number;
    /**
     * The raw bytes of the authentication key.
     * @group Implementation
     * @category Serialization
     */
    readonly data: Hex;
    /**
     * Creates an instance of the AuthenticationKey using the provided hex input.
     * This ensures that the hex input is valid and conforms to the required length for an Authentication Key.
     *
     * @param args - The arguments for constructing the AuthenticationKey.
     * @param args.data - The hex input data to be used for the Authentication Key.
     * @throws {Error} Throws an error if the length of the provided hex input is not equal to the required Authentication Key
     * length.
     * @group Implementation
     * @category Serialization
     */
    constructor(args: {
        data: HexInput;
    });
    /**
     * Serializes the fixed bytes data into a format suitable for transmission or storage.
     *
     * @param serializer - The serializer instance used to perform the serialization.
     * @group Implementation
     * @category Serialization
     */
    serialize(serializer: Serializer): void;
    /**
     * Deserialize an AuthenticationKey from the byte buffer in a Deserializer instance.
     * @param deserializer - The deserializer to deserialize the AuthenticationKey from.
     * @returns An instance of AuthenticationKey.
     * @group Implementation
     * @category Serialization
     */
    static deserialize(deserializer: Deserializer): AuthenticationKey;
    /**
     * Convert the internal data representation to a Uint8Array.
     *
     * This function is useful for obtaining a byte representation of the data, which can be utilized for serialization or transmission.
     *
     * @returns Uint8Array representation of the internal data.
     * @group Implementation
     * @category Serialization
     */
    toUint8Array(): Uint8Array;
    /**
     * Generates an AuthenticationKey from the specified scheme and input bytes.
     * This function is essential for creating a valid authentication key based on a given scheme.
     *
     * @param args - The arguments for generating the AuthenticationKey.
     * @param args.scheme - The authentication key scheme to use.
     * @param args.input - The input data in hexadecimal format to derive the key.
     * @returns An instance of AuthenticationKey containing the generated key data.
     * @group Implementation
     * @category Serialization
     */
    static fromSchemeAndBytes(args: {
        scheme: AuthenticationKeyScheme;
        input: HexInput;
    }): AuthenticationKey;
    /**
     * Derives an AuthenticationKey from the provided public key using a specified derivation scheme.
     *
     * @deprecated Use `fromPublicKey` instead.
     * @param args - The arguments for deriving the authentication key.
     * @param args.publicKey - The public key used for the derivation.
     * @param args.scheme - The scheme to use for deriving the authentication key.
     * @group Implementation
     * @category Serialization
     */
    static fromPublicKeyAndScheme(args: {
        publicKey: AccountPublicKey;
        scheme: AuthenticationKeyScheme;
    }): AuthenticationKey;
    /**
     * Converts a PublicKey to an AuthenticationKey using the derivation scheme inferred from the provided PublicKey instance.
     *
     * @param args - The arguments for the function.
     * @param args.publicKey - The PublicKey to be converted.
     * @returns AuthenticationKey - The derived AuthenticationKey.
     * @group Implementation
     * @category Serialization
     */
    static fromPublicKey(args: {
        publicKey: AccountPublicKey;
    }): AuthenticationKey;
    /**
     * Derives an account address from an AuthenticationKey by translating the AuthenticationKey bytes directly to an AccountAddress.
     *
     * @returns AccountAddress - The derived account address.
     * @group Implementation
     * @category Serialization
     */
    derivedAddress(): AccountAddress;
}

/**
 * Represents the arguments required to verify a digital signature.
 *
 * @param message - The original message that was signed.
 * @param signature - The signature to be verified against the message.
 * @group Implementation
 * @category Serialization
 */
interface VerifySignatureArgs {
    message: HexInput;
    signature: Signature;
}
/**
 * Represents the arguments required to verify a digital signature asynchronously.
 *
 * The validity of certain types of signatures are dependent on network state.  This is the case for
 * Keyless signatures which need to lookup the verification key and keyless configuration.
 *
 * @param aptosConfig - The Aptos configuration to use
 * @param message - The original message that was signed.
 * @param signature - The signature to be verified against the message.
 * @group Implementation
 * @category Serialization
 */
type VerifySignatureAsyncArgs = VerifySignatureArgs & {
    aptosConfig: AptosConfig;
    options?: any;
};
/**
 * Represents an abstract public key.
 *
 * This class provides a common interface for verifying signatures associated with the public key.
 * It allows for the retrieval of the raw public key bytes and the public key in a hexadecimal string format.
 * @group Implementation
 * @category Serialization
 */
declare abstract class PublicKey extends Serializable {
    /**
     * Verifies that the private key associated with this public key signed the message with the given signature.
     * @param args.message The message that was signed
     * @param args.signature The signature to verify
     * @group Implementation
     * @category Serialization
     */
    abstract verifySignature(args: VerifySignatureArgs): boolean;
    /**
     * Verifies signature with the public key and makes any network calls required to get state required to verify the signature.
     * @param args.aptosConfig The Aptos configuration
     * @param args.message The message that was signed
     * @param args.signature The signature to verify
     * @group Implementation
     * @category Serialization
     */
    verifySignatureAsync(args: VerifySignatureAsyncArgs): Promise<boolean>;
    /**
     * Get the raw public key bytes
     * @group Implementation
     * @category Serialization
     */
    toUint8Array(): Uint8Array;
    /**
     * Get the public key as a hex string with a 0x prefix.
     *
     * @returns The public key in hex format.
     * @group Implementation
     * @category Serialization
     */
    toString(): string;
}
/**
 * An abstract representation of an account public key.
 *
 * Provides a common interface for deriving an authentication key.
 *
 * @abstract
 * @group Implementation
 * @category Serialization
 */
declare abstract class AccountPublicKey extends PublicKey {
    /**
     * Get the authentication key associated with this public key
     * @group Implementation
     * @category Serialization
     */
    abstract authKey(): AuthenticationKey;
}

export { AuthenticationKey as A, PublicKey as P, type VerifySignatureArgs as V, type VerifySignatureAsyncArgs as a, AccountPublicKey as b };
