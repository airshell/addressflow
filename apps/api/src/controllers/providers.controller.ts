import { Request, Response } from 'express';
import { DefaultProviderRouter } from '@addressflow/core';

export class ProvidersController {
  constructor(private router: DefaultProviderRouter) {}

  public list = async (_req: Request, res: Response): Promise<void> => {
    // 1. Geocoding & Address Lookup Providers from Router
    const geocodingProviders = this.router.getRegisteredProviders().map((p) => ({
      name: p.name,
      label:
        p.name === 'nominatim' || p.name === 'openstreetmap'
          ? 'OpenStreetMap / Nominatim (100% Free / Open Source)'
          : p.name === 'mapbox'
            ? 'Mapbox Places Geocoding'
            : p.name === 'google'
              ? 'Google Maps Platform (Places New & Geocoding)'
              : 'Mock Provider (Offline Testing)',
      category: 'geocoding',
      status: 'active',
      capabilities: p.capabilities,
    }));

    // If openstreetmap is registered as nominatim, ensure openstreetmap is also present
    const hasOsm = geocodingProviders.some((p) => p.name === 'openstreetmap');
    const nominatimEntry = geocodingProviders.find((p) => p.name === 'nominatim');
    if (!hasOsm && nominatimEntry) {
      geocodingProviders.unshift({
        ...nominatimEntry,
        name: 'openstreetmap',
        label: 'OpenStreetMap / Nominatim (100% Free / Open Source)',
      });
    }

    // If mapbox is not already in the router instance, list it as a supported geocoding provider
    const hasMapbox = geocodingProviders.some((p) => p.name === 'mapbox');
    if (!hasMapbox) {
      geocodingProviders.push({
        name: 'mapbox',
        label: 'Mapbox Places Geocoding',
        category: 'geocoding',
        status: 'supported',
        capabilities: {
          supportsAutocomplete: true,
          supportsGeocoding: true,
          supportsReverseGeocoding: true,
          supportsPlaceDetails: true,
          supportsPersistentProviderIds: true,
          requiresAttribution: true,
          attributionRequirements: [{ text: '© Mapbox © OpenStreetMap', mustDisplay: true }],
          retentionPolicy: {
            canStoreApplicationDataPermanently: true,
            canStoreProviderIdentifiersPermanently: true,
            maxResponseCacheTtlSeconds: 86400 * 30,
          },
        },
      });
    }

    // 2. Interactive Map Visualization Engines supported out-of-the-box
    const mapEngines = [
      {
        name: 'leaflet',
        label: 'Leaflet.js (leafletjs)',
        category: 'visualization',
        status: 'supported',
        description: 'Lightweight mobile-friendly interactive raster & GeoJSON map engine',
        package: '@addressflow/map-helpers/leaflet',
        formats: ['GeoJSON FeatureCollection', 'LatLng', 'PopupHTML'],
        compatibleTileProviders: ['OpenStreetMap Standard Tiles', 'CartoDB', 'Stadia Maps'],
      },
      {
        name: 'maplibre',
        label: 'MapLibre GL JS (mapslibre / maplibre-gl)',
        category: 'visualization',
        status: 'supported',
        description: 'High-performance WebGL vector tile and raster interactive map engine',
        package: '@addressflow/map-helpers/maplibre',
        formats: ['GeoJSON Source Data', 'Bounding Box Array'],
        compatibleTileProviders: ['OpenMapTiles', 'Protomaps', 'MapTiler', 'Mapbox Vector Tiles'],
      },
    ];

    // Merged unified list so any client querying data gets all supported options
    const allProviders = [...geocodingProviders, ...mapEngines];

    res.json({
      data: allProviders,
      categories: {
        geocoding: geocodingProviders,
        visualization: mapEngines,
      },
      total: allProviders.length,
    });
  };
}
