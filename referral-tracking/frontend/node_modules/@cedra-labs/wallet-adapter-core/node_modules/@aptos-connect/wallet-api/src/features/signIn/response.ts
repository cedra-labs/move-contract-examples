// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable no-inner-declarations */

import { Deserializer, Serializer } from '@aptos-labs/ts-sdk';
import { AptosSignInOutput } from '@aptos-labs/wallet-standard';
import { makeUserResponseDeserializeFn, makeUserResponseSerializeFn, UserResponse } from '../../UserResponse';
import {
  deserializeWalletResponse,
  SerializedWalletResponse,
  serializeWalletResponse,
  WalletResponseWithArgs,
} from '../../WalletResponse';
import { deserializeAptosSignInOutput, serializeAptosSignInOutput } from '../../shared/AptosSignInOutput';

export interface SignInResponse extends WalletResponseWithArgs<SignInResponse.Args> {}

export namespace SignInResponse {
  export const supportedVersions = [1] as const;
  export type SupportedVersions = (typeof supportedVersions)[number];

  export const currentVersion = 1 as const;
  export type CurrentVersion = typeof currentVersion;

  // region ApprovalArgs

  export interface ApprovalArgs extends AptosSignInOutput {}

  function serializeApprovalArgs(serializer: Serializer, value: ApprovalArgs) {
    serializeAptosSignInOutput(serializer, value);
  }

  function deserializeApprovalArgs(deserializer: Deserializer): ApprovalArgs {
    return deserializeAptosSignInOutput(deserializer);
  }

  // endregion

  // region ResponseArgs

  export type Args = UserResponse<ApprovalArgs>;

  const serializeArgs = makeUserResponseSerializeFn(serializeApprovalArgs);

  const deserializeArgs = makeUserResponseDeserializeFn(deserializeApprovalArgs);

  // endregion

  type _Response = SignInResponse;

  export function serialize(args: Args, _: SupportedVersions = currentVersion): SerializedWalletResponse {
    return serializeWalletResponse(args, serializeArgs);
  }

  export function deserialize(serializedResponse: SerializedWalletResponse): _Response {
    return deserializeWalletResponse(serializedResponse, deserializeArgs);
  }
}
