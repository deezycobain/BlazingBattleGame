# Direct artwork ingestion

For user-supplied character artwork, prefer this order:

1. Process/crop/clean locally into final runtime frames.
2. Store the supplied source sheet under the owning character's `sprites/source/` tree.
3. Store final runtime frames under the owning character's `sprites/runtime/` tree.
4. Commit binary artwork as Git blobs/tree entries in one asset commit whenever the connector supports it.
5. Update `unit.json`, `runtime-map.json`, and `runtime/registry/asset-manifest.json` only after the binary assets exist.
6. Validation must fail when a declared frame/resource path is missing.

Do not use base64 chunk files, tar-decoder CI jobs, or write-enabled migration workflows as the normal artwork path. Those are emergency compatibility mechanisms only and should not remain in a clean promotion candidate.
