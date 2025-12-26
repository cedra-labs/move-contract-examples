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
  DEFAULT_BACKEND_URL: () => DEFAULT_BACKEND_URL,
  NetworkName: () => NetworkName,
  PairingStatus: () => PairingStatus,
  SigningRequestStatus: () => SigningRequestStatus,
  SigningRequestTypes: () => SigningRequestTypes,
  WalletOSEnum: () => WalletOSEnum,
  WalletPlatformEnum: () => WalletPlatformEnum
});
module.exports = __toCommonJS(src_exports);

// src/constants.ts
var DEFAULT_BACKEND_URL = "https://identityconnect.com";

// src/network.ts
var NetworkName = /* @__PURE__ */ ((NetworkName2) => {
  NetworkName2["DEVNET"] = "devnet";
  NetworkName2["MAINNET"] = "mainnet";
  NetworkName2["TESTNET"] = "testnet";
  return NetworkName2;
})(NetworkName || {});

// src/types/pairing.ts
var PairingStatus = /* @__PURE__ */ ((PairingStatus2) => {
  PairingStatus2["Finalized"] = "FINALIZED";
  PairingStatus2["Pending"] = "PENDING";
  return PairingStatus2;
})(PairingStatus || {});

// src/types/signingRequest.ts
var SigningRequestTypes = /* @__PURE__ */ ((SigningRequestTypes2) => {
  SigningRequestTypes2["SIGN_AND_SUBMIT_TRANSACTION"] = "SIGN_AND_SUBMIT_TRANSACTION";
  SigningRequestTypes2["SIGN_MESSAGE"] = "SIGN_MESSAGE";
  SigningRequestTypes2["SIGN_TRANSACTION"] = "SIGN_TRANSACTION";
  return SigningRequestTypes2;
})(SigningRequestTypes || {});
var SigningRequestStatus = /* @__PURE__ */ ((SigningRequestStatus2) => {
  SigningRequestStatus2["APPROVED"] = "APPROVED";
  SigningRequestStatus2["CANCELLED"] = "CANCELLED";
  SigningRequestStatus2["INVALID"] = "INVALID";
  SigningRequestStatus2["PENDING"] = "PENDING";
  SigningRequestStatus2["REJECTED"] = "REJECTED";
  return SigningRequestStatus2;
})(SigningRequestStatus || {});

// src/types/wallet.ts
var WalletOSEnum = /* @__PURE__ */ ((WalletOSEnum2) => {
  WalletOSEnum2["Android"] = "android";
  WalletOSEnum2["IdentityConnect"] = "ic";
  WalletOSEnum2["Linux"] = "linux";
  WalletOSEnum2["Macos"] = "osx";
  WalletOSEnum2["Windows"] = "win";
  WalletOSEnum2["iOS"] = "ios";
  return WalletOSEnum2;
})(WalletOSEnum || {});
var WalletPlatformEnum = /* @__PURE__ */ ((WalletPlatformEnum2) => {
  WalletPlatformEnum2["BraveExtension"] = "brave-extension";
  WalletPlatformEnum2["ChromeExtension"] = "chrome-extension";
  WalletPlatformEnum2["FirefoxExtension"] = "firefox-extension";
  WalletPlatformEnum2["IcDappWallet"] = "ic-dapp-wallet";
  WalletPlatformEnum2["KiwiExtension"] = "kiwi-extension";
  WalletPlatformEnum2["NativeApp"] = "native-app";
  WalletPlatformEnum2["OperaExtension"] = "opera-extension";
  WalletPlatformEnum2["SafariExtension"] = "safari-extension";
  return WalletPlatformEnum2;
})(WalletPlatformEnum || {});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEFAULT_BACKEND_URL,
  NetworkName,
  PairingStatus,
  SigningRequestStatus,
  SigningRequestTypes,
  WalletOSEnum,
  WalletPlatformEnum
});
//# sourceMappingURL=index.js.map