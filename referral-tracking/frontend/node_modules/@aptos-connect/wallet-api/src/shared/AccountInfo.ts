// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import { AccountAddress, Deserializer, PublicKey, Serializer } from '@aptos-labs/ts-sdk';
import { deserializePublicKey, serializePublicKey } from './PublicKey';

export interface AccountInfo {
  address: AccountAddress;
  name?: string;
  publicKey: PublicKey;
}

export function serializeAccountInfo(serializer: Serializer, value: AccountInfo) {
  serializer.serialize(value.address);
  serializePublicKey(serializer, value.publicKey);
  serializer.serializeStr(value.name ?? '');
}

export function deserializeAccountInfo(deserializer: Deserializer): AccountInfo {
  const address = deserializer.deserialize(AccountAddress);
  const publicKey = deserializePublicKey(deserializer);
  const name = deserializer.deserializeStr();
  return {
    address,
    publicKey,
    ...(name.length > 0 ? { name } : undefined),
  };
}
