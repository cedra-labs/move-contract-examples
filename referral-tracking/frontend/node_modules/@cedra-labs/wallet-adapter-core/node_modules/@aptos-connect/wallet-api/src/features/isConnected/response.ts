// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable no-inner-declarations */

import { Deserializer, Serializer } from '@aptos-labs/ts-sdk';
import {
  deserializeWalletResponse,
  SerializedWalletResponse,
  serializeWalletResponse,
  WalletResponseWithArgs,
} from '../../WalletResponse';

export interface IsConnectedResponse extends WalletResponseWithArgs<IsConnectedResponse.Args> {}

export namespace IsConnectedResponse {
  // region Args

  export type Args = boolean;

  function serializeArgs(serializer: Serializer, value: Args) {
    serializer.serializeBool(value);
  }

  function deserializeArgs(deserializer: Deserializer): Args {
    return deserializer.deserializeBool();
  }

  // endregion

  type _Response = IsConnectedResponse;

  export function serialize(args: Args): SerializedWalletResponse {
    return serializeWalletResponse(args, serializeArgs);
  }

  export function deserialize(serializedResponse: SerializedWalletResponse): _Response {
    return deserializeWalletResponse(serializedResponse, deserializeArgs);
  }
}
