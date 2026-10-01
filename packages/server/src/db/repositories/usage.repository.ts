import { UsageEvent, UsageMetricsSummary } from '@addressflow/types';
import { DatabaseClient } from '../client.js';

export class UsageRepository {
  constructor(private db: DatabaseClient) {}

  public async logEvent(event: Omit<UsageEvent, 'id' | 'createdAt'>): Promise<void> {
    await this.db.query(
      `INSERT INTO usage_events (
         project_id, request_id, event_type, query_hash, provider,
         was_coalesced, matched_application_data, was_out_of_bounds_blocked,
         latency_ms, status_code
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        event.projectId,
        event.requestId,
        event.eventType,
        event.queryHash ?? null,
        event.provider ?? null,
        event.wasCoalesced,
        event.matchedApplicationData,
        event.wasOutOfBoundsBlocked,
        event.latencyMs,
        event.statusCode,
      ]
    );
  }

  public async getMetricsSummary(projectId: string): Promise<UsageMetricsSummary> {
    const rows = await this.db.query<{
      total_requests: string;
      application_matches: string;
      coalesced_requests: string;
      out_of_bounds_blocked: string;
      provider_requests: string;
      provider_errors: string;
      avg_latency_ms: string;
    }>(
      `SELECT
         COUNT(*) AS total_requests,
         COUNT(*) FILTER (WHERE matched_application_data = TRUE) AS application_matches,
         COUNT(*) FILTER (WHERE was_coalesced = TRUE) AS coalesced_requests,
         COUNT(*) FILTER (WHERE was_out_of_bounds_blocked = TRUE) AS out_of_bounds_blocked,
         COUNT(*) FILTER (WHERE provider IS NOT NULL AND was_coalesced = FALSE) AS provider_requests,
         COUNT(*) FILTER (WHERE status_code >= 500) AS provider_errors,
         COALESCE(AVG(latency_ms), 0) AS avg_latency_ms
       FROM usage_events
       WHERE project_id = $1`,
      [projectId]
    );

    const r = rows[0] || {};
    const totalRequests = parseInt(r.total_requests || '0', 10);
    const applicationMatches = parseInt(r.application_matches || '0', 10);
    const coalescedRequests = parseInt(r.coalesced_requests || '0', 10);
    const outOfBoundsBlockedRequests = parseInt(r.out_of_bounds_blocked || '0', 10);
    const providerRequests = parseInt(r.provider_requests || '0', 10);
    const providerErrors = parseInt(r.provider_errors || '0', 10);
    const averageLatencyMs = Math.round(parseFloat(r.avg_latency_ms || '0'));

    const optimizationRatio =
      totalRequests > 0 ? parseFloat((1 - providerRequests / totalRequests).toFixed(4)) : 0;

    return {
      projectId,
      totalRequests,
      applicationMatches,
      coalescedRequests,
      outOfBoundsBlockedRequests,
      providerRequests,
      providerErrors,
      optimizationRatio,
      averageLatencyMs,
    };
  }
}
