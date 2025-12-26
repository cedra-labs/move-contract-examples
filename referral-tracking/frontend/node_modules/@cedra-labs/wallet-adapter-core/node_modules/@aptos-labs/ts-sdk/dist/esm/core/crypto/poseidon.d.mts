/**
 * Hashes a string to a field element via Poseidon hashing.
 * This function is useful for converting a string into a fixed-size hash that can be used in cryptographic applications.
 *
 * @param str - The string to be hashed.
 * @param maxSizeBytes - The maximum size in bytes for the resulting hash.
 * @returns bigint - The result of the hash.
 * @group Implementation
 * @category Serialization
 */
declare function hashStrToField(str: string, maxSizeBytes: number): bigint;
/**
 * Pads and packs the given byte array to a specified maximum size and appends its length.
 * This function ensures that the byte array does not exceed the maximum size, throwing an error if it does.
 * It is useful for preparing byte data for further processing or transmission by ensuring a consistent format.
 *
 * @param bytes - The byte array to be padded and packed.
 * @param maxSizeBytes - The maximum allowed size for the byte array.
 * @throws Error if the length of the input bytes exceeds the maximum size.
 * @returns A new Uint8Array that contains the padded and packed bytes along with the length of the original byte array.
 * @group Implementation
 * @category Serialization
 */
declare function padAndPackBytesWithLen(bytes: Uint8Array, maxSizeBytes: number): bigint[];
/**
 * Converts a little-endian byte array into a BigInt.
 * This function is useful for interpreting byte data as a numerical value in a way that respects the little-endian format.
 *
 * @param bytes - The byte array to convert.
 * @returns The resulting BigInt representation of the byte array.
 * @group Implementation
 * @category Serialization
 */
declare function bytesToBigIntLE(bytes: Uint8Array): bigint;
/**
 * Converts a bigint value into a little-endian byte array of a specified length.
 * This function is useful for representing large integers in a byte format, which is often required for cryptographic operations
 * or binary data manipulation.
 *
 * @param value - The number to convert into bytes.
 * @param length - The desired length of the resulting byte array.
 * @returns A Uint8Array containing the little-endian representation of the bigint value.
 * @group Implementation
 * @category Serialization
 */
declare function bigIntToBytesLE(value: bigint | number, length: number): Uint8Array;
/**
 * Hashes up to 16 scalar elements via the Poseidon hashing algorithm.
 * Each element must be scalar fields of the BN254 elliptic curve group.
 *
 * @param inputs - An array of elements to be hashed, which can be of type number, bigint, or string.
 * @returns bigint - The result of the hash.
 * @throws Error - Throws an error if the input length exceeds the maximum allowed.
 * @group Implementation
 * @category Serialization
 */
declare function poseidonHash(inputs: (number | bigint | string)[]): bigint;

export { bigIntToBytesLE, bytesToBigIntLE, hashStrToField, padAndPackBytesWithLen, poseidonHash };
