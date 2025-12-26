"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  bcsDeserialize: () => bcsDeserialize,
  bcsSerialize: () => bcsSerialize,
  deserializeJsonTransactionPayload: () => deserializeJsonTransactionPayload,
  deserializeRawTransaction: () => deserializeRawTransaction,
  deserializeSignAndSubmitTransactionRequestArgs: () => deserializeSignAndSubmitTransactionRequestArgs,
  deserializeSignTransactionRequestArgs: () => deserializeSignTransactionRequestArgs,
  deserializeSignTransactionResponseArgs: () => deserializeSignTransactionResponseArgs,
  isBcsSerializable: () => isBcsSerializable,
  makeFullMessage: () => makeFullMessage,
  serializeJsonTransactionPayload: () => serializeJsonTransactionPayload,
  serializeRawTransaction: () => serializeRawTransaction,
  serializeSignAndSubmitTransactionRequestArgs: () => serializeSignAndSubmitTransactionRequestArgs,
  serializeSignTransactionRequestArgs: () => serializeSignTransactionRequestArgs,
  serializeSignTransactionResponseArgs: () => serializeSignTransactionResponseArgs
});
module.exports = __toCommonJS(src_exports);

// src/serialization/bcsSerialization.ts
var import_ts_sdk = require("@aptos-labs/ts-sdk");
var import_aptos = require("aptos");
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
  const serializedValueBytes = import_aptos.BCS.bcsToBytes(serializable);
  return import_ts_sdk.Hex.fromHexInput(serializedValueBytes).toString();
}
function bcsDeserialize(deserializableClass, serializedValue) {
  const serializedValueBytes = import_ts_sdk.Hex.fromHexString(serializedValue).toUint8Array();
  const deserializer = new import_ts_sdk.Deserializer(serializedValueBytes);
  return deserializableClass.deserialize(deserializer);
}

// src/serialization/jsonPayload.ts
var import_ts_sdk2 = require("@aptos-labs/ts-sdk");

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
      value: import_ts_sdk2.Hex.fromHexInput(arg).toString()
    };
  }
  if (Array.isArray(arg)) {
    return arg.map(serializeEntryFunctionArg);
  }
  return arg;
}
function deserializeEntryFunctionArg(arg) {
  if (isSerializedUint8Array(arg)) {
    return import_ts_sdk2.Hex.fromHexInput(arg.value).toUint8Array();
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
var import_ts_sdk3 = require("@aptos-labs/ts-sdk");
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
      return bcsDeserialize(import_ts_sdk3.RawTransaction, serialized.value);
    case "fee_payer_raw_txn":
      return bcsDeserialize(import_ts_sdk3.RawTransactionWithData, serialized.value);
    case "multi_agent_raw_txn":
      return bcsDeserialize(import_ts_sdk3.RawTransactionWithData, serialized.value);
    default:
      throw new UnexpectedValueError("Invalid raw transaction type");
  }
}

// src/serialization/signAndSubmitTransactionRequestArgs.ts
var import_ts_sdk4 = require("@aptos-labs/ts-sdk");
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
    const payload = typeof args.payload === "string" ? bcsDeserialize(import_ts_sdk4.TransactionPayload, args.payload) : deserializeJsonTransactionPayload(args.payload);
    return { options: args.options, payload };
  }
  if ("feePayerAuthenticator" in args) {
    const deserializedRawTxn = deserializeRawTransaction(args.rawTxn);
    const feePayerAuthenticator = bcsDeserialize(import_ts_sdk4.AccountAuthenticator, args.feePayerAuthenticator);
    return { feePayerAuthenticator, rawTxn: deserializedRawTxn };
  }
  if ("rawTxn" in args) {
    const deserializedRawTxn = deserializeRawTransaction(args.rawTxn);
    return { rawTxn: deserializedRawTxn };
  }
  throw new UnexpectedValueError();
}

// src/serialization/signTransactionRequestArgs.ts
var import_ts_sdk5 = require("@aptos-labs/ts-sdk");
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
    const payload = typeof args.payload === "string" ? bcsDeserialize(import_ts_sdk5.TransactionPayload, args.payload) : deserializeJsonTransactionPayload(args.payload);
    return { options: args.options, payload };
  }
  if ("rawTxn" in args) {
    const deserializedRawTxn = deserializeRawTransaction(args.rawTxn);
    return { rawTxn: deserializedRawTxn };
  }
  throw new UnexpectedValueError();
}

// src/serialization/signTransactionResponseArgs.ts
var import_ts_sdk6 = require("@aptos-labs/ts-sdk");
function serializeSignTransactionResponseArgs(args) {
  const accountAuthenticator = bcsSerialize(args.accountAuthenticator);
  if ("rawTxn" in args) {
    const rawTxn = bcsSerialize(args.rawTxn);
    return { accountAuthenticator, rawTxn };
  }
  return { accountAuthenticator };
}
function deserializeSignTransactionResponseArgs(args) {
  const accountAuthenticator = bcsDeserialize(import_ts_sdk6.AccountAuthenticator, args.accountAuthenticator);
  if ("rawTxn" in args) {
    const rawTxn = bcsDeserialize(import_ts_sdk6.RawTransaction, args.rawTxn);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
});
//# sourceMappingURL=index.js.map