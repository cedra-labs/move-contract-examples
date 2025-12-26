// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

export function isTelegramMiniApp() {
  return (window as any).TelegramWebviewProxy !== undefined;
}

export * from './openTelegramPrompt';
