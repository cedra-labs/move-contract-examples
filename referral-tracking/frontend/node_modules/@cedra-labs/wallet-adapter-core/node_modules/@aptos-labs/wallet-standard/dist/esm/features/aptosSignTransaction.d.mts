import { AccountAuthenticator, AnyRawTransaction, AccountAddress, PublicKey, Network, TransactionPayload, InputGenerateTransactionPayloadData } from '@aptos-labs/ts-sdk';
import { UserResponse } from '../misc.mjs';

/** Name of the feature. */
declare const AptosSignTransactionNamespace = "aptos:signTransaction";
type AptosSignTransactionFeatureV1_0 = {
    [AptosSignTransactionNamespace]: {
        version: '1.0.0';
        signTransaction: AptosSignTransactionMethod;
    };
};
type AptosSignTransactionFeatureV1_1 = {
    [AptosSignTransactionNamespace]: {
        version: '1.1';
        signTransaction: AptosSignTransactionMethod & AptosSignTransactionMethodV1_1;
    };
};
/**
 * A Wallet Standard feature for signing an Aptos transaction, and returning the
 * account authenticator.
 */
type AptosSignTransactionFeature = AptosSignTransactionFeatureV1_0 | AptosSignTransactionFeatureV1_1;
type AptosSignTransactionOutput = AccountAuthenticator;
type AptosSignTransactionMethod = (transaction: AnyRawTransaction, asFeePayer?: boolean) => Promise<UserResponse<AptosSignTransactionOutput>>;
interface AccountInput {
    address: AccountAddress;
    publicKey?: PublicKey;
}
interface AptosSignTransactionInputV1_1 {
    expirationSecondsFromNow?: number;
    expirationTimestamp?: number;
    feePayer?: AccountInput;
    gasUnitPrice?: number;
    maxGasAmount?: number;
    network?: Network;
    payload: TransactionPayload | InputGenerateTransactionPayloadData;
    secondarySigners?: AccountInput[];
    sender?: AccountInput;
    sequenceNumber?: number | bigint;
    signerAddress?: AccountAddress;
}
interface AptosSignTransactionOutputV1_1 {
    authenticator: AccountAuthenticator;
    rawTransaction: AnyRawTransaction;
}
type AptosSignTransactionMethodV1_1 = (input: AptosSignTransactionInputV1_1) => Promise<UserResponse<AptosSignTransactionOutputV1_1>>;

export { AccountInput, AptosSignTransactionFeature, AptosSignTransactionFeatureV1_0, AptosSignTransactionFeatureV1_1, AptosSignTransactionInputV1_1, AptosSignTransactionMethod, AptosSignTransactionMethodV1_1, AptosSignTransactionNamespace, AptosSignTransactionOutput, AptosSignTransactionOutputV1_1 };
