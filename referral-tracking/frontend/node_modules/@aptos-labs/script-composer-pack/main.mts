// @ts-ignore
import * as wasmModule from './node_modules/@aptos-labs/aptos-dynamic-transaction-composer/aptos_dynamic_transaction_composer_bg.wasm';
export * from "./node_modules/@aptos-labs/aptos-dynamic-transaction-composer/aptos_dynamic_transaction_composer.js";
export class ScriptComposerWasm  {
    static wasm?: WebAssembly.Module;

    static isInitialized = false;

    static init() {
        if (!this.isInitialized) {
            this.wasm = new WebAssembly.Module(new Uint8Array(wasmModule.default));
            this.isInitialized = true;
        }
    }
}
