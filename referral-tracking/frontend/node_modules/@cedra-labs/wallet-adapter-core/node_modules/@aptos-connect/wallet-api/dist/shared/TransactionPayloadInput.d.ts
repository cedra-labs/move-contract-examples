import { Deserializer, InputGenerateTransactionPayloadData, Serializer } from '@aptos-labs/ts-sdk';
export declare enum TransactionPayloadInputVariant {
    EntryFunction = 0,
    Script = 1,
    Multisig = 2
}
export declare function serializeTransactionPayloadInput(serializer: Serializer, value: InputGenerateTransactionPayloadData): void;
export declare function deserializeTransactionPayloadInput(deserializer: Deserializer): InputGenerateTransactionPayloadData;
//# sourceMappingURL=TransactionPayloadInput.d.ts.map