// src/encrDecr.ts
import { Ed25519Signature } from "@aptos-labs/ts-sdk";
import { sha3_256 } from "@noble/hashes/sha3";
import nacl2 from "tweetnacl";
import ed2curve from "ed2curve";

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
import nacl from "tweetnacl";
var KeyTypes = /* @__PURE__ */ ((KeyTypes2) => {
  KeyTypes2["Ed25519PublicKey"] = "Ed25519PublicKey";
  KeyTypes2["Ed25519SecretKey"] = "Ed25519SecretKey";
  KeyTypes2["X25519PublicKey"] = "X25519PublicKey";
  KeyTypes2["X25519SecretKey"] = "X25519SecretKey";
  return KeyTypes2;
})(KeyTypes || {});
function createX25519KeyPair() {
  return keypairToX25519(nacl.box.keyPair());
}
function createEd25519KeyPair() {
  return keypairToEd25519(nacl.sign.keyPair());
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
  return keypairToEd25519(nacl.sign.keyPair.fromSeed(ed25519SecretKeyBytes.slice(0, 32)));
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
  const x25519PublicKey = ed2curve.convertPublicKey(ed25519PublicKey.key.slice(0, 32));
  if (!x25519PublicKey)
    throw new Error(`${errorKeyName} is not a valid Ed25519 public key`);
  return toKey(x25519PublicKey, "X25519PublicKey" /* X25519PublicKey */);
}
function convertEd25519SecretKeyToX25519SecretKey(ed25519SecretKey) {
  const x25519SecretKey = ed2curve.convertSecretKey(ed25519SecretKey.key.slice(0, 32));
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
  const nonce = nacl2.randomBytes(nacl2.box.nonceLength);
  const messageUint8 = new TextEncoder().encode(message);
  const secured = nacl2.box(messageUint8, nonce, receiverX25519PublicKey.key, senderX25519SecretKey.key.slice(0, 32));
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
    decryptedUint8 = nacl2.box.open(
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
  const signaturePrefixHash = new Uint8Array(sha3_256(`${SIGNATURE_PREFIX}::${purpose}::`));
  return new Uint8Array(sha3_256(concatUint8array(signaturePrefixHash, message)));
}
function signWithEd25519SecretKey(message, signingEd25519SecretKey, purpose) {
  return nacl2.sign.detached(messageHash(message, purpose), signingEd25519SecretKey.key);
}
function makeEd25519SecretKeySignCallbackNoDomainSeparation(signingEd25519SecretKey) {
  return async (message) => new Ed25519Signature(nacl2.sign.detached(message, signingEd25519SecretKey.key));
}
function verifySignature(message, signature, signingPublicKey, purpose) {
  return signingPublicKey.verifySignature({ message: messageHash(message, purpose), signature });
}
function hashAndVerifySignature(message, signature, signingPublicKey, purpose) {
  const messageUint8 = message instanceof Uint8Array ? message : new TextEncoder().encode(message);
  const messageUint8Hash = sha3_256(messageUint8);
  return verifySignature(messageUint8Hash, signature, signingPublicKey, purpose);
}

// src/securedEnvelope.ts
import { Ed25519PublicKey as AptosEd25519PublicKey, Ed25519Signature as Ed25519Signature2, Hex } from "@aptos-labs/ts-sdk";
import { sha3_256 as sha3_2562 } from "@noble/hashes/sha3";
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
  const publicMessageBytesHash = sha3_2562(publicMessageBytes);
  const privateMessageBytesHash = sha3_2562(privateMessageBytes);
  const combinedHash = new Uint8Array(publicMessageBytesHash.length + privateMessageBytesHash.length);
  combinedHash.set(publicMessageBytesHash);
  combinedHash.set(privateMessageBytesHash, publicMessageBytesHash.length);
  return sha3_2562(combinedHash);
}
function signEnvelope(publicMessageBytes, privateMessageBytes, senderEd25519SecretKey) {
  const messageHashBytes = combineHashedEnvelopeMessageBytes(publicMessageBytes, privateMessageBytes);
  const signatureBytes = signWithEd25519SecretKey(messageHashBytes, senderEd25519SecretKey, "SECURED_ENVELOPE");
  return Hex.fromHexInput(signatureBytes).toString();
}
function verifyEnvelopeSignature(publicMessageBytes, privateMessageBytes, messageSignatureInput, senderEd25519PublicKey) {
  const messageSignature = new Ed25519Signature2(Hex.fromHexInput(messageSignatureInput).toUint8Array());
  const senderPublicKey = new AptosEd25519PublicKey(senderEd25519PublicKey.key);
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
import {
  base64ToBytes,
  bytesToBase64,
  deserializePublicKey,
  deserializeSignature,
  serializePublicKey,
  serializeSignature
} from "@aptos-connect/wallet-api";
import {
  Deserializer,
  Ed25519PublicKey as AptosEd25519PublicKey2,
  Ed25519Signature as Ed25519Signature3,
  Hex as Hex2,
  Serializer
} from "@aptos-labs/ts-sdk";
function serializePublicKeyB64(publicKey) {
  const serializer = new Serializer();
  serializePublicKey(serializer, publicKey);
  return bytesToBase64(serializer.toUint8Array());
}
function deserializePublicKeyB64(publicKeyB64) {
  const serializedPublicKey = base64ToBytes(publicKeyB64);
  const deserializer = new Deserializer(serializedPublicKey);
  return deserializePublicKey(deserializer);
}
function deserializeEd25519PublicKeyB64(ed25519PublicKeyB64) {
  return new AptosEd25519PublicKey2(decodeBase64(ed25519PublicKeyB64));
}
function serializeSignatureB64(signature) {
  const serializer = new Serializer();
  serializeSignature(serializer, signature);
  return bytesToBase64(serializer.toUint8Array());
}
function deserializeSignatureB64(signatureB64) {
  const serializedSignature = base64ToBytes(signatureB64);
  const deserializer = new Deserializer(serializedSignature);
  return deserializeSignature(deserializer);
}
function deserializeEd25519SignatureB64(ed25519SignatureB64) {
  const signatureBytes = Hex2.fromHexInput(ed25519SignatureB64).toUint8Array();
  return new Ed25519Signature3(signatureBytes);
}
function publicKeyB64FromEd25519PublicKeyB64(ed25519PublicKeyB64) {
  const publicKey = deserializeEd25519PublicKeyB64(ed25519PublicKeyB64);
  return serializePublicKeyB64(publicKey);
}

// src/walletAccounts.ts
import { PublicKey as AptosPublicKey } from "@aptos-labs/ts-sdk";
import { sha3_256 as sha3_2563 } from "@noble/hashes/sha3";
var AccountConnectionAction = /* @__PURE__ */ ((AccountConnectionAction2) => {
  AccountConnectionAction2["ADD"] = "add";
  AccountConnectionAction2["REMOVE"] = "remove";
  return AccountConnectionAction2;
})(AccountConnectionAction || {});
function deriveAccountTransportEd25519Keypair(ed25519SecretKeyOrSignCallback, publicKey) {
  const publicKeyBytes = publicKey instanceof AptosPublicKey ? publicKey.toUint8Array() : publicKey.key;
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
  const accountInfoHash = sha3_2563(accountInfoBytes);
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
export {
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
};
//# sourceMappingURL=index.mjs.map