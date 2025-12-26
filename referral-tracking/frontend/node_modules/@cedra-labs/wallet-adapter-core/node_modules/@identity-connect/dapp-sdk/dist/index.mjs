// src/ACDappClient.ts
import {
  chainIdToNetwork,
  ConnectRequest,
  ConnectResponse,
  DisconnectRequest,
  GetConnectedAccountsRequest,
  GetConnectedAccountsResponse,
  makeUserApproval,
  SignAndSubmitTransactionRequest,
  SignAndSubmitTransactionResponse,
  SignInRequest,
  SignInResponse,
  SignMessageRequest,
  SignMessageResponse,
  SignTransactionRequest,
  SignTransactionResponse
} from "@aptos-connect/wallet-api";
import { WebWalletTransport } from "@aptos-connect/web-transport";
import {
  AccountAddress as AccountAddress3,
  AnySignature,
  AptosConfig as AptosConfig2,
  Deserializer,
  Ed25519Signature,
  FeePayerRawTransaction,
  generateRawTransaction,
  Hex
} from "@aptos-labs/ts-sdk";
import { NetworkName as NetworkName2 } from "@identity-connect/api";
import { createEd25519KeyPair, encodeBase64 as encodeBase642 } from "@identity-connect/crypto";

// src/constants.ts
var DEFAULT_FRONTEND_URL = "https://aptosconnect.app";

// src/conversion.ts
import {
  AccountAddress,
  generateTransactionPayload,
  generateTransactionPayloadWithABI
} from "@aptos-labs/ts-sdk";
function convertToSerializableArgument(argument) {
  if (argument === void 0 || argument === null) {
    return argument;
  }
  if (Array.isArray(argument)) {
    return argument.map((subArgument) => convertToSerializableArgument(subArgument));
  }
  if (typeof argument === "string" || typeof argument === "number" || typeof argument === "boolean" || argument instanceof Uint8Array) {
    return argument;
  }
  if (typeof argument === "bigint") {
    return argument.toString();
  }
  if (argument instanceof ArrayBuffer) {
    return new Uint8Array(argument);
  }
  if ("values" in argument) {
    return argument.values.map((subArgument) => convertToSerializableArgument(subArgument));
  }
  if ("data" in argument) {
    return AccountAddress.from(argument.data).toString();
  }
  if (argument.value === void 0) {
    return void 0;
  }
  if (typeof argument.value === "string" || typeof argument.value === "number" || typeof argument.value === "boolean" || argument.value instanceof Uint8Array) {
    return argument.value;
  }
  if (typeof argument.value === "bigint") {
    return argument.value.toString();
  }
  throw new Error("Unexpected argument");
}
function normalizePayloadForIC(payload, aptosConfig) {
  if ("bcsToBytes" in payload) {
    return payload;
  }
  if ("bytecode" in payload) {
    return generateTransactionPayload(payload);
  }
  if (aptosConfig) {
    return payload.abi !== void 0 ? generateTransactionPayloadWithABI({ ...payload, abi: payload.abi }) : generateTransactionPayload({ aptosConfig, ...payload });
  }
  const entryFunctionPayload = {
    arguments: payload.functionArguments.map(convertToSerializableArgument),
    function: payload.function,
    type: "entry_function_payload",
    type_arguments: (payload.typeArguments ?? []).map((ta) => ta.toString())
  };
  return "multisigAddress" in payload ? {
    multisig_address: AccountAddress.from(payload.multisigAddress).toString(),
    transaction_payload: entryFunctionPayload,
    type: "multisig_payload"
  } : entryFunctionPayload;
}

// src/PairingClient.ts
import { AccountAddress as AccountAddress2 } from "@aptos-labs/ts-sdk";
import {
  NetworkName,
  SigningRequestStatus,
  SigningRequestTypes
} from "@identity-connect/api";
import {
  decodeBase64,
  decryptEnvelope,
  deserializeEd25519PublicKeyB64,
  deserializePublicKeyB64,
  encodeBase64,
  encryptAndSignEnvelope,
  KeyTypes,
  toKey
} from "@identity-connect/crypto";
import {
  deserializeSignTransactionResponseArgs,
  serializeSignAndSubmitTransactionRequestArgs,
  serializeSignTransactionRequestArgs
} from "@identity-connect/wallet-api";
import axios, { AxiosError, isAxiosError } from "axios";

// src/errors.ts
var SignatureRequestError = class _SignatureRequestError extends Error {
  constructor(status) {
    super(status);
    this.name = "SignatureRequestError";
    Object.setPrototypeOf(this, _SignatureRequestError.prototype);
  }
};
var UnexpectedSignatureResponseError = class _UnexpectedSignatureResponseError extends Error {
  constructor(missingFields) {
    const message = `Missing the following fields: ${missingFields.join(", ")}`;
    super(message);
    this.name = "UnexpectedSignatureResponseError";
    Object.setPrototypeOf(this, _UnexpectedSignatureResponseError.prototype);
  }
};
var PairingExpiredError = class _PairingExpiredError extends Error {
  constructor() {
    super();
    this.name = "PairingExpiredError";
    Object.setPrototypeOf(this, _PairingExpiredError.prototype);
  }
};
var UnregisteredDappError = class _UnregisteredDappError extends Error {
  constructor() {
    super("Dapp ID is invalid or not associated with a registered Dapp.");
    this.name = "UnregisteredDappError";
    Object.setPrototypeOf(this, _UnregisteredDappError.prototype);
  }
};

// src/state.ts
var DAPP_PAIRINGS_WINDOW_STORAGE_KEY = "icDappPairings";
var windowStateAccessors = {
  async get(address) {
    const pairings = await this.getAll();
    return pairings[address];
  },
  async getAll() {
    const serialized = window.localStorage.getItem(DAPP_PAIRINGS_WINDOW_STORAGE_KEY);
    return serialized ? JSON.parse(serialized) : {};
  },
  async update(address, pairing) {
    const pairings = await this.getAll();
    if (pairing === void 0) {
      delete pairings[address];
    } else {
      pairings[address] = pairing;
    }
    const newSerialized = JSON.stringify(pairings);
    window.localStorage.setItem(DAPP_PAIRINGS_WINDOW_STORAGE_KEY, newSerialized);
  }
};

// src/utils.ts
var SIGN_MESSAGE_RESPONSE_REQUIRED_FIELDS = [
  "address",
  "application",
  "chainId",
  "fullMessage",
  "message",
  "nonce",
  "prefix",
  "signature"
];
function validateSignMessageResponse(response) {
  const providedFields = new Set(Object.keys(response));
  const missingFields = SIGN_MESSAGE_RESPONSE_REQUIRED_FIELDS.filter((field) => !providedFields.has(field));
  if (missingFields.length > 0) {
    throw new UnexpectedSignatureResponseError(missingFields);
  }
}
var SIGN_AND_SUBMIT_TRANSACTION_RESPONSE_REQUIRED_FIELDS = ["hash"];
function validateSignAndSubmitTransactionResponse(response) {
  const providedFields = new Set(Object.keys(response));
  const missingFields = SIGN_AND_SUBMIT_TRANSACTION_RESPONSE_REQUIRED_FIELDS.filter(
    (field) => !providedFields.has(field)
  );
  if (missingFields.length > 0) {
    throw new UnexpectedSignatureResponseError(missingFields);
  }
}

// src/PairingClient.ts
var API_VERSION = "0.2.0";
var SIGNING_REQUEST_POLLING_INTERVAL = 2500;
var SEQUENCE_NUMBER_MISMATCH_PATTERN = /^Sequence number mismatch, expected (?:\S+ to be )?(\d+)/;
async function waitFor(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
async function withRetries(requestFn, onError, retries = 1) {
  for (let i = 0; i < retries; i += 1) {
    try {
      return await requestFn();
    } catch (err) {
      onError(err);
    }
  }
  return requestFn();
}
var ACPairingClient = class {
  constructor({
    accessors = windowStateAccessors,
    axiosConfig,
    defaultNetworkName = NetworkName.MAINNET
  } = {}) {
    // endregion
    this.onDisconnectListeners = /* @__PURE__ */ new Set();
    this.accessors = accessors;
    this.defaultNetworkName = defaultNetworkName;
    this.axiosInstance = axios.create({
      baseURL: DEFAULT_FRONTEND_URL,
      ...axiosConfig
    });
    const isClientSideRendering = typeof window !== "undefined";
    this.initPromise = isClientSideRendering ? this.syncFirstPairing() : void 0;
  }
  async getPairing(id) {
    const response = await this.axiosInstance.get(`v1/pairing/${id}/`);
    return response.data.data.pairing;
  }
  async syncFirstPairing() {
    const pairings = await this.accessors.getAll();
    const firstPairing = Object.values(pairings)[0];
    if (firstPairing === void 0) {
      return;
    }
    try {
      const { dappSpecificWallet, maxDappSequenceNumber } = await this.getPairing(firstPairing.pairingId);
      await this.accessors.update(firstPairing.accountAddress, {
        ...firstPairing,
        currSequenceNumber: maxDappSequenceNumber,
        dappWalletId: dappSpecificWallet?.id
      });
    } catch (err) {
      await this.accessors.update(firstPairing.accountAddress, void 0);
    }
  }
  async createSigningRequest(pairing, type, networkName, requestBody) {
    const dappEd25519SecretKey = decodeBase64(pairing.dappEd25519SecretKeyB64);
    const dappEd25519PublicKey = decodeBase64(pairing.dappEd25519PublicKeyB64);
    const accountTransportEd25519PublicKey = decodeBase64(pairing.accountTransportEd25519PublicKeyB64);
    let sequenceNumber = pairing.currSequenceNumber + 1;
    return withRetries(
      async () => {
        const requestEnvelope = await encryptAndSignEnvelope(
          toKey(dappEd25519SecretKey, KeyTypes.Ed25519SecretKey),
          toKey(dappEd25519PublicKey, KeyTypes.Ed25519PublicKey),
          toKey(accountTransportEd25519PublicKey, KeyTypes.Ed25519PublicKey),
          sequenceNumber,
          { apiVersion: API_VERSION, networkName, requestType: type },
          requestBody
        );
        const response = await this.axiosInstance.post(
          `v1/pairing/${pairing.pairingId}/signing-request/`,
          requestEnvelope
        );
        await this.accessors.update(pairing.accountAddress, {
          ...pairing,
          currSequenceNumber: sequenceNumber
        });
        return response.data.data.signingRequest;
      },
      (err) => {
        if (isAxiosError(err)) {
          const errorMessage = err.response?.data?.message;
          const expectedSequenceNumber = errorMessage?.match(SEQUENCE_NUMBER_MISMATCH_PATTERN)?.[1];
          if (expectedSequenceNumber !== void 0) {
            sequenceNumber = Number(expectedSequenceNumber);
            return;
          }
        }
        throw err;
      }
    );
  }
  async getSigningRequest(id) {
    const response = await this.axiosInstance.get(
      `v1/signing-request/${id}/`,
      {
        validateStatus: (status) => status === 200 || status === 404
      }
    );
    return response.data?.data?.signingRequest;
  }
  async deletePairing(pairingId, secretKey, publicKey) {
    const requestEnvelope = await encryptAndSignEnvelope(
      secretKey,
      publicKey,
      publicKey,
      0,
      // ignored
      {},
      {}
    );
    await this.axiosInstance.post(
      `v1/pairing/${pairingId}/delete/`,
      requestEnvelope,
      { validateStatus: (status) => status === 204 || status === 404 }
    );
  }
  async cancelSigningRequest(pairing, id) {
    const sequenceNumber = pairing.currSequenceNumber;
    const dappEd25519SecretKey = decodeBase64(pairing.dappEd25519SecretKeyB64);
    const dappEd25519PublicKey = decodeBase64(pairing.dappEd25519PublicKeyB64);
    const accountTransportEd25519PublicKey = decodeBase64(pairing.accountTransportEd25519PublicKeyB64);
    const requestEnvelope = await encryptAndSignEnvelope(
      toKey(dappEd25519SecretKey, KeyTypes.Ed25519SecretKey),
      toKey(dappEd25519PublicKey, KeyTypes.Ed25519PublicKey),
      toKey(accountTransportEd25519PublicKey, KeyTypes.Ed25519PublicKey),
      sequenceNumber + 1,
      {},
      {}
    );
    const response = await this.axiosInstance.patch(
      `v1/signing-request/${id}/cancel/`,
      requestEnvelope
    );
    await this.accessors.update(pairing.accountAddress, {
      ...pairing,
      currSequenceNumber: sequenceNumber + 1
    });
    return response.data.data.signingRequest;
  }
  async signRequest(address, type, requestBody, { cancelToken, networkName } = {}) {
    await this.initPromise;
    const pairing = await this.accessors.get(address);
    if (pairing === void 0) {
      throw new Error("The requested account is not paired");
    }
    let signingRequest;
    try {
      signingRequest = await this.createSigningRequest(
        pairing,
        type,
        networkName || this.defaultNetworkName,
        requestBody
      );
      while (signingRequest.status === "PENDING") {
        await waitFor(SIGNING_REQUEST_POLLING_INTERVAL);
        if (cancelToken?.cancelled) {
          signingRequest.status = SigningRequestStatus.CANCELLED;
          break;
        }
        signingRequest = await this.getSigningRequest(signingRequest.id) ?? signingRequest;
      }
    } catch (err) {
      if (isAxiosError(err) && err.code === "404") {
        await this.accessors.update(address, void 0);
        for (const listener of this.onDisconnectListeners) {
          listener(address);
        }
        throw new PairingExpiredError();
      }
      throw err;
    }
    if (signingRequest.status !== "APPROVED") {
      throw new SignatureRequestError(signingRequest.status);
    }
    const decrypted = decryptEnvelope(
      toKey(decodeBase64(pairing.accountTransportEd25519PublicKeyB64), KeyTypes.Ed25519PublicKey),
      toKey(decodeBase64(pairing.dappEd25519SecretKeyB64), KeyTypes.Ed25519SecretKey),
      signingRequest.responseEnvelope
    );
    return decrypted.privateMessage;
  }
  // region Public API
  /**
   * Requests a connection to an account (internally known as pairing).
   * @returns either the address of the connected account, or undefined if the
   * connection was cancelled.
   */
  async addPairing({ publicKey, secretKey }, finalizedPairing) {
    await this.accessors.update(finalizedPairing.account.accountAddress, {
      accountAddress: finalizedPairing.account.accountAddress,
      accountAlias: finalizedPairing.account.userSubmittedAlias ?? void 0,
      accountPublicKeyB64: finalizedPairing.account.publicKeyB64,
      accountTransportEd25519PublicKeyB64: finalizedPairing.account.transportEd25519PublicKeyB64,
      currSequenceNumber: finalizedPairing.maxDappSequenceNumber,
      dappEd25519PublicKeyB64: encodeBase64(publicKey.key),
      dappEd25519SecretKeyB64: encodeBase64(secretKey.key),
      dappWalletId: finalizedPairing.dappSpecificWalletId,
      pairingId: finalizedPairing.id
    });
  }
  async disconnect(address) {
    const pairing = await this.accessors.get(address);
    if (pairing === void 0) {
      throw new Error("The specified account is not paired");
    }
    const dappEd25519SecretKey = decodeBase64(pairing.dappEd25519SecretKeyB64);
    const dappEd25519PublicKey = decodeBase64(pairing.dappEd25519PublicKeyB64);
    await this.deletePairing(
      pairing.pairingId,
      toKey(dappEd25519SecretKey, KeyTypes.Ed25519SecretKey),
      toKey(dappEd25519PublicKey, KeyTypes.Ed25519PublicKey)
    );
    await this.accessors.update(address, void 0);
    for (const listener of this.onDisconnectListeners) {
      listener(address);
    }
  }
  async signMessage(address, args, options) {
    const response = await this.signRequest(
      address,
      SigningRequestTypes.SIGN_MESSAGE,
      args,
      options
    );
    validateSignMessageResponse(response);
    return response;
  }
  async signTransaction(address, args, options) {
    const serializedRequestArgs = serializeSignTransactionRequestArgs(args);
    const serializedResponseArgs = await this.signRequest(address, SigningRequestTypes.SIGN_TRANSACTION, serializedRequestArgs, options);
    return deserializeSignTransactionResponseArgs(serializedResponseArgs);
  }
  // endregion
  async signAndSubmitTransaction(address, args, options) {
    const serializedRequestArgs = serializeSignAndSubmitTransactionRequestArgs(args);
    try {
      const responseArgs = await this.signRequest(address, SigningRequestTypes.SIGN_AND_SUBMIT_TRANSACTION, serializedRequestArgs, options);
      validateSignAndSubmitTransactionResponse(responseArgs);
      return responseArgs;
    } catch (e) {
      if (e instanceof AxiosError && e.response?.data?.message) {
        throw new Error(e.response?.data?.message);
      }
      throw e;
    }
  }
  async getConnectedAccounts() {
    await this.initPromise;
    const pairings = await this.accessors.getAll();
    return Object.values(pairings).map(
      ({ accountAddress, accountEd25519PublicKeyB64, accountPublicKeyB64 }) => ({
        address: AccountAddress2.from(accountAddress),
        publicKey: accountPublicKeyB64 !== void 0 ? deserializePublicKeyB64(accountPublicKeyB64) : deserializeEd25519PublicKeyB64(accountEd25519PublicKeyB64)
      })
    );
  }
  onDisconnect(listener) {
    this.onDisconnectListeners.add(listener);
    return () => this.onDisconnectListeners.delete(listener);
  }
};

// src/ACDappClient.ts
var ACDappClient = class {
  constructor({
    backendBaseURL,
    dappId,
    dappImageURI,
    dappName,
    defaultNetworkName = NetworkName2.MAINNET,
    frontendBaseURL = DEFAULT_FRONTEND_URL,
    provider = "google",
    tgWebAppURL
  } = {}) {
    this.defaultNetworkName = defaultNetworkName;
    this.dappInfo = {
      domain: window.location.origin,
      imageURI: dappImageURI,
      name: dappName ?? document.title
    };
    this.transport = new WebWalletTransport(frontendBaseURL, provider, tgWebAppURL);
    this.dappId = dappId;
    this.pairingClient = new ACPairingClient({
      axiosConfig: {
        baseURL: backendBaseURL ?? frontendBaseURL
      },
      defaultNetworkName
    });
  }
  // region Public API
  async getKeylessAccounts() {
    const serializedRequest = GetConnectedAccountsRequest.serialize(this.dappInfo);
    const serializedResponse = await this.transport.sendRequest(serializedRequest);
    const response = GetConnectedAccountsResponse.deserialize(serializedResponse);
    return response.args;
  }
  async getIcAccounts() {
    return this.pairingClient.getConnectedAccounts() ?? [];
  }
  async isIcAccount(address) {
    const icAccounts = await this.getIcAccounts();
    return icAccounts.find((account) => account.address.equals(AccountAddress3.from(address))) !== void 0;
  }
  async getConnectedAccounts() {
    const keylessAccounts = await this.getKeylessAccounts();
    const icAccounts = await this.getIcAccounts();
    return [...keylessAccounts, ...icAccounts];
  }
  async disconnect(address) {
    if (await this.isIcAccount(address)) {
      const stringAddress = AccountAddress3.from(address).toString();
      await this.pairingClient.disconnect(stringAddress);
    } else {
      const serializedRequest = DisconnectRequest.serialize(this.dappInfo);
      await this.transport.sendRequest(serializedRequest);
    }
  }
  async connect({
    claimOptions,
    preferredWalletName
  } = {}) {
    const dappKeypair = createEd25519KeyPair();
    const injectedPreferredWalletName = typeof window !== "undefined" ? window.AC_PREFERRED_WALLET_NAME : void 0;
    const requestArgs = {
      claimOptions,
      dappEd25519PublicKeyB64: encodeBase642(dappKeypair.publicKey.key),
      dappId: this.dappId,
      preferredWalletName: preferredWalletName ?? injectedPreferredWalletName
    };
    const serializedRequest = ConnectRequest.serialize(this.dappInfo, requestArgs);
    const serializedResponse = await this.transport.sendRequest(serializedRequest);
    const response = ConnectResponse.deserialize(serializedResponse);
    if (response.args.status === "approved") {
      const { account, pairing } = response.args.args;
      if (pairing) {
        await this.pairingClient.addPairing(dappKeypair, pairing);
      }
      return makeUserApproval({ account });
    }
    return response.args;
  }
  async signIn(args) {
    const serializedRequest = SignInRequest.serialize(this.dappInfo, args);
    const serializedResponse = await this.transport.sendRequest(serializedRequest);
    const response = SignInResponse.deserialize(serializedResponse);
    return response.args;
  }
  async signMessage(args) {
    const { signerAddress } = args;
    if (await this.isIcAccount(signerAddress)) {
      const { chainId } = args;
      const network = chainIdToNetwork(chainId);
      let message;
      let nonce;
      try {
        message = new TextDecoder().decode(args.message);
        nonce = new TextDecoder().decode(args.nonce);
      } catch (err) {
        throw new Error("Only UTF-8 encoded text is supported when using IC");
      }
      const { fullMessage, signature: hexSignature } = await this.pairingClient.signMessage(
        signerAddress.toString(),
        {
          address: true,
          application: true,
          chainId: true,
          message,
          nonce
        },
        { networkName: network }
      );
      const signatureBytes = Hex.fromHexInput(hexSignature).toUint8Array();
      const signature = signatureBytes.length === Ed25519Signature.LENGTH ? new Ed25519Signature(signatureBytes) : AnySignature.deserialize(new Deserializer(signatureBytes));
      return makeUserApproval({
        fullMessage,
        signature
      });
    }
    const serializedRequest = SignMessageRequest.serialize(this.dappInfo, args);
    const serializedResponse = await this.transport.sendRequest(serializedRequest);
    const response = SignMessageResponse.deserialize(serializedResponse);
    return response.args;
  }
  async signTransaction(args) {
    const normalizedArgs = "transaction" in args ? SignTransactionRequest.normalizeArgs(args) : args;
    const { signerAddress } = args;
    if (await this.isIcAccount(signerAddress)) {
      const {
        expirationSecondsFromNow,
        expirationTimestamp,
        feePayer,
        gasUnitPrice,
        maxGasAmount,
        network,
        payload,
        secondarySigners,
        sender,
        sequenceNumber
      } = normalizedArgs;
      if (feePayer !== void 0) {
        throw new Error("Sponsored transaction not currently supported");
      }
      if (secondarySigners && secondarySigners.length > 0) {
        throw new Error("Multi-agent transactions not currently supported");
      }
      if (!("bcsToBytes" in payload)) {
        throw new Error("Payload input format is only supported with Keyless accounts.");
      }
      const responseArgs = await this.pairingClient.signTransaction(
        signerAddress.toString(),
        {
          options: {
            expirationSecondsFromNow,
            expirationTimestamp,
            gasUnitPrice,
            maxGasAmount,
            sender: sender?.address.toString(),
            sequenceNumber: sequenceNumber !== void 0 ? Number(sequenceNumber) : void 0
          },
          payload
        },
        {
          networkName: network
        }
      );
      return makeUserApproval({
        authenticator: responseArgs.accountAuthenticator,
        rawTransaction: responseArgs.rawTxn
      });
    }
    const serializedRequest = SignTransactionRequest.serialize(this.dappInfo, normalizedArgs);
    const serializedResponse = await this.transport.sendRequest(serializedRequest);
    const response = SignTransactionResponse.deserialize(serializedResponse);
    return response.args;
  }
  async signAndSubmitTransaction(args) {
    const { signerAddress } = args;
    if (await this.isIcAccount(signerAddress)) {
      const { expirationTimestamp, feePayer, gasUnitPrice, maxGasAmount, network } = args;
      const aptosConfig = new AptosConfig2({ network });
      let convertedArgs;
      if (feePayer !== void 0) {
        const payload = await normalizePayloadForIC(args.payload, aptosConfig);
        const rawTxn = await generateRawTransaction({
          aptosConfig,
          feePayerAddress: feePayer.address,
          options: {
            gasUnitPrice,
            maxGasAmount
          },
          payload,
          sender: signerAddress
        });
        convertedArgs = {
          feePayerAuthenticator: feePayer.authenticator,
          rawTxn: new FeePayerRawTransaction(rawTxn, [], feePayer.address)
        };
      } else {
        const payload = normalizePayloadForIC(args.payload);
        convertedArgs = {
          options: {
            expirationTimestamp,
            gasUnitPrice,
            maxGasAmount
          },
          payload
        };
      }
      const { hash } = await this.pairingClient.signAndSubmitTransaction(signerAddress.toString(), convertedArgs, {
        networkName: network
      });
      return makeUserApproval({ txnHash: hash });
    }
    const serializedRequest = SignAndSubmitTransactionRequest.serialize(this.dappInfo, args);
    const serializedResponse = await this.transport.sendRequest(serializedRequest);
    const response = SignAndSubmitTransactionResponse.deserialize(serializedResponse);
    return response.args;
  }
  // endregion
};

// src/ICDappClient.ts
import { createEd25519KeyPair as createEd25519KeyPair2, encodeBase64 as encodeBase643 } from "@identity-connect/crypto";
import { isAxiosError as isAxiosError2 } from "axios";

// src/prompt.ts
var DEFAULT_PROMPT_SIZE = { height: 695, width: 465 };
var PROMPT_POLLER_INTERVAL = 500;
function openPrompt(url, size = DEFAULT_PROMPT_SIZE) {
  const { height, width } = size;
  const options = {
    height,
    left: window.screenLeft + Math.round((window.outerWidth - width) / 2),
    popup: true,
    top: window.screenTop + Math.round((window.outerHeight - height) / 2),
    width
  };
  const strOptions = Object.entries(options).map(([key, value]) => `${key}=${JSON.stringify(value)}`).reduce((acc, entry) => `${acc}, ${entry}`);
  const href = url instanceof URL ? url.href : url;
  const promptWindow = window.open(href, void 0, strOptions);
  if (promptWindow === null) {
    throw new Error("Couldn't open prompt");
  }
  return promptWindow;
}
async function waitForPromptResponse(promptWindow) {
  return new Promise((resolve) => {
    const listeners = {
      onMessage: (message) => {
        if (message.source !== promptWindow) {
          return;
        }
        window.removeEventListener("message", listeners.onMessage);
        clearTimeout(listeners.promptPollerId);
        resolve({
          args: message.data,
          status: "approved"
        });
      },
      promptPollerId: setInterval(() => {
        if (promptWindow.closed) {
          window.removeEventListener("message", listeners.onMessage);
          clearTimeout(listeners.promptPollerId);
          resolve({
            status: "dismissed"
          });
        }
      }, PROMPT_POLLER_INTERVAL)
    };
    window.addEventListener("message", listeners.onMessage);
  });
}

// src/ICDappClient.ts
var ICDappClient = class extends ACPairingClient {
  constructor(dappId, { frontendBaseURL = DEFAULT_FRONTEND_URL, ...pairingClientConfig } = {}) {
    super(pairingClientConfig);
    this.dappId = dappId;
    this.frontendBaseURL = frontendBaseURL;
  }
  async createPairingRequest(dappEd25519PublicKeyB64) {
    try {
      const response = await this.axiosInstance.post("v1/pairing/", {
        dappEd25519PublicKeyB64,
        dappId: this.dappId
      });
      return response.data.data.pairing;
    } catch (err) {
      if (isAxiosError2(err) && err.response?.data?.message === "Dapp not found") {
        throw new UnregisteredDappError();
      }
      throw err;
    }
  }
  // region Public API
  /**
   * Requests a connection to an account (internally known as pairing).
   * @returns either the address of the connected account, or undefined if the
   * connection was cancelled.
   */
  async connect() {
    const { publicKey, secretKey } = createEd25519KeyPair2();
    const dappEd25519PublicKeyB64 = encodeBase643(publicKey.key);
    const url = new URL(`${this.frontendBaseURL}/pairing`);
    const promptWindow = await openPrompt(url.href);
    let pairingId;
    try {
      const pendingPairing = await this.createPairingRequest(dappEd25519PublicKeyB64);
      pairingId = pendingPairing.id;
    } catch (err) {
      promptWindow.close();
      throw err;
    }
    url.searchParams.set("pairingId", pairingId);
    promptWindow.location.href = url.href;
    const promptResponse = await waitForPromptResponse(promptWindow);
    if (promptResponse.status === "dismissed") {
      void this.deletePairing(pairingId, secretKey, publicKey);
      return void 0;
    }
    const finalizedPairing = promptResponse.args;
    await this.addPairing({ publicKey, secretKey }, finalizedPairing);
    return finalizedPairing.account.accountAddress;
  }
  async offboard(address) {
    const pairing = await this.accessors.get(address);
    if (pairing === void 0) {
      throw new Error("This account is not paired");
    }
    const walletId = pairing.dappWalletId;
    if (walletId === void 0) {
      throw new Error("This account cannot be offboarded");
    }
    const url = new URL(`${this.frontendBaseURL}/offboarding?walletId=${walletId}`);
    const promptWindow = openPrompt(url);
    const response = await waitForPromptResponse(promptWindow);
    if (response.status === "approved" && response.args.offboarded) {
      this.disconnect(address);
      return true;
    }
    return false;
  }
  // endregion
};

// src/KeylessClient.ts
import {
  ConnectRequest as ConnectRequest2,
  ConnectResponse as ConnectResponse2,
  DisconnectRequest as DisconnectRequest2,
  GetConnectedAccountsRequest as GetConnectedAccountsRequest2,
  GetConnectedAccountsResponse as GetConnectedAccountsResponse2,
  IsConnectedRequest,
  IsConnectedResponse,
  SignAndSubmitTransactionRequest as SignAndSubmitTransactionRequest2,
  SignAndSubmitTransactionResponse as SignAndSubmitTransactionResponse2,
  SignMessageRequest as SignMessageRequest2,
  SignMessageResponse as SignMessageResponse2,
  SignTransactionRequest as SignTransactionRequest2,
  SignTransactionResponse as SignTransactionResponse2
} from "@aptos-connect/wallet-api";
import { WebWalletTransport as WebWalletTransport2 } from "@aptos-connect/web-transport";
import { NetworkName as NetworkName3 } from "@identity-connect/api";
var ACKeylessClient = class {
  constructor({
    dappImageURI,
    dappName,
    defaultNetworkName = NetworkName3.MAINNET,
    frontendBaseURL = DEFAULT_FRONTEND_URL,
    provider = "google"
  } = {}) {
    this.defaultNetworkName = defaultNetworkName;
    this.dappInfo = {
      domain: window.location.origin,
      imageURI: dappImageURI,
      name: dappName ?? document.title
    };
    this.transport = new WebWalletTransport2(frontendBaseURL, provider);
  }
  // region Public API
  async isConnected() {
    const serializedRequest = IsConnectedRequest.serialize(this.dappInfo);
    const serializedResponse = await this.transport.sendRequest(serializedRequest);
    const response = IsConnectedResponse.deserialize(serializedResponse);
    return response.args;
  }
  async getConnectedAccounts() {
    const serializedRequest = GetConnectedAccountsRequest2.serialize(this.dappInfo);
    const serializedResponse = await this.transport.sendRequest(serializedRequest);
    const response = GetConnectedAccountsResponse2.deserialize(serializedResponse);
    return response.args;
  }
  async disconnect() {
    const serializedRequest = DisconnectRequest2.serialize(this.dappInfo);
    await this.transport.sendRequest(serializedRequest);
  }
  async connect() {
    const serializedRequest = ConnectRequest2.serialize(this.dappInfo);
    const serializedResponse = await this.transport.sendRequest(serializedRequest);
    const response = ConnectResponse2.deserialize(serializedResponse);
    return response.args;
  }
  async signMessage(args) {
    const serializedRequest = SignMessageRequest2.serialize(this.dappInfo, args);
    const serializedResponse = await this.transport.sendRequest(serializedRequest);
    const response = SignMessageResponse2.deserialize(serializedResponse);
    return response.args;
  }
  async signTransaction(args) {
    const normalizedArgs = "transaction" in args ? SignTransactionRequest2.normalizeArgs(args) : args;
    const serializedRequest = SignTransactionRequest2.serialize(this.dappInfo, normalizedArgs);
    const serializedResponse = await this.transport.sendRequest(serializedRequest);
    const response = SignTransactionResponse2.deserialize(serializedResponse);
    return response.args;
  }
  async signAndSubmitTransaction(args) {
    const serializedRequest = SignAndSubmitTransactionRequest2.serialize(this.dappInfo, args);
    const serializedResponse = await this.transport.sendRequest(serializedRequest);
    const response = SignAndSubmitTransactionResponse2.deserialize(serializedResponse);
    return response.args;
  }
  // endregion
};
export {
  ACDappClient,
  ACKeylessClient,
  DAPP_PAIRINGS_WINDOW_STORAGE_KEY,
  ICDappClient,
  windowStateAccessors
};
//# sourceMappingURL=index.mjs.map