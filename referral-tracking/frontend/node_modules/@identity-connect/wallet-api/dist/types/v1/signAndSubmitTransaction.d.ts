import { TxnBuilderTypes } from 'aptos';
import { JsonTransactionPayload } from '../jsonPayload';
import { TransactionOptions } from '../transactionOptions';
export interface SignAndSubmitTransactionWithPayloadRequestV1Args {
    options?: TransactionOptions;
    payload: JsonTransactionPayload | TxnBuilderTypes.TransactionPayload;
}
export interface SignAndSubmitTransactionWithRawTxnRequestV1Args {
    rawTxn: TxnBuilderTypes.RawTransaction;
}
export interface SignAndSubmitTransactionWithFeePayerRawTxnRequestV1Args {
    feePayerAuthenticator: TxnBuilderTypes.AccountAuthenticator;
    rawTxn: TxnBuilderTypes.FeePayerRawTransaction;
}
export type SignAndSubmitTransactionRequestV1Args = SignAndSubmitTransactionWithPayloadRequestV1Args | SignAndSubmitTransactionWithRawTxnRequestV1Args | SignAndSubmitTransactionWithFeePayerRawTxnRequestV1Args;
//# sourceMappingURL=signAndSubmitTransaction.d.ts.map