// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import { Deserializer, Serializer } from '@aptos-labs/ts-sdk';
import { DeserializeFn, SerializeFn } from './helpers';

export interface WalletResponseWithArgs<TResponseArgs> {
  args: TResponseArgs;
}

export interface SerializedWalletResponse {
  data: Uint8Array;
}

export function serializeWalletResponse<TArgs>(args: TArgs, serializeFn: SerializeFn<TArgs>): SerializedWalletResponse {
  const serializer = new Serializer();
  serializeFn(serializer, args);
  const data = serializer.toUint8Array();
  return { data };
}

export function deserializeWalletResponse<TArgs>(
  { data }: SerializedWalletResponse,
  deserializeFn: DeserializeFn<TArgs>,
): WalletResponseWithArgs<TArgs> {
  const deserializer = new Deserializer(data);
  const args = deserializeFn(deserializer);
  return { args };
}
