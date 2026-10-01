export interface CoalescerStats {
  inFlightCount: number;
  totalExecutions: number;
  totalCoalesced: number;
}

export interface RequestCoalescer {
  execute<T>(key: string, task: () => Promise<T>, timeoutMs?: number): Promise<{ result: T; coalesced: boolean }>;
  getStats(): CoalescerStats;
  clear(): void;
}
