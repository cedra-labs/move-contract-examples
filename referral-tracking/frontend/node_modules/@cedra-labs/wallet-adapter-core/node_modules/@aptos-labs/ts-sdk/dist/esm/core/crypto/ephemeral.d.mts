import { Deserializer } from '../../bcs/deserializer.mjs';
import { Serializer } from '../../bcs/serializer.mjs';
import { EphemeralPublicKeyVariant, HexInput } from '../../types/types.mjs';
import { P as PublicKey } from '../../publicKey-CJOcUwJK.mjs';
import { Signature } from './signature.mjs';
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
import '../../utils/const.mjs';

/**
 * Represents ephemeral public keys for Aptos Keyless accounts.
 *
 * These keys are used only temporarily within Keyless accounts and are not utilized as public keys for account identification.
 * @group Implementation
 * @category Serialization
 */
declare class EphemeralPublicKey extends PublicKey {
    /**
     * The public key itself
     * @group Implementation
     * @category Serialization
     */
    readonly publicKey: PublicKey;
    /**
     * An enum indicating the scheme of the ephemeral public key
     * @group Implementation
     * @category Serialization
     */
    readonly variant: EphemeralPublicKeyVariant;
    /**
     * Creates an instance of EphemeralPublicKey using the provided public key.
     * This constructor ensures that only supported signature types are accepted.
     *
     * @param publicKey - The public key to be used for the ephemeral public key.
     * @throws Error if the signature type is unsupported.
     * @group Implementation
     * @category Serialization
     */
    constructor(publicKey: PublicKey);
    /**
     * Verifies a signed message using the ephemeral public key.
     *
     * @param args - The arguments for the verification.
     * @param args.message - The message that was signed.
     * @param args.signature - The signature that was signed by the private key of the ephemeral public key.
     * @returns true if the signature is valid, otherwise false.
     * @group Implementation
     * @category Serialization
     */
    verifySignature(args: {
        message: HexInput;
        signature: EphemeralSignature;
    }): boolean;
    verifySignatureAsync(args: {
        aptosConfig: AptosConfig;
        message: HexInput;
        signature: EphemeralSignature;
    }): Promise<boolean>;
    /**
     * Serializes the current instance, specifically handling the Ed25519 signature type.
     * This function ensures that the signature is properly serialized using the provided serializer.
     *
     * @param serializer - The serializer instance used to serialize the signature.
     * @throws Error if the signature type is unknown.
     * @group Implementation
     * @category Serialization
     */
    serialize(serializer: Serializer): void;
    /**
     * Deserializes an EphemeralSignature from the provided deserializer.
     * This function allows you to retrieve an EphemeralSignature based on the deserialized data.
     *
     * @param deserializer - The deserializer instance used to read the serialized data.
     * @group Implementation
     * @category Serialization
     */
    static deserialize(deserializer: Deserializer): EphemeralPublicKey;
    /**
     * Determines if the provided public key is an instance of `EphemeralPublicKey`.
     *
     * @param publicKey - The public key to check.
     * @returns A boolean indicating whether the public key is an ephemeral type.
     * @group Implementation
     * @category Serialization
     */
    static isPublicKey(publicKey: PublicKey): publicKey is EphemeralPublicKey;
}
/**
 * Represents ephemeral signatures used in Aptos Keyless accounts.
 *
 * These signatures are utilized within the KeylessSignature framework.
 * @group Implementation
 * @category Serialization
 */
declare class EphemeralSignature extends Signature {
    /**
     * The signature signed by the private key of an EphemeralKeyPair
     * @group Implementation
     * @category Serialization
     */
    readonly signature: Signature;
    constructor(signature: Signature);
    /**
     * Deserializes an ephemeral signature from a hexadecimal input.
     * This function allows you to convert a hexadecimal representation of an ephemeral signature into its deserialized form for
     * further processing.
     *
     * @param hexInput - The hexadecimal input representing the ephemeral signature.
     * @group Implementation
     * @category Serialization
     */
    static fromHex(hexInput: HexInput): EphemeralSignature;
    serialize(serializer: Serializer): void;
    static deserialize(deserializer: Deserializer): EphemeralSignature;
}

export { EphemeralPublicKey, EphemeralSignature };
