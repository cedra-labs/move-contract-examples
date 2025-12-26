import { Deserializer } from '../../bcs/deserializer.mjs';
import { Serializer } from '../../bcs/serializer.mjs';
import { HexInput } from '../../types/types.mjs';
import { A as AuthenticationKey } from '../../publicKey-CJOcUwJK.mjs';
import { Signature } from './signature.mjs';
import { Ed25519PublicKey, Ed25519Signature } from './ed25519.mjs';
import { AptosConfig } from '../../api/aptosConfig.mjs';
import { AbstractMultiKey } from './multiKey.mjs';
import '../../types/indexer.mjs';
import '../../types/generated/operations.mjs';
import '../../types/generated/types.mjs';
import '../../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';
import '../hex.mjs';
import '../common.mjs';
import '../accountAddress.mjs';
import '../../transactions/instances/transactionArgument.mjs';
import './privateKey.mjs';
import '../../utils/const.mjs';
import './singleKey.mjs';
import './secp256k1.mjs';

/**
 * Represents the public key of a K-of-N Ed25519 multi-sig transaction.
 *
 * A K-of-N multi-sig transaction requires at least K out of N authorized signers to sign the transaction
 * for it to be executed. This class encapsulates the logic for managing the public keys and the threshold
 * for valid signatures.
 *
 * @see {@link https://aptos.dev/integration/creating-a-signed-transaction/ | Creating a Signed Transaction}
 * @group Implementation
 * @category Serialization
 */
declare class MultiEd25519PublicKey extends AbstractMultiKey {
    /**
     * Maximum number of public keys supported
     * @group Implementation
     * @category Serialization
     */
    static readonly MAX_KEYS = 32;
    /**
     * Minimum number of public keys needed
     * @group Implementation
     * @category Serialization
     */
    static readonly MIN_KEYS = 2;
    /**
     * Minimum threshold for the number of valid signatures required
     * @group Implementation
     * @category Serialization
     */
    static readonly MIN_THRESHOLD = 1;
    /**
     * List of Ed25519 public keys for this LegacyMultiEd25519PublicKey
     * @group Implementation
     * @category Serialization
     */
    readonly publicKeys: Ed25519PublicKey[];
    /**
     * The minimum number of valid signatures required, for the number of public keys specified
     * @group Implementation
     * @category Serialization
     */
    readonly threshold: number;
    /**
     * Public key for a K-of-N multi-sig transaction. A K-of-N multi-sig transaction means that for such a
     * transaction to be executed, at least K out of the N authorized signers have signed the transaction
     * and passed the check conducted by the chain.
     *
     * @see {@link
     * https://aptos.dev/integration/creating-a-signed-transaction/ | Creating a Signed Transaction}
     * @param args - A wrapper to let you choose the param order.
     * @param args.publicKeys A list of public keys
     * @param args.threshold At least "threshold" signatures must be valid
     * @group Implementation
     * @category Serialization
     */
    constructor(args: {
        publicKeys: Ed25519PublicKey[];
        threshold: number;
    });
    /**
     * Verifies a multi-signature against a given message.
     * This function ensures that the provided signatures meet the required threshold and are valid for the given message.
     *
     * @param args - The arguments for verifying the signature.
     * @param args.message - The message that was signed.
     * @param args.signature - The multi-signature containing multiple signatures and a bitmap indicating which signatures are valid.
     * @returns True if the signature is valid; otherwise, false.
     * @throws Error if the bitmap and signatures length mismatch or if there are not enough valid signatures.
     * @group Implementation
     * @category Serialization
     */
    verifySignature(args: {
        message: HexInput;
        signature: Signature;
    }): boolean;
    verifySignatureAsync(args: {
        aptosConfig: AptosConfig;
        message: HexInput;
        signature: Signature;
    }): Promise<boolean>;
    /**
     * Generates an authentication key based on the current instance's byte representation.
     * This function is essential for creating a secure authentication key that can be used for various cryptographic operations.
     *
     * @returns {AuthenticationKey} The generated authentication key.
     * @group Implementation
     * @category Serialization
     */
    authKey(): AuthenticationKey;
    /**
     * Converts a PublicKeys into Uint8Array (bytes) with: bytes = p1_bytes | ... | pn_bytes | threshold
     * @group Implementation
     * @category Serialization
     */
    toUint8Array(): Uint8Array;
    /**
     * Serializes the current instance into bytes using the provided serializer.
     * This allows for the conversion of the instance's data into a format suitable for transmission or storage.
     *
     * @param serializer - The serializer used to convert the instance into bytes.
     * @group Implementation
     * @category Serialization
     */
    serialize(serializer: Serializer): void;
    /**
     * Deserializes a MultiEd25519Signature from the provided deserializer.
     * This function helps in reconstructing a MultiEd25519Signature object from its serialized byte representation.
     *
     * @param deserializer - The deserializer instance used to read the serialized data.
     * @group Implementation
     * @category Serialization
     */
    static deserialize(deserializer: Deserializer): MultiEd25519PublicKey;
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
    getIndex(publicKey: Ed25519PublicKey): number;
}
/**
 * Represents the signature of a K-of-N Ed25519 multi-sig transaction.
 *
 * @see {@link https://aptos.dev/integration/creating-a-signed-transaction/#multisignature-transactions | Creating a Signed Transaction}
 * @group Implementation
 * @category Serialization
 */
declare class MultiEd25519Signature extends Signature {
    /**
     * Maximum number of Ed25519 signatures supported
     * @group Implementation
     * @category Serialization
     */
    static MAX_SIGNATURES_SUPPORTED: number;
    /**
     * Number of bytes in the bitmap representing who signed the transaction (32-bits)
     * @group Implementation
     * @category Serialization
     */
    static BITMAP_LEN: number;
    /**
     * The list of underlying Ed25519 signatures
     * @group Implementation
     * @category Serialization
     */
    readonly signatures: Ed25519Signature[];
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
     * signature should be provided in `signatures`. Bits are read from left to right.
     * Alternatively, you can specify an array of bitmap positions.
     * Valid position should range between 0 and 31.
     * @see MultiEd25519Signature.createBitmap
     * @group Implementation
     * @category Serialization
     */
    constructor(args: {
        signatures: Ed25519Signature[];
        bitmap: Uint8Array | number[];
    });
    /**
     * Converts a MultiSignature into Uint8Array (bytes) with `bytes = s1_bytes | ... | sn_bytes | bitmap`
     * @group Implementation
     * @category Serialization
     */
    toUint8Array(): Uint8Array;
    serialize(serializer: Serializer): void;
    static deserialize(deserializer: Deserializer): MultiEd25519Signature;
    /**
     * Helper method to create a bitmap out of the specified bit positions.
     * This function allows you to set specific bits in a 32-bit long bitmap based on the provided positions.
     *
     * @param args The arguments for creating the bitmap.
     * @param args.bits The bitmap positions that should be set. A position starts at index 0. Valid positions should range between 0 and 31.
     *
     * @example
     * Here's an example of valid `bits`
     * ```
     * [0, 2, 31]
     * ```
     * `[0, 2, 31]` means the 1st, 3rd and 32nd bits should be set in the bitmap.
     * The result bitmap should be 0b1010000000000000000000000000001
     *
     * @returns bitmap that is 32 bits long.
     * @group Implementation
     * @category Serialization
     */
    static createBitmap(args: {
        bits: number[];
    }): Uint8Array;
}

export { MultiEd25519PublicKey, MultiEd25519Signature };
