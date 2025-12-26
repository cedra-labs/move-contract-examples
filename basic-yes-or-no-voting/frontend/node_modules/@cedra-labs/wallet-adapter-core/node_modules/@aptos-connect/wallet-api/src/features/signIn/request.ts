// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import { Deserializer, Network, Serializer } from '@aptos-labs/ts-sdk';
import { AptosSignInInput } from '@aptos-labs/wallet-standard';
import { DappInfo } from '../../shared';
import {
  deserializeWalletRequestWithArgs,
  SerializedWalletRequest,
  serializeWalletRequestWithArgs,
  WalletRequest,
} from '../../WalletRequest';
import { deserializeAptosSignInInput, serializeAptosSignInInput } from '../../shared/AptosSignInInput';
import { isSupportedNetwork } from '../../helpers';

export interface SignInRequest extends WalletRequest<SignInRequest.RequestName, SignInRequest.SupportedVersions> {
  args: SignInRequest.Args;
}

export namespace SignInRequest {
  export const name = 'signIn' as const;
  export type RequestName = typeof name;

  export const supportedVersions = [1] as const;
  export type SupportedVersions = (typeof supportedVersions)[number];

  export const currentVersion = 1 as const;
  export type CurrentVersion = typeof currentVersion;

  // region Args

  export type Args = AptosSignInInput & {
    network: Network;
  };

  export function serializeArgs(serializer: Serializer, value: Args) {
    if (value.network !== undefined && !isSupportedNetwork(value.network)) {
      throw new Error(`Unsupported network '${value.network}' in SignInRequest.serializeArgs`);
    }

    serializeAptosSignInInput(serializer, value);
    serializer.serializeStr(value.network);
  }

  export function deserializeArgs(deserializer: Deserializer, _: SupportedVersions): Args {
    return { ...deserializeAptosSignInInput(deserializer), network: deserializer.deserializeStr() as Network };
  }

  // endregion

  export function serialize(
    dappInfo: DappInfo,
    args: SignInRequest.Args,
  ): SerializedWalletRequest<RequestName, CurrentVersion> {
    return serializeWalletRequestWithArgs({ args, dappInfo, name, version: currentVersion }, serializeArgs);
  }

  export function deserialize(request: SerializedWalletRequest<RequestName, SupportedVersions>): SignInRequest {
    return deserializeWalletRequestWithArgs(request, (d) => deserializeArgs(d, request.version));
  }

  export function isSerialized(
    request: SerializedWalletRequest,
  ): request is SerializedWalletRequest<RequestName, SupportedVersions> {
    return request.name === name && supportedVersions.includes(request.version as SupportedVersions);
  }
}
