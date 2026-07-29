# Direct artwork ingestion

For user-supplied character artwork, use the permanent mobile Asset Inbox at GitHub issue #9.

1. User uploads one source sheet/image to the Asset Inbox from phone and labels the character/purpose.
2. Fetch the newest matching issue attachment immediately; GitHub signed private-image URLs can expire, while the stable `user-attachments` asset remains the source reference.
3. Process/crop/clean locally or in a one-time guarded GitHub ingest step into final runtime frames.
4. Preserve the supplied source sheet under the owning character's `sprites/source/` tree.
5. Store final runtime frames under the owning character's `sprites/runtime/` tree.
6. Commit the real binary artwork as ordinary repository assets before wiring gameplay metadata.
7. Update `unit.json`, `runtime-map.json`, and `runtime/registry/asset-manifest.json` only after the binary assets exist.
8. Validation must fail when a declared frame/resource path is missing.
9. Remove any one-time importer script/workflow and restore normal read-only CI before the candidate is handed off for manual testing.

Do not use base64 chunk files, tar-decoder CI jobs, or permanent write-enabled migration workflows as the normal artwork path. One-time ingestion tooling is acceptable only to bridge an attachment into real tracked assets and must not remain in the clean candidate.
