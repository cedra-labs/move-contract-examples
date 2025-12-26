// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable no-inner-declarations */

import { Deserializer, Serializer } from '@aptos-labs/ts-sdk';
import { type AccountInfo, deserializeAccountInfo, serializeAccountInfo } from '../../shared';
import {
  deserializeWalletResponse,
  SerializedWalletResponse,
  serializeWalletResponse,
  WalletResponseWithArgs,
} from '../../WalletResponse';

export interface GetConnectedAccountsResponse extends WalletResponseWithArgs<GetConnectedAccountsResponse.Args> {}

export namespace GetConnectedAccountsResponse {
  // region Args

  export type Args = AccountInfo[];

  function serializeArgs(serializer: Serializer, args: Args) {
    serializer.serializeU32AsUleb128(args.length);
    for (const account of args) {
      serializeAccountInfo(serializer, account);
    }
  }

  function deserializeArgs(deserializer: Deserializer): Args {
    const length = deserializer.deserializeUleb128AsU32();

    const accounts: AccountInfo[] = [];
    for (let i = 0; i < length; i += 1) {
      accounts.push(deserializeAccountInfo(deserializer));
    }

    return accounts;
  }

  // endregion

  type _Response = GetConnectedAccountsResponse;

  export function serialize(args: Args): SerializedWalletResponse {
    return serializeWalletResponse(args, serializeArgs);
  }

  export function deserialize(serializedResponse: SerializedWalletResponse): _Response {
    return deserializeWalletResponse(serializedResponse, deserializeArgs);
  }
}
