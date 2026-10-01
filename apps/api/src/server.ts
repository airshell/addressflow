import { createApp } from './app.js';
import { config } from './config.js';
import { DefaultProviderRouter } from '@addressflow/core';
import { MockAddressProvider } from '@addressflow/provider-mock';
import { NominatimAddressProvider } from '@addressflow/provider-nominatim';
import { GoogleAddressProvider } from '@addressflow/provider-google';
import { MapboxAddressProvider } from '@addressflow/provider-mapbox';
import {
  DatabaseClient,
  RedisService,
  AddressRepository,
  ApiKeyRepository,
  UsageRepository,
  AddressFlowService,
  DistributedRateLimiter,
} from '@addressflow/server';

async function bootstrap() {
  const router = new DefaultProviderRouter('openstreetmap'); // Default to free OpenStreetMap

  // Register OpenStreetMap / Nominatim Free Provider
  const nominatim = new NominatimAddressProvider({
    baseUrl: config.NOMINATIM_BASE_URL,
    userAgent: config.NOMINATIM_USER_AGENT,
  });
  // Register under both 'openstreetmap' and 'nominatim' for seamless developer lookup
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

  // Register Mapbox Provider if token is present
  if (config.MAPBOX_ACCESS_TOKEN) {
    const mapbox = new MapboxAddressProvider({ accessToken: config.MAPBOX_ACCESS_TOKEN });
    router.registerProvider(mapbox);
  }

  // Register Google Provider if key is present
  if (config.GOOGLE_MAPS_API_KEY) {
    const google = new GoogleAddressProvider({ apiKey: config.GOOGLE_MAPS_API_KEY });
    router.registerProvider(google);
  }

  // Register Mock provider for testing
  const mock = new MockAddressProvider();
  router.registerProvider(mock);

  const db = config.DATABASE_URL ? new DatabaseClient({ connectionString: config.DATABASE_URL }) : undefined;
  const redis = config.REDIS_URL ? new RedisService(config.REDIS_URL) : undefined;

  const apiKeyRepo = db ? new ApiKeyRepository(db) : undefined;
  const addressRepo = db ? new AddressRepository(db) : undefined;
  const usageRepo = db ? new UsageRepository(db) : undefined;

  // Fallback in-memory repos for standalone mode
  const dummyAddressRepo = addressRepo ?? ({
    findByQueryHash: async () => null,
    saveAddress: async () => 'addr_in_memory',
  } as any);

  const dummyUsageRepo = usageRepo ?? ({
    logEvent: async () => {},
    getMetricsSummary: async (pId: string) => ({
      projectId: pId,
      totalRequests: 0,
      applicationMatches: 0,
      coalescedRequests: 0,
      outOfBoundsBlockedRequests: 0,
      providerRequests: 0,
      providerErrors: 0,
      optimizationRatio: 0,
      averageLatencyMs: 0,
    }),
  } as any);

  const service = new AddressFlowService({
    addressRepo: dummyAddressRepo,
    usageRepo: dummyUsageRepo,
    router,
  });

  const rateLimiter = new DistributedRateLimiter(redis);

  const app = createApp({
    db,
    redis,
    apiKeyRepo,
    addressRepo: dummyAddressRepo,
    usageRepo: dummyUsageRepo,
    router,
    service,
    rateLimiter,
  });

  app.listen(config.PORT, config.HOST, () => {
    console.log(`AddressFlow API Server listening on http://${config.HOST}:${config.PORT}`);
    console.log(`Registered Providers: ${router.getRegisteredProviders().map((p) => p.name).join(', ')}`);
    console.log(`Supported Map Engines: Leaflet.js, MapLibre GL`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
