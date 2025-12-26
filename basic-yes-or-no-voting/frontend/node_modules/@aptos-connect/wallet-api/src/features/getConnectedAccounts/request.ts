// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import { DappInfo } from '../../shared';
import {
  deserializeWalletRequest,
  SerializedWalletRequest,
  serializeWalletRequest,
  WalletRequest,
} from '../../WalletRequest';

export interface GetConnectedAccountsRequest
  extends WalletRequest<GetConnectedAccountsRequest.RequestName, GetConnectedAccountsRequest.CurrentVersion> {}

export namespace GetConnectedAccountsRequest {
  export const name = 'getConnectedAccounts' as const;
  export type RequestName = typeof name;

  export const currentVersion = 1 as const;
  export type CurrentVersion = typeof currentVersion;

  export function serialize(dappInfo: DappInfo): SerializedWalletRequest<RequestName, CurrentVersion> {
    return serializeWalletRequest({ dappInfo, name, version: currentVersion });
  }

  export function deserialize(
    request: SerializedWalletRequest<RequestName, CurrentVersion>,
  ): GetConnectedAccountsRequest {
    return deserializeWalletRequest(request);
  }

  export function isSerialized(
    request: SerializedWalletRequest,
  ): request is SerializedWalletRequest<RequestName, CurrentVersion> {
    return request.name === name && request.version === currentVersion;
  }
}
