import { Deserializer } from '../../bcs/deserializer.mjs';
import { Serializable, Serializer } from '../../bcs/serializer.mjs';
import '../../types/types.mjs';
import '../../types/indexer.mjs';
import '../../types/generated/operations.mjs';
import '../../types/generated/types.mjs';
import '../../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';
import '../../core/hex.mjs';
import '../../core/common.mjs';

/**
 * Represents an Identifier that can be serialized and deserialized.
 * This class is used to denote the module "name" in "ModuleId" and
 * the "function name" in "EntryFunction".
 *
 * @extends Serializable
 * @group Implementation
 * @category Transactions
 */
declare class Identifier extends Serializable {
    identifier: string;
    /**
     * Creates an instance of the class with a specified identifier.
     *
     * @param identifier - The unique identifier for the instance.
     * @group Implementation
     * @category Transactions
     */
    constructor(identifier: string);
    /**
     * Serializes the identifier of the current instance using the provided serializer.
     *
     * @param serializer - The serializer instance used to perform the serialization.
     * @group Implementation
     * @category Transactions
     */
    serialize(serializer: Serializer): void;
    /**
     * Deserializes an identifier from the provided deserializer.
     * This function is useful for reconstructing an Identifier object from a serialized format.
     *
     * @param deserializer - The deserializer instance used to read the serialized data.
     * @group Implementation
     * @category Transactions
     */
    static deserialize(deserializer: Deserializer): Identifier;
}

export { Identifier };
