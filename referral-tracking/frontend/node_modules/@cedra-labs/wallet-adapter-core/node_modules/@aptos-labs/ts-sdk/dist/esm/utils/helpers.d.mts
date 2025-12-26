import { MoveStructId, MoveFunctionId } from '../types/types.mjs';
import { AccountAddress } from '../core/accountAddress.mjs';
import '../types/indexer.mjs';
import '../types/generated/operations.mjs';
import '../types/generated/types.mjs';
import './apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';
import '../bcs/serializer.mjs';
import '../core/hex.mjs';
import '../core/common.mjs';
import '../bcs/deserializer.mjs';
import '../transactions/instances/transactionArgument.mjs';

/**
 * Sleep for the specified amount of time in milliseconds.
 * This function can be used to introduce delays in asynchronous operations.
 *
 * @param timeMs - The time in milliseconds to sleep.
 * @group Implementation
 * @category Utils
 */
declare function sleep(timeMs: number): Promise<null>;
/**
 * Get the error message from an unknown error.
 *
 * @param error The error to get the message from
 * @returns The error message
 * @group Implementation
 * @category Utils
 */
declare function getErrorMessage(error: unknown): string;
/**
 * @group Implementation
 * @category Utils
 */
declare const nowInSeconds: () => number;
/**
 * Floors the given timestamp to the nearest whole hour.
 * This function is useful for normalizing timestamps to hourly intervals.
 *
 * @param timestampInSeconds - The timestamp in seconds to be floored.
 * @group Implementation
 * @category Utils
 */
declare function floorToWholeHour(timestampInSeconds: number): number;
/**
 * Decodes a base64 URL-encoded string into its original form.
 * This function is useful for converting base64 URL-encoded data back to a readable format.
 *
 * @param base64Url - The base64 URL-encoded string to decode.
 * @returns The decoded string.
 * @group Implementation
 * @category Utils
 */
declare function base64UrlDecode(base64Url: string): string;
declare function base64UrlToBytes(base64Url: string): Uint8Array;
/**
 * Amount is represented in the smallest unit format on chain, this function converts
 * a human-readable amount format to the smallest unit format
 * @example
 * human-readable amount format: 500
 * on chain amount format when decimal is 8: 50000000000
 *
 * @param value The value in human-readable format
 * @param decimal The token decimal
 * @returns The value in the smallest units
 * @group Implementation
 * @category Utils
 */
declare const convertAmountFromHumanReadableToOnChain: (value: number, decimal: number) => number;
/**
 * Amount is represented in the smallest unit format on chain, this function converts
 * the smallest unit format to a human-readable amount format
 * @example
 * human-readable amount format: 500
 * on chain amount format when decimal is 8: 50000000000
 *
 * @param value The value in human-readable format
 * @param decimal The token decimal
 * @returns The value in the smallest units
 * @group Implementation
 * @category Utils
 */
declare const convertAmountFromOnChainToHumanReadable: (value: number, decimal: number) => number;
/**
 * Convert an encoded struct to a MoveStructId.
 *
 * @example
 * const structObj = {
 *   account_address: "0x1",
 *   module_name: "0x6170746f735f636f696e",
 *   struct_name: "0x4170746f73436f696e",
 * };
 * // structId is "0x1::aptos_coin::AptosCoin"
 * const structId = parseEncodedStruct(structObj);
 *
 * @param structObj The struct with account_address, module_name, and struct_name properties
 * @returns The MoveStructId
 * @group Implementation
 * @category Utils
 */
declare const parseEncodedStruct: (structObj: {
    account_address: string;
    module_name: string;
    struct_name: string;
}) => MoveStructId;
/**
 * Determines whether the given object is an encoded struct type with the following properties:
 * - account_address: string
 * - module_name: string
 * - struct_name: string
 *
 * @param structObj The object to check
 * @returns Whether the object is an encoded struct type
 * @group Implementation
 * @category Utils
 */
declare const isEncodedStruct: (structObj: any) => structObj is {
    account_address: string;
    module_name: string;
    struct_name: string;
};
/**
 * Splits a function identifier into its constituent parts: module address, module name, and function name.
 * This function helps in validating and extracting details from a function identifier string.
 *
 * @param functionArg - The function identifier string in the format "moduleAddress::moduleName::functionName".
 * @returns An object containing the module address, module name, and function name.
 * @throws Error if the function identifier does not contain exactly three parts.
 * @group Implementation
 * @category Transactions
 */
declare function getFunctionParts(functionArg: MoveFunctionId): {
    moduleAddress: string;
    moduleName: string;
    functionName: string;
};
/**
 * Validates the provided function information.
 *
 * @param functionInfo - The function information to validate.
 * @returns Whether the function information is valid.
 * @group Implementation
 * @category Utils
 */
declare function isValidFunctionInfo(functionInfo: string): boolean;
/**
 * Truncates the provided wallet address at the middle with an ellipsis.
 *
 * @param address - The wallet address to truncate.
 * @param start - The number of characters to show at the beginning of the address.
 * @param end - The number of characters to show at the end of the address.
 * @returns The truncated address.
 * @group Implementation
 * @category Utils
 */
declare function truncateAddress(address: string, start?: number, end?: number): string;
/**
 * Calculates the paired FA metadata address for a given coin type.
 * This function is tolerant of various address formats in the coin type string,
 * including complex nested types.
 *
 * @example
 * // All these formats are valid and will produce the same result:
 * pairedFaMetadataAddress("0x1::aptos_coin::AptosCoin")  // simple form
 * pairedFaMetadataAddress("0x0000000000000000000000000000000000000000000000000000000000000001::aptos_coin::AptosCoin")  // long form
 * pairedFaMetadataAddress("0x00001::aptos_coin::AptosCoin")  // with leading zeros
 * pairedFaMetadataAddress("0x1::coin::Coin<0x1412::a::struct<0x0001::aptos_coin::AptosCoin>>")  // nested type parameters
 *
 * @param coinType - The coin type string in any of these formats:
 *   - Short form address: "0x1::aptos_coin::AptosCoin"
 *   - Long form address: "0x0000000000000000000000000000000000000000000000000000000000000001::aptos_coin::AptosCoin"
 *   - With leading zeros: "0x00001::aptos_coin::AptosCoin"
 *   - With nested types: "0x1::coin::Coin<0x1412::a::struct<0x0001::aptos_coin::AptosCoin>>"
 * @returns The calculated metadata address as an AccountAddress instance
 */
declare function pairedFaMetadataAddress(coinType: `0x${string}::${string}::${string}`): AccountAddress;

export { base64UrlDecode, base64UrlToBytes, convertAmountFromHumanReadableToOnChain, convertAmountFromOnChainToHumanReadable, floorToWholeHour, getErrorMessage, getFunctionParts, isEncodedStruct, isValidFunctionInfo, nowInSeconds, pairedFaMetadataAddress, parseEncodedStruct, sleep, truncateAddress };
