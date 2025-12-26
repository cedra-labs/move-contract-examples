// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import { CreatePairingSerializedResponse, FinalizedPairingData, SerializedDate } from '@identity-connect/api';
import { createEd25519KeyPair, encodeBase64 } from '@identity-connect/crypto';
import { isAxiosError } from 'axios';
import { DEFAULT_FRONTEND_URL } from './constants';
import { UnregisteredDappError } from './errors';
import { ACPairingClient, ACPairingClientConfig } from './PairingClient';
import { openPrompt, waitForPromptResponse } from './prompt';

export interface ICDappClientConfig extends ACPairingClientConfig {
  frontendBaseURL?: string;
}

export class ICDappClient extends ACPairingClient {
  private readonly frontendBaseURL: string;

  constructor(
    private readonly dappId: string,
    { frontendBaseURL = DEFAULT_FRONTEND_URL, ...pairingClientConfig }: ICDappClientConfig = {},
  ) {
    super(pairingClientConfig);
    this.frontendBaseURL = frontendBaseURL;
  }

  private async createPairingRequest(dappEd25519PublicKeyB64: string) {
    try {
      const response = await this.axiosInstance.post<CreatePairingSerializedResponse>('v1/pairing/', {
        dappEd25519PublicKeyB64,
        dappId: this.dappId,
      });
      return response.data.data.pairing;
    } catch (err) {
      // TODO: export typed errors from API
      if (isAxiosError(err) && err.response?.data?.message === 'Dapp not found') {
        throw new UnregisteredDappError();
      }
      throw err;
    }
  }

  // region Public API

  /**
   * Requests a connection to an account (internally known as pairing).
   * @returns either the address of the connected account, or undefined if the
   * connection was cancelled.
   */
  async connect() {
    const { publicKey, secretKey } = createEd25519KeyPair();
    const dappEd25519PublicKeyB64 = encodeBase64(publicKey.key);

    // Open the prompt without pairingId (for a snappier ux)
    const url = new URL(`${this.frontendBaseURL}/pairing`);
    const promptWindow = await openPrompt(url.href);

    let pairingId: string;
    try {
      const pendingPairing = await this.createPairingRequest(dappEd25519PublicKeyB64);
      pairingId = pendingPairing.id;
    } catch (err) {
      // Close the prompt and have the dapp handle the error
      promptWindow.close();
      throw err;
    }

    // Update the prompt's URL as soon as a pairingId is available
    url.searchParams.set('pairingId', pairingId);
    promptWindow.location.href = url.href;
    const promptResponse = await waitForPromptResponse<SerializedDate<FinalizedPairingData>>(promptWindow);

    if (promptResponse.status === 'dismissed') {
      // Ignore the result. This is just a courtesy call, so if anything goes wrong
      // the pairing will be removed during scheduled cleanup)
      void this.deletePairing(pairingId, secretKey, publicKey);
      return undefined;
    }

    const finalizedPairing = promptResponse.args;
    await this.addPairing({ publicKey, secretKey }, finalizedPairing);

    return finalizedPairing.account.accountAddress;
  }

  async offboard(address: string) {
    const pairing = await this.accessors.get(address);
    if (pairing === undefined) {
      throw new Error('This account is not paired');
    }

    const walletId = pairing.dappWalletId;
    if (walletId === undefined) {
      throw new Error('This account cannot be offboarded');
    }

    const url = new URL(`${this.frontendBaseURL}/offboarding?walletId=${walletId}`);
    const promptWindow = openPrompt(url);
    const response = await waitForPromptResponse<{ offboarded: boolean }>(promptWindow);
    if (response.status === 'approved' && response.args.offboarded) {
      // If exported, disconnect the pairing to clean up
      this.disconnect(address);
      return true;
    }
    return false;
  }

  // endregion
}
