import { Serializable, Serializer } from '../../bcs/serializer.mjs';
import { Deserializer } from '../../bcs/deserializer.mjs';
import { AccountAddress } from '../../core/accountAddress.mjs';
import { MoveModuleId } from '../../types/types.mjs';
import { Identifier } from './identifier.mjs';
import '../../core/hex.mjs';
import '../../core/common.mjs';
import '../../types/indexer.mjs';
import '../../types/generated/operations.mjs';
import '../../types/generated/types.mjs';
import '../../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';
import './transactionArgument.mjs';

/**
 * Represents a ModuleId that can be serialized and deserialized.
 * A ModuleId consists of a module address (e.g., "0x1") and a module name (e.g., "coin").
 * @group Implementation
 * @category Transactions
 */
declare class ModuleId extends Serializable {
    readonly address: AccountAddress;
    readonly name: Identifier;
    /**
     * Initializes a new instance of the module with the specified account address and name.
     *
     * @param address - The account address, e.g., "0x1".
     * @param name - The module name under the specified address, e.g., "coin".
     * @group Implementation
     * @category Transactions
     */
    constructor(address: AccountAddress, name: Identifier);
    /**
     * Converts a string literal in the format "account_address::module_name" to a ModuleId.
     * @param moduleId - A string literal representing the module identifier.
     * @throws Error if the provided moduleId is not in the correct format.
     * @returns ModuleId - The corresponding ModuleId object.
     * @group Implementation
     * @category Transactions
     */
    static fromStr(moduleId: MoveModuleId): ModuleId;
    /**
     * Serializes the address and name properties using the provided serializer.
     * This function is essential for converting the object's data into a format suitable for transmission or storage.
     *
     * @param serializer - The serializer instance used to perform the serialization.
     * @group Implementation
     * @category Transactions
     */
    serialize(serializer: Serializer): void;
    /**
     * Deserializes a ModuleId from the provided deserializer.
     * This function retrieves the account address and identifier to construct a ModuleId instance.
     *
     * @param deserializer - The deserializer instance used to read the data.
     * @group Implementation
     * @category Transactions
     */
    static deserialize(deserializer: Deserializer): ModuleId;
}

export { ModuleId };
