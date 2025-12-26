// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import {
  encodePopupWalletRequest,
  makePopupWalletRequestChallenge,
  SerializedWalletRequest,
  SignedPopupWalletRequest,
} from '@aptos-connect/wallet-api';
import { postEvent as postTelegramEvent } from '@telegram-apps/bridge';
import { v4 as randomUUID } from 'uuid';
import { createWalletRequest } from './createWalletRequest';
import { getClientIdentityKey } from './getClientIdentityKey';
import { getWalletResponse } from './getWalletResponse';

export async function openTelegramPrompt(args: {
  baseUrl: string;
  request: SerializedWalletRequest;
  tgWebAppUrl?: string;
}) {
  const { baseUrl, request: body, tgWebAppUrl = '/AptosConnectBot/AptosConnect' } = args;
  const identityKey = getClientIdentityKey();
  const clientIdentityKey = identityKey.publicKey();
  const requestId = randomUUID();
  const timestamp = Date.now();

  const challenge = makePopupWalletRequestChallenge({ body, id: requestId, timestamp });
  const signature = identityKey.sign(challenge);

  const signedWalletRequest: SignedPopupWalletRequest = {
    body,
    clientIdentityKey,
    id: requestId,
    signature,
    timestamp,
  };

  // Telegram only supports start parameters up to 1024 characters
  // If the encoded request is longer, we send it to the backend and mark
  // the request as "deferred" by omitting the body
  let encodedRequest = encodePopupWalletRequest(signedWalletRequest);
  if (encodedRequest.length > 1024) {
    void createWalletRequest(baseUrl, signedWalletRequest);
    encodedRequest = encodePopupWalletRequest({
      clientIdentityKey,
      id: requestId,
      signature,
      timestamp,
    });
  }

  postTelegramEvent('web_app_open_tg_link', {
    path_full: `${tgWebAppUrl}?startapp=${encodedRequest}`,
  });

  return getWalletResponse(baseUrl, clientIdentityKey, requestId);
}
