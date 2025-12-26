// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable no-inner-declarations */

import { AccountAuthenticator, Deserializer, RawTransaction, Serializer } from '@aptos-labs/ts-sdk';
import { makeUserResponseDeserializeFn, makeUserResponseSerializeFn, UserResponse } from '../../UserResponse';
import {
  deserializeWalletResponse,
  SerializedWalletResponse,
  serializeWalletResponse,
  WalletResponseWithArgs,
} from '../../WalletResponse';

export interface SignTransactionResponse extends WalletResponseWithArgs<SignTransactionResponse.Args> {}

export namespace SignTransactionResponse {
  // region ApprovalArgs

  export interface ApprovalArgs {
    authenticator: AccountAuthenticator;
    rawTransaction?: RawTransaction;
  }

  function serializeApprovalArgs(serializer: Serializer, value: ApprovalArgs) {
    serializer.serialize(value.authenticator);
    serializer.serializeBool(value.rawTransaction !== undefined);
    if (value.rawTransaction !== undefined) {
      serializer.serialize(value.rawTransaction);
    }
  }

  function deserializeApprovalArgs(deserializer: Deserializer): ApprovalArgs {
    const authenticator = deserializer.deserialize(AccountAuthenticator);
    const hasRawTransaction = deserializer.deserializeBool();
    const rawTransaction = hasRawTransaction ? deserializer.deserialize(RawTransaction) : undefined;

    return {
      authenticator,
      rawTransaction,
    };
  }

  // endregion

  // region ResponseArgs

  export type Args = UserResponse<ApprovalArgs>;

  const serializeArgs = makeUserResponseSerializeFn(serializeApprovalArgs);
  const deserializeArgs = makeUserResponseDeserializeFn(deserializeApprovalArgs);

  // endregion

  type _Response = SignTransactionResponse;

  export function serialize(args: Args): SerializedWalletResponse {
    return serializeWalletResponse(args, serializeArgs);
  }

  export function deserialize(serializedResponse: SerializedWalletResponse): _Response {
    return deserializeWalletResponse(serializedResponse, deserializeArgs);
  }
}
