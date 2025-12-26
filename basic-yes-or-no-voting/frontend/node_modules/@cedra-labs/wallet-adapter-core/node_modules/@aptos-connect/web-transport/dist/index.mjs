// src/index.ts
import {
  ConnectRequest,
  ConnectResponse as ConnectResponse2,
  DisconnectRequest,
  DisconnectResponse,
  GetConnectedAccountsRequest,
  GetConnectedAccountsResponse,
  IsConnectedRequest,
  IsConnectedResponse,
  SignAndSubmitTransactionRequest,
  SignInRequest,
  SignInResponse,
  SignMessageRequest,
  SignTransactionRequest
} from "@aptos-connect/wallet-api";

// src/prompt.ts
import {
  ConnectResponse,
  isTypedMessage,
  PromptApprovalResponseMessage,
  PromptConnectionRequestMessage,
  PromptConnectionResponseMessage,
  PromptUnauthorizedErrorMessage
} from "@aptos-connect/wallet-api";
var DEFAULT_PROMPT_SIZE = { height: 695, width: 465 };
var PROMPT_POLLER_INTERVAL = 500;
var dismissalSerializedResponse = ConnectResponse.serialize({ status: "dismissed" });
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
        if (isTypedMessage(PromptUnauthorizedErrorMessage, message.data)) {
          window.removeEventListener("message", listeners.onMessage);
          clearTimeout(listeners.promptPollerId);
          reject(new PromptUnauthorizedError());
          return;
        }
        if (isTypedMessage(PromptConnectionRequestMessage, message.data)) {
          promptWindow.postMessage(new PromptConnectionResponseMessage(request), baseUrl);
          return;
        }
        if (isTypedMessage(PromptApprovalResponseMessage, message.data)) {
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
import {
  base64ToBytes,
  bytesToBase64,
  deserializeAccountInfo,
  serializeAccountInfo
} from "@aptos-connect/wallet-api";
import { Deserializer, Serializer } from "@aptos-labs/ts-sdk";
var localDappStateKey = "@aptos-connect/dapp-local-state";
function serializeLocalDappState(state) {
  const serializer = new Serializer();
  serializer.serializeU32AsUleb128(state.connectedAccounts.length);
  for (const account of state.connectedAccounts) {
    serializeAccountInfo(serializer, account);
  }
  return serializer.toUint8Array();
}
function deserializeLocalDappState(serializedValue) {
  const deserializer = new Deserializer(serializedValue);
  const connectedAccountsLength = deserializer.deserializeUleb128AsU32();
  const connectedAccounts = [];
  for (let i = 0; i < connectedAccountsLength; i += 1) {
    connectedAccounts.push(deserializeAccountInfo(deserializer));
  }
  return { connectedAccounts };
}
function getState() {
  const encodedValue = window.localStorage.getItem(localDappStateKey);
  return encodedValue ? deserializeLocalDappState(base64ToBytes(encodedValue)) : { connectedAccounts: [] };
}
function setState(state) {
  const serializedValue = serializeLocalDappState(state);
  const encodedValue = bytesToBase64(serializedValue);
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
import {
  encodePopupWalletRequest,
  makePopupWalletRequestChallenge
} from "@aptos-connect/wallet-api";
import { postEvent as postTelegramEvent } from "@telegram-apps/bridge";
import { v4 as randomUUID } from "uuid";

// src/telegram/createWalletRequest.ts
import {
  bytesToBase64 as bytesToBase642,
  bytesToBase64url,
  encodeWalletRequestBody
} from "@aptos-connect/wallet-api";
async function createWalletRequest(baseUrl, request) {
  const encodedClientIdentityKey = bytesToBase64url(request.clientIdentityKey.toUint8Array());
  const response = await fetch(`${baseUrl}/v1/dapp/clients/${encodedClientIdentityKey}/requests/`, {
    body: JSON.stringify({
      body: encodeWalletRequestBody(request.body),
      id: request.id,
      signature: bytesToBase642(request.signature.toUint8Array()),
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
import { Ed25519PrivateKey } from "@aptos-labs/ts-sdk";
var identityKeyStorageKey = "@aptos-connect/client-identity-key";
function getClientIdentityKey() {
  const serialized = window.localStorage.getItem(identityKeyStorageKey);
  if (serialized) {
    return new Ed25519PrivateKey(serialized);
  }
  const identityKey = Ed25519PrivateKey.generate();
  window.localStorage.setItem(identityKeyStorageKey, identityKey.toString());
  return identityKey;
}

// src/telegram/getWalletResponse.ts
import { base64ToBytes as base64ToBytes2, bytesToBase64url as bytesToBase64url2 } from "@aptos-connect/wallet-api";

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
  const encodedClientIdentityKey = bytesToBase64url2(clientIdentityKey.toUint8Array());
  const url = new URL(`${baseUrl}/v1/dapp/clients/${encodedClientIdentityKey}/requests/${requestId}/response/`);
  const response = await smartPolling(
    () => fetch(url, {
      headers: { Accept: "application/json" },
      method: "get"
    })
  );
  const responseBody = await response.json();
  const data = base64ToBytes2(responseBody.data.body);
  return { data };
}

// src/telegram/openTelegramPrompt.ts
async function openTelegramPrompt(args) {
  const { baseUrl, request: body, tgWebAppUrl = "/AptosConnectBot/AptosConnect" } = args;
  const identityKey = getClientIdentityKey();
  const clientIdentityKey = identityKey.publicKey();
  const requestId = randomUUID();
  const timestamp = Date.now();
  const challenge = makePopupWalletRequestChallenge({ body, id: requestId, timestamp });
  const signature = identityKey.sign(challenge);
  const signedWalletRequest = {
    body,
    clientIdentityKey,
    id: requestId,
    signature,
    timestamp
  };
  let encodedRequest = encodePopupWalletRequest(signedWalletRequest);
  if (encodedRequest.length > 1024) {
    void createWalletRequest(baseUrl, signedWalletRequest);
    encodedRequest = encodePopupWalletRequest({
      clientIdentityKey,
      id: requestId,
      signature,
      timestamp
    });
  }
  postTelegramEvent("web_app_open_tg_link", {
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
      case IsConnectedRequest.name: {
        const connectedAccounts = getConnectedAccounts();
        return IsConnectedResponse.serialize(connectedAccounts.length > 0);
      }
      case GetConnectedAccountsRequest.name: {
        const connectedAccounts = getConnectedAccounts();
        return GetConnectedAccountsResponse.serialize(connectedAccounts);
      }
      case ConnectRequest.name: {
        const serializedResponse = await this.sendPromptRequest(request);
        const response = ConnectResponse2.deserialize(serializedResponse);
        if (response.args.status === "approved") {
          const { account, pairing } = response.args.args;
          if (pairing === void 0) {
            addConnectedAccount(account);
          }
        }
        return serializedResponse;
      }
      case SignInRequest.name: {
        const serializedResponse = await this.sendPromptRequest(request);
        const response = SignInResponse.deserialize(serializedResponse);
        if (response.args.status === "approved") {
          const { account } = response.args.args;
          addConnectedAccount(account);
        }
        return serializedResponse;
      }
      case DisconnectRequest.name: {
        const [activeAccount] = getConnectedAccounts();
        if (activeAccount) {
          removeConnectedAccount(activeAccount.address);
        }
        return DisconnectResponse.serialize({});
      }
      case SignMessageRequest.name:
      case SignTransactionRequest.name:
      case SignAndSubmitTransactionRequest.name: {
        return this.sendPromptRequest(request);
      }
      default: {
        throw new Error("Unexpected request");
      }
    }
  }
};
export {
  WebWalletTransport
};
//# sourceMappingURL=index.mjs.map