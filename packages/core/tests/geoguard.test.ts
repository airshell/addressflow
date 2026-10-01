import { describe, it, expect } from 'vitest';
import { GeographicGuard } from '../src/geoguard/guard.js';

describe('GeographicGuard (Pre-flight cost-saving guard)', () => {
  const indiaOnlySettings = {
    allowedCountryCodes: ['IN'],
    outOfBoundsAction: 'reject' as const,
  };

  it('allows domestic queries within allowed countries', () => {
    const eval1 = GeographicGuard.evaluateSearchQuery(
      '12 Residency Road, Bangalore',
      'IN',
      indiaOnlySettings
    );
    expect(eval1.isAllowed).toBe(true);
    expect(eval1.action).toBe('proceed');
  });

  it('blocks out-of-boundary queries before calling any provider (e.g. searching Qatar when restricted to India)', () => {
    const evalQatar = GeographicGuard.evaluateSearchQuery(
      'Souq Waqif, Doha, Qatar',
      undefined,
      indiaOnlySettings
    );

    expect(evalQatar.isAllowed).toBe(false);
    expect(evalQatar.action).toBe('reject');
    expect(evalQatar.reason).toContain('prohibited country/countries [QA]');
  });

  it('blocks explicit out-of-bounds country codes', () => {
    const evalCountry = GeographicGuard.evaluateSearchQuery(
      'Main Street',
      'US',
      indiaOnlySettings
    );

    expect(evalCountry.isAllowed).toBe(false);
    expect(evalCountry.reason).toContain("outside the project's allowed regions: [IN]");
  });

  it('evaluates bounding boxes for reverse geocode coordinates', () => {
    const bengaluruBounds = {
      allowedBounds: {
        north: 13.2,
        south: 12.8,
        east: 77.8,
        west: 77.4,
      },
      outOfBoundsAction: 'reject' as const,
    };

    // Point in Bangalore
    const inside = GeographicGuard.evaluateCoordinates({ latitude: 12.97, longitude: 77.59 }, bengaluruBounds);
    expect(inside.isAllowed).toBe(true);

    // Point in London
    const outside = GeographicGuard.evaluateCoordinates({ latitude: 51.5074, longitude: -0.1278 }, bengaluruBounds);
    expect(outside.isAllowed).toBe(false);
  });
});
