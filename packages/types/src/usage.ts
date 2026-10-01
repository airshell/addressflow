export type UsageEventType =
  | 'search'
  | 'resolve'
  | 'reverse'
  | 'out_of_bounds_blocked'
  | 'application_matched'
  | 'coalesced'
  | 'provider_dispatched';

export interface UsageEvent {
  id: string;
  projectId: string;
  requestId: string;
  eventType: UsageEventType;
  queryHash?: string;
  provider?: string;
  wasCoalesced: boolean;
  matchedApplicationData: boolean;
  wasOutOfBoundsBlocked: boolean;
  latencyMs: number;
  statusCode: number;
  createdAt: string;
}

export interface UsageMetricsSummary {
  projectId: string;
  totalRequests: number;
  applicationMatches: number;
  coalescedRequests: number;
  outOfBoundsBlockedRequests: number;
  providerRequests: number;
  providerErrors: number;
  optimizationRatio: number; // (1 - providerRequests / totalRequests)
  averageLatencyMs: number;
}
