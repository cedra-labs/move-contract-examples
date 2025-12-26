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
  WebWalletTransport: () => WebWalletTransport
});
module.exports = __toCommonJS(src_exports);
var import_wallet_api6 = require("@aptos-connect/wallet-api");

// src/prompt.ts
var import_wallet_api = require("@aptos-connect/wallet-api");
var DEFAULT_PROMPT_SIZE = { height: 695, width: 465 };
var PROMPT_POLLER_INTERVAL = 500;
var dismissalSerializedResponse = import_wallet_api.ConnectResponse.serialize({ status: "dismissed" });
var PromptUnauthorizedError = class extends Error {
  constructor() {
    super("Unauthorized");
  }
};
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
async function waitForPromptResponse(baseUrl, promptWindow, request) {
  return new Promise((resolve, reject) => {
    const listeners = {
      onMessage: (message) => {
        if (message.source !== promptWindow || message.origin !== baseUrl) {
          return;
        }
        if ((0, import_wallet_api.isTypedMessage)(import_wallet_api.PromptUnauthorizedErrorMessage, message.data)) {
          window.removeEventListener("message", listeners.onMessage);
          clearTimeout(listeners.promptPollerId);
          reject(new PromptUnauthorizedError());
          return;
        }
        if ((0, import_wallet_api.isTypedMessage)(import_wallet_api.PromptConnectionRequestMessage, message.data)) {
          promptWindow.postMessage(new import_wallet_api.PromptConnectionResponseMessage(request), baseUrl);
          return;
        }
        if ((0, import_wallet_api.isTypedMessage)(import_wallet_api.PromptApprovalResponseMessage, message.data)) {
          window.removeEventListener("message", listeners.onMessage);
          clearTimeout(listeners.promptPollerId);
          resolve(message.data.serializedValue);
        }
      },
      promptPollerId: setInterval(() => {
        if (promptWindow.closed) {
          window.removeEventListener("message", listeners.onMessage);
          clearTimeout(listeners.promptPollerId);
          resolve(dismissalSerializedResponse);
        }
      }, PROMPT_POLLER_INTERVAL)
    };
    window.addEventListener("message", listeners.onMessage);
  });
}

// src/state.ts
var import_wallet_api2 = require("@aptos-connect/wallet-api");
var import_ts_sdk = require("@aptos-labs/ts-sdk");
var localDappStateKey = "@aptos-connect/dapp-local-state";
function serializeLocalDappState(state) {
  const serializer = new import_ts_sdk.Serializer();
  serializer.serializeU32AsUleb128(state.connectedAccounts.length);
  for (const account of state.connectedAccounts) {
    (0, import_wallet_api2.serializeAccountInfo)(serializer, account);
  }
  return serializer.toUint8Array();
}
function deserializeLocalDappState(serializedValue) {
  const deserializer = new import_ts_sdk.Deserializer(serializedValue);
  const connectedAccountsLength = deserializer.deserializeUleb128AsU32();
  const connectedAccounts = [];
  for (let i = 0; i < connectedAccountsLength; i += 1) {
    connectedAccounts.push((0, import_wallet_api2.deserializeAccountInfo)(deserializer));
  }
  return { connectedAccounts };
}
function getState() {
  const encodedValue = window.localStorage.getItem(localDappStateKey);
  return encodedValue ? deserializeLocalDappState((0, import_wallet_api2.base64ToBytes)(encodedValue)) : { connectedAccounts: [] };
}
function setState(state) {
  const serializedValue = serializeLocalDappState(state);
  const encodedValue = (0, import_wallet_api2.bytesToBase64)(serializedValue);
  window.localStorage.setItem(localDappStateKey, encodedValue);
}
function getConnectedAccounts() {
  const state = getState();
  return state.connectedAccounts;
}
function addConnectedAccount(account) {
  const { connectedAccounts, ...state } = getState();
  connectedAccounts.push(account);
  setState({ ...state, connectedAccounts });
}
function removeConnectedAccount(address) {
  const { connectedAccounts, ...state } = getState();
  const index = connectedAccounts.findIndex((a) => a.address.equals(address));
  if (index >= 0) {
    connectedAccounts.splice(index, 1);
  }
  setState({ ...state, connectedAccounts });
}

// src/telegram/openTelegramPrompt.ts
var import_wallet_api5 = require("@aptos-connect/wallet-api");
var import_bridge = require("@telegram-apps/bridge");
var import_uuid = require("uuid");

// src/telegram/createWalletRequest.ts
var import_wallet_api3 = require("@aptos-connect/wallet-api");
async function createWalletRequest(baseUrl, request) {
  const encodedClientIdentityKey = (0, import_wallet_api3.bytesToBase64url)(request.clientIdentityKey.toUint8Array());
  const response = await fetch(`${baseUrl}/v1/dapp/clients/${encodedClientIdentityKey}/requests/`, {
    body: JSON.stringify({
      body: (0, import_wallet_api3.encodeWalletRequestBody)(request.body),
      id: request.id,
      signature: (0, import_wallet_api3.bytesToBase64)(request.signature.toUint8Array()),
      timestamp: request.timestamp
    }),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "post"
  });
  if (!response.ok) {
    throw new Error("Failed creating the wallet request");
  }
}

// src/telegram/getClientIdentityKey.ts
var import_ts_sdk2 = require("@aptos-labs/ts-sdk");
var identityKeyStorageKey = "@aptos-connect/client-identity-key";
function getClientIdentityKey() {
  const serialized = window.localStorage.getItem(identityKeyStorageKey);
  if (serialized) {
    return new import_ts_sdk2.Ed25519PrivateKey(serialized);
  }
  const identityKey = import_ts_sdk2.Ed25519PrivateKey.generate();
  window.localStorage.setItem(identityKeyStorageKey, identityKey.toString());
  return identityKey;
}

// src/telegram/getWalletResponse.ts
var import_wallet_api4 = require("@aptos-connect/wallet-api");

// src/telegram/smartPolling.ts
var ON_RESUME_DELAY = 300;
var FG_RESPONSE_POLLING_INTERVAL = 2e3;
var BG_RESPONSE_POLLING_INTERVAL = 3e3;
var POLLING_TIMEOUT = 5 * 6e4;
function waitFor(milliseconds) {
  let timeoutId;
  let cancel = () => {
  };
  const timer = new Promise((resolve) => {
    timeoutId = setTimeout(resolve, milliseconds);
    cancel = () => {
      clearTimeout(timeoutId);
      resolve();
    };
  });
  timer.cancel = cancel;
  return timer;
}
async function smartPolling(callback) {
  let timer;
  let justResumed = false;
  let pollingInterval = BG_RESPONSE_POLLING_INTERVAL;
  const onWindowFocus = () => {
    justResumed = true;
    pollingInterval = FG_RESPONSE_POLLING_INTERVAL;
    timer?.cancel();
  };
  const onWindowBlur = () => {
    pollingInterval = BG_RESPONSE_POLLING_INTERVAL;
  };
  window.addEventListener("focus", onWindowFocus);
  window.addEventListener("blur", onWindowBlur);
  try {
    const startTime = Date.now();
    while (Date.now() - startTime < POLLING_TIMEOUT) {
      timer = waitFor(pollingInterval);
      await timer;
      if (justResumed) {
        timer = waitFor(ON_RESUME_DELAY);
        await timer;
      }
      const response = await callback();
      if (response.status === 200) {
        return response;
      }
      justResumed = false;
    }
    throw new Error("Timeout");
  } finally {
    window.removeEventListener("focus", onWindowFocus);
    window.removeEventListener("blur", onWindowFocus);
  }
}

// src/telegram/getWalletResponse.ts
async function getWalletResponse(baseUrl, clientIdentityKey, requestId) {
  const encodedClientIdentityKey = (0, import_wallet_api4.bytesToBase64url)(clientIdentityKey.toUint8Array());
  const url = new URL(`${baseUrl}/v1/dapp/clients/${encodedClientIdentityKey}/requests/${requestId}/response/`);
  const response = await smartPolling(
    () => fetch(url, {
      headers: { Accept: "application/json" },
      method: "get"
    })
  );
  const responseBody = await response.json();
  const data = (0, import_wallet_api4.base64ToBytes)(responseBody.data.body);
  return { data };
}

// src/telegram/openTelegramPrompt.ts
async function openTelegramPrompt(args) {
  const { baseUrl, request: body, tgWebAppUrl = "/AptosConnectBot/AptosConnect" } = args;
  const identityKey = getClientIdentityKey();
  const clientIdentityKey = identityKey.publicKey();
  const requestId = (0, import_uuid.v4)();
  const timestamp = Date.now();
  const challenge = (0, import_wallet_api5.makePopupWalletRequestChallenge)({ body, id: requestId, timestamp });
  const signature = identityKey.sign(challenge);
  const signedWalletRequest = {
    body,
    clientIdentityKey,
    id: requestId,
    signature,
    timestamp
  };
  let encodedRequest = (0, import_wallet_api5.encodePopupWalletRequest)(signedWalletRequest);
  if (encodedRequest.length > 1024) {
    void createWalletRequest(baseUrl, signedWalletRequest);
    encodedRequest = (0, import_wallet_api5.encodePopupWalletRequest)({
      clientIdentityKey,
      id: requestId,
      signature,
      timestamp
    });
  }
  (0, import_bridge.postEvent)("web_app_open_tg_link", {
    path_full: `${tgWebAppUrl}?startapp=${encodedRequest}`
  });
  return getWalletResponse(baseUrl, clientIdentityKey, requestId);
}

// src/telegram/index.ts
function isTelegramMiniApp() {
  return window.TelegramWebviewProxy !== void 0;
}

// src/index.ts
var WebWalletTransport = class {
  constructor(baseUrl, provider = "google", tgWebAppUrl) {
    this.baseUrl = baseUrl;
    this.provider = provider;
    this.tgWebAppUrl = tgWebAppUrl;
    this.baseUrl = baseUrl;
  }
  async sendPromptRequest(request) {
    if (isTelegramMiniApp()) {
      return openTelegramPrompt({
        baseUrl: this.baseUrl,
        request,
        tgWebAppUrl: this.tgWebAppUrl
      });
    }
    const url = new URL(`${this.baseUrl}/prompt/`);
    url.searchParams.set("provider", this.provider);
    const prompt = openPrompt(url);
    return waitForPromptResponse(this.baseUrl, prompt, request);
  }
  async sendRequest(request) {
    switch (request.name) {
      case import_wallet_api6.IsConnectedRequest.name: {
        const connectedAccounts = getConnectedAccounts();
        return import_wallet_api6.IsConnectedResponse.serialize(connectedAccounts.length > 0);
      }
      case import_wallet_api6.GetConnectedAccountsRequest.name: {
        const connectedAccounts = getConnectedAccounts();
        return import_wallet_api6.GetConnectedAccountsResponse.serialize(connectedAccounts);
      }
      case import_wallet_api6.ConnectRequest.name: {
        const serializedResponse = await this.sendPromptRequest(request);
        const response = import_wallet_api6.ConnectResponse.deserialize(serializedResponse);
        if (response.args.status === "approved") {
          const { account, pairing } = response.args.args;
          if (pairing === void 0) {
            addConnectedAccount(account);
          }
        }
        return serializedResponse;
      }
      case import_wallet_api6.SignInRequest.name: {
        const serializedResponse = await this.sendPromptRequest(request);
        const response = import_wallet_api6.SignInResponse.deserialize(serializedResponse);
        if (response.args.status === "approved") {
          const { account } = response.args.args;
          addConnectedAccount(account);
        }
        return serializedResponse;
      }
      case import_wallet_api6.DisconnectRequest.name: {
        const [activeAccount] = getConnectedAccounts();
        if (activeAccount) {
          removeConnectedAccount(activeAccount.address);
        }
        return import_wallet_api6.DisconnectResponse.serialize({});
      }
      case import_wallet_api6.SignMessageRequest.name:
      case import_wallet_api6.SignTransactionRequest.name:
      case import_wallet_api6.SignAndSubmitTransactionRequest.name: {
        return this.sendPromptRequest(request);
      }
      default: {
        throw new Error("Unexpected request");
      }
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WebWalletTransport
});
//# sourceMappingURL=index.js.map