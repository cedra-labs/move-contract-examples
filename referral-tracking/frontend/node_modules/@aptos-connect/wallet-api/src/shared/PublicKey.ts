// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import {
  AnyPublicKey,
  Deserializer,
  Ed25519PublicKey,
  MultiEd25519PublicKey,
  MultiKey,
  PublicKey,
  Serializer,
  SigningScheme,
} from '@aptos-labs/ts-sdk';

export function serializePublicKey(serializer: Serializer, value: PublicKey) {
  if (value instanceof Ed25519PublicKey) {
    serializer.serializeU32AsUleb128(SigningScheme.Ed25519);
  } else if (value instanceof MultiEd25519PublicKey) {
    serializer.serializeU32AsUleb128(SigningScheme.MultiEd25519);
  } else if (value instanceof AnyPublicKey) {
    serializer.serializeU32AsUleb128(SigningScheme.SingleKey);
  } else if (value instanceof MultiKey) {
    serializer.serializeU32AsUleb128(SigningScheme.MultiKey);
  } else {
    throw new Error('Unexpected public key type');
  }
  serializer.serialize(value);
}

export function deserializePublicKey(deserializer: Deserializer): PublicKey {
  const signingScheme = deserializer.deserializeUleb128AsU32();
  switch (signingScheme) {
    case SigningScheme.Ed25519:
      return deserializer.deserialize(Ed25519PublicKey);
    case SigningScheme.MultiEd25519:
      return deserializer.deserialize(MultiEd25519PublicKey);
    case SigningScheme.SingleKey:
      return deserializer.deserialize(AnyPublicKey);
    case SigningScheme.MultiKey:
      return deserializer.deserialize(MultiKey);
    default:
      throw new Error(`Unknown signing scheme: ${signingScheme}`);
  }
}
