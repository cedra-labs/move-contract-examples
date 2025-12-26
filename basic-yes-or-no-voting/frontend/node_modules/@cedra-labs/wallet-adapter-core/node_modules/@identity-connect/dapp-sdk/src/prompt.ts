// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

const DEFAULT_PROMPT_SIZE = { height: 695, width: 465 };
const PROMPT_POLLER_INTERVAL = 500;

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

export interface PromptApproval<TResponseArgs> {
  args: TResponseArgs;
  status: 'approved';
}

export interface PromptDismissal {
  status: 'dismissed';
}

export type PromptResponse<TResponseArgs> = PromptApproval<TResponseArgs> | PromptDismissal;

export async function waitForPromptResponse<TResponseArgs>(promptWindow: Window) {
  return new Promise<PromptResponse<TResponseArgs>>((resolve) => {
    const listeners = {
      onMessage: (message: MessageEvent) => {
        if (message.source !== promptWindow) {
          return;
        }
        window.removeEventListener('message', listeners.onMessage);
        clearTimeout(listeners.promptPollerId);
        resolve({
          args: message.data,
          status: 'approved',
        });
      },
      promptPollerId: setInterval(() => {
        if (promptWindow.closed) {
          window.removeEventListener('message', listeners.onMessage);
          clearTimeout(listeners.promptPollerId);
          resolve({
            status: 'dismissed',
          });
        }
      }, PROMPT_POLLER_INTERVAL),
    };

    window.addEventListener('message', listeners.onMessage);
  });
}
