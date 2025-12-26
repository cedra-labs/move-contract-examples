// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import {
  AccountAddress,
  AccountAddressInput,
  Ed25519PublicKey,
  Ed25519Signature,
  Serializer,
} from '@aptos-labs/ts-sdk';
import { base64ToBytes, base64urlToBytes, bytesToBase64, bytesToBase64url } from './base64';
import { decodeWalletRequestBody, encodeWalletRequestBody, type WalletRequestBody } from './WalletRequestBody';

export interface UnsignedPopupWalletRequest {
  accountAddress?: AccountAddressInput;
  body: WalletRequestBody;
  clientIdentityKey?: undefined;
}

export interface BaseSignedPopupWalletRequest {
  accountAddress?: AccountAddressInput;
  clientIdentityKey: Ed25519PublicKey;
  id: string;
  // against ('AptosConnectWalletRequest', id, body, address, timestamp)
  signature: Ed25519Signature;
  timestamp: number;
}

export interface DeferredSignedPopupWalletRequest extends BaseSignedPopupWalletRequest {
  body?: undefined;
}

export interface SignedPopupWalletRequest extends BaseSignedPopupWalletRequest {
  body: WalletRequestBody;
}

export type PopupWalletRequest =
  | UnsignedPopupWalletRequest
  | DeferredSignedPopupWalletRequest
  | SignedPopupWalletRequest;

export function encodePopupWalletRequest(request: PopupWalletRequest): string {
  const serialized = JSON.stringify(request, (key, value) => {
    switch (key) {
      case 'body':
        return encodeWalletRequestBody(value);
      case 'clientIdentityKey':
        return bytesToBase64((value as Ed25519PublicKey).toUint8Array());
      case 'signature':
        return bytesToBase64((value as Ed25519Signature).toUint8Array());
      default:
        return value;
    }
  });
  const utf8Encoded = new TextEncoder().encode(serialized);
  return bytesToBase64url(utf8Encoded);
}

export function decodePopupWalletRequest(encoded: string): PopupWalletRequest {
  const utfEncoded = base64urlToBytes(encoded);
  const serialized = new TextDecoder().decode(utfEncoded);
  return JSON.parse(serialized, (key, value) => {
    switch (key) {
      case 'body':
        return decodeWalletRequestBody(value);
      case 'clientIdentityKey':
        return new Ed25519PublicKey(base64ToBytes(value));
      case 'signature':
        return new Ed25519Signature(base64ToBytes(value));
      default:
        return value;
    }
  });
}

export function makePopupWalletRequestChallenge({
  accountAddress,
  body,
  id,
  timestamp,
}: Omit<SignedPopupWalletRequest, 'clientIdentityKey' | 'signature'>) {
  const serializer = new Serializer();
  serializer.serializeStr('SignedPopupWalletRequest');
  serializer.serializeStr(id);
  serializer.serializeU64(timestamp);
  serializer.serializeBool(accountAddress !== undefined);
  if (accountAddress !== undefined) {
    serializer.serialize(AccountAddress.from(accountAddress));
  }
  serializer.serializeStr(body.name);
  serializer.serializeU8(body.version);
  serializer.serializeBytes(body.data);
  return serializer.toUint8Array();
}
