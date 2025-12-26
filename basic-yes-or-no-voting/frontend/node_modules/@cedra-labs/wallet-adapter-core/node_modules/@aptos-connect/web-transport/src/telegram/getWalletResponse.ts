// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import { base64ToBytes, bytesToBase64url, SerializedWalletResponse } from '@aptos-connect/wallet-api';
import { Ed25519PublicKey } from '@aptos-labs/ts-sdk';
import { smartPolling } from './smartPolling';

export async function getWalletResponse(
  baseUrl: string,
  clientIdentityKey: Ed25519PublicKey,
  requestId: string,
): Promise<SerializedWalletResponse> {
  const encodedClientIdentityKey = bytesToBase64url(clientIdentityKey.toUint8Array());
  const url = new URL(`${baseUrl}/v1/dapp/clients/${encodedClientIdentityKey}/requests/${requestId}/response/`);
  const response = await smartPolling(() =>
    fetch(url, {
      headers: { Accept: 'application/json' },
      method: 'get',
    }),
  );

  const responseBody = await response.json();
  const data = base64ToBytes(responseBody.data.body);
  return { data };
}
