import type { SignTransactionResponseArgs } from '../types';
export interface SerializedSignTransactionWithPayloadResponseArgs {
    accountAuthenticator: string;
    rawTxn: string;
}
export interface SerializedSignTransactionWithRawTxnResponseArgs {
    accountAuthenticator: string;
}
export type SerializedSignTransactionResponseArgs = SerializedSignTransactionWithPayloadResponseArgs | SerializedSignTransactionWithRawTxnResponseArgs;
export declare function serializeSignTransactionResponseArgs(args: SignTransactionResponseArgs): SerializedSignTransactionResponseArgs;
export declare function deserializeSignTransactionResponseArgs(args: SerializedSignTransactionResponseArgs): SignTransactionResponseArgs;
//# sourceMappingURL=signTransactionResponseArgs.d.ts.map