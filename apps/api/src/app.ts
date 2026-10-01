import express from 'express';
import cors from 'cors';
import { DefaultProviderRouter } from '@addressflow/core';
import {
  AddressFlowService,
  AddressRepository,
  ApiKeyRepository,
  UsageRepository,
  DatabaseClient,
  RedisService,
  DistributedRateLimiter,
} from '@addressflow/server';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';
import { createAuthMiddleware } from './middleware/auth.middleware.js';
import { createRateLimitMiddleware } from './middleware/rate-limit.middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { AddressController } from './controllers/address.controller.js';
import { ProvidersController } from './controllers/providers.controller.js';
import { UsageController } from './controllers/usage.controller.js';
import { HealthController } from './controllers/health.controller.js';

export interface AppDependencies {
  db?: DatabaseClient;
  redis?: RedisService;
  apiKeyRepo?: ApiKeyRepository;
  addressRepo?: AddressRepository;
  usageRepo?: UsageRepository;
  router: DefaultProviderRouter;
  service: AddressFlowService;
  rateLimiter?: DistributedRateLimiter;
}

export function createApp(deps: AppDependencies): express.Application {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(requestIdMiddleware);

  const rateLimiter = deps.rateLimiter ?? new DistributedRateLimiter(deps.redis);
  app.use(createRateLimitMiddleware(rateLimiter));
  app.use(createAuthMiddleware(deps.apiKeyRepo));

  // Controllers
  const healthCtrl = new HealthController(deps.db, deps.redis);
  const addressCtrl = new AddressController(deps.service, deps.addressRepo);
  const providersCtrl = new ProvidersController(deps.router);
  const usageCtrl = new UsageController(deps.usageRepo);

  // Health
  app.get('/health', healthCtrl.health);
  app.get('/ready', healthCtrl.ready);

  // v1 Address endpoints
  app.post('/v1/address/search', addressCtrl.search);
  app.post('/v1/address/resolve', addressCtrl.resolve);
  app.post('/v1/address/reverse', addressCtrl.reverse);
  app.post('/v1/addresses', addressCtrl.create);

  // v1 Providers & Usage
  app.get('/v1/providers', providersCtrl.list);
  app.get('/v1/usage', usageCtrl.getSummary);

  // Error handling
  app.use(errorMiddleware);

  return app;
}
