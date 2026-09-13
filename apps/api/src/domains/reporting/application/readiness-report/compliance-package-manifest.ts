export const MANIFEST_HASH_ALGORITHM = 'sha256' as const;
export const MANIFEST_CANONICALIZATION = 'jcs-v1' as const;
export const LEGACY_MANIFEST_CANONICALIZATION = 'legacy-json' as const;

/** RFC 8785-style JSON canonicalization for values accepted by Prisma Json. */
export function canonicalizeManifest(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('Canonical JSON does not support non-finite numbers');
    }
    return JSON.stringify(value);
  }
  if (typeof value === 'string') {
    assertValidUnicode(value);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeManifest(item)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => {
        assertValidUnicode(key);
        if (record[key] === undefined) {
          throw new TypeError(
            'Canonical JSON does not support undefined values',
          );
        }
        return `${JSON.stringify(key)}:${canonicalizeManifest(record[key])}`;
      })
      .join(',')}}`;
  }
  throw new TypeError(`Canonical JSON does not support ${typeof value}`);
}

export function manifestCanonicalization(manifest: unknown): string {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return LEGACY_MANIFEST_CANONICALIZATION;
  }
  const integrity = (manifest as Record<string, unknown>).integrity;
  if (!integrity || typeof integrity !== 'object' || Array.isArray(integrity)) {
    return LEGACY_MANIFEST_CANONICALIZATION;
  }
  const canonicalization = (integrity as Record<string, unknown>)
    .canonicalization;
  return typeof canonicalization === 'string'
    ? canonicalization
    : LEGACY_MANIFEST_CANONICALIZATION;
}

function assertValidUnicode(value: string) {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) {
        throw new TypeError('Canonical JSON does not support lone surrogates');
      }
      index++;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new TypeError('Canonical JSON does not support lone surrogates');
    }
  }
}
