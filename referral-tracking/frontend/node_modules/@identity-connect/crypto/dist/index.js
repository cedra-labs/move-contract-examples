"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  AccountConnectionAction: () => AccountConnectionAction,
  DecryptionError: () => DecryptionError,
  EncryptionEnvelopeError: () => EncryptionEnvelopeError,
  EnvelopeMessageMismatchError: () => EnvelopeMessageMismatchError,
  KeyTypes: () => KeyTypes,
  REQUIRED_FIELDS: () => REQUIRED_FIELDS,
  SIGNATURE_PREFIX: () => SIGNATURE_PREFIX,
  aptosAccountToEd25519Keypair: () => aptosAccountToEd25519Keypair,
  aptosAccountToSerializedInfo: () => aptosAccountToSerializedInfo,
  concatUint8array: () => concatUint8array,
  constructMetadata: () => constructMetadata,
  convertEd25519PublicKeyToX25519PublicKey: () => convertEd25519PublicKeyToX25519PublicKey,
  convertEd25519SecretKeyToX25519SecretKey: () => convertEd25519SecretKeyToX25519SecretKey,
  createEd25519KeyPair: () => createEd25519KeyPair,
  createSerializedAccountInfo: () => createSerializedAccountInfo,
  createX25519KeyPair: () => createX25519KeyPair,
  dangerouslyEncryptAndSignEnvelopeUnvalidated: () => dangerouslyEncryptAndSignEnvelopeUnvalidated,
  decodeBase64: () => decodeBase64,
  decryptEnvelope: () => decryptEnvelope,
  decryptMessage: () => decryptMessage,
  decryptMessageDirect: () => decryptMessageDirect,
  decryptObject: () => decryptObject,
  decryptObjectDirect: () => decryptObjectDirect,
  decryptSerializedEncryptionResult: () => decryptSerializedEncryptionResult,
  decryptSerializedEncryptionResultDirect: () => decryptSerializedEncryptionResultDirect,
  deriveAccountTransportEd25519Keypair: () => deriveAccountTransportEd25519Keypair,
  deserializeEd25519PublicKeyB64: () => deserializeEd25519PublicKeyB64,
  deserializeEd25519SignatureB64: () => deserializeEd25519SignatureB64,
  deserializeEncryptionResult: () => deserializeEncryptionResult,
  deserializePublicKeyB64: () => deserializePublicKeyB64,
  deserializeSignatureB64: () => deserializeSignatureB64,
  deserializeTransportEnvelope: () => deserializeTransportEnvelope,
  ed25519KeypairFromSecret: () => ed25519KeypairFromSecret,
  encodeBase64: () => encodeBase64,
  encryptAndSignEnvelope: () => encryptAndSignEnvelope,
  encryptMessage: () => encryptMessage,
  encryptMessageDirect: () => encryptMessageDirect,
  encryptObject: () => encryptObject,
  encryptObjectDirect: () => encryptObjectDirect,
  ensureMetadataFields: () => ensureMetadataFields,
  ensurePrivatePublicFieldsDisjoint: () => ensurePrivatePublicFieldsDisjoint,
  hashAndVerifySignature: () => hashAndVerifySignature,
  keypairToEd25519: () => keypairToEd25519,
  keypairToX25519: () => keypairToX25519,
  makeEd25519SecretKeySignCallbackNoDomainSeparation: () => makeEd25519SecretKeySignCallbackNoDomainSeparation,
  messageHash: () => messageHash,
  publicKeyB64FromEd25519PublicKeyB64: () => publicKeyB64FromEd25519PublicKeyB64,
  serializeEncryptionResult: () => serializeEncryptionResult,
  serializePublicKeyB64: () => serializePublicKeyB64,
  serializeSignatureB64: () => serializeSignatureB64,
  signWithEd25519SecretKey: () => signWithEd25519SecretKey,
  toKey: () => toKey,
  verifyEnvelopeSignature: () => verifyEnvelopeSignature,
  verifySignature: () => verifySignature
});
module.exports = __toCommonJS(src_exports);

// src/encrDecr.ts
var import_ts_sdk = require("@aptos-labs/ts-sdk");
var import_sha3 = require("@noble/hashes/sha3");
var import_tweetnacl2 = __toESM(require("tweetnacl"));
var import_ed2curve = __toESM(require("ed2curve"));

// src/errors.ts
var EncryptionEnvelopeError = class extends Error {
};
var EnvelopeMessageMismatchError = class _EnvelopeMessageMismatchError extends EncryptionEnvelopeError {
  constructor(message, field) {
    super(message);
    this.field = field;
    this.name = "EnvelopeMessageMismatchError";
    Object.setPrototypeOf(this, _EnvelopeMessageMismatchError.prototype);
  }
};
var DecryptionError = class _DecryptionError extends EncryptionEnvelopeError {
  constructor(message) {
    super(message);
    this.name = "DecryptionError";
    Object.setPrototypeOf(this, _DecryptionError.prototype);
  }
};

// src/utils.ts
var import_tweetnacl = __toESM(require("tweetnacl"));
var KeyTypes = /* @__PURE__ */ ((KeyTypes2) => {
  KeyTypes2["Ed25519PublicKey"] = "Ed25519PublicKey";
  KeyTypes2["Ed25519SecretKey"] = "Ed25519SecretKey";
  KeyTypes2["X25519PublicKey"] = "X25519PublicKey";
  KeyTypes2["X25519SecretKey"] = "X25519SecretKey";
  return KeyTypes2;
})(KeyTypes || {});
function createX25519KeyPair() {
  return keypairToX25519(import_tweetnacl.default.box.keyPair());
}
function createEd25519KeyPair() {
  return keypairToEd25519(import_tweetnacl.default.sign.keyPair());
}
function toKey(rawKey, type) {
  return {
    key: rawKey,
    type
  };
}
function keypairToEd25519(keyPair) {
  return {
    publicKey: toKey(keyPair.publicKey, "Ed25519PublicKey" /* Ed25519PublicKey */),
    secretKey: toKey(keyPair.secretKey, "Ed25519SecretKey" /* Ed25519SecretKey */)
  };
}
function keypairToX25519(keyPair) {
  return {
    publicKey: toKey(keyPair.publicKey, "X25519PublicKey" /* X25519PublicKey */),
    secretKey: toKey(keyPair.secretKey, "X25519SecretKey" /* X25519SecretKey */)
  };
}
function aptosAccountToEd25519Keypair(account) {
  return ed25519KeypairFromSecret(account.signingKey.secretKey);
}
function ed25519KeypairFromSecret(ed25519SecretKeyBytes) {
  return keypairToEd25519(import_tweetnacl.default.sign.keyPair.fromSeed(ed25519SecretKeyBytes.slice(0, 32)));
}
function decodeBase64(base64Str) {
  if (globalThis.Buffer) {
    return new Uint8Array(Buffer.from(base64Str, "base64"));
  }
  return Uint8Array.from(atob(base64Str), (m) => m.codePointAt(0));
}
function encodeBase64(bytes) {
  if (globalThis.Buffer) {
    return Buffer.from(bytes).toString("base64");
  }
  return btoa(Array.from(bytes, (x) => String.fromCodePoint(x)).join(""));
}
function concatUint8array(arrayOne, arrayTwo) {
  const mergedArray = new Uint8Array(arrayOne.length + arrayTwo.length);
  mergedArray.set(arrayOne);
  mergedArray.set(arrayTwo, arrayOne.length);
  return mergedArray;
}

// src/encrDecr.ts
var SIGNATURE_PREFIX = "APTOS::IDENTITY_CONNECT";
function convertEd25519PublicKeyToX25519PublicKey(ed25519PublicKey, errorKeyName) {
  const x25519PublicKey = import_ed2curve.default.convertPublicKey(ed25519PublicKey.key.slice(0, 32));
  if (!x25519PublicKey)
    throw new Error(`${errorKeyName} is not a valid Ed25519 public key`);
  return toKey(x25519PublicKey, "X25519PublicKey" /* X25519PublicKey */);
}
function convertEd25519SecretKeyToX25519SecretKey(ed25519SecretKey) {
  const x25519SecretKey = import_ed2curve.default.convertSecretKey(ed25519SecretKey.key.slice(0, 32));
  return toKey(x25519SecretKey, "X25519SecretKey" /* X25519SecretKey */);
}
function serializeEncryptionResult(enc) {
  return {
    nonceB64: encodeBase64(enc.nonce),
    securedB64: encodeBase64(enc.secured)
  };
}
function deserializeEncryptionResult(enc) {
  return {
    nonce: decodeBase64(enc.nonceB64),
    secured: decodeBase64(enc.securedB64)
  };
}
function decryptSerializedEncryptionResult(senderX25519PublicKey, receiverEd25519SecretKey, enc) {
  const des = deserializeEncryptionResult(enc);
  return decryptObject(senderX25519PublicKey, receiverEd25519SecretKey, des.secured, des.nonce);
}
function decryptSerializedEncryptionResultDirect(senderX25519PublicKey, receiverX25519SecretKey, enc) {
  const des = deserializeEncryptionResult(enc);
  return decryptObjectDirect(senderX25519PublicKey, receiverX25519SecretKey, des.secured, des.nonce);
}
function encryptMessage(senderX25519SecretKey, receiverEd25519PublicKey, message) {
  const receiverX25519PublicKey = convertEd25519PublicKeyToX25519PublicKey(
    receiverEd25519PublicKey,
    "receiver public key"
  );
  return encryptMessageDirect(senderX25519SecretKey, receiverX25519PublicKey, message);
}
function encryptMessageDirect(senderX25519SecretKey, receiverX25519PublicKey, message) {
  const nonce = import_tweetnacl2.default.randomBytes(import_tweetnacl2.default.box.nonceLength);
  const messageUint8 = new TextEncoder().encode(message);
  const secured = import_tweetnacl2.default.box(messageUint8, nonce, receiverX25519PublicKey.key, senderX25519SecretKey.key.slice(0, 32));
  return { nonce, secured };
}
function encryptObject(senderX25519SecretKey, receiverEd25519PublicKey, message) {
  const receiverX25519PublicKey = convertEd25519PublicKeyToX25519PublicKey(
    receiverEd25519PublicKey,
    "receiver public key"
  );
  return encryptObjectDirect(senderX25519SecretKey, receiverX25519PublicKey, message);
}
function encryptObjectDirect(senderX25519SecretKey, receiverX25519PublicKey, message) {
  return encryptMessageDirect(senderX25519SecretKey, receiverX25519PublicKey, JSON.stringify(message));
}
function decryptMessage(senderX25519PublicKey, receiverEd25519SecretKey, securedMessage, nonce) {
  const receiverX25519SecretKey = convertEd25519SecretKeyToX25519SecretKey(receiverEd25519SecretKey);
  return decryptMessageDirect(senderX25519PublicKey, receiverX25519SecretKey, securedMessage, nonce);
}
function decryptMessageDirect(senderX25519PublicKey, receiverX25519SecretKey, securedMessage, nonce) {
  let decryptedUint8;
  try {
    decryptedUint8 = import_tweetnacl2.default.box.open(
      securedMessage,
      nonce,
      senderX25519PublicKey.key.slice(0, 32),
      receiverX25519SecretKey.key.slice(0, 32)
    );
  } catch (e) {
    throw new DecryptionError(`Could not decrypt message: ${e.message}`);
  }
  if (!decryptedUint8)
    throw new DecryptionError("Could not decrypt message");
  return new TextDecoder().decode(decryptedUint8);
}
function decryptObject(senderX25519PublicKey, receiverEd25519SecretKey, securedMessage, nonce) {
  const receiverX25519SecretKey = convertEd25519SecretKeyToX25519SecretKey(receiverEd25519SecretKey);
  return decryptObjectDirect(senderX25519PublicKey, receiverX25519SecretKey, securedMessage, nonce);
}
function decryptObjectDirect(senderX25519PublicKey, receiverX25519SecretKey, securedMessage, nonce) {
  const decryptedStr = decryptMessageDirect(senderX25519PublicKey, receiverX25519SecretKey, securedMessage, nonce);
  return JSON.parse(decryptedStr);
}
function messageHash(message, purpose) {
  const signaturePrefixHash = new Uint8Array((0, import_sha3.sha3_256)(`${SIGNATURE_PREFIX}::${purpose}::`));
  return new Uint8Array((0, import_sha3.sha3_256)(concatUint8array(signaturePrefixHash, message)));
}
function signWithEd25519SecretKey(message, signingEd25519SecretKey, purpose) {
  return import_tweetnacl2.default.sign.detached(messageHash(message, purpose), signingEd25519SecretKey.key);
}
function makeEd25519SecretKeySignCallbackNoDomainSeparation(signingEd25519SecretKey) {
  return async (message) => new import_ts_sdk.Ed25519Signature(import_tweetnacl2.default.sign.detached(message, signingEd25519SecretKey.key));
}
function verifySignature(message, signature, signingPublicKey, purpose) {
  return signingPublicKey.verifySignature({ message: messageHash(message, purpose), signature });
}
function hashAndVerifySignature(message, signature, signingPublicKey, purpose) {
  const messageUint8 = message instanceof Uint8Array ? message : new TextEncoder().encode(message);
  const messageUint8Hash = (0, import_sha3.sha3_256)(messageUint8);
  return verifySignature(messageUint8Hash, signature, signingPublicKey, purpose);
}

// src/securedEnvelope.ts
var import_ts_sdk2 = require("@aptos-labs/ts-sdk");
var import_sha32 = require("@noble/hashes/sha3");
var REQUIRED_FIELDS = [
  "receiverEd25519PublicKeyB64",
  "senderEd25519PublicKeyB64",
  "senderX25519PublicKeyB64",
  "sequence",
  "timestampMillis"
].sort();
function ensurePrivatePublicFieldsDisjoint(privateMessage, publicMessage) {
  const intersection = Object.keys(privateMessage).filter((x) => Object.keys(publicMessage).includes(x));
  if (intersection.length > 0) {
    const field = intersection[0];
    throw new EnvelopeMessageMismatchError(`Field ${field} appears in both private and public message fields`, field);
  }
}
function ensureMetadataFields(message) {
  const messageKeys = Object.keys(message).sort();
  const extraFields = messageKeys.filter((key) => !REQUIRED_FIELDS.includes(key));
  const missingFields = REQUIRED_FIELDS.filter((key) => !messageKeys.includes(key));
  if (extraFields.length > 0 || missingFields.length > 0) {
    let extraFieldsStr = extraFields.length > 0 ? `extra(${extraFields.join(", ")})` : "";
    const missingFieldsStr = missingFields.length > 0 ? `missing(${missingFields.join(", ")})` : "";
    extraFieldsStr = extraFieldsStr.length > 0 && missingFieldsStr.length > 0 ? `${extraFieldsStr}, ` : extraFieldsStr;
    throw new EnvelopeMessageMismatchError(
      `PublicMessage metadata fields do not conform to spec: ${extraFieldsStr}${missingFieldsStr}`,
      "_metadata"
    );
  }
}
function deserializeTransportEnvelope(transportEnvelope) {
  const publicMessage = JSON.parse(transportEnvelope.serializedPublicMessage);
  return {
    ...transportEnvelope,
    publicMessage
  };
}
function encryptAndSignEnvelope(senderEd25519SecretKey, senderEd25519PublicKey, receiverEd25519PublicKey, sequence, publicMessage, privateMessage) {
  const senderEphemeralX25519KeyPair = createX25519KeyPair();
  const metadata = constructMetadata(
    senderEd25519PublicKey,
    receiverEd25519PublicKey,
    sequence,
    senderEphemeralX25519KeyPair.publicKey
  );
  ensureMetadataFields(metadata);
  ensurePrivatePublicFieldsDisjoint(privateMessage, publicMessage);
  return dangerouslyEncryptAndSignEnvelopeUnvalidated(
    senderEd25519SecretKey,
    receiverEd25519PublicKey,
    metadata,
    privateMessage,
    publicMessage,
    senderEphemeralX25519KeyPair
  );
}
function constructMetadata(senderEd25519PublicKey, receiverEd25519PublicKey, sequence, senderEphemeralX25519PublicKey) {
  return {
    receiverEd25519PublicKeyB64: encodeBase64(receiverEd25519PublicKey.key),
    senderEd25519PublicKeyB64: encodeBase64(senderEd25519PublicKey.key),
    senderX25519PublicKeyB64: encodeBase64(senderEphemeralX25519PublicKey.key),
    sequence,
    timestampMillis: Date.now()
  };
}
function dangerouslyEncryptAndSignEnvelopeUnvalidated(senderEd25519SecretKey, receiverEd25519PublicKey, metadata, privateMessage, publicMessage, senderEphemeralX25519KeyPair) {
  const encryptionResult = encryptObject(
    senderEphemeralX25519KeyPair.secretKey,
    receiverEd25519PublicKey,
    privateMessage
  );
  const encryptedPrivateMessage = serializeEncryptionResult(encryptionResult);
  const encryptedPrivateMessageBytes = decodeBase64(encryptedPrivateMessage.securedB64);
  const serializedPublicMessage = JSON.stringify({ ...publicMessage, _metadata: metadata });
  const publicMessageBytes = new TextEncoder().encode(serializedPublicMessage);
  const messageSignature = signEnvelope(publicMessageBytes, encryptedPrivateMessageBytes, senderEd25519SecretKey);
  return {
    encryptedPrivateMessage,
    messageSignature,
    serializedPublicMessage
  };
}
function combineHashedEnvelopeMessageBytes(publicMessageBytes, privateMessageBytes) {
  const publicMessageBytesHash = (0, import_sha32.sha3_256)(publicMessageBytes);
  const privateMessageBytesHash = (0, import_sha32.sha3_256)(privateMessageBytes);
  const combinedHash = new Uint8Array(publicMessageBytesHash.length + privateMessageBytesHash.length);
  combinedHash.set(publicMessageBytesHash);
  combinedHash.set(privateMessageBytesHash, publicMessageBytesHash.length);
  return (0, import_sha32.sha3_256)(combinedHash);
}
function signEnvelope(publicMessageBytes, privateMessageBytes, senderEd25519SecretKey) {
  const messageHashBytes = combineHashedEnvelopeMessageBytes(publicMessageBytes, privateMessageBytes);
  const signatureBytes = signWithEd25519SecretKey(messageHashBytes, senderEd25519SecretKey, "SECURED_ENVELOPE");
  return import_ts_sdk2.Hex.fromHexInput(signatureBytes).toString();
}
function verifyEnvelopeSignature(publicMessageBytes, privateMessageBytes, messageSignatureInput, senderEd25519PublicKey) {
  const messageSignature = new import_ts_sdk2.Ed25519Signature(import_ts_sdk2.Hex.fromHexInput(messageSignatureInput).toUint8Array());
  const senderPublicKey = new import_ts_sdk2.Ed25519PublicKey(senderEd25519PublicKey.key);
  const messageHashBytes = combineHashedEnvelopeMessageBytes(publicMessageBytes, privateMessageBytes);
  const messageVerified = verifySignature(messageHashBytes, messageSignature, senderPublicKey, "SECURED_ENVELOPE");
  if (!messageVerified) {
    throw new EnvelopeMessageMismatchError("Could not verify SecuredEnvelope signature", "messageSignature");
  }
}
function decryptEnvelope(senderEd25519PublicKey, receiverEd25519SecretKey, message) {
  const { encryptedPrivateMessage, messageSignature, serializedPublicMessage } = message;
  const publicMessage = JSON.parse(serializedPublicMessage);
  const rawPrivateMessage = decodeBase64(encryptedPrivateMessage.securedB64);
  const rawPublicMessage = new TextEncoder().encode(serializedPublicMessage);
  verifyEnvelopeSignature(rawPublicMessage, rawPrivateMessage, messageSignature, senderEd25519PublicKey);
  const senderEd25519PublicKeyB64 = encodeBase64(senderEd25519PublicKey.key);
  const expectedPublicKeyB64 = publicMessage._metadata.senderEd25519PublicKeyB64;
  if (senderEd25519PublicKeyB64 !== expectedPublicKeyB64) {
    throw new EnvelopeMessageMismatchError(
      "senderEd25519PublicKey in envelope does not match provided receiverEd25519SecretKey",
      "senderPublicKey"
    );
  }
  const senderX25519PublicKeyBytes = decodeBase64(publicMessage._metadata.senderX25519PublicKeyB64);
  const senderX25519PublicKey = toKey(senderX25519PublicKeyBytes, "X25519PublicKey" /* X25519PublicKey */);
  const encryptionResult = deserializeEncryptionResult(encryptedPrivateMessage);
  const privateMessage = decryptObject(
    senderX25519PublicKey,
    receiverEd25519SecretKey,
    encryptionResult.secured,
    encryptionResult.nonce
  );
  ensureMetadataFields(publicMessage._metadata);
  ensurePrivatePublicFieldsDisjoint(privateMessage, publicMessage);
  return {
    messageSignature,
    privateMessage,
    publicMessage
  };
}

// src/serialization.ts
var import_wallet_api = require("@aptos-connect/wallet-api");
var import_ts_sdk3 = require("@aptos-labs/ts-sdk");
function serializePublicKeyB64(publicKey) {
  const serializer = new import_ts_sdk3.Serializer();
  (0, import_wallet_api.serializePublicKey)(serializer, publicKey);
  return (0, import_wallet_api.bytesToBase64)(serializer.toUint8Array());
}
function deserializePublicKeyB64(publicKeyB64) {
  const serializedPublicKey = (0, import_wallet_api.base64ToBytes)(publicKeyB64);
  const deserializer = new import_ts_sdk3.Deserializer(serializedPublicKey);
  return (0, import_wallet_api.deserializePublicKey)(deserializer);
}
function deserializeEd25519PublicKeyB64(ed25519PublicKeyB64) {
  return new import_ts_sdk3.Ed25519PublicKey(decodeBase64(ed25519PublicKeyB64));
}
function serializeSignatureB64(signature) {
  const serializer = new import_ts_sdk3.Serializer();
  (0, import_wallet_api.serializeSignature)(serializer, signature);
  return (0, import_wallet_api.bytesToBase64)(serializer.toUint8Array());
}
function deserializeSignatureB64(signatureB64) {
  const serializedSignature = (0, import_wallet_api.base64ToBytes)(signatureB64);
  const deserializer = new import_ts_sdk3.Deserializer(serializedSignature);
  return (0, import_wallet_api.deserializeSignature)(deserializer);
}
function deserializeEd25519SignatureB64(ed25519SignatureB64) {
  const signatureBytes = import_ts_sdk3.Hex.fromHexInput(ed25519SignatureB64).toUint8Array();
  return new import_ts_sdk3.Ed25519Signature(signatureBytes);
}
function publicKeyB64FromEd25519PublicKeyB64(ed25519PublicKeyB64) {
  const publicKey = deserializeEd25519PublicKeyB64(ed25519PublicKeyB64);
  return serializePublicKeyB64(publicKey);
}

// src/walletAccounts.ts
var import_ts_sdk4 = require("@aptos-labs/ts-sdk");
var import_sha33 = require("@noble/hashes/sha3");
var AccountConnectionAction = /* @__PURE__ */ ((AccountConnectionAction2) => {
  AccountConnectionAction2["ADD"] = "add";
  AccountConnectionAction2["REMOVE"] = "remove";
  return AccountConnectionAction2;
})(AccountConnectionAction || {});
function deriveAccountTransportEd25519Keypair(ed25519SecretKeyOrSignCallback, publicKey) {
  const publicKeyBytes = publicKey instanceof import_ts_sdk4.PublicKey ? publicKey.toUint8Array() : publicKey.key;
  if (ed25519SecretKeyOrSignCallback instanceof Function) {
    const seedGeneratorBytes = messageHash(publicKeyBytes, "TRANSPORT_KEYPAIR");
    const signature = ed25519SecretKeyOrSignCallback(seedGeneratorBytes);
    if (signature instanceof Promise) {
      return signature.then((value) => ed25519KeypairFromSecret(value.toUint8Array()));
    }
    return ed25519KeypairFromSecret(signature.toUint8Array());
  }
  const seedBytes = signWithEd25519SecretKey(publicKeyBytes, ed25519SecretKeyOrSignCallback, "TRANSPORT_KEYPAIR");
  return ed25519KeypairFromSecret(seedBytes);
}
function createSerializedAccountInfo(...[
  signCallback,
  publicKey,
  transportEd25519PublicKey,
  action,
  intentId,
  accountAddress
]) {
  const authKey = publicKey.authKey();
  const finalAccountAddress = accountAddress || authKey.derivedAddress().toString();
  const publicKeyB64 = serializePublicKeyB64(publicKey);
  const accountInfo = {
    accountAddress: finalAccountAddress,
    action,
    intentId,
    publicKeyB64,
    timestampMillis: Date.now(),
    transportEd25519PublicKeyB64: encodeBase64(transportEd25519PublicKey.key)
  };
  const accountInfoSerialized = JSON.stringify(accountInfo);
  const accountInfoBytes = new TextEncoder().encode(accountInfoSerialized);
  const accountInfoHash = (0, import_sha33.sha3_256)(accountInfoBytes);
  const signature = signCallback(messageHash(accountInfoHash, "ACCOUNT_INFO"));
  if (signature instanceof Promise) {
    return signature.then((value) => ({
      accountInfoSerialized,
      signatureB64: serializeSignatureB64(value)
    }));
  }
  return {
    accountInfoSerialized,
    signatureB64: serializeSignatureB64(signature)
  };
}
async function aptosAccountToSerializedInfo(account, intentId) {
  const signCallback = async (data) => account.sign(data);
  const transportKey = await deriveAccountTransportEd25519Keypair(signCallback, account.publicKey);
  return createSerializedAccountInfo(
    signCallback,
    account.publicKey,
    transportKey.publicKey,
    "add" /* ADD */,
    intentId
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AccountConnectionAction,
  DecryptionError,
  EncryptionEnvelopeError,
  EnvelopeMessageMismatchError,
  KeyTypes,
  REQUIRED_FIELDS,
  SIGNATURE_PREFIX,
  aptosAccountToEd25519Keypair,
  aptosAccountToSerializedInfo,
  concatUint8array,
  constructMetadata,
  convertEd25519PublicKeyToX25519PublicKey,
  convertEd25519SecretKeyToX25519SecretKey,
  createEd25519KeyPair,
  createSerializedAccountInfo,
  createX25519KeyPair,
  dangerouslyEncryptAndSignEnvelopeUnvalidated,
  decodeBase64,
  decryptEnvelope,
  decryptMessage,
  decryptMessageDirect,
  decryptObject,
  decryptObjectDirect,
  decryptSerializedEncryptionResult,
  decryptSerializedEncryptionResultDirect,
  deriveAccountTransportEd25519Keypair,
  deserializeEd25519PublicKeyB64,
  deserializeEd25519SignatureB64,
  deserializeEncryptionResult,
  deserializePublicKeyB64,
  deserializeSignatureB64,
  deserializeTransportEnvelope,
  ed25519KeypairFromSecret,
  encodeBase64,
  encryptAndSignEnvelope,
  encryptMessage,
  encryptMessageDirect,
  encryptObject,
  encryptObjectDirect,
  ensureMetadataFields,
  ensurePrivatePublicFieldsDisjoint,
  hashAndVerifySignature,
  keypairToEd25519,
  keypairToX25519,
  makeEd25519SecretKeySignCallbackNoDomainSeparation,
  messageHash,
  publicKeyB64FromEd25519PublicKeyB64,
  serializeEncryptionResult,
  serializePublicKeyB64,
  serializeSignatureB64,
  signWithEd25519SecretKey,
  toKey,
  verifyEnvelopeSignature,
  verifySignature
});
//# sourceMappingURL=index.js.map