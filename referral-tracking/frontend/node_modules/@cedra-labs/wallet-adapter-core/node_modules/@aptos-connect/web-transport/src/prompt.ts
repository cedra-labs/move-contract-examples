// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import {
  ConnectResponse,
  isTypedMessage,
  PromptApprovalResponseMessage,
  PromptConnectionRequestMessage,
  PromptConnectionResponseMessage,
  PromptUnauthorizedErrorMessage,
  SerializedWalletRequest,
  SerializedWalletResponse,
} from '@aptos-connect/wallet-api';

const DEFAULT_PROMPT_SIZE = { height: 695, width: 465 };
const PROMPT_POLLER_INTERVAL = 500;

const dismissalSerializedResponse = ConnectResponse.serialize({ status: 'dismissed' });

export class PromptUnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
  }
}

export function openPrompt(url: string | URL, size = DEFAULT_PROMPT_SIZE) {
  const { height, width } = size;
  const options = {
    height,
    left: window.screenLeft + Math.round((window.outerWidth - width) / 2),
    popup: true,
    top: window.screenTop + Math.round((window.outerHeight - height) / 2),
    width,
  };

  const strOptions = Object.entries(options)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .reduce((acc, entry) => `${acc}, ${entry}`);

  const href = url instanceof URL ? url.href : url;
  const promptWindow = window.open(href, undefined, strOptions);
  if (promptWindow === null) {
    throw new Error("Couldn't open prompt");
  }

  return promptWindow;
}

export async function waitForPromptResponse(baseUrl: string, promptWindow: Window, request: SerializedWalletRequest) {
  return new Promise<SerializedWalletResponse>((resolve, reject) => {
    const listeners = {
      onMessage: (message: MessageEvent) => {
        // Ignore messages from untrusted sources
        if (message.source !== promptWindow || message.origin !== baseUrl) {
          return;
        }
        if (isTypedMessage(PromptUnauthorizedErrorMessage, message.data)) {
          window.removeEventListener('message', listeners.onMessage);
          clearTimeout(listeners.promptPollerId);
          reject(new PromptUnauthorizedError());
          return;
        }
        if (isTypedMessage(PromptConnectionRequestMessage, message.data)) {
          promptWindow.postMessage(new PromptConnectionResponseMessage(request), baseUrl);
          return;
        }
        if (isTypedMessage(PromptApprovalResponseMessage, message.data)) {
          window.removeEventListener('message', listeners.onMessage);
          clearTimeout(listeners.promptPollerId);
          resolve(message.data.serializedValue);
        }
      },
      promptPollerId: setInterval(() => {
        if (promptWindow.closed) {
          window.removeEventListener('message', listeners.onMessage);
          clearTimeout(listeners.promptPollerId);
          resolve(dismissalSerializedResponse);
        }
      }, PROMPT_POLLER_INTERVAL),
    };

    window.addEventListener('message', listeners.onMessage);
  });
}
