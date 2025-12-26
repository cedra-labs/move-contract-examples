// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import {
  bytesToBase64,
  bytesToBase64url,
  encodeWalletRequestBody,
  SignedPopupWalletRequest,
} from '@aptos-connect/wallet-api';

export async function createWalletRequest(baseUrl: string, request: SignedPopupWalletRequest) {
  const encodedClientIdentityKey = bytesToBase64url(request.clientIdentityKey.toUint8Array());

  const response = await fetch(`${baseUrl}/v1/dapp/clients/${encodedClientIdentityKey}/requests/`, {
    body: JSON.stringify({
      body: encodeWalletRequestBody(request.body),
      id: request.id,
      signature: bytesToBase64(request.signature.toUint8Array()),
      timestamp: request.timestamp,
    }),
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    method: 'post',
  });

  if (!response.ok) {
    throw new Error('Failed creating the wallet request');
  }
}
