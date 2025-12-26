// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable no-inner-declarations */

import { Deserializer, Serializer, Signature } from '@aptos-labs/ts-sdk';
import { deserializeSignature, serializeSignature } from '../../shared';
import { makeUserResponseDeserializeFn, makeUserResponseSerializeFn, UserResponse } from '../../UserResponse';
import {
  deserializeWalletResponse,
  SerializedWalletResponse,
  serializeWalletResponse,
  WalletResponseWithArgs,
} from '../../WalletResponse';

export interface SignMessageResponse extends WalletResponseWithArgs<SignMessageResponse.Args> {}

export namespace SignMessageResponse {
  // region ApprovalArgs

  export interface ApprovalArgs {
    // Should return message parts
    fullMessage: string;
    signature: Signature;
  }

  function serializeApprovalArgs(serializer: Serializer, value: ApprovalArgs) {
    serializer.serializeStr(value.fullMessage);
    serializeSignature(serializer, value.signature);
  }

  function deserializeApprovalArgs(deserializer: Deserializer): ApprovalArgs {
    const fullMessage = deserializer.deserializeStr();
    const signature = deserializeSignature(deserializer);
    return { fullMessage, signature };
  }

  // endregion

  // region ResponseArgs

  export type Args = UserResponse<ApprovalArgs>;

  const serializeArgs = makeUserResponseSerializeFn(serializeApprovalArgs);
  const deserializeArgs = makeUserResponseDeserializeFn(deserializeApprovalArgs);

  // endregion

  type _Response = SignMessageResponse;

  export function serialize(args: Args): SerializedWalletResponse {
    return serializeWalletResponse(args, serializeArgs);
  }

  export function deserialize(serializedResponse: SerializedWalletResponse): _Response {
    return deserializeWalletResponse(serializedResponse, deserializeArgs);
  }
}
