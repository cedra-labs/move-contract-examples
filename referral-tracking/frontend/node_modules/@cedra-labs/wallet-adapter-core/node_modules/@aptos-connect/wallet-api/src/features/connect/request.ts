// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import { Deserializer, Ed25519PrivateKey, Network, Serializer } from '@aptos-labs/ts-sdk';
import { DappInfo } from '../../shared';
import {
  deserializeWalletRequestWithArgs,
  SerializedWalletRequest,
  serializeWalletRequestWithArgs,
  WalletRequest,
} from '../../WalletRequest';
import { isSupportedNetwork } from '../../helpers';

export interface ClaimOptions {
  asset?: string;
  network: Network;
  secretKey: Ed25519PrivateKey;
}

export interface ConnectRequest extends WalletRequest<ConnectRequest.RequestName, ConnectRequest.SupportedVersions> {
  args: ConnectRequest.Args;
}

export namespace ConnectRequest {
  export const name = 'connect' as const;
  export type RequestName = typeof name;

  export const supportedVersions = [1, 2, 3, 4] as const;
  export type SupportedVersions = (typeof supportedVersions)[number];
  export const currentVersion = 4 as const;
  export type CurrentVersion = typeof currentVersion;

  // region Args

  export type Args = {
    claimOptions?: ClaimOptions;
    dappEd25519PublicKeyB64?: string;
    dappId?: string;
    // Whether to display paired accounts under the specified wallet first
    preferredWalletName?: string;
  };

  export function serializeArgs(serializer: Serializer, value: Args) {
    serializer.serializeOptionStr(value.dappId);
    serializer.serializeOptionStr(value.dappEd25519PublicKeyB64);
    serializer.serializeOptionStr(value.preferredWalletName);

    serializer.serializeBool(value.claimOptions !== undefined);
    if (value.claimOptions) {
      serializer.serialize(value.claimOptions.secretKey);
      serializer.serializeStr(value.claimOptions.network);
      serializer.serializeOptionStr(value.claimOptions.asset);
      if (!isSupportedNetwork(value.claimOptions.network)) {
        throw new Error(`Unsupported network '${value.claimOptions.network}'`);
      }
    }
  }

  export function deserializeArgs(deserializer: Deserializer, version: SupportedVersions): Args {
    if (version === 1) {
      return {};
    }

    const dappId = deserializer.deserializeOption('string');
    const dappEd25519PublicKeyB64 = deserializer.deserializeOption('string');
    const preferredWalletName = version >= 3 ? deserializer.deserializeOption('string') : undefined;

    const hasClaimOptions = version >= 4 ? deserializer.deserializeBool() : false;
    let claimOptions: ClaimOptions | undefined;
    if (hasClaimOptions) {
      const secretKey = deserializer.deserialize(Ed25519PrivateKey);
      const network = deserializer.deserializeStr();
      const asset = deserializer.deserializeOption('string');

      if (!isSupportedNetwork(network)) {
        throw new Error(`Unsupported network '${network}'`);
      }

      claimOptions = { asset, network, secretKey };
    }

    return { claimOptions, dappEd25519PublicKeyB64, dappId, preferredWalletName };
  }

  // endregion

  export function serialize(
    dappInfo: DappInfo,
    args: ConnectRequest.Args = {},
  ): SerializedWalletRequest<RequestName, CurrentVersion> {
    return serializeWalletRequestWithArgs({ args, dappInfo, name, version: currentVersion }, serializeArgs);
  }

  export function deserialize(request: SerializedWalletRequest<RequestName, SupportedVersions>): ConnectRequest {
    return deserializeWalletRequestWithArgs(request, (d) => deserializeArgs(d, request.version));
  }

  export function isSerialized(
    request: SerializedWalletRequest,
  ): request is SerializedWalletRequest<RequestName, SupportedVersions> {
    return request.name === name && supportedVersions.includes(request.version as SupportedVersions);
  }
}
