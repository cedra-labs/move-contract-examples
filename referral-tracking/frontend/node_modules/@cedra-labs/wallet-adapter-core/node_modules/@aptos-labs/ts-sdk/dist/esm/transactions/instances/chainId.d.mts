import { Serializable, Serializer } from '../../bcs/serializer.mjs';
import { Deserializer } from '../../bcs/deserializer.mjs';
import '../../core/hex.mjs';
import '../../core/common.mjs';
import '../../types/types.mjs';
import '../../types/indexer.mjs';
import '../../types/generated/operations.mjs';
import '../../types/generated/types.mjs';
import '../../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';

/**
 * Represents a ChainId that can be serialized and deserialized.
 *
 * @extends Serializable
 * @group Implementation
 * @category Transactions
 */
declare class ChainId extends Serializable {
    readonly chainId: number;
    /**
     * Initializes a new instance of the class with the specified chain ID.
     *
     * @param chainId - The ID of the blockchain network to be used.
     * @group Implementation
     * @category Transactions
     */
    constructor(chainId: number);
    /**
     * Serializes the current object using the provided serializer.
     * This function helps in converting the object into a format suitable for transmission or storage.
     *
     * @param serializer - The serializer instance used to perform the serialization.
     * @group Implementation
     * @category Transactions
     */
    serialize(serializer: Serializer): void;
    /**
     * Deserializes a ChainId from the provided deserializer.
     * This function allows you to reconstruct a ChainId object from serialized data.
     *
     * @param deserializer - The deserializer instance used to read the serialized data.
     * @group Implementation
     * @category Transactions
     */
    static deserialize(deserializer: Deserializer): ChainId;
}

export { ChainId };
