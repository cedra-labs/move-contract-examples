import { Serializable } from '../../bcs/serializer.mjs';
import '../hex.mjs';
import '../common.mjs';
import '../../types/types.mjs';
import '../../types/indexer.mjs';
import '../../types/generated/operations.mjs';
import '../../types/generated/types.mjs';
import '../../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';

/**
 * An abstract representation of a crypto signature,
 * associated with a specific signature scheme, e.g., Ed25519 or Secp256k1.
 *
 * This class represents the product of signing a message directly from a
 * PrivateKey and can be verified against a CryptoPublicKey.
 * @group Implementation
 * @category Serialization
 */
declare abstract class Signature extends Serializable {
    /**
     * Get the raw signature bytes
     * @group Implementation
     * @category Serialization
     */
    toUint8Array(): Uint8Array;
    /**
     * Get the signature as a hex string with a 0x prefix e.g. 0x123456...
     * @returns The hex string representation of the signature.
     * @group Implementation
     * @category Serialization
     */
    toString(): string;
}

export { Signature };
