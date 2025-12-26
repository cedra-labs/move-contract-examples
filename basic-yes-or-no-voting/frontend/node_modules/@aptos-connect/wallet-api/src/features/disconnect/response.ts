// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable no-inner-declarations */

import {
  deserializeWalletResponse,
  SerializedWalletResponse,
  serializeWalletResponse,
  WalletResponseWithArgs,
} from '../../WalletResponse';

export interface DisconnectResponse extends WalletResponseWithArgs<DisconnectResponse.Args> {}

export namespace DisconnectResponse {
  export type Args = {};
  type _Response = DisconnectResponse;

  export function serialize(args: Args): SerializedWalletResponse {
    return serializeWalletResponse(args, () => {});
  }

  export function deserialize(serializedResponse: SerializedWalletResponse): _Response {
    return deserializeWalletResponse(serializedResponse, () => ({}));
  }
}
