// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable no-inner-declarations */

import { Deserializer, Serializer } from '@aptos-labs/ts-sdk';
import { FinalizedPairingData, SerializedDate } from '@identity-connect/api';
import { type AccountInfo, deserializeAccountInfo, serializeAccountInfo } from '../../shared';
import { makeUserResponseDeserializeFn, makeUserResponseSerializeFn, UserResponse } from '../../UserResponse';
import {
  deserializeWalletResponse,
  SerializedWalletResponse,
  serializeWalletResponse,
  WalletResponseWithArgs,
} from '../../WalletResponse';

export interface ConnectResponse extends WalletResponseWithArgs<ConnectResponse.Args> {}

export namespace ConnectResponse {
  export const supportedVersions = [1, 2] as const;
  export type SupportedVersions = (typeof supportedVersions)[number];
  export const currentVersion = 2 as const;

  // region ApprovalArgs

  export interface ApprovalArgs {
    account: AccountInfo;
    pairing?: SerializedDate<FinalizedPairingData>;
  }

  function serializeApprovalArgsV1(serializer: Serializer, value: ApprovalArgs) {
    serializeAccountInfo(serializer, value.account);
  }

  function serializeApprovalArgs(serializer: Serializer, value: ApprovalArgs) {
    serializeAccountInfo(serializer, value.account);
    serializer.serializeOptionStr(value.pairing !== undefined ? JSON.stringify(value.pairing) : undefined);
  }

  function deserializeApprovalArgs(deserializer: Deserializer): ApprovalArgs {
    const account = deserializeAccountInfo(deserializer);
    const serializedPairing = deserializer.deserializeOption('string');
    const pairing = serializedPairing !== undefined ? JSON.parse(serializedPairing) : undefined;
    return { account, pairing };
  }

  // endregion

  // region ResponseArgs

  export type Args = UserResponse<ApprovalArgs>;

  const serializeArgsV1 = makeUserResponseSerializeFn(serializeApprovalArgsV1);
  const serializeArgs = makeUserResponseSerializeFn(serializeApprovalArgs);
  const deserializeArgs = makeUserResponseDeserializeFn(deserializeApprovalArgs);

  // endregion

  type _Response = ConnectResponse;

  export function serialize(args: Args, version: SupportedVersions = currentVersion): SerializedWalletResponse {
    return serializeWalletResponse(args, version === 1 ? serializeArgsV1 : serializeArgs);
  }

  export function deserialize(serializedResponse: SerializedWalletResponse): _Response {
    return deserializeWalletResponse(serializedResponse, deserializeArgs);
  }
}
