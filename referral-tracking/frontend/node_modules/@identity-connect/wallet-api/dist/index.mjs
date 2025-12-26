// src/serialization/bcsSerialization.ts
import { Deserializer, Hex } from "@aptos-labs/ts-sdk";
import { BCS } from "aptos";
function isBcsSerializableV1(value) {
  return value?.serialize !== void 0;
}
function isBcsSerializableV2(value) {
  return value?.serialize !== void 0 && value?.bcsToBytes !== void 0 && value?.bcsToHex !== void 0;
}
function isBcsSerializable(value) {
  return isBcsSerializableV1(value) || isBcsSerializableV2(value);
}
function bcsSerialize(serializable) {
  if (isBcsSerializableV2(serializable)) {
    return serializable.bcsToHex().toString();
  }
  const serializedValueBytes = BCS.bcsToBytes(serializable);
  return Hex.fromHexInput(serializedValueBytes).toString();
}
function bcsDeserialize(deserializableClass, serializedValue) {
  const serializedValueBytes = Hex.fromHexString(serializedValue).toUint8Array();
  const deserializer = new Deserializer(serializedValueBytes);
  return deserializableClass.deserialize(deserializer);
}

// src/serialization/jsonPayload.ts
import { Hex as Hex2 } from "@aptos-labs/ts-sdk";

// src/serialization/error.ts
var UnexpectedValueError = class _UnexpectedValueError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnexpectedValueError";
    Object.setPrototypeOf(this, _UnexpectedValueError.prototype);
  }
};

// src/serialization/jsonPayload.ts
function isSerializedUint8Array(arg) {
  return arg?.type === "Uint8Array" && typeof arg?.value === "string";
}
function serializeEntryFunctionArg(arg) {
  if (arg instanceof Uint8Array) {
    return {
      type: "Uint8Array",
      value: Hex2.fromHexInput(arg).toString()
    };
  }
  if (Array.isArray(arg)) {
    return arg.map(serializeEntryFunctionArg);
  }
  return arg;
}
function deserializeEntryFunctionArg(arg) {
  if (isSerializedUint8Array(arg)) {
    return Hex2.fromHexInput(arg.value).toUint8Array();
  }
  if (Array.isArray(arg)) {
    return arg.map(deserializeEntryFunctionArg);
  }
  return arg;
}
function serializeEntryFunctionPayload(payload) {
  const normalizedArgs = payload.arguments.map(serializeEntryFunctionArg);
  return {
    ...payload,
    arguments: normalizedArgs,
    type: "entry_function_payload"
  };
}
function deserializeEntryFunctionPayload(payload) {
  const deserializedArgs = payload.arguments.map(deserializeEntryFunctionArg);
  return {
    ...payload,
    arguments: deserializedArgs,
    type: "entry_function_payload"
  };
}
function serializeJsonTransactionPayload(payload) {
  if (payload.type === "entry_function_payload" || payload.type === void 0) {
    return serializeEntryFunctionPayload(payload);
  }
  if (payload.type === "multisig_payload") {
    const innerPayload = payload.transaction_payload !== void 0 ? serializeEntryFunctionPayload(payload.transaction_payload) : void 0;
    return { ...payload, transaction_payload: innerPayload };
  }
  throw new UnexpectedValueError();
}
function deserializeJsonTransactionPayload(payload) {
  if (payload.type === "entry_function_payload" || payload.type === void 0) {
    return deserializeEntryFunctionPayload(payload);
  }
  if (payload.type === "multisig_payload") {
    const innerPayload = payload.transaction_payload !== void 0 ? deserializeEntryFunctionPayload(payload.transaction_payload) : void 0;
    return { ...payload, transaction_payload: innerPayload };
  }
  throw new UnexpectedValueError();
}

// src/serialization/rawTxn.ts
import {
  RawTransaction,
  RawTransactionWithData
} from "@aptos-labs/ts-sdk";
function serializeRawTransaction(rawTxn) {
  const value = bcsSerialize(rawTxn);
  if ("fee_payer_address" in rawTxn) {
    return { type: "fee_payer_raw_txn", value };
  }
  if ("secondary_signer_addresses" in rawTxn) {
    return { type: "multi_agent_raw_txn", value };
  }
  if ("chain_id" in rawTxn) {
    return { type: "raw_txn", value };
  }
  throw new UnexpectedValueError("Invalid raw transaction type");
}
function deserializeRawTransaction(serialized) {
  switch (serialized.type) {
    case "raw_txn":
      return bcsDeserialize(RawTransaction, serialized.value);
    case "fee_payer_raw_txn":
      return bcsDeserialize(RawTransactionWithData, serialized.value);
    case "multi_agent_raw_txn":
      return bcsDeserialize(RawTransactionWithData, serialized.value);
    default:
      throw new UnexpectedValueError("Invalid raw transaction type");
  }
}

// src/serialization/signAndSubmitTransactionRequestArgs.ts
import { AccountAuthenticator, TransactionPayload } from "@aptos-labs/ts-sdk";
function serializeSignAndSubmitTransactionRequestArgs(args) {
  if ("payload" in args) {
    const serializedPayload = isBcsSerializable(args.payload) ? bcsSerialize(args.payload) : serializeJsonTransactionPayload(args.payload);
    return { options: args.options, payload: serializedPayload };
  }
  if ("feePayerAuthenticator" in args) {
    return {
      feePayerAuthenticator: bcsSerialize(args.feePayerAuthenticator),
      rawTxn: serializeRawTransaction(args.rawTxn)
    };
  }
  if ("rawTxn" in args) {
    return { rawTxn: serializeRawTransaction(args.rawTxn) };
  }
  throw new UnexpectedValueError();
}
function deserializeSignAndSubmitTransactionRequestArgs(args) {
  if ("payload" in args) {
    const payload = typeof args.payload === "string" ? bcsDeserialize(TransactionPayload, args.payload) : deserializeJsonTransactionPayload(args.payload);
    return { options: args.options, payload };
  }
  if ("feePayerAuthenticator" in args) {
    const deserializedRawTxn = deserializeRawTransaction(args.rawTxn);
    const feePayerAuthenticator = bcsDeserialize(AccountAuthenticator, args.feePayerAuthenticator);
    return { feePayerAuthenticator, rawTxn: deserializedRawTxn };
  }
  if ("rawTxn" in args) {
    const deserializedRawTxn = deserializeRawTransaction(args.rawTxn);
    return { rawTxn: deserializedRawTxn };
  }
  throw new UnexpectedValueError();
}

// src/serialization/signTransactionRequestArgs.ts
import { TransactionPayload as TransactionPayload2 } from "@aptos-labs/ts-sdk";
function serializeSignTransactionRequestArgs(args) {
  if ("payload" in args) {
    const serializedPayload = isBcsSerializable(args.payload) ? bcsSerialize(args.payload) : serializeJsonTransactionPayload(args.payload);
    return { options: args.options, payload: serializedPayload };
  }
  if ("rawTxn" in args) {
    const serializedRawTxn = serializeRawTransaction(args.rawTxn);
    return { rawTxn: serializedRawTxn };
  }
  throw new UnexpectedValueError();
}
function deserializeSignTransactionRequestArgs(args) {
  if ("payload" in args) {
    const payload = typeof args.payload === "string" ? bcsDeserialize(TransactionPayload2, args.payload) : deserializeJsonTransactionPayload(args.payload);
    return { options: args.options, payload };
  }
  if ("rawTxn" in args) {
    const deserializedRawTxn = deserializeRawTransaction(args.rawTxn);
    return { rawTxn: deserializedRawTxn };
  }
  throw new UnexpectedValueError();
}

// src/serialization/signTransactionResponseArgs.ts
import { AccountAuthenticator as AccountAuthenticator2, RawTransaction as RawTransaction2 } from "@aptos-labs/ts-sdk";
function serializeSignTransactionResponseArgs(args) {
  const accountAuthenticator = bcsSerialize(args.accountAuthenticator);
  if ("rawTxn" in args) {
    const rawTxn = bcsSerialize(args.rawTxn);
    return { accountAuthenticator, rawTxn };
  }
  return { accountAuthenticator };
}
function deserializeSignTransactionResponseArgs(args) {
  const accountAuthenticator = bcsDeserialize(AccountAuthenticator2, args.accountAuthenticator);
  if ("rawTxn" in args) {
    const rawTxn = bcsDeserialize(RawTransaction2, args.rawTxn);
    return { accountAuthenticator, rawTxn };
  }
  return { accountAuthenticator };
}

// src/utils/makeFullMessage.ts
var prefix = "APTOS";
function makeFullMessage(params, flags) {
  let fullMessage = prefix;
  if (flags.address) {
    fullMessage += `
address: ${params.address}`;
  }
  if (flags.application) {
    fullMessage += `
application: ${params.application}`;
  }
  if (flags.chainId) {
    fullMessage += `
chainId: ${params.chainId}`;
  }
  fullMessage += `
message: ${params.message}`;
  fullMessage += `
nonce: ${params.nonce}`;
  return {
    fullMessage,
    prefix
  };
}
export {
  bcsDeserialize,
  bcsSerialize,
  deserializeJsonTransactionPayload,
  deserializeRawTransaction,
  deserializeSignAndSubmitTransactionRequestArgs,
  deserializeSignTransactionRequestArgs,
  deserializeSignTransactionResponseArgs,
  isBcsSerializable,
  makeFullMessage,
  serializeJsonTransactionPayload,
  serializeRawTransaction,
  serializeSignAndSubmitTransactionRequestArgs,
  serializeSignTransactionRequestArgs,
  serializeSignTransactionResponseArgs
};
//# sourceMappingURL=index.mjs.map