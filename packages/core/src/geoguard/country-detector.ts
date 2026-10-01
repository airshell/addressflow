import { COUNTRY_NAMES_TO_ISO } from '../normalization/abbreviations.js';

export function detectCountryCodesInQuery(query: string): string[] {
  if (!query) return [];
  const lower = query.toLowerCase();
  const detected = new Set<string>();

  // Check direct country names
  for (const [name, iso] of Object.entries(COUNTRY_NAMES_TO_ISO)) {
    // word boundary regex
    const regex = new RegExp(`\\b${name}\\b`, 'i');
    if (regex.test(lower)) {
      detected.add(iso);
    }
  }

  // Check 2-letter uppercase tokens if present in raw
  const tokens = query.split(/[\s,]+/);
  for (const token of tokens) {
    const trimmed = token.trim();
    if (trimmed.length === 2 && trimmed === trimmed.toUpperCase()) {
      if (Object.values(COUNTRY_NAMES_TO_ISO).includes(trimmed)) {
        detected.add(trimmed);
      }
    }
  }

  return Array.from(detected);
}
