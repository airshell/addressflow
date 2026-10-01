import { createHash } from 'node:crypto';

export function computeQueryHash(normalizedValue: string, version: string = 'v1'): string {
  const hash = createHash('sha256').update(`${version}:${normalizedValue}`).digest('hex');
  return `${version}:${hash.substring(0, 32)}`;
}
