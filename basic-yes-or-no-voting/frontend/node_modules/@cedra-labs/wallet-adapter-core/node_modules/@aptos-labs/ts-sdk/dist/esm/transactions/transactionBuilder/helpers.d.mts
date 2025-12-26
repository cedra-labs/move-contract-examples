import { SimpleEntryFunctionArgumentTypes, EntryFunctionArgumentTypes, InputGenerateTransactionPayloadDataWithRemoteABI, InputGenerateTransactionPayloadData, InputScriptData } from '../types.mjs';
import { MoveFunction } from '../../types/types.mjs';
import { FixedBytes } from '../../bcs/serializable/fixedBytes.mjs';
import { Bool, U8, U16, U32, U64, U128, U256 } from '../../bcs/serializable/movePrimitives.mjs';
import { MoveString } from '../../bcs/serializable/moveStructs.mjs';
import { AccountAddress } from '../../core/accountAddress.mjs';
import '@aptos-labs/script-composer-pack';
import '../../api/aptosConfig.mjs';
import '../../utils/apiEndpoints.mjs';
import '../../utils/const.mjs';
import '../../types/indexer.mjs';
import '../../types/generated/operations.mjs';
import '../../types/generated/types.mjs';
import '../../publicKey-CJOcUwJK.mjs';
import '../../bcs/serializer.mjs';
import '../../core/hex.mjs';
import '../../core/common.mjs';
import '../../bcs/deserializer.mjs';
import '../../core/crypto/signature.mjs';
import '../authenticator/account.mjs';
import '../../core/crypto/ed25519.mjs';
import '../../core/crypto/privateKey.mjs';
import '../instances/transactionArgument.mjs';
import '../../core/crypto/multiEd25519.mjs';
import '../../core/crypto/multiKey.mjs';
import '../../core/crypto/singleKey.mjs';
import '../../core/crypto/secp256k1.mjs';
import '../instances/rawTransaction.mjs';
import '../instances/chainId.mjs';
import '../instances/transactionPayload.mjs';
import '../instances/identifier.mjs';
import '../instances/moduleId.mjs';
import '../typeTag/index.mjs';
import '../instances/simpleTransaction.mjs';
import '../instances/multiAgentTransaction.mjs';

/**
 * Determines if the provided argument is of type boolean.
 * This can help in validating input types before processing them further.
 *
 * @param arg - The argument to check, which can be of various types.
 * @returns A boolean indicating whether the argument is a boolean.
 * @group Implementation
 * @category Transactions
 */
declare function isBool(arg: SimpleEntryFunctionArgumentTypes): arg is boolean;
/**
 * Checks if the provided argument is of type string.
 *
 * @param arg - The value to be checked for string type.
 * @returns A boolean indicating whether the argument is a string.
 * @group Implementation
 * @category Transactions
 */
declare function isString(arg: any): arg is string;
/**
 * Determines if the provided argument is of type number.
 *
 * @param arg - The argument to check, which can be of various types.
 * @returns A boolean indicating whether the argument is a number.
 * @group Implementation
 * @category Transactions
 */
declare function isNumber(arg: SimpleEntryFunctionArgumentTypes): arg is number;
/**
 * Converts a number or a string representation of a number into a number type.
 * This function is useful for ensuring that the input is in a consistent numeric format,
 * which can help prevent type mismatches in further processing.
 *
 * @param arg - The input value to be converted. This can be a number, a string representing a number, or any other type.
 * @returns Returns the converted number if the input is valid; otherwise, it returns undefined.
 * @group Implementation
 * @category Transactions
 */
declare function convertNumber(arg: SimpleEntryFunctionArgumentTypes): number | undefined;
/**
 * Determines if the provided argument is a large number, which can be a number, bigint, or string representation of a number.
 *
 * @param arg - The argument to check, which can be of type number, bigint, or string.
 * @group Implementation
 * @category Transactions
 */
declare function isLargeNumber(arg: SimpleEntryFunctionArgumentTypes): arg is number | bigint | string;
/**
 * Checks if the provided argument is empty, meaning it is either null or undefined.
 *
 * @param arg - The argument to check for emptiness.
 * @returns A boolean indicating whether the argument is empty.
 * @group Implementation
 * @category Transactions
 */
declare function isEmptyOption(arg: SimpleEntryFunctionArgumentTypes): arg is null | undefined;
/**
 * Determines if the provided argument is a valid encoded entry function argument type.
 * This function helps validate that the argument conforms to the expected types for entry function parameters.
 *
 * @param arg - The argument to check, which can be of type EntryFunctionArgumentTypes or SimpleEntryFunctionArgumentTypes.
 * @group Implementation
 * @category Transactions
 */
declare function isEncodedEntryFunctionArgument(arg: EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes): arg is EntryFunctionArgumentTypes;
/**
 * @group Implementation
 * @category Transactions
 */
declare function isBcsBool(arg: EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes): arg is Bool;
/**
 * @group Implementation
 * @category Transactions
 */
declare function isBcsAddress(arg: EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes): arg is AccountAddress;
/**
 * @group Implementation
 * @category Transactions
 */
declare function isBcsString(arg: EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes): arg is MoveString;
/**
 * @group Implementation
 * @category Transactions
 */
declare function isBcsFixedBytes(arg: EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes): arg is FixedBytes;
/**
 * @group Implementation
 * @category Transactions
 */
declare function isBcsU8(arg: EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes): arg is U8;
/**
 * @group Implementation
 * @category Transactions
 */
declare function isBcsU16(arg: EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes): arg is U16;
/**
 * @group Implementation
 * @category Transactions
 */
declare function isBcsU32(arg: EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes): arg is U32;
/**
 * @group Implementation
 * @category Transactions
 */
declare function isBcsU64(arg: EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes): arg is U64;
/**
 * @group Implementation
 * @category Transactions
 */
declare function isBcsU128(arg: EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes): arg is U128;
/**
 * @group Implementation
 * @category Transactions
 */
declare function isBcsU256(arg: EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes): arg is U256;
/**
 * Determines if the provided argument contains script data input by checking for the presence of bytecode.
 *
 * @param arg - The input data to be checked, which can either be a payload with remote ABI or a standard payload.
 * @param arg.bytecode - The bytecode of the script, present if the input is script data.
 * @param arg.function - The function associated with the transaction, which is relevant for standard payloads.
 * @param arg.args - The arguments for the function, applicable in the context of standard payloads.
 * @group Implementation
 * @category Transactions
 */
declare function isScriptDataInput(arg: InputGenerateTransactionPayloadDataWithRemoteABI | InputGenerateTransactionPayloadData): arg is InputScriptData;
/**
 * Throws an error indicating a type mismatch for a specified argument position.
 * This function helps in debugging by providing clear feedback on expected types.
 *
 * @param expectedType - The type that was expected for the argument.
 * @param position - The position of the argument that caused the type mismatch.
 * @group Implementation
 * @category Transactions
 */
declare function throwTypeMismatch(expectedType: string, position: number): void;
/**
 * Finds the index of the first non-signer argument in the function ABI parameters.
 *
 * A function is often defined with a `signer` or `&signer` arguments at the start, which are filled in
 * by signatures and not by the caller. This function helps identify the position of the first argument that
 * can be provided by the caller, allowing for easier handling of function parameters.
 *
 * @param functionAbi - The ABI of the function to analyze.
 * @returns The index of the first non-signer argument, or the length of the parameters array if none are found.
 * @group Implementation
 * @category Transactions
 */
declare function findFirstNonSignerArg(functionAbi: MoveFunction): number;

export { convertNumber, findFirstNonSignerArg, isBcsAddress, isBcsBool, isBcsFixedBytes, isBcsString, isBcsU128, isBcsU16, isBcsU256, isBcsU32, isBcsU64, isBcsU8, isBool, isEmptyOption, isEncodedEntryFunctionArgument, isLargeNumber, isNumber, isScriptDataInput, isString, throwTypeMismatch };
