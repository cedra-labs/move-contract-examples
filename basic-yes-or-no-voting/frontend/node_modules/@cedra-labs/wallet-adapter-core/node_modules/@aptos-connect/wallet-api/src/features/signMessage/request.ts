// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable no-inner-declarations */

import { AccountAddress, Deserializer, Serializer } from '@aptos-labs/ts-sdk';
import { DappInfo } from '../../shared';
import {
  deserializeWalletRequestWithArgs,
  SerializedWalletRequest,
  serializeWalletRequestWithArgs,
  WalletRequest,
} from '../../WalletRequest';

export interface SignMessageRequest
  extends WalletRequest<SignMessageRequest.RequestName, SignMessageRequest.SupportedVersions> {
  args: SignMessageRequest.Args;
}

export namespace SignMessageRequest {
  export const name = 'signMessage' as const;
  export type RequestName = typeof name;

  export const supportedVersions = [1, 2] as const;
  export type SupportedVersions = (typeof supportedVersions)[number];
  export const currentVersion = 2 as const;
  export type CurrentVersion = typeof currentVersion;

  // region Args

  export interface Args {
    chainId: number;
    message: Uint8Array;
    nonce: Uint8Array;
    signerAddress?: AccountAddress;
  }

  function serializeArgs(serializer: Serializer, value: Args) {
    serializer.serializeBool(value.signerAddress !== undefined);
    if (value.signerAddress !== undefined) {
      serializer.serialize(value.signerAddress);
    }
    serializer.serializeU8(value.chainId);
    serializer.serializeBytes(value.nonce);
    serializer.serializeBytes(value.message);
  }

  function deserializeArgs(deserializer: Deserializer, version: SupportedVersions): Args {
    const hasSignerAddress = version >= 2 && deserializer.deserializeBool();
    const signerAddress = hasSignerAddress ? deserializer.deserialize(AccountAddress) : undefined;
    const chainId = deserializer.deserializeU8();
    const nonce = deserializer.deserializeBytes();
    const message = deserializer.deserializeBytes();
    return { chainId, message, nonce, signerAddress };
  }

  // endregion

  // region Request

  export function serialize(dappInfo: DappInfo, args: Args): SerializedWalletRequest<RequestName, CurrentVersion> {
    const request = { args, dappInfo, name, version: currentVersion };
    return serializeWalletRequestWithArgs(request, serializeArgs);
  }

  export function deserialize(
    serializedRequest: SerializedWalletRequest<RequestName, SupportedVersions>,
  ): SignMessageRequest {
    return deserializeWalletRequestWithArgs(serializedRequest, (d) => deserializeArgs(d, serializedRequest.version));
  }

  export function isSerialized(
    request: SerializedWalletRequest,
  ): request is SerializedWalletRequest<RequestName, SupportedVersions> {
    return request.name === name && request.version === currentVersion;
  }

  // endregion
}
