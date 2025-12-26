// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import { Ed25519PrivateKey } from '@aptos-labs/ts-sdk';

const identityKeyStorageKey = '@aptos-connect/client-identity-key';

export function getClientIdentityKey() {
  const serialized = window.localStorage.getItem(identityKeyStorageKey);
  if (serialized) {
    return new Ed25519PrivateKey(serialized);
  }
  const identityKey = Ed25519PrivateKey.generate();
  window.localStorage.setItem(identityKeyStorageKey, identityKey.toString());
  return identityKey;
}
