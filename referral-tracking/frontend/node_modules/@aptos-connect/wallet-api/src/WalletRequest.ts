// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import { Deserializer, Serializer } from '@aptos-labs/ts-sdk';
import { DappInfo, deserializeDappInfo, serializeDappInfo } from './shared';
import { DeserializeFn, SerializeFn } from './helpers';

export interface WalletRequest<RequestName extends string, Version extends number> {
  dappInfo: DappInfo;
  name: RequestName;
  version: Version;
}

export interface WalletRequestWithArgs<RequestName extends string, Version extends number, TArgs>
  extends WalletRequest<RequestName, Version> {
  args: TArgs;
}

export interface SerializedWalletRequest<RequestName extends string = string, Version extends number = number> {
  data: Uint8Array;
  name: RequestName;
  version: Version;
}

export function serializeWalletRequest<RequestName extends string, Version extends number>({
  dappInfo,
  name,
  version,
}: WalletRequest<RequestName, Version>): SerializedWalletRequest<RequestName, Version> {
  const serializer = new Serializer();
  serializeDappInfo(serializer, dappInfo);
  const data = serializer.toUint8Array();
  return { data, name, version };
}

export function deserializeWalletRequest<RequestName extends string, Version extends number>({
  data,
  name,
  version,
}: SerializedWalletRequest<RequestName, Version>): WalletRequest<RequestName, Version> {
  const deserializer = new Deserializer(data);
  const dappInfo = deserializeDappInfo(deserializer);
  return { dappInfo, name, version };
}

export function serializeWalletRequestWithArgs<RequestName extends string, Version extends number, TArgs>(
  { args, dappInfo, name, version }: WalletRequestWithArgs<RequestName, Version, TArgs>,
  serializeArgsFn: SerializeFn<TArgs>,
): SerializedWalletRequest<RequestName, Version> {
  const serializer = new Serializer();
  serializeDappInfo(serializer, dappInfo);
  serializeArgsFn(serializer, args);
  const data = serializer.toUint8Array();
  return { data, name, version };
}

export function deserializeWalletRequestWithArgs<RequestName extends string, Version extends number, TArgs>(
  { data, name, version }: SerializedWalletRequest<RequestName, Version>,
  deserializeArgsFn: DeserializeFn<TArgs>,
): WalletRequestWithArgs<RequestName, Version, TArgs> {
  const deserializer = new Deserializer(data);
  const dappInfo = deserializeDappInfo(deserializer);
  const args = deserializeArgsFn(deserializer);
  return { args, dappInfo, name, version };
}
