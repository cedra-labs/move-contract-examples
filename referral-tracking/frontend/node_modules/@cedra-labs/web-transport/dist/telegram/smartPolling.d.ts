export interface Timer extends Promise<void> {
    cancel: () => void;
}
/**
 * Smart polling function that tries to reduce as much as possible the number of requests,
 * while still returning quickly after the resource becomes available.
 */
export declare function smartPolling(callback: () => Promise<Response>): Promise<Response>;
//# sourceMappingURL=smartPolling.d.ts.map