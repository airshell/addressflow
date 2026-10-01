export type AddressFlowErrorCode =
  | 'INVALID_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'LOCATION_OUT_OF_BOUNDS'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_RATE_LIMITED'
  | 'PROVIDER_QUOTA_EXCEEDED'
  | 'PROVIDER_INVALID_RESPONSE'
  | 'NORMALIZATION_ERROR'
  | 'DATABASE_ERROR'
  | 'REDIS_ERROR'
  | 'COALESCING_TIMEOUT'
  | 'INTERNAL_ERROR';

export interface AddressFlowErrorPayload {
  code: AddressFlowErrorCode;
  message: string;
  requestId?: string;
  details?: Record<string, unknown>;
  retryAfterSeconds?: number;
}
