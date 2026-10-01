import {
  CanonicalAddress,
  SearchAddressRequestDto,
  ResolveAddressRequestDto,
  ReverseGeocodeRequestDto,
  AddressSearchResponseDto,
  AddressResolveResponseDto,
  AddressReverseResponseDto,
  AuthenticatedContext,
} from '@addressflow/types';
import {
  normalizeAddressQuery,
  MemoryRequestCoalescer,
  GeographicGuard,
  DefaultProviderRouter,
  AddressFlowError,
} from '@addressflow/core';
import { AddressRepository } from '../db/repositories/address.repository.js';
import { UsageRepository } from '../db/repositories/usage.repository.js';

export interface AddressFlowServiceOptions {
  addressRepo: AddressRepository;
  usageRepo: UsageRepository;
  router: DefaultProviderRouter;
  coalescer?: MemoryRequestCoalescer;
}

export class AddressFlowService {
  private addressRepo: AddressRepository;
  private usageRepo: UsageRepository;
  private router: DefaultProviderRouter;
  private coalescer: MemoryRequestCoalescer;

  constructor(options: AddressFlowServiceOptions) {
    this.addressRepo = options.addressRepo;
    this.usageRepo = options.usageRepo;
    this.router = options.router;
    this.coalescer = options.coalescer ?? new MemoryRequestCoalescer(10000);
  }

  public async search(
    request: SearchAddressRequestDto,
    auth: AuthenticatedContext,
    requestId: string
  ): Promise<AddressSearchResponseDto> {
    const startTime = Date.now();

    // 1. Normalization & Query Hashing
    const normalized = normalizeAddressQuery(request.query, {
      countryCode: request.countryCode,
    });

    // 2. Pre-Flight Geographic Boundary & Cost Guard (Zero Provider Cost)
    const guardResult = GeographicGuard.evaluateSearchQuery(
      request.query,
      request.countryCode,
      auth.settings
    );

    if (!guardResult.isAllowed) {
      // Log blocked event for cost analytics
      await this.usageRepo.logEvent({
        projectId: auth.projectId,
        requestId,
        eventType: 'out_of_bounds_blocked',
        queryHash: normalized.hash,
        wasCoalesced: false,
        matchedApplicationData: false,
        wasOutOfBoundsBlocked: true,
        latencyMs: Date.now() - startTime,
        statusCode: guardResult.action === 'reject' ? 400 : 200,
      }).catch(() => {});

      if (guardResult.action === 'reject') {
        throw new AddressFlowError('LOCATION_OUT_OF_BOUNDS', guardResult.reason ?? 'Location out of bounds', {
          requestId,
          details: { detectedCountryCodes: guardResult.detectedCountryCodes },
        });
      }

      // Return empty results gracefully
      return {
        data: [],
        meta: {
          requestId,
          source: 'guard',
          coalesced: false,
          latencyMs: Date.now() - startTime,
        },
      };
    }

    // 3. Application-Owned Address Database Lookup
    const appMatch = await this.addressRepo.findByQueryHash(normalized.hash, auth.projectId);
    if (appMatch) {
      await this.usageRepo.logEvent({
        projectId: auth.projectId,
        requestId,
        eventType: 'application_matched',
        queryHash: normalized.hash,
        wasCoalesced: false,
        matchedApplicationData: true,
        wasOutOfBoundsBlocked: false,
        latencyMs: Date.now() - startTime,
        statusCode: 200,
      }).catch(() => {});

      return {
        data: [appMatch],
        meta: {
          requestId,
          source: 'application',
          coalesced: false,
          latencyMs: Date.now() - startTime,
        },
      };
    }

    // 4. Provider Routing & Single-Flight Request Coalescing
    const provider = await this.router.selectProvider({
      projectId: auth.projectId,
      queryType: 'search',
      countryCode: request.countryCode,
      language: request.language,
      preferredProvider: auth.settings?.defaultProvider,
    });

    const coalescingKey = `${auth.projectId}:${provider.name}:${normalized.hash}`;

    const { result, coalesced } = await this.coalescer.execute(coalescingKey, async () => {
      // Injects project allowed country codes into provider request to strictly constrain provider call
      const providerResponse = await provider.search({
        query: request.query,
        countryCode: request.countryCode,
        countryCodes: auth.settings?.allowedCountryCodes,
        language: request.language,
        limit: request.limit ?? 5,
        sessionToken: request.sessionToken,
      });

      return providerResponse;
    });

    // 5. Convert candidates to CanonicalAddress models
    const addresses: CanonicalAddress[] = result.candidates.map((c) => ({
      id: `addr_cand_${c.identifier}`,
      formattedAddress: c.formattedAddress,
      components: c.components ?? {},
      location: c.location,
      confidence: c.confidence ?? 0.9,
      source: 'provider',
      providerReferences: [
        {
          provider: c.provider,
          type: c.type,
          identifier: c.identifier,
          createdAt: new Date().toISOString(),
          metadata: c.metadata,
        },
      ],
      normalizedQueryHash: normalized.hash,
    }));

    // 6. Log Usage Analytics
    await this.usageRepo.logEvent({
      projectId: auth.projectId,
      requestId,
      eventType: coalesced ? 'coalesced' : 'provider_dispatched',
      queryHash: normalized.hash,
      provider: provider.name,
      wasCoalesced: coalesced,
      matchedApplicationData: false,
      wasOutOfBoundsBlocked: false,
      latencyMs: Date.now() - startTime,
      statusCode: 200,
    }).catch(() => {});

    return {
      data: addresses,
      meta: {
        requestId,
        source: coalesced ? 'coalesced' : 'provider',
        provider: provider.name,
        coalesced,
        latencyMs: Date.now() - startTime,
        attributions: result.attributions,
      },
    };
  }

  public async resolve(
    request: ResolveAddressRequestDto,
    auth: AuthenticatedContext,
    requestId: string
  ): Promise<AddressResolveResponseDto> {
    const startTime = Date.now();

    const provider = await this.router.selectProvider({
      projectId: auth.projectId,
      queryType: 'resolve',
      preferredProvider: request.provider ?? auth.settings?.defaultProvider,
    });

    const coalescingKey = `${auth.projectId}:resolve:${provider.name}:${request.identifier}`;

    const { result, coalesced } = await this.coalescer.execute(coalescingKey, async () => {
      const resolved = await provider.resolve({
        identifier: request.identifier,
        sessionToken: request.sessionToken,
        language: request.language,
      });
      return resolved;
    });

    await this.usageRepo.logEvent({
      projectId: auth.projectId,
      requestId,
      eventType: coalesced ? 'coalesced' : 'resolve',
      provider: provider.name,
      wasCoalesced: coalesced,
      matchedApplicationData: false,
      wasOutOfBoundsBlocked: false,
      latencyMs: Date.now() - startTime,
      statusCode: 200,
    }).catch(() => {});

    return {
      data: result.address,
      meta: {
        requestId,
        source: coalesced ? 'coalesced' : 'provider',
        provider: provider.name,
        coalesced,
        latencyMs: Date.now() - startTime,
        attributions: result.attributions,
      },
    };
  }

  public async reverse(
    request: ReverseGeocodeRequestDto,
    auth: AuthenticatedContext,
    requestId: string
  ): Promise<AddressReverseResponseDto> {
    const startTime = Date.now();

    // Pre-flight bounds check
    const guardResult = GeographicGuard.evaluateCoordinates(
      { latitude: request.latitude, longitude: request.longitude },
      auth.settings
    );

    if (!guardResult.isAllowed) {
      if (guardResult.action === 'reject') {
        throw new AddressFlowError('LOCATION_OUT_OF_BOUNDS', guardResult.reason ?? 'Coordinates out of bounds', {
          requestId,
        });
      }
      return {
        data: [],
        meta: {
          requestId,
          source: 'guard',
          coalesced: false,
          latencyMs: Date.now() - startTime,
        },
      };
    }

    const provider = await this.router.selectProvider({
      projectId: auth.projectId,
      queryType: 'reverse',
      preferredProvider: auth.settings?.defaultProvider,
    });

    const coordKey = `${request.latitude.toFixed(4)},${request.longitude.toFixed(4)}`;
    const coalescingKey = `${auth.projectId}:rev:${provider.name}:${coordKey}`;

    const { result, coalesced } = await this.coalescer.execute(coalescingKey, async () => {
      return await provider.reverseGeocode({
        location: { latitude: request.latitude, longitude: request.longitude },
        language: request.language,
        limit: request.limit,
      });
    });

    await this.usageRepo.logEvent({
      projectId: auth.projectId,
      requestId,
      eventType: coalesced ? 'coalesced' : 'reverse',
      provider: provider.name,
      wasCoalesced: coalesced,
      matchedApplicationData: false,
      wasOutOfBoundsBlocked: false,
      latencyMs: Date.now() - startTime,
      statusCode: 200,
    }).catch(() => {});

    return {
      data: result.addresses,
      meta: {
        requestId,
        source: coalesced ? 'coalesced' : 'provider',
        provider: provider.name,
        coalesced,
        latencyMs: Date.now() - startTime,
        attributions: result.attributions,
      },
    };
  }
}
