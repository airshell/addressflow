import { GeoBoundingBox } from './address.js';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSettings {
  allowedCountryCodes?: string[]; // e.g. ["IN"] or ["US", "CA"]
  allowedBounds?: GeoBoundingBox;
  disallowedRegions?: string[];
  outOfBoundsAction?: 'reject' | 'empty_results';
  defaultProvider?: string;
  enableCoalescing?: boolean;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  projectId: string;
  name: string;
  keyPrefix: string;
  hashedSecret: string;
  status: 'active' | 'revoked';
  rateLimitMaxRequests?: number;
  rateLimitWindowSeconds?: number;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface AuthenticatedContext {
  organizationId: string;
  projectId: string;
  apiKeyId: string;
  settings: ProjectSettings;
}
