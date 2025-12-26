import { Deserializer } from '../../bcs/deserializer.mjs';
import { Serializable, Serializer } from '../../bcs/serializer.mjs';
import { AccountAddress } from '../../core/accountAddress.mjs';
import { Identifier } from '../instances/identifier.mjs';
import '../../types/types.mjs';
import '../../types/indexer.mjs';
import '../../types/generated/operations.mjs';
import '../../types/generated/types.mjs';
import '../../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';
import '../../core/hex.mjs';
import '../../core/common.mjs';
import '../instances/transactionArgument.mjs';

/**
 * Represents a type tag in the serialization framework, serving as a base class for various specific type tags.
 * This class provides methods for serialization and deserialization of type tags, as well as type checking methods
 * to determine the specific type of the tag at runtime.
 *
 * @extends Serializable
 * @group Implementation
 * @category Transactions
 */
declare abstract class TypeTag extends Serializable {
    abstract serialize(serializer: Serializer): void;
    /**
     * Deserializes a StructTag from the provided deserializer.
     * This function allows you to reconstruct a StructTag object from its serialized form.
     *
     * @param deserializer - The deserializer instance used to read the serialized data.
     * @group Implementation
     * @category Transactions
     */
    deserialize(deserializer: Deserializer): StructTag;
    static deserialize(deserializer: Deserializer): TypeTag;
    abstract toString(): string;
    /**
     * Determines if the current instance is of type TypeTagBool.
     *
     * @returns {boolean} True if the instance is a TypeTagBool, otherwise false.
     * @group Implementation
     * @category Transactions
     */
    isBool(): this is TypeTagBool;
    /**
     * Determines if the current instance is of type TypeTagAddress.
     *
     * @returns {boolean} True if the instance is a TypeTagAddress, otherwise false.
     * @group Implementation
     * @category Transactions
     */
    isAddress(): this is TypeTagAddress;
    /**
     * Determines if the current instance is of type TypeTagGeneric.
     *
     * @returns {boolean} Returns true if the instance is a TypeTagGeneric, otherwise false.
     * @group Implementation
     * @category Transactions
     */
    isGeneric(): this is TypeTagGeneric;
    /**
     * Determine if the current instance is a TypeTagSigner.
     *
     * @returns {boolean} Returns true if the instance is a TypeTagSigner, otherwise false.
     * @group Implementation
     * @category Transactions
     */
    isSigner(): this is TypeTagSigner;
    /**
     * Checks if the current instance is a vector type.
     * This can help determine the specific type of data structure being used.
     *
     * @returns {boolean} True if the instance is of type TypeTagVector, otherwise false.
     * @group Implementation
     * @category Transactions
     */
    isVector(): this is TypeTagVector;
    /**
     * Determines if the current instance is a structure type.
     *
     * @returns {boolean} True if the instance is of type TypeTagStruct, otherwise false.
     * @group Implementation
     * @category Transactions
     */
    isStruct(): this is TypeTagStruct;
    /**
     * Determines if the current instance is of type `TypeTagU8`.
     *
     * @returns {boolean} Returns true if the instance is of type `TypeTagU8`, otherwise false.
     * @group Implementation
     * @category Transactions
     */
    isU8(): this is TypeTagU8;
    /**
     * Checks if the current instance is of type TypeTagU16.
     *
     * @returns {boolean} True if the instance is TypeTagU16, otherwise false.
     * @group Implementation
     * @category Transactions
     */
    isU16(): this is TypeTagU16;
    /**
     * Checks if the current instance is of type TypeTagU32.
     *
     * @returns {boolean} Returns true if the instance is TypeTagU32, otherwise false.
     * @group Implementation
     * @category Transactions
     */
    isU32(): this is TypeTagU32;
    /**
     * Checks if the current instance is of type TypeTagU64.
     *
     * @returns {boolean} True if the instance is a TypeTagU64, otherwise false.
     * @group Implementation
     * @category Transactions
     */
    isU64(): this is TypeTagU64;
    /**
     * Determines if the current instance is of the TypeTagU128 type.
     *
     * @returns {boolean} True if the instance is of TypeTagU128, otherwise false.
     * @group Implementation
     * @category Transactions
     */
    isU128(): this is TypeTagU128;
    /**
     * Checks if the current instance is of type TypeTagU256.
     *
     * @returns {boolean} Returns true if the instance is of type TypeTagU256, otherwise false.
     * @group Implementation
     * @category Transactions
     */
    isU256(): this is TypeTagU256;
    isPrimitive(): boolean;
}
/**
 * Represents a boolean type tag in the type system.
 * This class extends the base TypeTag class and provides
 * methods for serialization and deserialization of the boolean
 * type tag.
 *
 * @extends TypeTag
 * @group Implementation
 * @category Transactions
 */
declare class TypeTagBool extends TypeTag {
    /**
     * Returns the string representation of the object.
     *
     * @returns {string} The string representation of the object.
     * @group Implementation
     * @category Transactions
     */
    toString(): string;
    /**
     * Serializes the current instance's properties into a provided serializer.
     * This function ensures that the address, module name, name, and type arguments are properly serialized.
     *
     * @param serializer - The serializer instance used to serialize the properties.
     * @group Implementation
     * @category Transactions
     */
    serialize(serializer: Serializer): void;
    /**
     * Deserializes a StructTag and returns a new TypeTagStruct instance.
     *
     * @param _deserializer - The deserializer used to read the StructTag data.
     * @group Implementation
     * @category Transactions
     */
    static load(_deserializer: Deserializer): TypeTagBool;
}
/**
 * Represents a type tag for an 8-bit unsigned integer (u8).
 * This class extends the base TypeTag class and provides methods
 * for serialization and deserialization specific to the u8 type.
 *
 * @extends TypeTag
 * @group Implementation
 * @category Transactions
 */
declare class TypeTagU8 extends TypeTag {
    toString(): string;
    serialize(serializer: Serializer): void;
    static load(_deserializer: Deserializer): TypeTagU8;
}
/**
 * Represents a type tag for unsigned 16-bit integers (u16).
 * This class extends the base TypeTag class and provides methods for serialization and deserialization.
 *
 * @extends TypeTag
 * @group Implementation
 * @category Transactions
 */
declare class TypeTagU16 extends TypeTag {
    toString(): string;
    serialize(serializer: Serializer): void;
    static load(_deserializer: Deserializer): TypeTagU16;
}
/**
 * Represents a type tag for a 32-bit unsigned integer (u32).
 * This class extends the base TypeTag class and provides methods for serialization
 * and deserialization specific to the u32 type.
 *
 * @extends TypeTag
 * @group Implementation
 * @category Transactions
 */
declare class TypeTagU32 extends TypeTag {
    toString(): string;
    serialize(serializer: Serializer): void;
    static load(_deserializer: Deserializer): TypeTagU32;
}
/**
 * Represents a type tag for 64-bit unsigned integers (u64).
 * This class extends the base TypeTag class and provides methods for serialization and deserialization.
 *
 * @extends TypeTag
 * @group Implementation
 * @category Transactions
 */
declare class TypeTagU64 extends TypeTag {
    toString(): string;
    serialize(serializer: Serializer): void;
    static load(_deserializer: Deserializer): TypeTagU64;
}
/**
 * Represents a type tag for the u128 data type.
 * This class extends the base TypeTag class and provides methods for serialization and deserialization.
 *
 * @extends TypeTag
 * @group Implementation
 * @category Transactions
 */
declare class TypeTagU128 extends TypeTag {
    toString(): string;
    serialize(serializer: Serializer): void;
    static load(_deserializer: Deserializer): TypeTagU128;
}
/**
 * Represents a type tag for the U256 data type.
 * This class extends the base TypeTag class and provides methods for serialization and deserialization.
 *
 * @extends TypeTag
 * @group Implementation
 * @category Transactions
 */
declare class TypeTagU256 extends TypeTag {
    toString(): string;
    serialize(serializer: Serializer): void;
    static load(_deserializer: Deserializer): TypeTagU256;
}
/**
 * Represents a type tag for an address in the system.
 * This class extends the TypeTag class and provides functionality
 * to serialize the address type and load it from a deserializer.
 *
 * @extends TypeTag
 * @group Implementation
 * @category Transactions
 */
declare class TypeTagAddress extends TypeTag {
    toString(): string;
    serialize(serializer: Serializer): void;
    static load(_deserializer: Deserializer): TypeTagAddress;
}
/**
 * Represents a type tag for a signer in the system.
 * This class extends the base TypeTag and provides specific functionality
 * related to the signer type.
 *
 * @extends TypeTag
 * @group Implementation
 * @category Transactions
 */
declare class TypeTagSigner extends TypeTag {
    toString(): string;
    serialize(serializer: Serializer): void;
    static load(_deserializer: Deserializer): TypeTagSigner;
}
/**
 * Represents a reference to a type tag in the type system.
 * This class extends the TypeTag class and provides functionality
 * to serialize and deserialize type tag references.
 *
 * @extends TypeTag
 * @group Implementation
 * @category Transactions
 */
declare class TypeTagReference extends TypeTag {
    readonly value: TypeTag;
    toString(): `&${string}`;
    /**
     * Initializes a new instance of the class with the specified parameters.
     *
     * @param value - The TypeTag to reference.
     * @group Implementation
     * @category Transactions
     */
    constructor(value: TypeTag);
    serialize(serializer: Serializer): void;
    static load(deserializer: Deserializer): TypeTagReference;
}
/**
 * Represents a generic type tag used for type parameters in entry functions.
 * Generics are not serialized into a real type, so they cannot be used as a type directly.
 *
 * @extends TypeTag
 * @group Implementation
 * @category Transactions
 */
declare class TypeTagGeneric extends TypeTag {
    readonly value: number;
    toString(): `T${number}`;
    constructor(value: number);
    serialize(serializer: Serializer): void;
    static load(deserializer: Deserializer): TypeTagGeneric;
}
/**
 * Represents a vector type tag, which encapsulates a single type tag value.
 * This class extends the base TypeTag class and provides methods for serialization,
 * deserialization, and string representation of the vector type tag.
 *
 * @extends TypeTag
 * @group Implementation
 * @category Transactions
 */
declare class TypeTagVector extends TypeTag {
    readonly value: TypeTag;
    toString(): `vector<${string}>`;
    constructor(value: TypeTag);
    /**
     * Creates a new TypeTagVector instance with a TypeTagU8 type.
     *
     * @returns {TypeTagVector} A new TypeTagVector initialized with TypeTagU8.
     * @group Implementation
     * @category Transactions
     */
    static u8(): TypeTagVector;
    serialize(serializer: Serializer): void;
    static load(deserializer: Deserializer): TypeTagVector;
}
/**
 * Represents a structured type tag in the system, extending the base TypeTag class.
 * This class encapsulates information about a specific structure, including its address,
 * module name, and type arguments, and provides methods for serialization and type checking.
 *
 * @param value - The StructTag instance containing the details of the structured type.
 * @group Implementation
 * @category Transactions
 */
declare class TypeTagStruct extends TypeTag {
    readonly value: StructTag;
    toString(): `0x${string}::${string}::${string}`;
    constructor(value: StructTag);
    serialize(serializer: Serializer): void;
    static load(deserializer: Deserializer): TypeTagStruct;
    /**
     * Determines if the provided address, module name, and struct name match the current type tag.
     *
     * @param address - The account address to compare against the type tag.
     * @param moduleName - The name of the module to compare against the type tag.
     * @param structName - The name of the struct to compare against the type tag.
     * @returns True if the address, module name, and struct name match the type tag; otherwise, false.
     * @group Implementation
     * @category Transactions
     */
    isTypeTag(address: AccountAddress, moduleName: string, structName: string): boolean;
    /**
     * Checks if the provided value is of type string.
     * This function can help ensure that the data being processed is in the correct format before further operations.
     *
     * @returns {boolean} Returns true if the value is a string, otherwise false.
     * @group Implementation
     * @category Transactions
     */
    isString(): boolean;
    /**
     * Checks if the specified account address is of type "option".
     *
     * @returns {boolean} Returns true if the account address is an option type, otherwise false.
     * @group Implementation
     * @category Transactions
     */
    isOption(): boolean;
    /**
     * Checks if the provided value is of type 'object'.
     * This function helps determine if a value can be treated as an object type in the context of the SDK.
     *
     * @returns {boolean} Returns true if the value is an object, otherwise false.
     * @group Implementation
     * @category Transactions
     */
    isObject(): boolean;
    /**
     * Checks if the provided value is a 'DelegationKey' for permissioned signers.
     *
     * @returns {boolean} Returns true if the value is a DelegationKey, otherwise false.
     * @group Implementation
     * @category Transactions
     */
    isDelegationKey(): boolean;
    /**
     * Checks if the provided value is of type `RateLimiter`.
     *
     * @returns {boolean} Returns true if the value is a RateLimiter, otherwise false.
     * @group Implementation
     * @category Transactions
     */
    isRateLimiter(): boolean;
}
/**
 * Represents a structured tag that includes an address, module name,
 * name, and type arguments. This class is used to define and manage
 * structured data types within the SDK.
 *
 * @property {AccountAddress} address - The address associated with the struct tag.
 * @property {Identifier} moduleName - The name of the module that contains the struct.
 * @property {Identifier} name - The name of the struct.
 * @property {Array<TypeTag>} typeArgs - An array of type arguments associated with the struct.
 * @group Implementation
 * @category Transactions
 */
declare class StructTag extends Serializable {
    readonly address: AccountAddress;
    readonly moduleName: Identifier;
    readonly name: Identifier;
    readonly typeArgs: Array<TypeTag>;
    constructor(address: AccountAddress, module_name: Identifier, name: Identifier, type_args: Array<TypeTag>);
    serialize(serializer: Serializer): void;
    static deserialize(deserializer: Deserializer): StructTag;
}
/**
 * Retrieves the StructTag for the AptosCoin, which represents the Aptos Coin in the Aptos blockchain.
 *
 * @returns {StructTag} The StructTag for the AptosCoin.
 * @group Implementation
 * @category Transactions
 */
declare function aptosCoinStructTag(): StructTag;
/**
 * Returns a new StructTag representing a string type.
 *
 * @returns {StructTag} A StructTag for the string type.
 * @group Implementation
 * @category Transactions
 */
declare function stringStructTag(): StructTag;
/**
 * Creates a new StructTag for the Option type with the specified type argument.
 * This can help in defining a specific instance of an Option type in your application.
 *
 * @param typeArg - The type tag that specifies the type of the value contained in the Option.
 * @group Implementation
 * @category Transactions
 */
declare function optionStructTag(typeArg: TypeTag): StructTag;
/**
 * Creates a new StructTag for the Object type with the specified type argument.
 * This function helps in defining a structured representation of an Object with a specific type.
 *
 * @param typeArg - The type tag that specifies the type of the Object.
 * @group Implementation
 * @category Transactions
 */
declare function objectStructTag(typeArg: TypeTag): StructTag;

export { StructTag, TypeTag, TypeTagAddress, TypeTagBool, TypeTagGeneric, TypeTagReference, TypeTagSigner, TypeTagStruct, TypeTagU128, TypeTagU16, TypeTagU256, TypeTagU32, TypeTagU64, TypeTagU8, TypeTagVector, aptosCoinStructTag, objectStructTag, optionStructTag, stringStructTag };
