import { RequestCoalescer, CoalescerStats } from './coalescer.js';

interface InFlightEntry<T> {
  promise: Promise<T>;
  createdAt: number;
  waitersCount: number;
}

export class MemoryRequestCoalescer implements RequestCoalescer {
  private inFlight = new Map<string, InFlightEntry<unknown>>();
  private totalExecutions = 0;
  private totalCoalesced = 0;
  private defaultTimeoutMs: number;

  constructor(defaultTimeoutMs: number = 10000) {
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  public async execute<T>(
    key: string,
    task: () => Promise<T>,
    timeoutMs?: number
  ): Promise<{ result: T; coalesced: boolean }> {
    const existing = this.inFlight.get(key) as InFlightEntry<T> | undefined;

    if (existing) {
      existing.waitersCount++;
      this.totalCoalesced++;
      const result = await existing.promise;
      return { result, coalesced: true };
    }

    this.totalExecutions++;
    const effectiveTimeout = timeoutMs ?? this.defaultTimeoutMs;

    let timeoutId: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        this.inFlight.delete(key);
        reject(new Error(`Coalescing operation timed out after ${effectiveTimeout}ms for key ${key}`));
      }, effectiveTimeout);
    });

    const executionPromise = (async () => {
      try {
        const value = await Promise.race([task(), timeoutPromise]);
        return value;
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, {
      promise: executionPromise,
      createdAt: Date.now(),
      waitersCount: 0,
    });

    const result = await executionPromise;
    return { result, coalesced: false };
  }

  public getStats(): CoalescerStats {
    return {
      inFlightCount: this.inFlight.size,
      totalExecutions: this.totalExecutions,
      totalCoalesced: this.totalCoalesced,
    };
  }

  public clear(): void {
    this.inFlight.clear();
  }
}
