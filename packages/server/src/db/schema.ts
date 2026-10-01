export const INITIAL_MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(16) NOT NULL,
    hashed_secret VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    rate_limit_max_requests INT DEFAULT 120,
    rate_limit_window_seconds INT DEFAULT 60,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    query_hash VARCHAR(64),
    formatted_address TEXT NOT NULL,
    components JSONB NOT NULL DEFAULT '{}'::jsonb,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    confidence DOUBLE PRECISION DEFAULT 1.0,
    source VARCHAR(50) NOT NULL DEFAULT 'application',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS provider_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address_id UUID NOT NULL REFERENCES addresses(id) ON DELETE CASCADE,
    provider VARCHAR(64) NOT NULL,
    reference_type VARCHAR(64) NOT NULL,
    identifier VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_provider_identifier UNIQUE (provider, identifier)
);

CREATE TABLE IF NOT EXISTS usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    request_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    query_hash VARCHAR(64),
    provider VARCHAR(64),
    was_coalesced BOOLEAN NOT NULL DEFAULT FALSE,
    matched_application_data BOOLEAN NOT NULL DEFAULT FALSE,
    was_out_of_bounds_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    latency_ms INT NOT NULL DEFAULT 0,
    status_code INT NOT NULL DEFAULT 200,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance and multi-tenant isolation
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_project ON api_keys(project_id);
CREATE INDEX IF NOT EXISTS idx_addresses_project_hash ON addresses(project_id, query_hash);
CREATE INDEX IF NOT EXISTS idx_provider_refs_ident ON provider_references(provider, identifier);
CREATE INDEX IF NOT EXISTS idx_usage_project_created ON usage_events(project_id, created_at DESC);
`;
