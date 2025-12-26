// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import {
  ConnectRequest,
  ConnectResponse,
  DisconnectRequest,
  DisconnectResponse,
  GetConnectedAccountsRequest,
  GetConnectedAccountsResponse,
  IsConnectedRequest,
  IsConnectedResponse,
  SerializedWalletRequest,
  SignAndSubmitTransactionRequest,
  SignInRequest,
  SignInResponse,
  SignMessageRequest,
  SignTransactionRequest,
} from '@aptos-connect/wallet-api';
import { openPrompt, waitForPromptResponse } from './prompt';
import { addConnectedAccount, getConnectedAccounts, removeConnectedAccount } from './state';

import { isTelegramMiniApp, openTelegramPrompt } from './telegram';

export class WebWalletTransport {
  constructor(
    private readonly baseUrl: string,
    private readonly provider: 'google' | 'apple' = 'google',
    private readonly tgWebAppUrl?: string,
  ) {
    this.baseUrl = baseUrl;
  }

  async sendPromptRequest(request: SerializedWalletRequest) {
    if (isTelegramMiniApp()) {
      return openTelegramPrompt({
        baseUrl: this.baseUrl,
        request,
        tgWebAppUrl: this.tgWebAppUrl,
      });
    }

    const url = new URL(`${this.baseUrl}/prompt/`);
    url.searchParams.set('provider', this.provider);
    const prompt = openPrompt(url);

    return waitForPromptResponse(this.baseUrl, prompt, request);
  }

  async sendRequest(request: SerializedWalletRequest) {
    switch (request.name) {
      case IsConnectedRequest.name: {
        const connectedAccounts = getConnectedAccounts();
        return IsConnectedResponse.serialize(connectedAccounts.length > 0);
      }
      case GetConnectedAccountsRequest.name: {
        const connectedAccounts = getConnectedAccounts();
        return GetConnectedAccountsResponse.serialize(connectedAccounts);
      }
      case ConnectRequest.name: {
        const serializedResponse = await this.sendPromptRequest(request);
        const response = ConnectResponse.deserialize(serializedResponse);
        if (response.args.status === 'approved') {
          const { account, pairing } = response.args.args;
          if (pairing === undefined) {
            addConnectedAccount(account);
          }
        }
        return serializedResponse;
      }
      case SignInRequest.name: {
        const serializedResponse = await this.sendPromptRequest(request);
        const response = SignInResponse.deserialize(serializedResponse);
        if (response.args.status === 'approved') {
          const { account } = response.args.args;
          addConnectedAccount(account);
        }
        return serializedResponse;
      }
      case DisconnectRequest.name: {
        const [activeAccount] = getConnectedAccounts();
        if (activeAccount) {
          removeConnectedAccount(activeAccount.address);
        }
        return DisconnectResponse.serialize({});
      }
      case SignMessageRequest.name:
      case SignTransactionRequest.name:
      case SignAndSubmitTransactionRequest.name: {
        return this.sendPromptRequest(request);
      }
      default: {
        throw new Error('Unexpected request');
      }
    }
  }
}
