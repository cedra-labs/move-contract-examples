import { Deserializer, Serializable as BcsSerializableV2 } from '@aptos-labs/ts-sdk';
import { BCS } from 'aptos';
export type BcsSerializableV1 = {
    serialize(serializer: BCS.Serializer): void;
};
export type BcsDeserializableV1Class<T extends BcsSerializableV1> = {
    deserialize(deserializer: BCS.Deserializer): T;
};
export type BcsDeserializableV2Class<T extends BcsSerializableV2> = {
    deserialize(deserializer: Deserializer): T;
};
/**
 * Check if a value is BCS serializable
 */
export declare function isBcsSerializable(value: any): value is BcsSerializableV1 | BcsSerializableV2;
export declare function bcsSerialize(serializable: BcsSerializableV1 | BcsSerializableV2): string;
export declare function bcsDeserialize<T extends BcsSerializableV2>(deserializableClass: BcsDeserializableV2Class<T>, serializedValue: string): T;
//# sourceMappingURL=bcsSerialization.d.ts.map