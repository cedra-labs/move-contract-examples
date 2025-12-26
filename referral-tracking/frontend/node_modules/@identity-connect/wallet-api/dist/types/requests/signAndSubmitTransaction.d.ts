import { AccountAuthenticator, FeePayerRawTransaction, RawTransaction, TransactionPayload } from '@aptos-labs/ts-sdk';
import { JsonTransactionPayload } from '../jsonPayload';
import { TransactionOptions } from '../transactionOptions';
export interface SignAndSubmitTransactionWithPayloadRequestArgs {
    options?: TransactionOptions;
    payload: JsonTransactionPayload | TransactionPayload;
}
export interface SignAndSubmitTransactionWithRawTxnRequestArgs {
    rawTxn: RawTransaction;
}
export interface SignAndSubmitTransactionWithFeePayerRawTxnRequestArgs {
    feePayerAuthenticator: AccountAuthenticator;
    rawTxn: FeePayerRawTransaction;
}
export type SignAndSubmitTransactionRequestArgs = SignAndSubmitTransactionWithPayloadRequestArgs | SignAndSubmitTransactionWithRawTxnRequestArgs | SignAndSubmitTransactionWithFeePayerRawTxnRequestArgs;
//# sourceMappingURL=signAndSubmitTransaction.d.ts.map