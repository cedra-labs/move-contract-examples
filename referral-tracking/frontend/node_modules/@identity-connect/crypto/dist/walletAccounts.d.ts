import { Account, AccountPublicKey, PublicKey as AptosPublicKey, Signature } from '@aptos-labs/ts-sdk';
import { Ed25519KeyPair, Ed25519PublicKey, Ed25519SecretKey } from './utils';
export declare enum AccountConnectionAction {
    ADD = "add",
    REMOVE = "remove"
}
/**
 * When a wallet wants to create a pairing, or add/remove an account from a wallet connection, it must prove that it
 * has the secret key for a given account. To do so it uses an `AccountConnectInfo` object.
 *  1. Once the `AccountConnectInfo` is assembled, it’s JSON serialized to get a `accountInfoSerialized` string.
 *  2. We then domain separate and hash the `accountInfoSerialized` to get the `accountInfoHash`:
 *    `SHA3-256(SHA3-256('APTOS::IDENTITY_CONNECT::') | SHA3-256(accountInfoSerialized))`
 *  3. To obtain the `signature`, we sign the `accountInfoHash` with the Ed25519 private key of the sender, and hex
 *     encode it.
 *  4. These are assembled into an `AccountConnectInfoSerialized`, ready to be sent in an HTTP request.
 */
export type BaseAccountConnectInfo = {
    accountAddress: string;
    action: AccountConnectionAction;
    intentId: string;
    timestampMillis: number;
    transportEd25519PublicKeyB64: string;
};
export type Ed25519AccountConnectInfo = BaseAccountConnectInfo & {
    ed25519PublicKeyB64: string;
    publicKeyB64?: undefined;
};
export type AnyAccountConnectInfo = BaseAccountConnectInfo & {
    ed25519PublicKeyB64?: undefined;
    publicKeyB64: string;
};
export type AccountConnectInfo = Ed25519AccountConnectInfo | AnyAccountConnectInfo;
export type Ed25519AccountConnectInfoSerialized = {
    accountInfoSerialized: string;
    signature: string;
    signatureB64?: undefined;
};
export type AnyAccountConnectInfoSerialized = {
    accountInfoSerialized: string;
    signature?: undefined;
    signatureB64: string;
};
export type AccountConnectInfoSerialized = Ed25519AccountConnectInfoSerialized | AnyAccountConnectInfoSerialized;
export type SyncSignCallback = (message: Uint8Array) => Signature;
export type AsyncSignCallback = (message: Uint8Array) => Promise<Signature>;
export type AnySignCallback = SyncSignCallback | AsyncSignCallback;
export declare function deriveAccountTransportEd25519Keypair(ed25519SecretKey: Ed25519SecretKey, publicKey: Ed25519PublicKey | AptosPublicKey): Ed25519KeyPair;
export declare function deriveAccountTransportEd25519Keypair(signCallback: SyncSignCallback, publicKey: Ed25519PublicKey | AptosPublicKey): Ed25519KeyPair;
export declare function deriveAccountTransportEd25519Keypair(signCallback: AsyncSignCallback, publicKey: Ed25519PublicKey | AptosPublicKey): Promise<Ed25519KeyPair>;
export declare function deriveAccountTransportEd25519Keypair(signCallback: AnySignCallback, publicKey: Ed25519PublicKey | AptosPublicKey): Ed25519KeyPair | Promise<Ed25519KeyPair>;
export type CreateSerializedAccountInfoArgs<TSignCallback extends AnySignCallback> = [
    signCallback: TSignCallback,
    publicKey: AccountPublicKey,
    transportEd25519PublicKey: Ed25519PublicKey,
    action: AccountConnectionAction,
    intentId: string,
    accountAddress?: string
];
export declare function createSerializedAccountInfo(...args: CreateSerializedAccountInfoArgs<SyncSignCallback>): AccountConnectInfoSerialized;
export declare function createSerializedAccountInfo(...args: CreateSerializedAccountInfoArgs<AsyncSignCallback>): Promise<AccountConnectInfoSerialized>;
export declare function createSerializedAccountInfo(...args: CreateSerializedAccountInfoArgs<AnySignCallback>): AccountConnectInfoSerialized | Promise<AccountConnectInfoSerialized>;
export declare function aptosAccountToSerializedInfo(account: Account, intentId: string): Promise<AccountConnectInfoSerialized>;
//# sourceMappingURL=walletAccounts.d.ts.map