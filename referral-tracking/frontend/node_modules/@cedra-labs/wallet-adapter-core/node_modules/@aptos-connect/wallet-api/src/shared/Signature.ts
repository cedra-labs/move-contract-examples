// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import {
  AnySignature,
  Deserializer,
  Ed25519Signature,
  MultiEd25519Signature,
  // This type got renamed in the zeta branch, commenting out until it's synced with main
  // MultiSignature,
  Serializer,
  Signature,
  SigningScheme,
} from '@aptos-labs/ts-sdk';

export function serializeSignature(serializer: Serializer, value: Signature) {
  if (value instanceof Ed25519Signature) {
    serializer.serializeU32AsUleb128(SigningScheme.Ed25519);
  } else if (value instanceof MultiEd25519Signature) {
    serializer.serializeU32AsUleb128(SigningScheme.MultiEd25519);
  } else if (value instanceof AnySignature) {
    serializer.serializeU32AsUleb128(SigningScheme.SingleKey);
    // } else if (value instanceof MultiSignature) {
    //   serializer.serializeU32AsUleb128(SigningScheme.MultiKey);
  } else {
    throw new Error('Unexpected signature type');
  }
  serializer.serialize(value);
}

export function deserializeSignature(deserializer: Deserializer) {
  const signingScheme = deserializer.deserializeUleb128AsU32();
  switch (signingScheme) {
    case SigningScheme.Ed25519:
      return deserializer.deserialize(Ed25519Signature);
    case SigningScheme.MultiEd25519:
      return deserializer.deserialize(MultiEd25519Signature);
    case SigningScheme.SingleKey:
      return deserializer.deserialize(AnySignature);
    // case SigningScheme.MultiKey:
    //   return deserializer.deserialize(MultiSignature);
    default:
      throw new Error(`Unknown signing scheme: ${signingScheme}`);
  }
}
