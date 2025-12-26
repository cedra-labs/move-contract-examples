import { Hex } from '../core/hex.mjs';
import { Uint8, Uint16, Uint32, AnyNumber } from '../types/types.mjs';
import '../core/common.mjs';
import '../types/indexer.mjs';
import '../types/generated/operations.mjs';
import '../types/generated/types.mjs';
import '../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';

/**
 * This class serves as a base class for all serializable types. It facilitates
 * composable serialization of complex types and enables the serialization of
 * instances to their BCS (Binary Canonical Serialization) representation.
 * @group Implementation
 * @category BCS
 */
declare abstract class Serializable {
    abstract serialize(serializer: Serializer): void;
    /**
     * Serializes a `Serializable` value to its BCS representation.
     * This function is the TypeScript SDK equivalent of `bcs::to_bytes` in Move.
     * @returns the BCS representation of the Serializable instance as a byte buffer.
     * @group Implementation
     * @category BCS
     */
    bcsToBytes(): Uint8Array;
    /**
     * Converts the BCS-serialized bytes of a value into a Hex instance.
     * This function provides a Hex representation of the BCS-serialized data for easier handling and manipulation.
     * @returns A Hex instance with the BCS-serialized bytes loaded into its underlying Uint8Array.
     * @group Implementation
     * @category BCS
     */
    bcsToHex(): Hex;
    /**
     * Returns the hex string representation of the `Serializable` value without the 0x prefix.
     * @returns the hex format as a string without `0x` prefix.
     */
    toStringWithoutPrefix(): string;
    /**
     * Returns the hex string representation of the `Serializable` value with the 0x prefix.
     * @returns the hex formatas a string prefixed by `0x`.
     */
    toString(): string;
}
/**
 * A class for serializing various data types into a binary format.
 * It provides methods to serialize strings, bytes, numbers, and other serializable objects
 * using the Binary Coded Serialization (BCS) layout. The serialized data can be retrieved as a
 * Uint8Array.
 * @group Implementation
 * @category BCS
 */
declare class Serializer {
    private buffer;
    private offset;
    /**
     * Constructs a serializer with a buffer of size `length` bytes, 64 bytes by default.
     * The `length` must be greater than 0.
     *
     * @param length - The size of the buffer in bytes.
     * @group Implementation
     * @category BCS
     */
    constructor(length?: number);
    /**
     * Ensures that the internal buffer can accommodate the specified number of bytes.
     * This function dynamically resizes the buffer if the current size is insufficient.
     *
     * @param bytes - The number of bytes to ensure the buffer can handle.
     * @group Implementation
     * @category BCS
     */
    private ensureBufferWillHandleSize;
    /**
     * Appends the specified values to the buffer, ensuring that the buffer can accommodate the new data.
     *
     * @param {Uint8Array} values - The values to be appended to the buffer.
     * @group Implementation
     * @category BCS
     */
    protected appendToBuffer(values: Uint8Array): void;
    /**
     * Serializes a value into the buffer using the provided function, ensuring the buffer can accommodate the size.
     *
     * @param fn - The function to serialize the value, which takes a byte offset, the value to serialize, and an optional little-endian flag.
     * @param fn.byteOffset - The byte offset at which to write the value.
     * @param fn.value - The numeric value to serialize into the buffer.
     * @param fn.littleEndian - Optional flag indicating whether to use little-endian byte order (defaults to true).
     * @group Implementation
     * @category BCS
     */
    private serializeWithFunction;
    /**
     * Serializes a string. UTF8 string is supported.
     * The number of bytes in the string content is serialized first, as a uleb128-encoded u32 integer.
     * Then the string content is serialized as UTF8 encoded bytes.
     *
     * BCS layout for "string": string_length | string_content
     * where string_length is a u32 integer encoded as a uleb128 integer, equal to the number of bytes in string_content.
     *
     * @param value - The string to serialize.
     *
     * @example
     * ```typescript
     * const serializer = new Serializer();
     * serializer.serializeStr("1234abcd");
     * assert(serializer.toUint8Array() === new Uint8Array([8, 49, 50, 51, 52, 97, 98, 99, 100]));
     * ```
     * @group Implementation
     * @category BCS
     */
    serializeStr(value: string): void;
    /**
     * Serializes an array of bytes.
     *
     * This function encodes the length of the byte array as a u32 integer in uleb128 format, followed by the byte array itself.
     * BCS layout for "bytes": bytes_length | bytes
     * where bytes_length is a u32 integer encoded as a uleb128 integer, equal to the length of the bytes array.
     * @param value - The byte array to serialize.
     * @group Implementation
     * @category BCS
     */
    serializeBytes(value: Uint8Array): void;
    /**
     * Serializes an array of bytes with a known length, allowing for efficient deserialization without needing to serialize the
     * length itself.
     * When deserializing, the number of bytes to deserialize needs to be passed in.
  
     * @param value - The Uint8Array to be serialized.
     * @group Implementation
     * @category BCS
     */
    serializeFixedBytes(value: Uint8Array): void;
    /**
     * Serializes a boolean value into a byte representation.
     *
     * The BCS layout for a boolean uses one byte, where "0x01" represents true and "0x00" represents false.
     *
     * @param value - The boolean value to serialize.
     * @group Implementation
     * @category BCS
     */
    serializeBool(value: boolean): void;
    /**
     * Serializes a Uint8 value and appends it to the buffer.
     * BCS layout for "uint8": One byte. Binary format in little-endian representation.
     *
     * @param value - The Uint8 value to serialize.
     * @group Implementation
     * @category BCS
     */
    serializeU8(value: Uint8): void;
    /**
     * Serializes a uint16 number.
     *
     * @group Implementation
     * @category BCS
  
     */
    /**
     * Serializes a 16-bit unsigned integer value into a binary format.
     * BCS layout for "uint16": Two bytes. Binary format in little-endian representation.
     *
     * @param value - The 16-bit unsigned integer value to serialize.
     * @example
     * ```typescript
     * const serializer = new Serializer();
     * serializer.serializeU16(4660);
     * assert(serializer.toUint8Array() === new Uint8Array([0x34, 0x12]));
     * ```
     * @group Implementation
     * @category BCS
     */
    serializeU16(value: Uint16): void;
    /**
     * Serializes a 32-bit unsigned integer value into a binary format.
     * This function is useful for encoding data that needs to be stored or transmitted in a compact form.
     * @example
     * ```typescript
     * const serializer = new Serializer();
     * serializer.serializeU32(305419896);
     * assert(serializer.toUint8Array() === new Uint8Array([0x78, 0x56, 0x34, 0x12]));
     * ```
     * @param value - The 32-bit unsigned integer value to serialize.
     * @group Implementation
     * @category BCS
     */
    serializeU32(value: Uint32): void;
    /**
     * Serializes a 64-bit unsigned integer into a format suitable for storage or transmission.
     * This function breaks down the value into two 32-bit components and writes them in little-endian order.
     *
     * @param value - The 64-bit unsigned integer to serialize, represented as a number.
     * @example
     * ```ts
     * const serializer = new Serializer();
     * serializer.serializeU64(1311768467750121216);
     * assert(serializer.toUint8Array() === new Uint8Array([0x00, 0xEF, 0xCD, 0xAB, 0x78, 0x56, 0x34, 0x12]));
     * ```
     * @group Implementation
     * @category BCS
     */
    serializeU64(value: AnyNumber): void;
    /**
     * Serializes a U128 value into a format suitable for storage or transmission.
     *
     * @param value - The U128 value to serialize, represented as a number.
     * @group Implementation
     * @category BCS
     */
    serializeU128(value: AnyNumber): void;
    /**
     * Serializes a U256 value into a byte representation.
     * This function is essential for encoding large numbers in a compact format suitable for transmission or storage.
     *
     * @param value - The U256 value to serialize, represented as an AnyNumber.
     * @group Implementation
     * @category BCS
     */
    serializeU256(value: AnyNumber): void;
    /**
     * Serializes a 32-bit unsigned integer as a variable-length ULEB128 encoded byte array.
     * BCS uses uleb128 encoding in two cases: (1) lengths of variable-length sequences and (2) tags of enum values
     *
     * @param val - The 32-bit unsigned integer value to be serialized.
     * @group Implementation
     * @category BCS
     */
    serializeU32AsUleb128(val: Uint32): void;
    /**
     * Returns the buffered bytes as a Uint8Array.
     *
     * This function allows you to retrieve the byte representation of the buffer up to the current offset.
     *
     * @returns Uint8Array - The byte array representation of the buffer.
     * @group Implementation
     * @category BCS
     */
    toUint8Array(): Uint8Array;
    /**
     * Serializes a `Serializable` value, facilitating composable serialization.
     *
     * @param value The Serializable value to serialize.
     *
     * @returns the serializer instance
     * @group Implementation
     * @category BCS
     */
    serialize<T extends Serializable>(value: T): void;
    /**
     * Serializes an array of BCS Serializable values to a serializer instance.
     * The bytes are added to the serializer instance's byte buffer.
     *
     * @param values The array of BCS Serializable values
     * @example
     * const addresses = new Array<AccountAddress>(
     *   AccountAddress.from("0x1"),
     *   AccountAddress.from("0x2"),
     *   AccountAddress.from("0xa"),
     *   AccountAddress.from("0xb"),
     * );
     * const serializer = new Serializer();
     * serializer.serializeVector(addresses);
     * const serializedBytes = serializer.toUint8Array();
     * // serializedBytes is now the BCS-serialized bytes
     * // The equivalent value in Move would be:
     * // `bcs::to_bytes(&vector<address> [@0x1, @0x2, @0xa, @0xb])`;
     * @group Implementation
     * @category BCS
     */
    serializeVector<T extends Serializable>(values: Array<T>): void;
    /**
     * Serializes an optional value which can be a Serializable, string, or Uint8Array.
     * For strings and Uint8Arrays, it uses the appropriate serialization method.
     *
     * @param value The value to serialize (Serializable, string, Uint8Array, or undefined)
     * @param len Optional fixed length for Uint8Array serialization. If provided, uses serializeFixedBytes instead of serializeBytes
     *
     * @example
     * ```typescript
     * const serializer = new Serializer();
     * serializer.serializeOption("hello");  // Serializes optional string
     * serializer.serializeOption(new Uint8Array([1, 2, 3]));  // Serializes optional bytes
     * serializer.serializeOption(new Uint8Array([1, 2, 3]), 3);  // Serializes optional fixed-length bytes
     * serializer.serializeOption(new AccountAddress(...));  // Serializes optional Serializable
     * serializer.serializeOption(undefined);  // Serializes none case
     * ```
     * @group Implementation
     * @category BCS
     */
    serializeOption<T extends Serializable | string | Uint8Array>(value?: T, len?: number): void;
    /**
     * @deprecated use `serializeOption` instead.
     * Serializes an optional string, supporting UTF8 encoding.
     * The function encodes the existence of the string first, followed by the length and content if it exists.
     *
     * BCS layout for optional "string": 1 | string_length | string_content
     * where string_length is a u32 integer encoded as a uleb128 integer, equal to the number of bytes in string_content.
     * BCS layout for undefined: 0
     *
     * @param value - The optional string to serialize. If undefined, it will serialize as 0.
     * @group Implementation
     * @category BCS
     */
    serializeOptionStr(value?: string): void;
}
/**
 * @group Implementation
 * @category BCS
 */
declare function ensureBoolean(value: unknown): asserts value is boolean;
/**
 * @group Implementation
 * @category BCS
 */
declare const outOfRangeErrorMessage: (value: AnyNumber, min: AnyNumber, max: AnyNumber) => string;
/**
 * Validates that a given number is within a specified range.
 * This function throws an error if the value is outside the defined minimum and maximum bounds.
 *
 * @param value - The number to validate.
 * @param minValue - The minimum allowable value (inclusive).
 * @param maxValue - The maximum allowable value (inclusive).
 * @group Implementation
 * @category BCS
 */
declare function validateNumberInRange<T extends AnyNumber>(value: T, minValue: T, maxValue: T): void;

export { Serializable, Serializer, ensureBoolean, outOfRangeErrorMessage, validateNumberInRange };
