import { TypeTag } from './index.mjs';
import '../../bcs/deserializer.mjs';
import '../../types/types.mjs';
import '../../types/indexer.mjs';
import '../../types/generated/operations.mjs';
import '../../types/generated/types.mjs';
import '../../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';
import '../../bcs/serializer.mjs';
import '../../core/hex.mjs';
import '../../core/common.mjs';
import '../../core/accountAddress.mjs';
import '../instances/transactionArgument.mjs';
import '../instances/identifier.mjs';

/**
 * Error types related to parsing type tags, indicating various issues encountered during the parsing process.
 * @group Implementation
 * @category Transactions
 */
declare enum TypeTagParserErrorType {
    InvalidTypeTag = "unknown type",
    UnexpectedGenericType = "unexpected generic type",
    UnexpectedTypeArgumentClose = "unexpected '>'",
    UnexpectedWhitespaceCharacter = "unexpected whitespace character",
    UnexpectedComma = "unexpected ','",
    TypeArgumentCountMismatch = "type argument count doesn't match expected amount",
    MissingTypeArgumentClose = "no matching '>' for '<'",
    MissingTypeArgument = "no type argument before ','",
    UnexpectedPrimitiveTypeArguments = "primitive types not expected to have type arguments",
    UnexpectedVectorTypeArgumentCount = "vector type expected to have exactly one type argument",
    UnexpectedStructFormat = "unexpected struct format, must be of the form 0xaddress::module_name::struct_name",
    InvalidModuleNameCharacter = "module name must only contain alphanumeric or '_' characters",
    InvalidStructNameCharacter = "struct name must only contain alphanumeric or '_' characters",
    InvalidAddress = "struct address must be valid"
}
/**
 * Represents an error that occurs during the parsing of a type tag.
 * This error extends the built-in Error class and provides additional context
 * regarding the specific type tag that failed to parse and the reason for the failure.
 *
 * @param typeTagStr - The type tag string that failed to be parsed.
 * @param invalidReason - The reason why the type tag string is considered invalid.
 * @group Implementation
 * @category Transactions
 */
declare class TypeTagParserError extends Error {
    /**
     * Constructs an error indicating a failure to parse a type tag.
     * This error provides details about the specific type tag that could not be parsed and the reason for the failure.
     *
     * @param typeTagStr - The string representation of the type tag that failed to parse.
     * @param invalidReason - The reason why the type tag is considered invalid.
     * @group Implementation
     * @category Transactions
     */
    constructor(typeTagStr: string, invalidReason: TypeTagParserErrorType);
}
/**
 * Parses a type string into a structured representation of type tags, accommodating various formats including generics and
 * nested types.
 *
 * This function can help you accurately interpret type strings, which can include simple types, standalone structs, and complex
 * nested generics.
 * It supports multiple generics, spacing within generics, and nested generics of varying depths.
 * All types are made of a few parts they're either:
 * 1. A simple type e.g. u8
 * 2. A standalone struct e.g. 0x1::account::Account
 * 3. A nested struct e.g. 0x1::coin::Coin<0x1234::coin::MyCoin>
 *
 * There are a few more special cases that need to be handled, however.
 * 1. Multiple generics e.g. 0x1::pair::Pair<u8, u16>
 * 2. Spacing in the generics e.g. 0x1::pair::Pair< u8 , u16>
 * 3. Nested generics of different depths e.g. 0x1::pair::Pair<0x1::coin::Coin<0x1234::coin::MyCoin>, u8>
 * 4. Generics for types in ABIs are filled in with placeholders e.g. T1, T2, T3
 * @param typeStr - The string representation of the type to be parsed.
 * @param options - Optional settings for parsing behavior.
 * @param options.allowGenerics - A flag indicating whether to allow generics in the parsing process.
 * @returns The parsed type tag representation.
 * @throws TypeTagParserError if the type string is malformed or does not conform to expected formats.
 * @group Implementation
 * @category Transactions
 */
declare function parseTypeTag(typeStr: string, options?: {
    allowGenerics?: boolean;
}): TypeTag;

export { TypeTagParserError, TypeTagParserErrorType, parseTypeTag };
