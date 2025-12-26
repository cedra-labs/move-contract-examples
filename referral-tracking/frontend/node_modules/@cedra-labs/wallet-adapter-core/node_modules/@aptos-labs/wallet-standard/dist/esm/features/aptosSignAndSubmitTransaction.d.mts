import { InputGenerateTransactionPayloadData } from '@aptos-labs/ts-sdk';
import { UserResponse } from '../misc.mjs';

/** Version of the feature. */
type AptosSignAndSubmitTransactionVersion = '1.1.0';
/** Name of the feature. */
declare const AptosSignAndSubmitTransactionNamespace = "aptos:signAndSubmitTransaction";
/**
 * A Wallet Standard feature for signing a transaction, and returning the
 * hash of the transaction.
 */
type AptosSignAndSubmitTransactionFeature = {
    /** Namespace for the feature. */
    [AptosSignAndSubmitTransactionNamespace]: {
        /** Version of the feature API. */
        version: AptosSignAndSubmitTransactionVersion;
        signAndSubmitTransaction: AptosSignAndSubmitTransactionMethod;
    };
};
type AptosSignAndSubmitTransactionMethod = (transaction: AptosSignAndSubmitTransactionInput) => Promise<UserResponse<AptosSignAndSubmitTransactionOutput>>;
interface AptosSignAndSubmitTransactionInput {
    gasUnitPrice?: number;
    maxGasAmount?: number;
    payload: InputGenerateTransactionPayloadData;
}
interface AptosSignAndSubmitTransactionOutput {
    hash: string;
}

export { AptosSignAndSubmitTransactionFeature, AptosSignAndSubmitTransactionInput, AptosSignAndSubmitTransactionMethod, AptosSignAndSubmitTransactionNamespace, AptosSignAndSubmitTransactionOutput, AptosSignAndSubmitTransactionVersion };
