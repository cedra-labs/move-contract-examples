// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

export function base64ToBytes(base64: string) {
  const binaryString = atob(base64);
  return Uint8Array.from(binaryString, (m) => m.charCodeAt(0));
}

export function bytesToBase64(bytes: Uint8Array) {
  const binaryString = String.fromCharCode(...bytes);
  return btoa(binaryString);
}

export function base64urlToBytes(base64: string) {
  return base64ToBytes(base64.replace(/-/g, '+').replace(/_/g, '/'));
}

export function bytesToBase64url(bytes: Uint8Array) {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
