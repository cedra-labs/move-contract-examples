// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import { Deserializer, Serializer } from '@aptos-labs/ts-sdk';

export interface DappInfo {
  domain: string;
  imageURI?: string;
  name: string;
}

export function serializeDappInfo(serializer: Serializer, value: DappInfo) {
  serializer.serializeStr(value.domain);
  serializer.serializeStr(value.name);
  serializer.serializeBool(value.imageURI !== undefined);
  if (value.imageURI !== undefined) {
    serializer.serializeStr(value.imageURI);
  }
}

export function deserializeDappInfo(deserializer: Deserializer): DappInfo {
  const domain = deserializer.deserializeStr();
  const name = deserializer.deserializeStr();
  const hasImageUri = deserializer.deserializeBool();
  const imageURI = hasImageUri ? deserializer.deserializeStr() : undefined;
  return { domain, imageURI, name };
}
