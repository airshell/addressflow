import { RedisService } from './client.js';

export class DistributedLock {
  constructor(private redisService?: RedisService) {}

  public async acquireLock(
    lockKey: string,
    token: string,
    ttlMs: number = 5000
  ): Promise<boolean> {
    try {
      if (this.redisService) {
        const client = this.redisService.getClient();
        const res = await client.set(`addressflow:lock:${lockKey}`, token, 'PX', ttlMs, 'NX');
        return res === 'OK';
      }
    } catch {
      // Fallback
    }
    return true; // Single node fallback
  }

  public async releaseLock(lockKey: string, token: string): Promise<void> {
    try {
      if (this.redisService) {
        const client = this.redisService.getClient();
        const luaScript = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `;
        await client.eval(luaScript, 1, `addressflow:lock:${lockKey}`, token);
      }
    } catch {
      // Ignore
    }
  }
}
