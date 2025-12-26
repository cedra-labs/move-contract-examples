import { Deserializer } from '../bcs/deserializer.mjs';
import { Serializable } from '../bcs/serializer.mjs';
import '../types/types.mjs';
import '../types/indexer.mjs';
import '../types/generated/operations.mjs';
import '../types/generated/types.mjs';
import './apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';
import '../core/hex.mjs';
import '../core/common.mjs';

/**
 * @group Implementation
 * @category Utils
 */
type DeserializableClass<T extends Serializable> = {
    /**
     * Deserializes a serialized object using the provided deserializer.
     * This function allows you to reconstruct an object from its serialized form.
     *
     * @param deserializer - An instance of the Deserializer used to read the serialized data.
     * @group Implementation
     * @category Utils
     */
    deserialize(deserializer: Deserializer): T;
};
/**
 * Normalizes an instance of a class by deserializing it from its byte representation.
 * This function allows the `instanceof` operator to work correctly when the input objects originate from a different bundle.
 *
 * @param cls - The class of the object to normalize.
 * @param value - The instance to normalize.
 * @group Implementation
 * @category Utils
 */
declare function normalizeBundle<T extends Serializable>(cls: DeserializableClass<T>, value: T): T;

export { type DeserializableClass, normalizeBundle };
