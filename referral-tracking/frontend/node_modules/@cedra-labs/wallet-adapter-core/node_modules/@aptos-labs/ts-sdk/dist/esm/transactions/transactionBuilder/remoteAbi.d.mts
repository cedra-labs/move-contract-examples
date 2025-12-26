import { TypeTag } from '../typeTag/index.mjs';
import { AptosConfig } from '../../api/aptosConfig.mjs';
import { TypeArgument, FunctionABI, EntryFunctionABI, ViewFunctionABI, EntryFunctionArgumentTypes, SimpleEntryFunctionArgumentTypes } from '../types.mjs';
import { MoveModule, MoveFunction } from '../../types/types.mjs';
import { CallArgument } from '@aptos-labs/script-composer-pack';
import '../../bcs/deserializer.mjs';
import '../../types/indexer.mjs';
import '../../types/generated/operations.mjs';
import '../../types/generated/types.mjs';
import '../../utils/apiEndpoints.mjs';
import '../../bcs/serializer.mjs';
import '../../core/hex.mjs';
import '../../core/common.mjs';
import '../../core/accountAddress.mjs';
import '../instances/transactionArgument.mjs';
import '../instances/identifier.mjs';
import '../../utils/const.mjs';
import '../../bcs/serializable/moveStructs.mjs';
import '../../bcs/serializable/movePrimitives.mjs';
import '../../bcs/serializable/fixedBytes.mjs';
import '../../publicKey-CJOcUwJK.mjs';
import '../../core/crypto/signature.mjs';
import '../authenticator/account.mjs';
import '../../core/crypto/ed25519.mjs';
import '../../core/crypto/privateKey.mjs';
import '../../core/crypto/multiEd25519.mjs';
import '../../core/crypto/multiKey.mjs';
import '../../core/crypto/singleKey.mjs';
import '../../core/crypto/secp256k1.mjs';
import '../instances/rawTransaction.mjs';
import '../instances/chainId.mjs';
import '../instances/transactionPayload.mjs';
import '../instances/moduleId.mjs';
import '../instances/simpleTransaction.mjs';
import '../instances/multiAgentTransaction.mjs';

/**
 * Convert type arguments to only type tags, allowing for string representations of type tags.
 *
 * @param typeArguments - An optional array of type arguments that may include string representations.
 * @returns An array of TypeTag objects derived from the provided type arguments.
 * @group Implementation
 * @category Transactions
 */
declare function standardizeTypeTags(typeArguments?: Array<TypeArgument>): Array<TypeTag>;
/**
 * Fetches the ABI of a specified module from the on-chain module ABI.
 *
 * @param moduleAddress - The address of the module from which to fetch the ABI.
 * @param moduleName - The name of the module containing the ABI.
 * @param aptosConfig - The configuration settings for Aptos.
 * @group Implementation
 * @category Transactions
 */
declare function fetchModuleAbi(moduleAddress: string, moduleName: string, aptosConfig: AptosConfig): Promise<MoveModule | undefined>;
/**
 * Fetches the ABI of a specified function from the on-chain module ABI. This function allows you to access the details of a
 * specific function within a module.
 *
 * @param moduleAddress - The address of the module from which to fetch the function ABI.
 * @param moduleName - The name of the module containing the function.
 * @param functionName - The name of the function whose ABI is to be fetched.
 * @param aptosConfig - The configuration settings for Aptos.
 * @group Implementation
 * @category Transactions
 */
declare function fetchFunctionAbi(moduleAddress: string, moduleName: string, functionName: string, aptosConfig: AptosConfig): Promise<MoveFunction | undefined>;
/**
 * @deprecated Use `fetchFunctionAbi` instead and manually parse the type tags.
 */
declare function fetchMoveFunctionAbi(moduleAddress: string, moduleName: string, functionName: string, aptosConfig: AptosConfig): Promise<FunctionABI>;
/**
 * Fetches the ABI for an entry function from the specified module address.
 * This function validates if the ABI corresponds to an entry function and retrieves its parameters.
 *
 * @param moduleAddress - The address of the module containing the entry function.
 * @param moduleName - The name of the module containing the entry function.
 * @param functionName - The name of the entry function to fetch the ABI for.
 * @param aptosConfig - The configuration settings for Aptos.
 * @returns An object containing the number of signers, type parameters, and function parameters.
 * @throws Error if the ABI cannot be found or if the function is not an entry function.
 * @group Implementation
 * @category Transactions
 */
declare function fetchEntryFunctionAbi(moduleAddress: string, moduleName: string, functionName: string, aptosConfig: AptosConfig): Promise<EntryFunctionABI>;
/**
 * Fetches the ABI for a view function from the specified module address.
 * This function ensures that the ABI is valid and retrieves the type parameters, parameters, and return types for the view function.
 *
 * @param moduleAddress - The address of the module containing the view function.
 * @param moduleName - The name of the module containing the view function.
 * @param functionName - The name of the view function for which to fetch the ABI.
 * @param aptosConfig - The configuration settings for Aptos.
 * @returns An object containing the type parameters, parameters, and return types of the view function.
 * @throws Error if the ABI cannot be found or if the function is not a view function.
 * @group Implementation
 * @category Transactions
 */
declare function fetchViewFunctionAbi(moduleAddress: string, moduleName: string, functionName: string, aptosConfig: AptosConfig): Promise<ViewFunctionABI>;
/**
 * @deprecated Handle this inline
 *
 * @example
 * ```typescript
 * const callArgument = argument instanceof CallArgument ? argument : CallArgument.newBytes(
 *   convertArgument(functionName, functionAbi, argument, position, genericTypeParams).bcsToBytes()
 * );
 * ```
 */
declare function convertCallArgument(argument: CallArgument | EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes, functionName: string, functionAbi: FunctionABI, position: number, genericTypeParams: Array<TypeTag>): CallArgument;
/**
 * Converts a non-BCS encoded argument into BCS encoded, if necessary.
 * This function checks the provided argument against the expected parameter type and converts it accordingly.
 *
 * @param functionName - The name of the function for which the argument is being converted.
 * @param functionAbiOrModuleAbi - The ABI (Application Binary Interface) of the function, which defines its parameters.
 * @param arg - The argument to be converted, which can be of various types.
 * @param position - The index of the argument in the function's parameter list.
 * @param genericTypeParams - An array of type tags for any generic type parameters.
 * @param options - Options for the conversion process.
 * @param options.allowUnknownStructs - If true, unknown structs will be allowed and converted to a `FixedBytes`.
 * @group Implementation
 * @category Transactions
 */
declare function convertArgument(functionName: string, functionAbiOrModuleAbi: MoveModule | FunctionABI, arg: EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes, position: number, genericTypeParams: Array<TypeTag>, options?: {
    allowUnknownStructs?: boolean;
}): EntryFunctionArgumentTypes;
/**
 * Checks if the provided argument is BCS encoded and converts it if necessary, ensuring type compatibility with the ABI.
 * This function helps in validating and converting arguments for entry functions based on their expected types.
 *
 * @param arg - The argument to check or convert, which can be either a simple or entry function argument type.
 * @param param - The expected type tag for the argument.
 * @param position - The position of the argument in the function call.
 * @param genericTypeParams - An array of generic type parameters that may be used for conversion.
 * @group Implementation
 * @category Transactions
 */
declare function checkOrConvertArgument(arg: SimpleEntryFunctionArgumentTypes | EntryFunctionArgumentTypes, param: TypeTag, position: number, genericTypeParams: Array<TypeTag>, moduleAbi?: MoveModule, options?: {
    allowUnknownStructs?: boolean;
}): EntryFunctionArgumentTypes;

export { checkOrConvertArgument, convertArgument, convertCallArgument, fetchEntryFunctionAbi, fetchFunctionAbi, fetchModuleAbi, fetchMoveFunctionAbi, fetchViewFunctionAbi, standardizeTypeTags };
