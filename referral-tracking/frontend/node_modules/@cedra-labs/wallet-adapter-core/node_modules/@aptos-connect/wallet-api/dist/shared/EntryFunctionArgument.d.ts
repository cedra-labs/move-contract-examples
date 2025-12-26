import { Deserializer, EntryFunctionArgumentTypes, Serializer, SimpleEntryFunctionArgumentTypes } from '@aptos-labs/ts-sdk';
export type EntryFunctionArgument = EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes;
export declare enum EntryFunctionArgumentVariant {
    Undefined = 0,
    Array = 1,
    String = 2,
    Uint8Array = 3,
    AccountAddress = 4,
    FixedBytes = 5
}
export declare function serializeEntryFunctionArgument(serializer: Serializer, argument: EntryFunctionArgument): void;
export declare function deserializeEntryFunctionArgument(deserializer: Deserializer): EntryFunctionArgument;
//# sourceMappingURL=EntryFunctionArgument.d.ts.map