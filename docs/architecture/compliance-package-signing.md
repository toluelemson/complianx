# Compliance package signing

## Decision

Do not add manifest signing yet. Canonical SHA-256 hashes currently detect changes to the stored manifest and package archive, but the application has no key-management service or asymmetric-key lifecycle. Putting a long-lived private key directly in a Coolify environment variable would add operational risk without providing durable, independently verifiable provenance.

Adopt signing when Neuraldocx can keep the private key in a managed signing service and publish a stable verification-key set. Ed25519 is the preferred algorithm. Existing package hashes and verification behavior remain the migration foundation.

## Threat model and value

Signing is intended to prove that a particular canonical manifest was issued by Neuraldocx and has not changed since issuance. It protects against:

- modification of a manifest after generation;
- replacement of a manifest and recomputation of its unkeyed hash by an attacker with database write access;
- forged packages presented outside Neuraldocx as if Neuraldocx generated them;
- ambiguity about which signing key and algorithm produced a package.

Signing does not prove that the source evidence is true, that a human decision was correct, or that the package establishes legal compliance. It also does not protect a package generated while the application or signing authority is compromised. Archive integrity continues to depend on the per-file hashes in the signed manifest and the existing archive hash.

## Proposed signed format

Keep the current package manifest, canonicalization, hashes, archive, and package versioning. Add signature metadata to the package record rather than embedding the signature in the signed manifest, which would create a self-reference:

```json
{
  "signature": "<base64url Ed25519 signature>",
  "signatureKeyId": "package-signing-2026-01",
  "signatureAlgorithm": "Ed25519",
  "signedDigest": "<lowercase SHA-256 hex>",
  "signedAt": "2026-09-13T12:00:00.000Z"
}
```

The signing input should be a domain-separated byte sequence, not a generic hash that could be reused in another protocol:

```text
UTF8("neuraldocx-compliance-package-manifest-v1\n")
+
SHA256(UTF8(canonicalizeManifest(manifest)))
```

Sign those bytes with Ed25519. `signatureKeyId` selects a public key; it must never contain key material or a provider secret. `signedDigest` is redundant with `manifestHash`, but recording the exact signed value makes verification and incident analysis explicit. The manifest must continue to declare `hashAlgorithm: sha256` and `canonicalization: jcs-v1`.

## Key management options

### Managed signing service — recommended

Use a provider that supports non-exportable Ed25519 keys or an equivalently reviewed asymmetric signing algorithm. The API receives permission to request signatures but cannot read the private key. Hetzner/Coolify should hold only the provider credential or workload identity needed to call that one key.

Required controls:

- separate production and non-production keys;
- least-privilege permission limited to sign and read public-key metadata;
- provider audit logs retained with application audit events;
- deletion protection and documented recovery ownership;
- alerting on unexpected signing volume and authorization failures;
- all API replicas configured to use the same active key identifier.

This option best limits private-key extraction after an application compromise. Provider choice should be made before implementation because supported algorithms and request formats differ.

### Hardware security module

A dedicated HSM offers strong custody but adds provisioning, availability, backup, and operator complexity that the current deployment does not justify. Reconsider it only if customer assurance requirements or signing volume require dedicated hardware.

### Coolify secret containing an encrypted key

This is acceptable only as a short-lived pilot. It requires an additional wrapping-key mechanism, safe injection into every replica, strict file permissions, backup and rotation procedures, and protection from application-process compromise. A plain PEM or base64 private key in an environment variable is not recommended for production.

## Generation flow

1. Complete human review and the existing package-readiness checks.
2. Persist the manifest and read it back from PostgreSQL as the package generator does today.
3. Canonicalize the persisted manifest with the declared canonicalization version.
4. Calculate and store `manifestHash` and build the archive using the existing flow.
5. Send the domain-separated manifest digest to the configured signer.
6. Store the signature, key identifier, algorithm, signed digest, and signing time in the same database transaction as the completed package metadata.
7. Record the key identifier and signature algorithm in the immutable package-generation audit event. Do not log signatures, provider credentials, or manifest contents.

Package generation must fail closed if signing is required and the signer is unavailable. It must remove the orphan archive using the existing cleanup behavior. A retry may reuse the same completed signature only when the manifest digest and key identifier are identical.

## Verification

Online verification should retain the current tenant authorization checks and then:

1. verify the manifest and archive hashes;
2. require complete signature metadata for signed packages;
3. resolve `signatureKeyId` from a trusted public-key registry;
4. recompute the canonical manifest digest and domain-separated signing input;
5. verify the Ed25519 signature;
6. return separate `manifestValid`, `archiveValid`, and `signatureValid` results with non-sensitive errors.

Unknown, revoked, malformed, or mismatched key metadata must fail signature verification. Verification should use cached public keys and remain independent of the signing service.

For external verification, publish a versioned JSON Web Key Set over HTTPS and include a small verification document or CLI with the package. Public keys are not secrets. The verifier must pin the Neuraldocx issuer and expected algorithm rather than trusting a key supplied inside the archive.

## Rotation and revocation

Use unique, immutable key identifiers. Rotation should follow this sequence:

1. create the new key and publish its public key;
2. deploy the new key identifier to all signers;
3. switch new package generation to the new key;
4. retain old public keys for the lifetime of packages signed by them;
5. disable old private-key signing after the overlap period.

Normal rotation must not invalidate old packages. If a private key is compromised, mark its registry entry with a revocation status and time while retaining the public key. Verification results should distinguish a cryptographically valid signature made by a revoked key from a trusted signature. Incident policy must decide how packages signed before the confirmed compromise time are treated.

## Migration strategy

No existing package should be retroactively presented as originally signed.

- Packages without signature metadata remain `unsigned-legacy` and continue through the existing legacy or `jcs-v1` hash verification paths.
- New signing columns must be nullable during migration. Add a constraint requiring all signature fields together when any one is present.
- Introduce signing behind an explicit production mode such as `PACKAGE_SIGNING_MODE=required`; development and tests may use `disabled` or a deterministic test signer.
- After production keys, public-key publication, monitoring, and recovery procedures are verified, require signatures for newly generated packages.
- If historical packages are countersigned later, store a separate attestation with its own timestamp and audit event. Do not rewrite the original package record or generation time.

## Implementation prerequisites

Implementation can proceed when all of the following are owned and tested:

- a selected managed signer and production/non-production key hierarchy;
- a signer interface isolated from the reporting domain;
- a trusted, durable public-key registry and external publication URL;
- database fields and constraints for signature metadata;
- startup validation that prevents a required production signer from falling back to disabled or local signing;
- rotation, revocation, backup, outage, and incident runbooks;
- tests for valid, tampered, unknown-key, wrong-algorithm, revoked-key, legacy unsigned, signer-unavailable, and cross-tenant verification cases.

Until these prerequisites exist, canonical hashes provide deterministic integrity checks, while package provenance relies on the authenticated Neuraldocx service and its audit trail.
