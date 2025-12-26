// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import { base64ToBytes, bytesToBase64 } from './base64';

export interface WalletRequestBody<RequestName extends string = string, Version extends number = number> {
  data: Uint8Array;
  name: RequestName;
  version: Version;
}

export function encodeWalletRequestBody({ data, ...rest }: WalletRequestBody): string {
  const serialized = JSON.stringify({ data, ...rest }, (key, value) => (key === 'data' ? bytesToBase64(value) : value));
  const utf8Encoded = new TextEncoder().encode(serialized);
  return bytesToBase64(utf8Encoded);
}

export function decodeWalletRequestBody(encoded: string): WalletRequestBody {
  const utfEncoded = base64ToBytes(encoded);
  const serialized = new TextDecoder().decode(utfEncoded);
  return JSON.parse(serialized, (key, value) => (key === 'data' ? base64ToBytes(value) : value));
}
