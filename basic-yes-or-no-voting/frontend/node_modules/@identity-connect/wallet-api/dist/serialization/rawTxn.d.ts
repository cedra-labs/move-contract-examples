import { FeePayerRawTransaction, MultiAgentRawTransaction, RawTransaction } from '@aptos-labs/ts-sdk';
import { TxnBuilderTypes } from 'aptos';
export type SerializableRawTransaction = RawTransaction | FeePayerRawTransaction | MultiAgentRawTransaction;
export type SerializableRawTransactionV1 = TxnBuilderTypes.RawTransaction | TxnBuilderTypes.FeePayerRawTransaction | TxnBuilderTypes.MultiAgentRawTransaction;
export interface SerializedSimpleRawTransaction {
    type: 'raw_txn';
    value: string;
}
export interface SerializedFeePayerRawTransaction {
    type: 'fee_payer_raw_txn';
    value: string;
}
export interface SerializedMultiAgentRawTransaction {
    type: 'multi_agent_raw_txn';
    value: string;
}
export type SerializedRawTransaction = SerializedSimpleRawTransaction | SerializedFeePayerRawTransaction | SerializedMultiAgentRawTransaction;
export declare function serializeRawTransaction(rawTxn: RawTransaction | TxnBuilderTypes.RawTransaction): SerializedSimpleRawTransaction;
export declare function serializeRawTransaction(rawTxn: FeePayerRawTransaction | TxnBuilderTypes.FeePayerRawTransaction): SerializedFeePayerRawTransaction;
export declare function serializeRawTransaction(rawTxn: MultiAgentRawTransaction | TxnBuilderTypes.MultiAgentRawTransaction): SerializedMultiAgentRawTransaction;
export declare function serializeRawTransaction(rawTxn: SerializableRawTransaction | SerializableRawTransactionV1): SerializedRawTransaction;
export declare function deserializeRawTransaction(serialized: SerializedSimpleRawTransaction): RawTransaction;
export declare function deserializeRawTransaction(serialized: SerializedFeePayerRawTransaction): FeePayerRawTransaction;
export declare function deserializeRawTransaction(serialized: SerializedMultiAgentRawTransaction): MultiAgentRawTransaction;
export declare function deserializeRawTransaction(serialized: SerializedRawTransaction): SerializableRawTransaction;
//# sourceMappingURL=rawTxn.d.ts.map