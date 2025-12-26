/**
 * The AsyncQueue class is an async-aware data structure that provides a queue-like
 * behavior for managing asynchronous tasks or operations.
 * It allows to enqueue items and dequeue them asynchronously.
 * This is not thread-safe, but it is async concurrency safe, and
 * it does not guarantee ordering for those that call into and await on enqueue.
 * @group Implementation
 * @category Transactions
 */
declare class AsyncQueue<T> {
    readonly queue: T[];
    private pendingDequeue;
    private cancelled;
    /**
     * Adds an item to the queue. If there are pending dequeued promises, it resolves the oldest promise with the enqueued item
     * immediately; otherwise, it adds the item to the queue.
     *
     * @param item - The item to be added to the queue.
     * @group Implementation
     * @category Transactions
     */
    enqueue(item: T): void;
    /**
     * Dequeues the next item from the queue and returns a promise that resolves to it.
     * If the queue is empty, it creates a new promise that will be resolved when an item is enqueued.
     *
     * @returns Promise<T>
     * @group Implementation
     * @category Transactions
     */
    dequeue(): Promise<T>;
    /**
     * Determine whether the queue is empty.
     *
     * @returns boolean - Returns true if the queue has no elements, otherwise false.
     * @group Implementation
     * @category Transactions
     */
    isEmpty(): boolean;
    /**
     * Cancels all pending promises in the queue and rejects them with an AsyncQueueCancelledError.
     * This ensures that any awaiting code can handle the cancellation appropriately.
     *
     * @returns {void}
     * @group Implementation
     * @category Transactions
     */
    cancel(): void;
    /**
     * Determine whether the queue has been cancelled.
     *
     * @returns boolean - Returns true if the queue is cancelled, otherwise false.
     * @group Implementation
     * @category Transactions
     */
    isCancelled(): boolean;
    /**
     * Retrieve the length of the pending dequeue.
     *
     * @returns number - The number of items currently in the pending dequeue.
     * @group Implementation
     * @category Transactions
     */
    pendingDequeueLength(): number;
}
/**
 * Represents an error that occurs when an asynchronous queue operation is cancelled.
 * This error extends the built-in Error class to provide additional context for cancellation events.
 *
 * @extends Error
 * @group Implementation
 * @category Transactions
 */
declare class AsyncQueueCancelledError extends Error {
}

export { AsyncQueue, AsyncQueueCancelledError };
