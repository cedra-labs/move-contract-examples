// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import {
  chainIdToNetwork,
  ConnectRequest,
  ConnectResponse,
  type DappInfo,
  DisconnectRequest,
  GetConnectedAccountsRequest,
  GetConnectedAccountsResponse,
  makeUserApproval,
  SignAndSubmitTransactionRequest,
  SignAndSubmitTransactionResponse,
  SignInRequest,
  SignInResponse,
  SignMessageRequest,
  SignMessageResponse,
  SignTransactionRequest,
  SignTransactionResponse,
  UserApproval,
  UserDismissal,
} from '@aptos-connect/wallet-api';
import { WebWalletTransport } from '@aptos-connect/web-transport';
import {
  AccountAddress,
  AccountAddressInput,
  AnySignature,
  AptosConfig,
  Deserializer,
  Ed25519Signature,
  FeePayerRawTransaction,
  generateRawTransaction,
  Hex,
} from '@aptos-labs/ts-sdk';
import { NetworkName } from '@identity-connect/api';
import { createEd25519KeyPair, encodeBase64 } from '@identity-connect/crypto';
import { SignAndSubmitTransactionRequestArgs } from '@identity-connect/wallet-api';
import { DEFAULT_FRONTEND_URL } from './constants';
import { normalizePayloadForIC } from './conversion';
import { ACPairingClient } from './PairingClient';

export interface WithSignerAddress {
  signerAddress: AccountAddress;
}

export interface ACDappClientConfig {
  backendBaseURL?: string;
  dappId?: string;
  dappImageURI?: string;
  dappName?: string;
  defaultNetworkName?: NetworkName;
  frontendBaseURL?: string;
  provider?: 'google' | 'apple';
  tgWebAppURL?: string;
}

export class ACDappClient {
  private readonly defaultNetworkName: NetworkName;
  readonly dappInfo: DappInfo;

  private readonly transport: WebWalletTransport;

  private readonly dappId?: string;
  private readonly pairingClient: ACPairingClient;

  constructor({
    backendBaseURL,
    dappId,
    dappImageURI,
    dappName,
    defaultNetworkName = NetworkName.MAINNET,
    frontendBaseURL = DEFAULT_FRONTEND_URL,
    provider = 'google',
    tgWebAppURL,
  }: ACDappClientConfig = {}) {
    this.defaultNetworkName = defaultNetworkName;

    this.dappInfo = {
      domain: window.location.origin,
      imageURI: dappImageURI,
      name: dappName ?? document.title,
    };

    this.transport = new WebWalletTransport(frontendBaseURL, provider, tgWebAppURL);

    this.dappId = dappId;
    this.pairingClient = new ACPairingClient({
      axiosConfig: {
        baseURL: backendBaseURL ?? frontendBaseURL,
      },
      defaultNetworkName,
    });
  }

  // region Public API

  private async getKeylessAccounts() {
    const serializedRequest = GetConnectedAccountsRequest.serialize(this.dappInfo);
    const serializedResponse = await this.transport.sendRequest(serializedRequest);
    const response = GetConnectedAccountsResponse.deserialize(serializedResponse);
    return response.args;
  }

  private async getIcAccounts() {
    return this.pairingClient.getConnectedAccounts() ?? [];
  }

  private async isIcAccount(address: AccountAddressInput) {
    const icAccounts = await this.getIcAccounts();
    return icAccounts.find((account) => account.address.equals(AccountAddress.from(address))) !== undefined;
  }

  async getConnectedAccounts() {
    const keylessAccounts = await this.getKeylessAccounts();
    const icAccounts = await this.getIcAccounts();
    return [...keylessAccounts, ...icAccounts];
  }

  async disconnect(address: AccountAddressInput) {
    if (await this.isIcAccount(address)) {
      const stringAddress = AccountAddress.from(address).toString();
      await this.pairingClient.disconnect(stringAddress);
    } else {
      const serializedRequest = DisconnectRequest.serialize(this.dappInfo);
      await this.transport.sendRequest(serializedRequest);
    }
  }

  async connect({
    claimOptions,
    preferredWalletName,
  }: Omit<ConnectRequest.Args, 'dappId' | 'dappEd25519PublicKeyB64'> = {}) {
    const dappKeypair = createEd25519KeyPair();
    const injectedPreferredWalletName =
      typeof window !== 'undefined' ? (window as any).AC_PREFERRED_WALLET_NAME : undefined;

    const requestArgs = {
      claimOptions,
      dappEd25519PublicKeyB64: encodeBase64(dappKeypair.publicKey.key),
      dappId: this.dappId,
      preferredWalletName: preferredWalletName ?? injectedPreferredWalletName,
    } satisfies ConnectRequest.Args;

    const serializedRequest = ConnectRequest.serialize(this.dappInfo, requestArgs);
    const serializedResponse = await this.transport.sendRequest(serializedRequest);
    const response = ConnectResponse.deserialize(serializedResponse);

    if (response.args.status === 'approved') {
      const { account, pairing } = response.args.args;
      if (pairing) {
        await this.pairingClient.addPairing(dappKeypair, pairing);
      }
      return makeUserApproval({ account });
    }
    return response.args;
  }

  async signIn(args: SignInRequest.Args): Promise<UserDismissal | UserApproval<SignInResponse.ApprovalArgs>> {
    const serializedRequest = SignInRequest.serialize(this.dappInfo, args);

    const serializedResponse = await this.transport.sendRequest(serializedRequest);

    const response = SignInResponse.deserialize(serializedResponse);

    return response.args;
  }

  async signMessage(args: SignMessageRequest.Args & WithSignerAddress) {
    const { signerAddress } = args;

    if (await this.isIcAccount(signerAddress)) {
      const { chainId } = args;
      const network = chainIdToNetwork(chainId) as string;

      let message: string;
      let nonce: string;
      try {
        message = new TextDecoder().decode(args.message);
        nonce = new TextDecoder().decode(args.nonce);
      } catch (err) {
        throw new Error('Only UTF-8 encoded text is supported when using IC');
      }

      const { fullMessage, signature: hexSignature } = await this.pairingClient.signMessage(
        signerAddress.toString(),
        {
          address: true,
          application: true,
          chainId: true,
          message,
          nonce,
        },
        { networkName: network as NetworkName },
      );

      const signatureBytes = Hex.fromHexInput(hexSignature).toUint8Array();
      const signature =
        signatureBytes.length === Ed25519Signature.LENGTH
          ? new Ed25519Signature(signatureBytes)
          : AnySignature.deserialize(new Deserializer(signatureBytes));
      return makeUserApproval<SignMessageResponse.ApprovalArgs>({
        fullMessage,
        signature,
      });
    }
    const serializedRequest = SignMessageRequest.serialize(this.dappInfo, args);
    const serializedResponse = await this.transport.sendRequest(serializedRequest);
    const response = SignMessageResponse.deserialize(serializedResponse);
    return response.args;
  }

  async signTransaction(
    args: (SignTransactionRequest.Args | SignTransactionRequest.ArgsWithTransaction) & WithSignerAddress,
  ): Promise<SignTransactionResponse.Args> {
    const normalizedArgs = 'transaction' in args ? SignTransactionRequest.normalizeArgs(args) : args;
    const { signerAddress } = args;

    if (await this.isIcAccount(signerAddress)) {
      const {
        expirationSecondsFromNow,
        expirationTimestamp,
        feePayer,
        gasUnitPrice,
        maxGasAmount,
        network,
        payload,
        secondarySigners,
        sender,
        sequenceNumber,
      } = normalizedArgs;

      if (feePayer !== undefined) {
        throw new Error('Sponsored transaction not currently supported');
      }

      if (secondarySigners && secondarySigners.length > 0) {
        throw new Error('Multi-agent transactions not currently supported');
      }

      if (!('bcsToBytes' in payload)) {
        throw new Error('Payload input format is only supported with Keyless accounts.');
      }

      const responseArgs = await this.pairingClient.signTransaction(
        signerAddress.toString(),
        {
          options: {
            expirationSecondsFromNow,
            expirationTimestamp,
            gasUnitPrice,
            maxGasAmount,
            sender: sender?.address.toString(),
            sequenceNumber: sequenceNumber !== undefined ? Number(sequenceNumber) : undefined,
          },
          payload,
        },
        {
          networkName: network as NetworkName | undefined,
        },
      );
      return makeUserApproval({
        authenticator: responseArgs.accountAuthenticator,
        rawTransaction: responseArgs.rawTxn,
      });
    }

    const serializedRequest = SignTransactionRequest.serialize(this.dappInfo, normalizedArgs);
    const serializedResponse = await this.transport.sendRequest(serializedRequest);
    const response = SignTransactionResponse.deserialize(serializedResponse);
    return response.args;
  }

  async signAndSubmitTransaction(args: SignAndSubmitTransactionRequest.Args & WithSignerAddress) {
    const { signerAddress } = args;
    if (await this.isIcAccount(signerAddress)) {
      const { expirationTimestamp, feePayer, gasUnitPrice, maxGasAmount, network } = args;
      const aptosConfig = new AptosConfig({ network });

      let convertedArgs: SignAndSubmitTransactionRequestArgs;
      if (feePayer !== undefined) {
        const payload = await normalizePayloadForIC(args.payload, aptosConfig);
        const rawTxn = await generateRawTransaction({
          aptosConfig,
          feePayerAddress: feePayer.address,
          options: {
            gasUnitPrice,
            maxGasAmount,
          },
          payload,
          sender: signerAddress,
        });
        convertedArgs = {
          feePayerAuthenticator: feePayer.authenticator,
          rawTxn: new FeePayerRawTransaction(rawTxn, [], feePayer.address),
        };
      } else {
        const payload = normalizePayloadForIC(args.payload);
        convertedArgs = {
          options: {
            expirationTimestamp,
            gasUnitPrice,
            maxGasAmount,
          },
          payload,
        };
      }

      const { hash } = await this.pairingClient.signAndSubmitTransaction(signerAddress.toString(), convertedArgs, {
        networkName: network as NetworkName | undefined,
      });
      return makeUserApproval<SignAndSubmitTransactionResponse.ApprovalArgs>({ txnHash: hash });
    }

    const serializedRequest = SignAndSubmitTransactionRequest.serialize(this.dappInfo, args);
    const serializedResponse = await this.transport.sendRequest(serializedRequest);
    const response = SignAndSubmitTransactionResponse.deserialize(serializedResponse);
    return response.args;
  }

  // endregion
}
