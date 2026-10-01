import { ProjectSettings, GeoLocation } from '@addressflow/types';
import { detectCountryCodesInQuery } from './country-detector.js';
import { isPointInsideBounds } from './bounds.js';

export interface GuardEvaluationResult {
  isAllowed: boolean;
  reason?: string;
  action: 'proceed' | 'reject' | 'empty_results';
  detectedCountryCodes: string[];
}

export class GeographicGuard {
  /**
   * Pre-flight inspection for address search/autocomplete queries.
   * If the application is configured for specific countries (e.g. ['IN']),
   * and a query asks for another jurisdiction (e.g. 'Doha, Qatar' or 'Dubai, UAE'),
   * this immediately flags it to prevent wasting expensive upstream provider API calls.
   */
  public static evaluateSearchQuery(
    query: string,
    requestedCountryCode?: string,
    settings?: ProjectSettings
  ): GuardEvaluationResult {
    if (!settings) {
      return { isAllowed: true, action: 'proceed', detectedCountryCodes: [] };
    }

    const actionOnBlock = settings.outOfBoundsAction ?? 'reject';
    const allowedCountries = settings.allowedCountryCodes?.map((c) => c.toUpperCase()) ?? [];

    // 1. If explicit countryCode requested and not in allowed list
    if (requestedCountryCode && allowedCountries.length > 0) {
      const code = requestedCountryCode.trim().toUpperCase();
      if (!allowedCountries.includes(code)) {
        return {
          isAllowed: false,
          reason: `Requested country code '${code}' is outside the project's allowed regions: [${allowedCountries.join(', ')}]`,
          action: actionOnBlock,
          detectedCountryCodes: [code],
        };
      }
    }

    // 2. Check query string text for detected countries
    const detectedInText = detectCountryCodesInQuery(query);
    if (allowedCountries.length > 0 && detectedInText.length > 0) {
      const conflictCountries = detectedInText.filter((c) => !allowedCountries.includes(c));
      if (conflictCountries.length > 0) {
        return {
          isAllowed: false,
          reason: `Query contains location references to prohibited country/countries [${conflictCountries.join(', ')}]. Allowed regions: [${allowedCountries.join(', ')}]`,
          action: actionOnBlock,
          detectedCountryCodes: detectedInText,
        };
      }
    }

    return {
      isAllowed: true,
      action: 'proceed',
      detectedCountryCodes: detectedInText,
    };
  }

  /**
   * Pre-flight inspection for reverse geocode queries.
   */
  public static evaluateCoordinates(
    coords: GeoLocation,
    settings?: ProjectSettings
  ): GuardEvaluationResult {
    if (!settings || !settings.allowedBounds) {
      return { isAllowed: true, action: 'proceed', detectedCountryCodes: [] };
    }

    const actionOnBlock = settings.outOfBoundsAction ?? 'reject';
    const isInside = isPointInsideBounds(coords, settings.allowedBounds);

    if (!isInside) {
      return {
        isAllowed: false,
        reason: `Coordinates (${coords.latitude}, ${coords.longitude}) are outside the configured project bounds.`,
        action: actionOnBlock,
        detectedCountryCodes: [],
      };
    }

    return {
      isAllowed: true,
      action: 'proceed',
      detectedCountryCodes: [],
    };
  }
}
