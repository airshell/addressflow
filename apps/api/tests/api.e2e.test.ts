import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { DefaultProviderRouter } from '@addressflow/core';
import { MockAddressProvider } from '@addressflow/provider-mock';
import { NominatimAddressProvider } from '@addressflow/provider-nominatim';
import { GoogleAddressProvider } from '@addressflow/provider-google';
import { MapboxAddressProvider } from '@addressflow/provider-mapbox';
import { AddressFlowService } from '@addressflow/server';

describe('AddressFlow REST API End-to-End', () => {
  let app: any;
  let mockProvider: MockAddressProvider;

  beforeAll(() => {
    const router = new DefaultProviderRouter('mock');
    mockProvider = new MockAddressProvider();
    router.registerProvider(mockProvider);

    const nominatim = new NominatimAddressProvider();
    router.registerProvider(nominatim);
    router.registerProvider({
      ...nominatim,
      name: 'openstreetmap',
      capabilities: nominatim.capabilities,
      search: (req) => nominatim.search(req),
      resolve: (req) => nominatim.resolve(req),
      reverseGeocode: (req) => nominatim.reverseGeocode(req),
      checkHealth: () => nominatim.checkHealth(),
    });

    const google = new GoogleAddressProvider({ apiKey: 'dummy-key' });
    router.registerProvider(google);

    const mapbox = new MapboxAddressProvider({ accessToken: 'dummy-token' });
    router.registerProvider(mapbox);

    const dummyAddressRepo = {
      findByQueryHash: async () => null,
      saveAddress: async () => 'addr_mock_saved',
    } as any;

    const dummyUsageRepo = {
      logEvent: async () => {},
      getMetricsSummary: async (pId: string) => ({
        projectId: pId,
        totalRequests: 1,
        applicationMatches: 0,
        coalescedRequests: 0,
        outOfBoundsBlockedRequests: 1,
        providerRequests: 0,
        providerErrors: 0,
        optimizationRatio: 1.0,
        averageLatencyMs: 5,
      }),
    } as any;

    const service = new AddressFlowService({
      addressRepo: dummyAddressRepo,
      usageRepo: dummyUsageRepo,
      router,
    });

    app = createApp({
      router,
      service,
      addressRepo: dummyAddressRepo,
      usageRepo: dummyUsageRepo,
    });
  });

  it('GET /health returns status ok without requiring auth', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('addressflow-api');
  });

  it('rejects unauthenticated requests to /v1/address/search with 401', async () => {
    const res = await request(app)
      .post('/v1/address/search')
      .send({ query: '12 Residency Road' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('accepts search request with valid test API key and returns normalized results', async () => {
    const res = await request(app)
      .post('/v1/address/search')
      .set('Authorization', 'Bearer af_test_mock_key')
      .send({ query: '12 Residency Road', countryCode: 'IN' });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.requestId).toBeDefined();
    expect(res.body.meta.provider).toBe('mock');
  });

  it('short-circuits out-of-bounds geographic queries with 400 LOCATION_OUT_OF_BOUNDS and 0 provider calls', async () => {
    const initialCallCount = mockProvider.searchCallCount;

    const res = await request(app)
      .post('/v1/address/search')
      .set('Authorization', 'Bearer af_test_mock_key')
      .send({ query: 'Main Souq, Doha, Qatar' }); // Qatar is not in allowed ['US', 'IN']

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('LOCATION_OUT_OF_BOUNDS');
    expect(res.body.error.message).toContain('prohibited country/countries [QA]');

    // Crucial cost check: Provider was never called!
    expect(mockProvider.searchCallCount).toBe(initialCallCount);
  });

  it('GET /v1/providers returns Mapbox, OpenStreetMap, Leaflet, and MapLibre in providers list', async () => {
    const res = await request(app)
      .get('/v1/providers')
      .set('Authorization', 'Bearer af_test_mock_key');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);

    const providerNames = res.body.data.map((p: any) => p.name);
    expect(providerNames).toContain('mapbox');
    expect(providerNames).toContain('openstreetmap');
    expect(providerNames).toContain('nominatim');
    expect(providerNames).toContain('leaflet');
    expect(providerNames).toContain('maplibre');
    expect(providerNames).toContain('google');

    // Also check structured categorization
    expect(res.body.categories.geocoding).toBeDefined();
    expect(res.body.categories.visualization).toBeDefined();
    const visNames = res.body.categories.visualization.map((v: any) => v.name);
    expect(visNames).toContain('leaflet');
    expect(visNames).toContain('maplibre');
  });

  it('GET /v1/usage returns optimization metrics', async () => {
    const res = await request(app)
      .get('/v1/usage')
      .set('Authorization', 'Bearer af_test_mock_key');

    expect(res.status).toBe(200);
    expect(res.body.data.optimizationRatio).toBe(1.0);
  });
});
