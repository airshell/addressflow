---
name: addressflow
description: Build, integrate, and configure AddressFlow for provider-agnostic address search, normalization, geocoding, and multi-provider routing (Google Maps, OpenStreetMap/Nominatim, Mapbox). Use when integrating address autocomplete in web/mobile apps, cutting third-party maps API costs with traffic merging and boundary guards, visualizing coordinates with Leaflet.js or MapLibre GL, or storing canonical addresses in PostgreSQL/MySQL.
---

# AddressFlow Agent Skill

This skill guides AI coding agents on how to integrate and use **AddressFlow**—the provider-agnostic address infrastructure platform that standardizes addresses, prevents vendor lock-in, and drastically reduces commercial maps API bills.

---

## When to Use This Skill

Activate this skill when:
- Adding **address autocomplete, search, or geocoding** to any web, mobile, or backend application.
- Integrating or replacing **Google Maps Platform, OpenStreetMap (Nominatim), or Mapbox**.
- Slashing geocoding billing costs using **pre-flight geographic boundary guards** or **traffic merging (request deduplication)**.
- Storing validated address details in the application's **own database (PostgreSQL, MySQL, Supabase, SQLite)** in full compliance with provider Terms of Service (Place IDs + canonical data, no raw payload hoarding).
- Rendering map markers or GeoJSON layers using **Leaflet.js** or **MapLibre GL**.

---

## Key Packages & Architecture

AddressFlow is structured into modular packages:

| Package | Purpose | Typical Use Environment |
| :--- | :--- | :--- |
| **`@addressflow/client`** | Lightweight, fetch-native Client SDK | Frontend (React, Next.js, Vue, Svelte, Mobile) or API microservices |
| **`@addressflow/core`** | In-process normalization, GeoGuard, hasher, and traffic merger | Backend Node.js / TypeScript services |
| **`@addressflow/map-helpers`** | Zero-glue Leaflet.js and MapLibre GL GeoJSON / marker adapters | Frontend mapping UI |
| **`@addressflow/provider-nominatim`** | 100% Free OpenStreetMap provider with rate-limiting & ODbL attribution | Server or in-process backend |
| **`@addressflow/provider-google`** | Google Maps Places (New) autocomplete, place details, and geocoding | Server or in-process backend |
| **`@addressflow/provider-mapbox`** | Mapbox Places Geocoding v5 API adapter | Server or in-process backend |
| **`@addressflow/server`** | Multi-tenant PostgreSQL persistence & Redis rate-limiting/cache | Microservice deployment |

---

## Pattern 1: Frontend Autocomplete (React / Next.js)

When building an address search input:

```bash
npm install @addressflow/client
```

```tsx
import React, { useState, useEffect } from 'react';
import { AddressFlowClient, CanonicalAddress } from '@addressflow/client';

const client = new AddressFlowClient({
  baseUrl: process.env.NEXT_PUBLIC_ADDRESSFLOW_URL || 'https://api.addressflow.mycompany.com',
  apiKey: process.env.NEXT_PUBLIC_ADDRESSFLOW_API_KEY,
});

export function AddressSearch({ onSelect }: { onSelect: (addr: CanonicalAddress) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CanonicalAddress[]>([]);

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        // ALWAYS pass countryCode to activate the Pre-Flight Boundary Guard!
        const res = await client.address.search({
          query,
          countryCode: 'IN', // e.g. 'IN', 'US', 'GB'
          limit: 5,
        });
        setResults(res.data);
      } catch (err) {
        console.error('Address search failed:', err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search address..."
      />
      {results.map((item) => (
        <div key={item.id} onClick={() => onSelect(item)}>
          <strong>{item.components.street || item.formattedAddress}</strong>
          <small>{item.formattedAddress}</small>
        </div>
      ))}
    </div>
  );
}
```

---

## Pattern 2: Compliant Database Storage (PostgreSQL / MySQL)

When an address is confirmed (e.g. at checkout or profile update), **never store raw provider JSON blobs** (which violate Google/Mapbox 30-day caching policies). Instead, store canonical application-owned records and link provider Place IDs:

### Database Schema
```sql
-- 1. Application-Owned Address
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    query_hash VARCHAR(64) NOT NULL,
    formatted_address TEXT NOT NULL,
    components JSONB NOT NULL DEFAULT '{}'::jsonb,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    confidence DOUBLE PRECISION DEFAULT 1.0,
    source VARCHAR(50) NOT NULL DEFAULT 'application',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Decoupled Provider References (Store Google Place ID indefinitely)
CREATE TABLE provider_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address_id UUID NOT NULL REFERENCES addresses(id) ON DELETE CASCADE,
    provider VARCHAR(64) NOT NULL,       -- 'google', 'mapbox', 'openstreetmap'
    reference_type VARCHAR(64) NOT NULL, -- 'place_id', 'osm_id'
    identifier VARCHAR(255) NOT NULL,    -- 'ChIJbU60qSXdyzsR5-231'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_provider_identifier UNIQUE (provider, identifier)
);

CREATE INDEX idx_addresses_hash ON addresses(project_id, query_hash);
```

### Application Code
```typescript
// Resolve the selected place via AddressFlow
const resolved = await client.address.resolve({
  provider: 'google',
  placeId: selectedItem.providerReference.identifier,
});

const canonical = resolved.data;

// In your application database (e.g. orders, user_addresses):
await db.orders.create({
  data: {
    userId: currentUser.id,
    shippingAddressId: canonical.id, // Store AddressFlow canonical UUID
    formattedAddress: canonical.formattedAddress,
    lat: canonical.location?.latitude,
    lng: canonical.location?.longitude,
  },
});
```

---

## Pattern 3: In-Process Engine (Standalone Node.js / Express)

If embedding AddressFlow directly into an existing Node.js backend without deploying a separate microservice:

```bash
npm install @addressflow/core @addressflow/types @addressflow/provider-nominatim @addressflow/provider-google
```

```typescript
import {
  normalizeAddressString,
  computeAddressQueryHash,
  GeographicGuard,
  MemoryRequestCoalescer,
  DefaultProviderRouter,
} from '@addressflow/core';
import { NominatimProvider } from '@addressflow/provider-nominatim';
import { GoogleMapsProvider } from '@addressflow/provider-google';

// 1. Configure Providers: Free OpenStreetMap (Primary) + Google Maps (Fallback)
const osm = new NominatimProvider({ userAgent: 'MyApp/1.0 (ops@myapp.com)' });
const google = new GoogleMapsProvider({ apiKey: process.env.GOOGLE_MAPS_KEY! });

const router = new DefaultProviderRouter({
  providers: [osm, google],
  primaryProvider: 'openstreetmap',
  fallbackProvider: 'google',
});

// 2. Pre-flight Boundary Guard (0 cost for out-of-boundary queries)
const guard = new GeographicGuard({
  allowedCountryCodes: ['IN'],
  strictBoundaryEnforcement: true,
});

// 3. In-memory Traffic Merger (100 simultaneous requests -> 1 upstream query)
const coalescer = new MemoryRequestCoalescer({ ttlMs: 3000 });

export async function searchAddress(query: string, countryCode: string = 'IN') {
  // Pre-flight check: block out-of-bounds before spending vendor API credit
  const evaluation = guard.evaluate(query, countryCode);
  if (!evaluation.allowed) {
    return { data: [], blockedReason: evaluation.reason };
  }

  // Normalize string and compute deterministic hash
  const normalized = normalizeAddressString(query);
  const hash = computeAddressQueryHash(normalized);

  // Merge concurrent lookups
  return await coalescer.coalesce(`search:${hash}`, async () => {
    return await router.search({ query: normalized, countryCode });
  });
}
```

---

## Pattern 4: Interactive Map Rendering (Leaflet.js & MapLibre GL)

```bash
npm install @addressflow/map-helpers
```

### Leaflet.js
```typescript
import L from 'leaflet';
import { toLeafletLatLng, createLeafletPopupContent, toLeafletGeoJSON } from '@addressflow/map-helpers';

// Initialize map with free OpenStreetMap tiles
const map = L.map('map').setView([12.9716, 77.5946], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Plot single marker:
const coords = toLeafletLatLng(address);
if (coords) {
  L.marker([coords.lat, coords.lng])
    .bindPopup(createLeafletPopupContent(address))
    .addTo(map);
}

// Or plot array of search results as a GeoJSON layer:
L.geoJSON(toLeafletGeoJSON(searchResults)).addTo(map);
```

### MapLibre GL
```typescript
import maplibregl from 'maplibre-gl';
import { toMapLibreGeoJSONSource } from '@addressflow/map-helpers';

map.addSource('places', toMapLibreGeoJSONSource(searchResults) as any);
map.addLayer({
  id: 'place-points',
  type: 'circle',
  source: 'places',
  paint: { 'circle-radius': 6, 'circle-color': '#0ea5e9' },
});
```

---

## Cost Optimization Checklist for Agents

When generating code that uses AddressFlow, verify:
1. **Did you provide `countryCode`?** Always pass `countryCode` in search requests so the `GeographicGuard` blocks out-of-boundary queries before hitting paid APIs.
2. **Is OpenStreetMap the primary provider?** When cost is a priority, set `primaryProvider: 'openstreetmap'` and use `fallbackProvider: 'google'`.
3. **Are concurrent requests deduplicated?** Use `MemoryRequestCoalescer` in backends or route through the AddressFlow API server.
4. **Is permanent storage compliant?** Store only `CanonicalAddress` fields and `Place ID` references in permanent SQL databases. Never persist raw 30-day ephemeral provider JSON payloads.
