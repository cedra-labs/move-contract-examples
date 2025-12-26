import { HexInput } from '../../types/types.mjs';
import { Deserializer } from '../../bcs/deserializer.mjs';
import { Serializer } from '../../bcs/serializer.mjs';
import { b as AccountPublicKey, P as PublicKey, A as AuthenticationKey } from '../../publicKey-CJOcUwJK.mjs';
import { Signature } from './signature.mjs';
import { AnyPublicKey, AnySignature } from './singleKey.mjs';
import { AptosConfig } from '../../api/aptosConfig.mjs';
import '../../types/indexer.mjs';
import '../../types/generated/operations.mjs';
import '../../types/generated/types.mjs';
import '../../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';
import '../hex.mjs';
import '../common.mjs';
import '../accountAddress.mjs';
import '../../transactions/instances/transactionArgument.mjs';
import './ed25519.mjs';
import './privateKey.mjs';
import '../../utils/const.mjs';
import './secp256k1.mjs';

declare abstract class AbstractMultiKey extends AccountPublicKey {
    publicKeys: PublicKey[];
    constructor(args: {
        publicKeys: PublicKey[];
    });
    /**
     * Create a bitmap that holds the mapping from the original public keys
     * to the signatures passed in
     *
     * @param args.bits array of the index mapping to the matching public keys
     * @returns Uint8array bit map
     * @group Implementation
     * @category Serialization
     */
    createBitmap(args: {
        bits: number[];
    }): Uint8Array;
    /**
     * Get the index of the provided public key.
     *
     * This function retrieves the index of a specified public key within the MultiKey.
     * If the public key does not exist, it throws an error.
     *
     * @param publicKey - The public key to find the index for.
     * @returns The corresponding index of the public key, if it exists.
     * @throws Error - If the public key is not found in the MultiKey.
     * @group Implementation
     * @category Serialization
     */
    getIndex(publicKey: PublicKey): number;
}
/**
 * Represents a multi-key authentication scheme for accounts, allowing multiple public keys
 * to be associated with a single account. This class enforces a minimum number of valid signatures
 * required to authorize actions, ensuring enhanced security for multi-agent accounts.
 *
 * The public keys of each individual agent can be any type of public key supported by Aptos.
 * Since [AIP-55](https://github.com/aptos-foundation/AIPs/pull/263), Aptos supports
 * `Legacy` and `Unified` authentication keys.
 * @group Implementation
 * @category Serialization
 */
declare class MultiKey extends AbstractMultiKey {
    /**
     * List of any public keys
     * @group Implementation
     * @category Serialization
     */
    readonly publicKeys: AnyPublicKey[];
    /**
     * The minimum number of valid signatures required, for the number of public keys specified
     * @group Implementation
     * @category Serialization
     */
    readonly signaturesRequired: number;
    /**
     * Signature for a K-of-N multi-sig transaction.
     * This constructor initializes a multi-signature transaction with the provided signatures and bitmap.
     *
     * @param args An object containing the parameters for the multi-signature transaction.
     * @param args.signatures A list of signatures.
     * @param args.bitmap A bitmap represented as a Uint8Array or an array of numbers, where each bit indicates whether a
     * corresponding signature is present. A maximum of 32 signatures is supported, and the length of the bitmap must be 4 bytes.
     *
     * @throws Error if the number of signatures exceeds the maximum supported, if the bitmap length is incorrect, or if the number
     * of signatures does not match the bitmap.
     * @group Implementation
     * @category Serialization
     */
    constructor(args: {
        publicKeys: Array<PublicKey>;
        signaturesRequired: number;
    });
    /**
     * Verifies the provided signature against the given message.
     * This function helps ensure the integrity and authenticity of the message by checking if the signature is valid.
     *
     * Note: This function will fail if a keyless signature is used.  Use `verifySignatureAsync` instead.
     *
     * @param args - The arguments for verifying the signature.
     * @param args.message - The message that was signed.
     * @param args.signature - The signature to verify.
     * @group Implementation
     * @category Serialization
     */
    verifySignature(args: {
        message: HexInput;
        signature: MultiKeySignature;
    }): boolean;
    /**
     * Verifies the provided signature against the given message.
     * This function helps ensure the integrity and authenticity of the message by checking if the signature is valid.
     *
     * @param args - The arguments for verifying the signature.
     * @param args.aptosConfig - The Aptos configuration to use
     * @param args.message - The message that was signed.
     * @param args.signature - The signature to verify.
     * @group Implementation
     * @category Serialization
     */
    verifySignatureAsync(args: {
        aptosConfig: AptosConfig;
        message: HexInput;
        signature: Signature;
        options?: {
            throwErrorWithReason?: boolean;
        };
    }): Promise<boolean>;
    /**
     * Generates an authentication key based on the current instance's byte representation.
     * This key can be used for secure authentication processes within the system.
     *
     * @returns {AuthenticationKey} The generated authentication key.
     * @group Implementation
     * @category Serialization
     */
    authKey(): AuthenticationKey;
    /**
     * Serializes the object by writing its signatures and bitmap to the provided serializer.
     * This allows the object to be converted into a format suitable for transmission or storage.
     *
     * @param serializer - The serializer instance used to perform the serialization.
     * @group Implementation
     * @category Serialization
     */
    serialize(serializer: Serializer): void;
    /**
     * Deserializes a MultiKeySignature from the provided deserializer.
     * This function retrieves the signatures and bitmap necessary for creating a MultiKeySignature object.
     *
     * @param deserializer - The deserializer instance used to read the serialized data.
     * @group Implementation
     * @category Serialization
     */
    static deserialize(deserializer: Deserializer): MultiKey;
    /**
     * Get the index of the provided public key.
     *
     * This function retrieves the index of a specified public key within the MultiKey.
     * If the public key does not exist, it throws an error.
     *
     * @param publicKey - The public key to find the index for.
     * @returns The corresponding index of the public key, if it exists.
     * @throws Error - If the public key is not found in the MultiKey.
     * @group Implementation
     */
    getIndex(publicKey: PublicKey): number;
    static isInstance(value: PublicKey): value is MultiKey;
}
/**
 * Represents a multi-signature transaction using Ed25519 signatures.
 * This class allows for the creation and management of a K-of-N multi-signature scheme,
 * where a specified number of signatures are required to authorize a transaction.
 *
 * It includes functionality to validate the number of signatures against a bitmap,
 * which indicates which public keys have signed the transaction.
 * @group Implementation
 * @category Serialization
 */
declare class MultiKeySignature extends Signature {
    /**
     * Number of bytes in the bitmap representing who signed the transaction (32-bits)
     * @group Implementation
     * @category Serialization
     */
    static BITMAP_LEN: number;
    /**
     * Maximum number of Ed25519 signatures supported
     * @group Implementation
     * @category Serialization
     */
    static MAX_SIGNATURES_SUPPORTED: number;
    /**
     * The list of underlying Ed25519 signatures
     * @group Implementation
     * @category Serialization
     */
    readonly signatures: AnySignature[];
    /**
     * 32-bit Bitmap representing who signed the transaction
     *
     * This is represented where each public key can be masked to determine whether the message was signed by that key.
     * @group Implementation
     * @category Serialization
     */
    readonly bitmap: Uint8Array;
    /**
     * Signature for a K-of-N multi-sig transaction.
     *
     * @see {@link
     * https://aptos.dev/integration/creating-a-signed-transaction/#multisignature-transactions | Creating a Signed Transaction}
     *
     * @param args.signatures A list of signatures
     * @param args.bitmap 4 bytes, at most 32 signatures are supported. If Nth bit value is `1`, the Nth
     * signature should be provided in `signatures`. Bits are read from left to right
     * @group Implementation
     * @category Serialization
     */
    constructor(args: {
        signatures: Array<Signature | AnySignature>;
        bitmap: Uint8Array | number[];
    });
    /**
     * Helper method to create a bitmap out of the specified bit positions
     * @param args.bits The bitmap positions that should be set. A position starts at index 0.
     * Valid position should range between 0 and 31.
     * @example
     * Here's an example of valid `bits`
     * ```
     * [0, 2, 31]
     * ```
     * `[0, 2, 31]` means the 1st, 3rd and 32nd bits should be set in the bitmap.
     * The result bitmap should be 0b1010000000000000000000000000001
     *
     * @returns bitmap that is 32bit long
     * @group Implementation
     * @category Serialization
     */
    static createBitmap(args: {
        bits: number[];
    }): Uint8Array;
    /**
     * Converts the bitmap to an array of signer indices.
     *
     * Example:
     *
     * bitmap: [0b10001000, 0b01000000, 0b00000000, 0b00000000]
     * signerIndices: [0, 4, 9]
     *
     * @returns An array of signer indices.
     * @group Implementation
     * @category Serialization
     */
    bitMapToSignerIndices(): number[];
    serialize(serializer: Serializer): void;
    static deserialize(deserializer: Deserializer): MultiKeySignature;
}

export { AbstractMultiKey, MultiKey, MultiKeySignature };
