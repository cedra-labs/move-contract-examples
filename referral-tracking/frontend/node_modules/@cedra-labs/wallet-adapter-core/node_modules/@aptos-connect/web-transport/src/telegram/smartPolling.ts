// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable no-await-in-loop */

/**
 * How long to wait after resuming before trying to fetch the resource again.
 * This gives time for the underlying resource to be persisted.
 */
const ON_RESUME_DELAY = 300;

/**
 * How often to poll for the resource when the window is in the foreground.
 * This should typically not be needed, but it's a good fallback in case we
 * can't detect whether the window is in the background
 */
const FG_RESPONSE_POLLING_INTERVAL = 2000;

/**
 * Polling interval when the window is in the background.
 * This can be arbitrarily long, but it's still good to keep polling as fallback.
 */
const BG_RESPONSE_POLLING_INTERVAL = 3000;

/**
 * Given there's no "cancel" mechanism for polling, we should time out the polling after
 * an arbitrarily long time to prevent memory leaks.
 */
const POLLING_TIMEOUT = 5 * 60000;

export interface Timer extends Promise<void> {
  cancel: () => void;
}

function waitFor(milliseconds: number): Timer {
  let timeoutId: ReturnType<typeof setTimeout>;
  let cancel = () => {};
  const timer = new Promise((resolve) => {
    timeoutId = setTimeout(resolve, milliseconds);
    cancel = () => {
      clearTimeout(timeoutId);
      resolve();
    };
  }) as Timer;
  timer.cancel = cancel;
  return timer;
}

/**
 * Smart polling function that tries to reduce as much as possible the number of requests,
 * while still returning quickly after the resource becomes available.
 */
export async function smartPolling(callback: () => Promise<Response>): Promise<Response> {
  let timer: Timer | undefined;
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

  window.addEventListener('focus', onWindowFocus);
  window.addEventListener('blur', onWindowBlur);

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
    throw new Error('Timeout');
  } finally {
    window.removeEventListener('focus', onWindowFocus);
    window.removeEventListener('blur', onWindowFocus);
  }
}
