import { Request, Response } from 'express';
import { DatabaseClient, RedisService } from '@addressflow/server';

export class HealthController {
  constructor(
    private db?: DatabaseClient,
    private redis?: RedisService
  ) {}

  public health = async (_req: Request, res: Response): Promise<void> => {
    res.json({
      status: 'ok',
      service: 'addressflow-api',
      timestamp: new Date().toISOString(),
    });
  };

  public ready = async (_req: Request, res: Response): Promise<void> => {
    const dbHealth = this.db ? await this.db.checkHealth() : { healthy: false, error: 'Database not initialized' };
    const redisHealth = this.redis ? await this.redis.checkHealth() : { healthy: false };

    const isReady = dbHealth.healthy;

    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'ready' : 'not_ready',
      database: dbHealth,
      redis: redisHealth,
      timestamp: new Date().toISOString(),
    });
  };
}
