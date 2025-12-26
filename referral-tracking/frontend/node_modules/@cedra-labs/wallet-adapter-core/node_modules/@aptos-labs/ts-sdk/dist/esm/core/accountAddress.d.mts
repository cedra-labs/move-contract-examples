import { Serializable, Serializer } from '../bcs/serializer.mjs';
import { Deserializer } from '../bcs/deserializer.mjs';
import { ParsingResult } from './common.mjs';
import { TransactionArgument } from '../transactions/instances/transactionArgument.mjs';
import { HexInput } from '../types/types.mjs';
import './hex.mjs';
import '../types/indexer.mjs';
import '../types/generated/operations.mjs';
import '../types/generated/types.mjs';
import '../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';

/**
 * Provides reasons for an address was invalid.
 * @group Implementation
 * @category Serialization
 */
declare enum AddressInvalidReason {
    INCORRECT_NUMBER_OF_BYTES = "incorrect_number_of_bytes",
    INVALID_HEX_CHARS = "invalid_hex_chars",
    TOO_SHORT = "too_short",
    TOO_LONG = "too_long",
    LEADING_ZERO_X_REQUIRED = "leading_zero_x_required",
    LONG_FORM_REQUIRED_UNLESS_SPECIAL = "long_form_required_unless_special",
    INVALID_PADDING_ZEROES = "INVALID_PADDING_ZEROES",
    INVALID_PADDING_STRICTNESS = "INVALID_PADDING_STRICTNESS"
}
/**
 * The input for an account address, which can be either a hexadecimal string or a standard account address.
 * @group Implementation
 * @category Serialization
 */
type AccountAddressInput = HexInput | AccountAddress;
/**
 * NOTE: Only use this class for account addresses. For other hex data, e.g. transaction
 * hashes, use the Hex class.
 *
 * AccountAddress is used for working with account addresses. Account addresses, when
 * represented as a string, generally look like these examples:
 * - 0x1
 * - 0xaa86fe99004361f747f91342ca13c426ca0cccb0c1217677180c9493bad6ef0c
 *
 * Proper formatting and parsing of account addresses is defined by AIP-40.
 * To learn more about the standard, read the AIP here:
 * https://github.com/aptos-foundation/AIPs/blob/main/aips/aip-40.md.
 *
 * The comments in this class make frequent reference to the LONG and SHORT formats,
 * as well as "special" addresses. To learn what these refer to see AIP-40.
 * @group Implementation
 * @category Serialization
 */
declare class AccountAddress extends Serializable implements TransactionArgument {
    /**
     * This is the internal representation of an account address.
     * @group Implementation
     * @category Serialization
     */
    readonly data: Uint8Array;
    /**
     * The number of bytes that make up an account address.
     * @group Implementation
     * @category Serialization
     */
    static readonly LENGTH: number;
    /**
     * The length of an address string in LONG form without a leading 0x.
     * @group Implementation
     * @category Serialization
     */
    static readonly LONG_STRING_LENGTH: number;
    static ZERO: AccountAddress;
    static ONE: AccountAddress;
    static TWO: AccountAddress;
    static THREE: AccountAddress;
    static FOUR: AccountAddress;
    static A: AccountAddress;
    /**
     * Creates an instance of AccountAddress from a Uint8Array.
     *
     * This function ensures that the input data is exactly 32 bytes long, which is required for a valid account address.
     *
     * @param input A Uint8Array representing an account address.
     * @throws ParsingError if the input length is not equal to 32 bytes.
     * @group Implementation
     * @category Serialization
     */
    constructor(input: Uint8Array);
    /**
     * Determines if the address is classified as special, which is defined as 0x0 to 0xf inclusive.
     * In other words, the last byte of the address must be < 0b10000 (16)
     * and every other byte must be zero.
     *
     * For more information on how special addresses are defined, see AIP-40:
     * https://github.com/aptos-foundation/AIPs/blob/main/aips/aip-40.md.
     *
     * @returns true if the address is special, false otherwise.
     * @group Implementation
     * @category Serialization
     */
    isSpecial(): boolean;
    /**
     * Return the AccountAddress as a string as per AIP-40.
     * https://github.com/aptos-foundation/AIPs/blob/main/aips/aip-40.md.
     * This representation returns special addresses in SHORT form (0xf)
     * and other addresses in LONG form (0x + 64 characters).
     *
     * @returns AccountAddress as a string conforming to AIP-40.
     * @group Implementation
     * @category Serialization
     */
    toString(): `0x${string}`;
    /**
     * Return the AccountAddress as a string conforming to AIP-40 but without the leading 0x.
     *
     * NOTE: Prefer to use `toString` where possible.
     *
     * @returns AccountAddress as a string without the leading 0x.
     * @group Implementation
     * @category Serialization
     */
    toStringWithoutPrefix(): string;
    /**
     * Convert the account address to a string in LONG format, which is always 0x followed by 64 hex characters.
     *
     * NOTE: Prefer to use `toString` where possible, as it formats special addresses using the SHORT form (no leading 0s).
     *
     * @returns AccountAddress as a string in LONG form.
     * @group Implementation
     * @category Serialization
     */
    toStringLong(): `0x${string}`;
    /**
     * Returns the account address as a string in LONG form without a leading 0x.
     * This function will include leading zeroes and will produce a string of 64 hex characters.
     *
     * NOTE: Prefer to use `toString` where possible, as it formats special addresses using the SHORT form (no leading 0s).
     *
     * @returns {string} The account address in LONG form.
     * @group Implementation
     * @category Serialization
     */
    toStringLongWithoutPrefix(): string;
    /**
     * Convert the account address to a string in SHORT format, which is 0x followed by the shortest
     * possible representation (no leading zeros).
     *
     * @returns AccountAddress as a string in SHORT form.
     * @group Implementation
     * @category Serialization
     */
    toStringShort(): `0x${string}`;
    /**
     * Returns a lossless short string representation of the address by trimming leading zeros.
     * If the address consists of all zeros, returns "0".
     *
     * @returns A string representation of the address without leading zeros
     * @group Implementation
     * @category Serialization
     */
    toStringShortWithoutPrefix(): string;
    /**
     * Get the inner data as a Uint8Array.
     * The inner data is already a Uint8Array, so no conversion takes place.
     *
     * @returns Hex data as Uint8Array
     * @group Implementation
     * @category Serialization
     */
    toUint8Array(): Uint8Array;
    /**
     * Serialize the AccountAddress to a Serializer instance's data buffer.
     * @param serializer The serializer to serialize the AccountAddress to.
     * @returns void
     * @example
     * const serializer = new Serializer();
     * const address = AccountAddress.fromString("0x1");
     * address.serialize(serializer);
     * const bytes = serializer.toUint8Array();
     * // `bytes` is now the BCS-serialized address.
     * @group Implementation
     * @category Serialization
     */
    serialize(serializer: Serializer): void;
    /**
     * Serializes the current instance into a byte sequence suitable for entry functions.
     * This allows for the proper encoding of data when interacting with entry functions in the blockchain.
     *
     * @param serializer - The serializer instance used to convert the data into bytes.
     * @group Implementation
     * @category Serialization
     */
    serializeForEntryFunction(serializer: Serializer): void;
    /**
     * Serializes the current instance for use in a script function by encoding it into a byte sequence.
     * This process involves serializing the variant index and the instance data, making it suitable for transmission.
     *
     * @param serializer - The serializer instance used to perform the serialization.
     * @group Implementation
     * @category Serialization
     */
    serializeForScriptFunction(serializer: Serializer): void;
    /**
     * Deserialize an AccountAddress from the byte buffer in a Deserializer instance.
     * This function allows you to convert a byte representation of an AccountAddress into an instance of AccountAddress.
     * @param deserializer The deserializer to deserialize the AccountAddress from.
     * @returns An instance of AccountAddress.
     * @example
     * const bytes = hexToBytes("0x0102030405060708091011121314151617181920212223242526272829303132");
     * const deserializer = new Deserializer(bytes);
     * const address = AccountAddress.deserialize(deserializer);
     * // `address` is now an instance of AccountAddress.
     * @group Implementation
     * @category Serialization
     */
    static deserialize(deserializer: Deserializer): AccountAddress;
    /**
     * NOTE: This function has strict parsing behavior. For relaxed behavior, please use
     * the `fromString` function.
     *
     * Creates an instance of AccountAddress from a hex string.
     *
     * This function allows only the strictest formats defined by AIP-40. In short this
     * means only the following formats are accepted:
     *
     * - LONG
     * - SHORT for special addresses
     *
     * Where:
     * - LONG is defined as 0x + 64 hex characters.
     * - SHORT for special addresses is 0x0 to 0xf inclusive without padding zeroes.
     *
     * This means the following are not accepted:
     * - SHORT for non-special addresses.
     * - Any address without a leading 0x.
     *
     * @param input - A hex string representing an account address.
     *
     * @throws {ParsingError} If the hex string does not start with 0x or is not in a valid format.
     *
     * @remarks
     *
     * This function has strict parsing behavior. For relaxed behavior, please use the `fromString` function.
     *
     * @see AIP-40 documentation for more details on address formats:
     * https://github.com/aptos-foundation/AIPs/blob/main/aips/aip-40.md.
     *
     * @returns An instance of AccountAddress.
     * @group Implementation
     * @category Serialization
     */
    static fromStringStrict(input: string): AccountAddress;
    /**
     * NOTE: This function has relaxed parsing behavior. For strict behavior, please use
     * the `fromStringStrict` function. Where possible use `fromStringStrict` rather than this
     * function, `fromString`.
     *
     * Creates an instance of AccountAddress from a hex string.
     *
     * This function allows all formats defined by AIP-40. In short this means the
     * following formats are accepted:
     *
     * - LONG, with or without leading 0x
     * - SHORT*, with or without leading 0x
     *
     * Where:
     * - LONG is 64 hex characters.
     * - SHORT* is 1 to 63 hex characters inclusive. The address can have missing values up to `maxMissingChars` before it is padded.
     * - Padding zeroes are allowed, e.g. 0x0123 is valid.
     *
     * Learn more about the different address formats by reading AIP-40:
     * https://github.com/aptos-foundation/AIPs/blob/main/aips/aip-40.md.
     *
     * @param input A hex string representing an account address.
     * @param args.maxMissingChars The number of characters that can be missing in a padded address before it is invalid.
     *
     * @returns An instance of AccountAddress.
     *
     * @throws ParsingError if the hex string is too short, too long, or contains invalid characters.
     * @group Implementation
     * @category Serialization
     */
    static fromString(input: string, { maxMissingChars }?: {
        maxMissingChars?: number;
    }): AccountAddress;
    /**
     * Convenience method for creating an AccountAddress from various input types.
     * This function accepts a string, Uint8Array, or an existing AccountAddress instance and returns the corresponding
     * AccountAddress.
     *
     * @param input - The input to convert into an AccountAddress. This can be a string representation of an address, a Uint8Array,
     * or an existing AccountAddress.
     * @param args.maxMissingChars The number of characters that can be missing in a padded address before it is invalid.
     * @group Implementation
     * @category Serialization
     */
    static from(input: AccountAddressInput, { maxMissingChars }?: {
        maxMissingChars?: number;
    }): AccountAddress;
    /**
     * Create an AccountAddress from various input types, including strings, Uint8Array, and AccountAddress instances.
     *
     * @param input - The input to convert into an AccountAddress, which can be a string, a Uint8Array, or an AccountAddress.
     * @group Implementation
     * @category Serialization
     */
    static fromStrict(input: AccountAddressInput): AccountAddress;
    /**
     * Check if the provided input is a valid AccountAddress.
     *
     * @param args - The arguments for validation.
     * @param args.input - A hex string representing an account address.
     * @param args.strict - If true, use strict parsing behavior; if false, use relaxed parsing behavior.
     *
     * @returns An object indicating whether the address is valid. If valid, valid = true; if not, valid = false with additional details.
     * If the address is invalid, invalidReason will explain why it is invalid, and invalidReasonMessage will provide the error message.
     * @group Implementation
     * @category Serialization
     */
    static isValid(args: {
        input: AccountAddressInput;
        strict?: boolean;
    }): ParsingResult<AddressInvalidReason>;
    /**
     * Determine if two AccountAddresses are equal based on their underlying byte data.
     *
     * @param other - The AccountAddress to compare to.
     * @returns true if the AccountAddresses are equal, false if not.
     * @group Implementation
     * @category Serialization
     */
    equals(other: AccountAddress): boolean;
}

export { AccountAddress, type AccountAddressInput, AddressInvalidReason };
