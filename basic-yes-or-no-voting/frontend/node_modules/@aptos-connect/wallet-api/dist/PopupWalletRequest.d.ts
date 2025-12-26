import { AccountAddressInput, Ed25519PublicKey, Ed25519Signature } from '@aptos-labs/ts-sdk';
import { type WalletRequestBody } from './WalletRequestBody';
export interface UnsignedPopupWalletRequest {
    accountAddress?: AccountAddressInput;
    body: WalletRequestBody;
    clientIdentityKey?: undefined;
}
export interface BaseSignedPopupWalletRequest {
    accountAddress?: AccountAddressInput;
    clientIdentityKey: Ed25519PublicKey;
    id: string;
    signature: Ed25519Signature;
    timestamp: number;
}
export interface DeferredSignedPopupWalletRequest extends BaseSignedPopupWalletRequest {
    body?: undefined;
}
export interface SignedPopupWalletRequest extends BaseSignedPopupWalletRequest {
    body: WalletRequestBody;
}
export type PopupWalletRequest = UnsignedPopupWalletRequest | DeferredSignedPopupWalletRequest | SignedPopupWalletRequest;
export declare function encodePopupWalletRequest(request: PopupWalletRequest): string;
export declare function decodePopupWalletRequest(encoded: string): PopupWalletRequest;
export declare function makePopupWalletRequestChallenge({ accountAddress, body, id, timestamp, }: Omit<SignedPopupWalletRequest, 'clientIdentityKey' | 'signature'>): Uint8Array;
//# sourceMappingURL=PopupWalletRequest.d.ts.map