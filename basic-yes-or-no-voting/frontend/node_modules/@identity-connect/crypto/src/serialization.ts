// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import {
  base64ToBytes,
  bytesToBase64,
  deserializePublicKey,
  deserializeSignature,
  serializePublicKey,
  serializeSignature,
} from '@aptos-connect/wallet-api';
import {
  AccountPublicKey,
  Deserializer,
  Ed25519PublicKey as AptosEd25519PublicKey,
  Ed25519Signature,
  Hex,
  PublicKey,
  Serializer,
  Signature,
} from '@aptos-labs/ts-sdk';
import { decodeBase64 } from './utils';

export function serializePublicKeyB64(publicKey: PublicKey) {
  const serializer = new Serializer();
  serializePublicKey(serializer, publicKey);
  return bytesToBase64(serializer.toUint8Array());
}

export function deserializePublicKeyB64(publicKeyB64: string) {
  const serializedPublicKey = base64ToBytes(publicKeyB64);
  const deserializer = new Deserializer(serializedPublicKey);
  return deserializePublicKey(deserializer) as AccountPublicKey;
}

export function deserializeEd25519PublicKeyB64(ed25519PublicKeyB64: string) {
  return new AptosEd25519PublicKey(decodeBase64(ed25519PublicKeyB64));
}

export function serializeSignatureB64(signature: Signature) {
  const serializer = new Serializer();
  serializeSignature(serializer, signature);
  return bytesToBase64(serializer.toUint8Array());
}

export function deserializeSignatureB64(signatureB64: string) {
  const serializedSignature = base64ToBytes(signatureB64);
  const deserializer = new Deserializer(serializedSignature);
  return deserializeSignature(deserializer);
}

export function deserializeEd25519SignatureB64(ed25519SignatureB64: string) {
  const signatureBytes = Hex.fromHexInput(ed25519SignatureB64).toUint8Array();
  return new Ed25519Signature(signatureBytes);
}

export function publicKeyB64FromEd25519PublicKeyB64(ed25519PublicKeyB64: string) {
  const publicKey = deserializeEd25519PublicKeyB64(ed25519PublicKeyB64);
  return serializePublicKeyB64(publicKey);
}
