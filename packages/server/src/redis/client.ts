import Redis from 'ioredis';

export class RedisService {
  private client: Redis | null = null;
  private isConnected = false;
  public get connected(): boolean { return this.isConnected; }

  constructor(private url?: string) {}

  public getClient(): Redis {
    if (!this.client) {
      const redisUrl = this.url ?? process.env.REDIS_URL ?? 'redis://localhost:6379';
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy: () => null, // Don't hang on connection failure
      });

      this.client.on('connect', () => {
        this.isConnected = true;
      });

      this.client.on('error', () => {
        this.isConnected = false;
      });
    }
    return this.client;
  }

  public async checkHealth(): Promise<{ healthy: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      const client = this.getClient();
      await client.ping();
      return { healthy: true, latencyMs: Date.now() - start };
    } catch {
      return { healthy: false, latencyMs: Date.now() - start };
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit().catch(() => {});
      this.client = null;
    }
  }
}
