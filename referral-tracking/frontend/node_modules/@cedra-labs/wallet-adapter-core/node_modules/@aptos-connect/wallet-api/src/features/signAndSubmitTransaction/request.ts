// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import {
  AccountAddress,
  Deserializer,
  InputGenerateTransactionPayloadData,
  Network,
  Serializer,
  TransactionPayload,
} from '@aptos-labs/ts-sdk';
import { isSupportedNetwork } from '../../helpers';
import {
  AccountAuthenticatorInput,
  DappInfo,
  deserializeAccountAuthenticatorInput,
  deserializeTransactionPayloadInput,
  serializeAccountAuthenticatorInput,
  serializeTransactionPayloadInput,
} from '../../shared';
import {
  deserializeWalletRequestWithArgs,
  SerializedWalletRequest,
  serializeWalletRequestWithArgs,
  WalletRequest,
} from '../../WalletRequest';

export interface SignAndSubmitTransactionRequest
  extends WalletRequest<
    SignAndSubmitTransactionRequest.RequestName,
    SignAndSubmitTransactionRequest.SupportedVersions
  > {
  args: SignAndSubmitTransactionRequest.Args;
}

export namespace SignAndSubmitTransactionRequest {
  export const name = 'signAndSubmitTransaction' as const;
  export type RequestName = typeof name;

  export const supportedVersions = [1, 2, 3] as const;
  export type SupportedVersions = (typeof supportedVersions)[number];
  export const currentVersion = 3 as const;
  export type CurrentVersion = typeof currentVersion;

  // region Args

  export interface Args {
    expirationTimestamp?: number;
    feePayer?: AccountAuthenticatorInput;
    gasUnitPrice?: number;
    maxGasAmount?: number;
    network?: Network;
    payload: TransactionPayload | InputGenerateTransactionPayloadData;
    signerAddress?: AccountAddress;
  }

  export function serializeArgs(serializer: Serializer, value: Args) {
    if (value.network !== undefined && !isSupportedNetwork(value.network)) {
      throw new Error(`Unsupported network '${value.network}'`);
    }

    serializer.serializeBool(value.signerAddress !== undefined);
    if (value.signerAddress !== undefined) {
      serializer.serialize(value.signerAddress);
    }

    serializer.serializeOptionStr(value.network);

    if ('bcsToBytes' in value.payload) {
      serializer.serializeBool(true);
      serializer.serialize(value.payload);
    } else {
      serializer.serializeBool(false);
      serializeTransactionPayloadInput(serializer, value.payload);
    }

    serializer.serializeU64(value.expirationTimestamp ?? 0);
    serializer.serializeU32AsUleb128(value.gasUnitPrice ?? 0);
    serializer.serializeU32AsUleb128(value.maxGasAmount ?? 0);
    serializer.serializeU32AsUleb128(value.feePayer ? 1 : 0);
    if (value.feePayer) {
      serializeAccountAuthenticatorInput(serializer, value.feePayer);
    }
  }

  export function deserializeArgs(deserializer: Deserializer, version: SupportedVersions): Args {
    const hasSignerAddress = version >= 3 && deserializer.deserializeBool();
    const signerAddress = hasSignerAddress ? deserializer.deserialize(AccountAddress) : undefined;

    const network = version === 1 ? deserializer.deserializeStr() : deserializer.deserializeOption('string');
    if (network !== undefined && !isSupportedNetwork(network)) {
      throw new Error(`Unsupported network '${network}'`);
    }

    const isPayloadBcsSerializable = version === 1 || deserializer.deserializeBool();
    const payload = isPayloadBcsSerializable
      ? deserializer.deserialize(TransactionPayload)
      : deserializeTransactionPayloadInput(deserializer);
    const expirationTimestamp = Number(deserializer.deserializeU64());
    const gasUnitPrice = deserializer.deserializeUleb128AsU32();
    const maxGasAmount = deserializer.deserializeUleb128AsU32();
    const hasFeePayer = deserializer.deserializeUleb128AsU32();
    const feePayer = hasFeePayer ? deserializeAccountAuthenticatorInput(deserializer) : undefined;

    return {
      expirationTimestamp: expirationTimestamp > 0 ? expirationTimestamp : undefined,
      feePayer,
      gasUnitPrice: gasUnitPrice > 0 ? gasUnitPrice : undefined,
      maxGasAmount: maxGasAmount > 0 ? maxGasAmount : undefined,
      network,
      payload,
      signerAddress,
    };
  }

  // endregion

  // region Request

  export function serialize(dappInfo: DappInfo, args: Args): SerializedWalletRequest<RequestName, CurrentVersion> {
    const request = { args, dappInfo, name, version: currentVersion };
    return serializeWalletRequestWithArgs(request, serializeArgs);
  }

  export function deserialize(
    serializedRequest: SerializedWalletRequest<RequestName, SupportedVersions>,
  ): SignAndSubmitTransactionRequest {
    return deserializeWalletRequestWithArgs(serializedRequest, (deserializer) =>
      deserializeArgs(deserializer, serializedRequest.version),
    );
  }

  export function isSerialized(
    request: SerializedWalletRequest,
  ): request is SerializedWalletRequest<RequestName, SupportedVersions> {
    return request.name === name && supportedVersions.includes(request.version as SupportedVersions);
  }

  // endregion
}
