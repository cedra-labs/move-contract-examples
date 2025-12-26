// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import {
  ConnectRequest,
  ConnectResponse,
  type DappInfo,
  DisconnectRequest,
  GetConnectedAccountsRequest,
  GetConnectedAccountsResponse,
  IsConnectedRequest,
  IsConnectedResponse,
  SignAndSubmitTransactionRequest,
  SignAndSubmitTransactionResponse,
  SignMessageRequest,
  SignMessageResponse,
  SignTransactionRequest,
  SignTransactionResponse,
} from '@aptos-connect/wallet-api';
import { WebWalletTransport } from '@aptos-connect/web-transport';
import { NetworkName } from '@identity-connect/api';
import { DEFAULT_FRONTEND_URL } from './constants';

export interface ACKeylessClientConfig {
  dappImageURI?: string;
  dappName?: string;
  defaultNetworkName?: NetworkName;
  frontendBaseURL?: string;
  provider?: 'google' | 'apple';
}

export class ACKeylessClient {
  private readonly defaultNetworkName: NetworkName;

  readonly dappInfo: DappInfo;

  private readonly transport: WebWalletTransport;

  constructor({
    dappImageURI,
    dappName,
    defaultNetworkName = NetworkName.MAINNET,
    frontendBaseURL = DEFAULT_FRONTEND_URL,
    provider = 'google',
  }: ACKeylessClientConfig = {}) {
    this.defaultNetworkName = defaultNetworkName;

    this.dappInfo = {
      domain: window.location.origin,
      imageURI: dappImageURI,
      name: dappName ?? document.title,
    };

    this.transport = new WebWalletTransport(frontendBaseURL, provider);
  }

  // region Public API

  async isConnected() {
    const serializedRequest = IsConnectedRequest.serialize(this.dappInfo);
    const serializedResponse = await this.transport.sendRequest(serializedRequest);
    const response = IsConnectedResponse.deserialize(serializedResponse);
    return response.args;
  }

  async getConnectedAccounts() {
    const serializedRequest = GetConnectedAccountsRequest.serialize(this.dappInfo);
    const serializedResponse = await this.transport.sendRequest(serializedRequest);
    const response = GetConnectedAccountsResponse.deserialize(serializedResponse);
    return response.args;
  }

  async disconnect() {
    const serializedRequest = DisconnectRequest.serialize(this.dappInfo);
    await this.transport.sendRequest(serializedRequest);
  }

  async connect() {
    const serializedRequest = ConnectRequest.serialize(this.dappInfo);
    const serializedResponse = await this.transport.sendRequest(serializedRequest);
    const response = ConnectResponse.deserialize(serializedResponse);
    return response.args;
  }

  async signMessage(args: SignMessageRequest.Args) {
    const serializedRequest = SignMessageRequest.serialize(this.dappInfo, args);
    const serializedResponse = await this.transport.sendRequest(serializedRequest);
    const response = SignMessageResponse.deserialize(serializedResponse);
    return response.args;
  }

  async signTransaction(
    args: SignTransactionRequest.Args | SignTransactionRequest.ArgsWithTransaction,
  ): Promise<SignTransactionResponse.Args> {
    const normalizedArgs = 'transaction' in args ? SignTransactionRequest.normalizeArgs(args) : args;
    const serializedRequest = SignTransactionRequest.serialize(this.dappInfo, normalizedArgs);
    const serializedResponse = await this.transport.sendRequest(serializedRequest);
    const response = SignTransactionResponse.deserialize(serializedResponse);
    return response.args;
  }

  async signAndSubmitTransaction(args: SignAndSubmitTransactionRequest.Args) {
    const serializedRequest = SignAndSubmitTransactionRequest.serialize(this.dappInfo, args);
    const serializedResponse = await this.transport.sendRequest(serializedRequest);
    const response = SignAndSubmitTransactionResponse.deserialize(serializedResponse);
    return response.args;
  }

  // endregion
}
