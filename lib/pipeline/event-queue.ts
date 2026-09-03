/**
 * A minimal push-based async queue.
 *
 * The pipeline stages are ordinary async functions that report progress through
 * a synchronous callback. The transport needs an async iterable. This bridges
 * the two without buffering: an event pushed while a stage is still running is
 * delivered to the client immediately, which is the whole point of streaming a
 * seven-stage clinical pipeline rather than posting the verdict at the end.
 */
export class EventQueue<T> implements AsyncIterable<T> {
  private items: T[] = [];
  private waiting: Array<(r: IteratorResult<T>) => void> = [];
  private closed = false;
  private failure: unknown = null;

  push(item: T): void {
    if (this.closed) return;
    const waiter = this.waiting.shift();
    if (waiter) waiter({ value: item, done: false });
    else this.items.push(item);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    while (this.waiting.length) {
      this.waiting.shift()!({ value: undefined as never, done: true });
    }
  }

  fail(error: unknown): void {
    this.failure = error;
    this.close();
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: (): Promise<IteratorResult<T>> => {
        if (this.items.length) {
          return Promise.resolve({ value: this.items.shift()!, done: false });
        }
        if (this.closed) {
          if (this.failure) return Promise.reject(this.failure);
          return Promise.resolve({ value: undefined as never, done: true });
        }
        return new Promise((resolve) => this.waiting.push(resolve));
      },
    };
  }
}
