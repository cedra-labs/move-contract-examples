/* tslint:disable */
/* eslint-disable */
/**
 * Wrapper to decompile script in its serialized form and wrap it with wasm errors.
 * @param {Uint8Array} script
 * @returns {(MoveFunctionCall)[]}
 */
declare function generate_batched_call_payload_wasm(script: Uint8Array): (MoveFunctionCall)[];
declare class AllocatedLocal {
  free(): void;
}
declare class BuilderCall {
  free(): void;
}
/**
 * WASM Representation of CallArgument. This is because wasm_bindgen can only support c-style enum.
 */
declare class CallArgument {
  free(): void;
  /**
   * @param {Uint8Array} bytes
   * @returns {CallArgument}
   */
  static newBytes(bytes: Uint8Array): CallArgument;
  /**
   * @param {number} signer_idx
   * @returns {CallArgument}
   */
  static newSigner(signer_idx: number): CallArgument;
  /**
   * @returns {CallArgument}
   */
  borrow(): CallArgument;
  /**
   * @returns {CallArgument}
   */
  borrowMut(): CallArgument;
  /**
   * @returns {CallArgument}
   */
  copy(): CallArgument;
}
declare class IntoUnderlyingByteSource {
  free(): void;
  /**
   * @param {any} controller
   */
  start(controller: any): void;
  /**
   * @param {any} controller
   * @returns {Promise<any>}
   */
  pull(controller: any): Promise<any>;
  cancel(): void;
  readonly autoAllocateChunkSize: number;
  readonly type: string;
}
declare class IntoUnderlyingSink {
  free(): void;
  /**
   * @param {any} chunk
   * @returns {Promise<any>}
   */
  write(chunk: any): Promise<any>;
  /**
   * @returns {Promise<any>}
   */
  close(): Promise<any>;
  /**
   * @param {any} reason
   * @returns {Promise<any>}
   */
  abort(reason: any): Promise<any>;
}
declare class IntoUnderlyingSource {
  free(): void;
  /**
   * @param {any} controller
   * @returns {Promise<any>}
   */
  pull(controller: any): Promise<any>;
  cancel(): void;
}
/**
 * Calling a Move function.
 *
 * Similar to a public entry function call, but the arguments could specified as `CallArgument`,
 * which can be a return value of a previous `MoveFunctionCall`.
 */
declare class MoveFunctionCall {
  free(): void;
}
/**
 * Raw options for [`pipeTo()`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/pipeTo).
 */
declare class PipeOptions {
  free(): void;
  readonly preventAbort: boolean;
  readonly preventCancel: boolean;
  readonly preventClose: boolean;
  readonly signal: AbortSignal | undefined;
}
/**
 * Representing a returned value from a previous list of `MoveFunctionCall`s.
 */
declare class PreviousResult {
  free(): void;
}
declare class QueuingStrategy {
  free(): void;
  readonly highWaterMark: number;
}
/**
 * Raw options for [`getReader()`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/getReader).
 */
declare class ReadableStreamGetReaderOptions {
  free(): void;
  readonly mode: any;
}
declare class TransactionComposer {
  free(): void;
  /**
   * Create a builder with one distinct signer available. This should be the default configuration.
   * @returns {TransactionComposer}
   */
  static single_signer(): TransactionComposer;
  /**
   * Create a builder with one signer needed for script. This would be needed for multi-agent
   * transaction where multiple signers are present.
   * @param {number} signer_count
   * @returns {TransactionComposer}
   */
  static multi_signer(signer_count: number): TransactionComposer;
  /**
   * Consume the builder and generate a serialized script with calls in the builder.
   * @param {boolean} with_metadata
   * @returns {Uint8Array}
   */
  generate_batched_calls(with_metadata: boolean): Uint8Array;
  /**
   * Load up a module from a remote endpoint. Will need to invoke this function prior to the
   * call.
   * @param {string} api_url
   * @param {string} module_name
   * @returns {Promise<void>}
   */
  load_module(api_url: string, module_name: string): Promise<void>;
  /**
   * Load up the dependency modules of a TypeTag from a remote endpoint.
   * @param {string} api_url
   * @param {string} type_tag
   * @returns {Promise<void>}
   */
  load_type_tag(api_url: string, type_tag: string): Promise<void>;
  /**
   * This would be the core api for the `TransactionComposer`. The function would:
   * - add the function call to the builder
   * - allocate the locals and parameters needed for this function call
   * - return the arguments back to the caller which could be passed into subsequent calls
   *   into `add_batched_call`.
   *
   * This function would also check for the ability and type safety when passing values
   * into the function call, and will abort if there's a violation.
   * @param {string} module
   * @param {string} _function
   * @param {(string)[]} ty_args
   * @param {(CallArgument)[]} args
   * @returns {(CallArgument)[]}
   */
  add_batched_call(module: string, _function: string, ty_args: (string)[], args: (CallArgument)[]): (CallArgument)[];
}

type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_allocatedlocal_free: (a: number, b: number) => void;
  readonly __wbg_buildercall_free: (a: number, b: number) => void;
  readonly __wbg_transactioncomposer_free: (a: number, b: number) => void;
  readonly transactioncomposer_single_signer: () => number;
  readonly transactioncomposer_multi_signer: (a: number) => number;
  readonly transactioncomposer_generate_batched_calls: (a: number, b: number, c: number) => void;
  readonly transactioncomposer_load_module: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly transactioncomposer_load_type_tag: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly transactioncomposer_add_batched_call: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => void;
  readonly __wbg_callargument_free: (a: number, b: number) => void;
  readonly callargument_newBytes: (a: number, b: number) => number;
  readonly callargument_newSigner: (a: number) => number;
  readonly callargument_borrow: (a: number, b: number) => void;
  readonly callargument_borrowMut: (a: number, b: number) => void;
  readonly callargument_copy: (a: number, b: number) => void;
  readonly generate_batched_call_payload_wasm: (a: number, b: number, c: number) => void;
  readonly __wbg_previousresult_free: (a: number, b: number) => void;
  readonly __wbg_movefunctioncall_free: (a: number, b: number) => void;
  readonly __wbg_readablestreamgetreaderoptions_free: (a: number, b: number) => void;
  readonly readablestreamgetreaderoptions_mode: (a: number) => number;
  readonly __wbg_pipeoptions_free: (a: number, b: number) => void;
  readonly pipeoptions_preventClose: (a: number) => number;
  readonly pipeoptions_preventCancel: (a: number) => number;
  readonly pipeoptions_preventAbort: (a: number) => number;
  readonly pipeoptions_signal: (a: number) => number;
  readonly __wbg_intounderlyingsource_free: (a: number, b: number) => void;
  readonly intounderlyingsource_pull: (a: number, b: number) => number;
  readonly intounderlyingsource_cancel: (a: number) => void;
  readonly __wbg_intounderlyingbytesource_free: (a: number, b: number) => void;
  readonly intounderlyingbytesource_type: (a: number, b: number) => void;
  readonly intounderlyingbytesource_autoAllocateChunkSize: (a: number) => number;
  readonly intounderlyingbytesource_start: (a: number, b: number) => void;
  readonly intounderlyingbytesource_pull: (a: number, b: number) => number;
  readonly intounderlyingbytesource_cancel: (a: number) => void;
  readonly __wbg_queuingstrategy_free: (a: number, b: number) => void;
  readonly queuingstrategy_highWaterMark: (a: number) => number;
  readonly __wbg_intounderlyingsink_free: (a: number, b: number) => void;
  readonly intounderlyingsink_write: (a: number, b: number) => number;
  readonly intounderlyingsink_close: (a: number) => number;
  readonly intounderlyingsink_abort: (a: number, b: number) => number;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_export_2: WebAssembly.Table;
  readonly _dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h05d404cb64162693: (a: number, b: number, c: number) => void;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly wasm_bindgen__convert__closures__invoke2_mut__hbdef1ea83a9567de: (a: number, b: number, c: number, d: number) => void;
}

type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
declare function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

declare class ScriptComposerWasm {
    static wasm?: WebAssembly.Module;
    static isInitialized: boolean;
    static init(): void;
}

export { AllocatedLocal, BuilderCall, CallArgument, type InitInput, type InitOutput, IntoUnderlyingByteSource, IntoUnderlyingSink, IntoUnderlyingSource, MoveFunctionCall, PipeOptions, PreviousResult, QueuingStrategy, ReadableStreamGetReaderOptions, ScriptComposerWasm, type SyncInitInput, TransactionComposer, generate_batched_call_payload_wasm, initSync };
