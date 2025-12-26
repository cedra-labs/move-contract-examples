// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable no-inner-declarations */

import { Deserializer, Serializer } from '@aptos-labs/ts-sdk';
import { makeUserResponseDeserializeFn, makeUserResponseSerializeFn, UserResponse } from '../../UserResponse';
import {
  deserializeWalletResponse,
  SerializedWalletResponse,
  serializeWalletResponse,
  WalletResponseWithArgs,
} from '../../WalletResponse';

export interface SignAndSubmitTransactionResponse
  extends WalletResponseWithArgs<SignAndSubmitTransactionResponse.Args> {}

export namespace SignAndSubmitTransactionResponse {
  // region ApprovalArgs

  export interface ApprovalArgs {
    txnHash: string;
  }

  function serializeApprovalArgs(serializer: Serializer, value: ApprovalArgs) {
    serializer.serializeStr(value.txnHash);
  }

  function deserializeApprovalArgs(deserializer: Deserializer): ApprovalArgs {
    const txnHash = deserializer.deserializeStr();
    return { txnHash };
  }

  // endregion

  // region ResponseArgs

  export type Args = UserResponse<ApprovalArgs>;

  const serializeArgs = makeUserResponseSerializeFn(serializeApprovalArgs);
  const deserializeArgs = makeUserResponseDeserializeFn(deserializeApprovalArgs);

  // endregion

  type _Response = SignAndSubmitTransactionResponse;

  export function serialize(args: Args): SerializedWalletResponse {
    return serializeWalletResponse(args, serializeArgs);
  }

  export function deserialize(serializedResponse: SerializedWalletResponse): _Response {
    return deserializeWalletResponse(serializedResponse, deserializeArgs);
  }
}
