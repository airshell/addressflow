import { CanonicalAddress } from '@addressflow/types';
import { DatabaseClient } from '../client.js';

export class AddressRepository {
  constructor(private db: DatabaseClient) {}

  public async findByQueryHash(queryHash: string, projectId: string): Promise<CanonicalAddress | null> {
    const rows = await this.db.query<{
      id: string;
      formatted_address: string;
      components: any;
      latitude: number | null;
      longitude: number | null;
      confidence: number;
      source: string;
      query_hash: string;
    }>(
      `SELECT id, formatted_address, components, latitude, longitude, confidence, source, query_hash
       FROM addresses
       WHERE project_id = $1 AND query_hash = $2
       LIMIT 1`,
      [projectId, queryHash]
    );

    if (rows.length === 0) return null;
    const r = rows[0];

    // Fetch provider references
    const refs = await this.db.query<{
      provider: string;
      reference_type: string;
      identifier: string;
      created_at: Date;
    }>(
      `SELECT provider, reference_type, identifier, created_at
       FROM provider_references
       WHERE address_id = $1`,
      [r.id]
    );

    return {
      id: r.id,
      formattedAddress: r.formatted_address,
      components: r.components,
      location: r.latitude && r.longitude ? { latitude: r.latitude, longitude: r.longitude } : undefined,
      confidence: r.confidence,
      source: r.source as any,
      normalizedQueryHash: r.query_hash,
      providerReferences: refs.map((ref) => ({
        provider: ref.provider,
        type: ref.reference_type,
        identifier: ref.identifier,
        createdAt: ref.created_at.toISOString(),
      })),
    };
  }

  public async saveAddress(address: CanonicalAddress, projectId: string): Promise<string> {
    const rows = await this.db.query<{ id: string }>(
      `INSERT INTO addresses (project_id, query_hash, formatted_address, components, latitude, longitude, confidence, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        projectId,
        address.normalizedQueryHash ?? null,
        address.formattedAddress,
        JSON.stringify(address.components),
        address.location?.latitude ?? null,
        address.location?.longitude ?? null,
        address.confidence ?? 1.0,
        address.source,
      ]
    );

    const addressId = rows[0].id;

    if (address.providerReferences) {
      for (const ref of address.providerReferences) {
        await this.db.query(
          `INSERT INTO provider_references (address_id, provider, reference_type, identifier, metadata)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (provider, identifier) DO NOTHING`,
          [addressId, ref.provider, ref.type, ref.identifier, JSON.stringify(ref.metadata ?? {})]
        );
      }
    }

    return addressId;
  }
}
