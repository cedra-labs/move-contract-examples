// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import { AccountAddress, AccountAuthenticator, Deserializer, Serializer } from '@aptos-labs/ts-sdk';

export interface AccountAuthenticatorInput {
  address: AccountAddress;
  authenticator: AccountAuthenticator;
}

export function serializeAccountAuthenticatorInput(serializer: Serializer, value: AccountAuthenticatorInput) {
  serializer.serialize(value.address);
  serializer.serialize(value.authenticator);
}

export function deserializeAccountAuthenticatorInput(deserializer: Deserializer): AccountAuthenticatorInput {
  const address = deserializer.deserialize(AccountAddress);
  const authenticator = deserializer.deserialize(AccountAuthenticator);
  return { address, authenticator };
}
