import { createHash, timingSafeEqual } from 'node:crypto';
import { AuthenticatedContext } from '@addressflow/types';
import { DatabaseClient } from '../client.js';

export function hashApiSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

export class ApiKeyRepository {
  constructor(private db: DatabaseClient) {}

  public async authenticateKey(rawKey: string): Promise<AuthenticatedContext | null> {
    if (!rawKey || typeof rawKey !== 'string') return null;

    // Keys are formatted as af_live_<secret> or af_test_<secret>
    const hashed = hashApiSecret(rawKey);

    const rows = await this.db.query<{
      key_id: string;
      project_id: string;
      organization_id: string;
      settings: any;
      hashed_secret: string;
      status: string;
      expires_at: Date | null;
    }>(
      `SELECT 
         k.id AS key_id,
         k.project_id,
         k.hashed_secret,
         k.status,
         k.expires_at,
         p.organization_id,
         p.settings
       FROM api_keys k
       JOIN projects p ON p.id = k.project_id
       WHERE k.hashed_secret = $1 AND k.status = 'active'`,
      [hashed]
    );

    if (rows.length === 0) return null;
    const row = rows[0];

    // Expiration check
    if (row.expires_at && new Date() > new Date(row.expires_at)) {
      return null;
    }

    // Constant-time check
    const storedBuf = Buffer.from(row.hashed_secret, 'hex');
    const inputBuf = Buffer.from(hashed, 'hex');
    if (storedBuf.length !== inputBuf.length || !timingSafeEqual(storedBuf, inputBuf)) {
      return null;
    }

    // Update last_used_at asynchronously
    this.db.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [row.key_id]).catch(() => {});

    return {
      apiKeyId: row.key_id,
      projectId: row.project_id,
      organizationId: row.organization_id,
      settings: row.settings || {},
    };
  }
}
