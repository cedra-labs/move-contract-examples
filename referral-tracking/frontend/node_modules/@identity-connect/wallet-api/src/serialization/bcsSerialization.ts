// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import { Deserializer, Hex, Serializable as BcsSerializableV2 } from '@aptos-labs/ts-sdk';
import { BCS } from 'aptos';

export type BcsSerializableV1 = { serialize(serializer: BCS.Serializer): void };
export type BcsDeserializableV1Class<T extends BcsSerializableV1> = {
  deserialize(deserializer: BCS.Deserializer): T;
};
export type BcsDeserializableV2Class<T extends BcsSerializableV2> = {
  deserialize(deserializer: Deserializer): T;
};

function isBcsSerializableV1(value: any): value is BcsSerializableV1 {
  return (value as BcsSerializableV1)?.serialize !== undefined;
}

function isBcsSerializableV2(value: any): value is BcsSerializableV2 {
  return (
    (value as BcsSerializableV2)?.serialize !== undefined &&
    (value as BcsSerializableV2)?.bcsToBytes !== undefined &&
    (value as BcsSerializableV2)?.bcsToHex !== undefined
  );
}

/**
 * Check if a value is BCS serializable
 */
export function isBcsSerializable(value: any): value is BcsSerializableV1 | BcsSerializableV2 {
  return isBcsSerializableV1(value) || isBcsSerializableV2(value);
}

export function bcsSerialize(serializable: BcsSerializableV1 | BcsSerializableV2) {
  if (isBcsSerializableV2(serializable)) {
    return serializable.bcsToHex().toString();
  }
  const serializedValueBytes = BCS.bcsToBytes(serializable);
  return Hex.fromHexInput(serializedValueBytes).toString();
}

export function bcsDeserialize<T extends BcsSerializableV2>(
  deserializableClass: BcsDeserializableV2Class<T>,
  serializedValue: string,
) {
  const serializedValueBytes = Hex.fromHexString(serializedValue).toUint8Array();
  const deserializer = new Deserializer(serializedValueBytes);
  return deserializableClass.deserialize(deserializer);
}
