import { createHash } from 'node:crypto';
import {
  canonicalizeManifest,
  LEGACY_MANIFEST_CANONICALIZATION,
  manifestCanonicalization,
} from './compliance-package-manifest';

describe('compliance package manifest canonicalization', () => {
  it('serializes identical objects equally regardless of insertion order', () => {
    const first = { project: { name: 'System', id: 'one' }, version: 1 };
    const second = { version: 1, project: { id: 'one', name: 'System' } };
    expect(canonicalizeManifest(first)).toBe(canonicalizeManifest(second));
    expect(
      createHash('sha256').update(canonicalizeManifest(first)).digest('hex'),
    ).toBe(
      createHash('sha256').update(canonicalizeManifest(second)).digest('hex'),
    );
  });

  it('sorts nested object keys while preserving array order', () => {
    expect(
      canonicalizeManifest({ z: [{ b: 2, a: 1 }, 'second'], a: true }),
    ).toBe('{"a":true,"z":[{"a":1,"b":2},"second"]}');
    expect(canonicalizeManifest([2, 1])).not.toBe(canonicalizeManifest([1, 2]));
  });

  it('treats manifests without integrity metadata as legacy JSON', () => {
    expect(manifestCanonicalization({ manifestVersion: '1.0' })).toBe(
      LEGACY_MANIFEST_CANONICALIZATION,
    );
  });

  it('reads the canonicalization version from new manifests', () => {
    expect(
      manifestCanonicalization({
        integrity: { hashAlgorithm: 'sha256', canonicalization: 'jcs-v1' },
      }),
    ).toBe('jcs-v1');
  });

  it('changes output when a nested value is tampered with', () => {
    expect(canonicalizeManifest({ nested: { approved: true } })).not.toBe(
      canonicalizeManifest({ nested: { approved: false } }),
    );
  });
});
