// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import {
  AccountAddress,
  deserializeFromScriptArgument,
  Deserializer,
  Hex,
  InputGenerateTransactionPayloadData,
  MoveFunctionId,
  parseTypeTag,
  ScriptFunctionArgumentTypes,
  Serializer,
  TypeArgument,
  TypeTag,
} from '@aptos-labs/ts-sdk';
import {
  deserializeEntryFunctionArgument,
  EntryFunctionArgument,
  serializeEntryFunctionArgument,
} from './EntryFunctionArgument';

export enum TransactionPayloadInputVariant {
  EntryFunction,
  Script,
  Multisig,
}

// region Utils

function serializeTypeArguments(serializer: Serializer, typeArguments: TypeArgument[]) {
  serializer.serializeU32AsUleb128(typeArguments.length);
  for (const typeArgument of typeArguments) {
    const typeTag =
      typeof typeArgument === 'string' ? parseTypeTag(typeArgument, { allowGenerics: true }) : typeArgument;
    serializer.serialize(typeTag);
  }
}

function deserializeTypeArguments(deserializer: Deserializer) {
  const typeArguments: TypeTag[] = [];
  const typeArgumentsLength = deserializer.deserializeUleb128AsU32();
  for (let i = 0; i < typeArgumentsLength; i += 1) {
    const typeTag = deserializer.deserialize(TypeTag);
    typeArguments.push(typeTag);
  }
  return typeArguments;
}

function serializeEntryFunctionArguments(serializer: Serializer, functionArguments: EntryFunctionArgument[]) {
  serializer.serializeU32AsUleb128(functionArguments.length);
  for (const functionArgument of functionArguments) {
    serializeEntryFunctionArgument(serializer, functionArgument);
  }
}

function deserializeEntryFunctionArguments(deserializer: Deserializer) {
  const functionArgumentsLength = deserializer.deserializeUleb128AsU32();
  const functionArguments: EntryFunctionArgument[] = [];
  for (let i = 0; i < functionArgumentsLength; i += 1) {
    const functionArgument = deserializeEntryFunctionArgument(deserializer);
    functionArguments.push(functionArgument);
  }
  return functionArguments;
}

// endregion

export function serializeTransactionPayloadInput(serializer: Serializer, value: InputGenerateTransactionPayloadData) {
  if ('multisigAddress' in value) {
    serializer.serializeU32AsUleb128(TransactionPayloadInputVariant.Multisig);
    serializer.serializeStr(value.function);
    serializeEntryFunctionArguments(serializer, value.functionArguments);
    serializeTypeArguments(serializer, value.typeArguments ?? []);
    const multisigAddress = AccountAddress.from(value.multisigAddress);
    serializer.serialize(multisigAddress);
  } else if ('function' in value) {
    serializer.serializeU32AsUleb128(TransactionPayloadInputVariant.EntryFunction);
    serializer.serializeStr(value.function);
    serializeEntryFunctionArguments(serializer, value.functionArguments);
    serializeTypeArguments(serializer, value.typeArguments ?? []);
    // TODO: possibly serialize ABI?
  } else {
    serializer.serializeU32AsUleb128(TransactionPayloadInputVariant.Script);
    const bytecode = Hex.fromHexInput(value.bytecode);
    serializer.serializeBytes(bytecode.toUint8Array());
    serializer.serializeU32AsUleb128(value.functionArguments.length);
    for (const argument of value.functionArguments) {
      argument.serializeForScriptFunction(serializer);
    }
    serializeTypeArguments(serializer, value.typeArguments ?? []);
  }
}

export function deserializeTransactionPayloadInput(deserializer: Deserializer): InputGenerateTransactionPayloadData {
  const variant = deserializer.deserializeUleb128AsU32();
  switch (variant) {
    case TransactionPayloadInputVariant.Multisig: {
      const functionId = deserializer.deserializeStr() as MoveFunctionId;
      const functionArguments = deserializeEntryFunctionArguments(deserializer);
      const typeArguments = deserializeTypeArguments(deserializer);
      const multisigAddress = deserializer.deserialize(AccountAddress);
      return {
        function: functionId,
        functionArguments,
        multisigAddress,
        typeArguments,
      };
    }
    case TransactionPayloadInputVariant.EntryFunction: {
      const functionId = deserializer.deserializeStr() as MoveFunctionId;
      const functionArguments = deserializeEntryFunctionArguments(deserializer);
      const typeArguments = deserializeTypeArguments(deserializer);
      return {
        function: functionId,
        functionArguments,
        typeArguments,
      };
    }
    case TransactionPayloadInputVariant.Script: {
      const bytecode = deserializer.deserializeBytes();
      const functionArgumentsLength = deserializer.deserializeUleb128AsU32();
      const functionArguments: ScriptFunctionArgumentTypes[] = [];
      for (let i = 0; i < functionArgumentsLength; i += 1) {
        const argument = deserializeFromScriptArgument(deserializer);
        functionArguments.push(argument as ScriptFunctionArgumentTypes);
      }
      const typeArguments = deserializeTypeArguments(deserializer);
      return {
        bytecode,
        functionArguments,
        typeArguments,
      };
    }
    default: {
      throw new Error('Unexpected variant');
    }
  }
}
