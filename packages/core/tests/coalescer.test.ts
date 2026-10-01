import { describe, it, expect, vi } from 'vitest';
import { MemoryRequestCoalescer } from '../src/coalescing/memory-coalescer.js';

describe('MemoryRequestCoalescer', () => {
  it('coalesces 100 simultaneous requests with the same key into 1 execution', async () => {
    const coalescer = new MemoryRequestCoalescer();
    const task = vi.fn().mockImplementation(async () => {
      // Simulate 50ms provider latency
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { address: '12 Residency Rd, Bangalore' };
    });

    const promises = Array.from({ length: 100 }, () =>
      coalescer.execute('query:hash:123', task)
    );

    const results = await Promise.all(promises);

    expect(task).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(100);

    const firstResult = results[0];
    const otherResults = results.slice(1);

    expect(firstResult.coalesced).toBe(false);
    expect(firstResult.result.address).toBe('12 Residency Rd, Bangalore');

    for (const r of otherResults) {
      expect(r.coalesced).toBe(true);
      expect(r.result.address).toBe('12 Residency Rd, Bangalore');
    }

    const stats = coalescer.getStats();
    expect(stats.totalExecutions).toBe(1);
    expect(stats.totalCoalesced).toBe(99);
    expect(stats.inFlightCount).toBe(0);
  });

  it('cleans up in-flight map when task fails without poisoning subsequent calls', async () => {
    const coalescer = new MemoryRequestCoalescer();
    let attempt = 0;

    const failingTask = async () => {
      attempt++;
      if (attempt === 1) throw new Error('Provider failed temporarily');
      return 'success';
    };

    await expect(coalescer.execute('fail-key', failingTask)).rejects.toThrow('Provider failed temporarily');
    expect(coalescer.getStats().inFlightCount).toBe(0);

    // Second call should retry fresh and succeed
    const retryResult = await coalescer.execute('fail-key', failingTask);
    expect(retryResult.result).toBe('success');
    expect(retryResult.coalesced).toBe(false);
  });
});
