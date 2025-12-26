// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import { AccountAddress, Deserializer, PublicKey, Serializer } from '@aptos-labs/ts-sdk';
import { deserializePublicKey, serializePublicKey } from './PublicKey';

export interface AccountInput {
  address: AccountAddress;
  publicKey?: PublicKey;
}

export function serializeAccountInput(serializer: Serializer, value: AccountInput) {
  serializer.serialize(value.address);
  serializer.serializeBool(value.publicKey !== undefined);
  if (value.publicKey) {
    serializePublicKey(serializer, value.publicKey);
  }
}

export function deserializeAccountInput(deserializer: Deserializer): AccountInput {
  const address = deserializer.deserialize(AccountAddress);
  const hasPublicKey = deserializer.deserializeBool();
  const publicKey = hasPublicKey ? deserializePublicKey(deserializer) : undefined;
  return { address, publicKey };
}
