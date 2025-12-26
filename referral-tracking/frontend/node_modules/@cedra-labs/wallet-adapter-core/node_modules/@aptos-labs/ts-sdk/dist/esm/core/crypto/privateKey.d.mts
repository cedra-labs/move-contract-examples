import { HexInput, PrivateKeyVariants } from '../../types/types.mjs';
import { Hex } from '../hex.mjs';
import { P as PublicKey } from '../../publicKey-CJOcUwJK.mjs';
import { Signature } from './signature.mjs';
import '../../types/indexer.mjs';
import '../../types/generated/operations.mjs';
import '../../types/generated/types.mjs';
import '../../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';
import '../common.mjs';
import '../../bcs/serializer.mjs';
import '../accountAddress.mjs';
import '../../bcs/deserializer.mjs';
import '../../transactions/instances/transactionArgument.mjs';
import '../../api/aptosConfig.mjs';
import '../../utils/const.mjs';

/**
 * Represents a private key used for signing messages and deriving the associated public key.
 * @group Implementation
 * @category Serialization
 */
interface PrivateKey {
    /**
     * Sign the given message with the private key to create a signature.
     * @param message - The message to be signed, provided in HexInput format.
     * @returns A Signature object representing the signed message.
     * @group Implementation
     * @category Serialization
     */
    sign(message: HexInput): Signature;
    /**
     * Derive the public key associated with the private key.
     * @group Implementation
     * @category Serialization
     */
    publicKey(): PublicKey;
    /**
     * Get the private key in bytes (Uint8Array).
     * @group Implementation
     * @category Serialization
     */
    toUint8Array(): Uint8Array;
}
declare class PrivateKey {
    /**
     * The AIP-80 compliant prefixes for each private key type. Append this to a private key's hex representation
     * to get an AIP-80 compliant string.
     *
     * [Read about AIP-80](https://github.com/aptos-foundation/AIPs/blob/main/aips/aip-80.md)
     */
    static readonly AIP80_PREFIXES: {
        ed25519: string;
        secp256k1: string;
    };
    /**
     * Format a HexInput to an AIP-80 compliant string.
     *
     * [Read about AIP-80](https://github.com/aptos-foundation/AIPs/blob/main/aips/aip-80.md)
     *
     * @param privateKey - The HexString or Uint8Array format of the private key.
     * @param privateKeyType - The private key type
     */
    static formatPrivateKey(privateKey: HexInput, type: PrivateKeyVariants): string;
    /**
     * Parse a HexInput that may be a HexString, Uint8Array, or a AIP-80 compliant string to a Hex instance.
     *
     * [Read about AIP-80](https://github.com/aptos-foundation/AIPs/blob/main/aips/aip-80.md)
     *
     * @param value - A HexString, Uint8Array, or a AIP-80 compliant string.
     * @param privateKeyType - The private key type
     * @param strict - If true, the value MUST be compliant with AIP-80.
     */
    static parseHexInput(value: HexInput, type: PrivateKeyVariants, strict?: boolean): Hex;
}

export { PrivateKey };
