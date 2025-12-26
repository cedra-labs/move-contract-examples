import type { JsonTransactionPayload, SignTransactionRequestArgs, SignTransactionRequestV1Args, SignTransactionWithPayloadRequestArgs, SignTransactionWithRawTxnRequestArgs, TransactionOptions } from '../types';
import type { SerializedRawTransaction } from './rawTxn';
export interface SerializedSignTransactionWithPayloadRequestArgs {
    options?: TransactionOptions;
    payload: JsonTransactionPayload | string;
}
export interface SerializedSignTransactionWithRawTxnRequestArgs {
    rawTxn: SerializedRawTransaction;
}
export type SerializedSignTransactionRequestArgs = SerializedSignTransactionWithPayloadRequestArgs | SerializedSignTransactionWithRawTxnRequestArgs;
export declare function serializeSignTransactionRequestArgs(args: SignTransactionRequestArgs | SignTransactionRequestV1Args): SerializedSignTransactionRequestArgs;
export declare function deserializeSignTransactionRequestArgs(args: SerializedSignTransactionWithPayloadRequestArgs): SignTransactionWithPayloadRequestArgs;
export declare function deserializeSignTransactionRequestArgs(args: SerializedSignTransactionWithRawTxnRequestArgs): SignTransactionWithRawTxnRequestArgs;
export declare function deserializeSignTransactionRequestArgs(args: SerializedSignTransactionRequestArgs): SignTransactionRequestArgs;
//# sourceMappingURL=signTransactionRequestArgs.d.ts.map