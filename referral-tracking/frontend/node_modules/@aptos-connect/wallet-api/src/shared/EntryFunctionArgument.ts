// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import {
  AccountAddress,
  Deserializer,
  EntryFunctionArgumentTypes,
  FixedBytes,
  Serializer,
  SimpleEntryFunctionArgumentTypes,
} from '@aptos-labs/ts-sdk';

export type EntryFunctionArgument = EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes;

/* eslint-disable @typescript-eslint/no-shadow */
export enum EntryFunctionArgumentVariant {
  Undefined,
  Array,
  String,
  Uint8Array,
  AccountAddress,
  FixedBytes,
}

/* eslint-enable @typescript-eslint/no-shadow */

export function serializeEntryFunctionArgument(serializer: Serializer, argument: EntryFunctionArgument) {
  // undefined | null -> undefined
  if (argument === undefined || argument === null) {
    serializer.serializeU32AsUleb128(EntryFunctionArgumentVariant.Undefined);
    return;
  }

  // Array -> Array
  if (Array.isArray(argument)) {
    serializer.serializeU32AsUleb128(EntryFunctionArgumentVariant.Array);
    serializer.serializeU32AsUleb128(argument.length);
    for (const subArgument of argument) {
      serializeEntryFunctionArgument(serializer, subArgument);
    }
    return;
  }

  // boolean | number | bigint | string -> string
  if (
    typeof argument === 'string' ||
    typeof argument === 'number' ||
    typeof argument === 'boolean' ||
    typeof argument === 'bigint'
  ) {
    serializer.serializeU32AsUleb128(EntryFunctionArgumentVariant.String);
    serializer.serializeStr(argument.toString());
    return;
  }

  // Uint8Array -> Uint8Array
  if (argument instanceof Uint8Array) {
    serializer.serializeU32AsUleb128(EntryFunctionArgumentVariant.Uint8Array);
    serializer.serializeBytes(argument);
    return;
  }

  // ArrayBuffer -> Uint8Array
  if (argument instanceof ArrayBuffer) {
    serializer.serializeU32AsUleb128(EntryFunctionArgumentVariant.Uint8Array);
    serializer.serializeBytes(new Uint8Array(argument));
    return;
  }

  // MoveVector -> Array
  if ('values' in argument) {
    serializer.serializeU32AsUleb128(EntryFunctionArgumentVariant.Array);
    serializer.serializeU32AsUleb128(argument.values.length);
    for (const subArgument of argument.values) {
      serializeEntryFunctionArgument(serializer, subArgument);
    }
    return;
  }

  // AccountAddress -> AccountAddress
  if ('data' in argument) {
    serializer.serializeU32AsUleb128(EntryFunctionArgumentVariant.AccountAddress);
    serializer.serialize(argument);
    return;
  }

  // Empty MoveOption -> undefined
  if (argument.value === undefined) {
    serializer.serializeU32AsUleb128(EntryFunctionArgumentVariant.Undefined);
    serializer.serialize(argument);
    return;
  }

  // FixedBytes -> FixedBytes
  if (argument.value instanceof Uint8Array) {
    serializer.serializeU32AsUleb128(EntryFunctionArgumentVariant.FixedBytes);
    serializer.serializeBytes(argument.value);
    return;
  }

  // Bool | U8 | U16 | U32 | U64 | U128 | U256 | MoveString -> string
  serializer.serializeU32AsUleb128(EntryFunctionArgumentVariant.String);
  serializer.serializeStr(argument.value.toString());
}

export function deserializeEntryFunctionArgument(deserializer: Deserializer): EntryFunctionArgument {
  const variant = deserializer.deserializeUleb128AsU32() as EntryFunctionArgumentVariant;

  switch (variant) {
    // undefined | null | empty MoveOption
    case EntryFunctionArgumentVariant.Undefined: {
      return undefined;
    }
    // Array | MoveVector
    case EntryFunctionArgumentVariant.Array: {
      const length = deserializer.deserializeUleb128AsU32();
      const args: (EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes)[] = [];
      for (let i = 0; i < length; i += 1) {
        const argument = deserializeEntryFunctionArgument(deserializer);
        args.push(argument);
      }
      return args;
    }
    // Uint8Array | ArrayBuffer | FixedBytes
    case EntryFunctionArgumentVariant.Uint8Array: {
      return deserializer.deserializeBytes();
    }
    // AccountAddress
    case EntryFunctionArgumentVariant.AccountAddress: {
      return deserializer.deserialize(AccountAddress);
    }
    // Bool | U8 | U16 | U32 | U64 | U128 | U256 | MoveString
    case EntryFunctionArgumentVariant.String: {
      return deserializer.deserializeStr();
    }
    // FixedBytes (custom serialization)
    case EntryFunctionArgumentVariant.FixedBytes: {
      const bytes = deserializer.deserializeBytes();
      return new FixedBytes(bytes);
    }
    default: {
      throw new Error('Unexpected variant');
    }
  }
}
