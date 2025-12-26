// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import { Deserializer, Serializer } from '@aptos-labs/ts-sdk';
import { AptosSignInInput } from '@aptos-labs/wallet-standard';

export function serializeAptosSignInInput(serializer: Serializer, value: AptosSignInInput) {
  serializer.serializeStr(JSON.stringify(value));
}

export function deserializeAptosSignInInput(deserializer: Deserializer): AptosSignInInput {
  return JSON.parse(deserializer.deserializeStr());
}
