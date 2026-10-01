import { Pool, PoolConfig } from 'pg';

export interface DatabaseConfig {
  connectionString?: string;
  maxConnections?: number;
}

export class DatabaseClient {
  private pool: Pool | null = null;
  private isConnected = false;
  public get connected(): boolean { return this.isConnected; }

  constructor(private config: DatabaseConfig = {}) {}

  public getPool(): Pool {
    if (!this.pool) {
      const poolConfig: PoolConfig = {
        connectionString: this.config.connectionString ?? process.env.DATABASE_URL,
        max: this.config.maxConnections ?? 20,
      };
      this.pool = new Pool(poolConfig);
    }
    return this.pool;
  }

  public async query<T = unknown>(text: string, params: unknown[] = []): Promise<T[]> {
    const pool = this.getPool();
    const result = await pool.query(text, params);
    return result.rows as T[];
  }

  public async checkHealth(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      await this.query('SELECT 1');
      return { healthy: true, latencyMs: Date.now() - start };
    } catch (err) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : 'Database error',
      };
    }
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
