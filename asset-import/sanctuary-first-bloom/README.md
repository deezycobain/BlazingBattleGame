# Sanctuary First Bloom asset staging

Upload the four ZIP packs for the Sanctuary First Bloom production art into this directory on the `feature/sanctuary-first-bloom` branch.

Expected pack names:

- `01-sanctuary-bonsai-core.zip`
- `02-sanctuary-bonsai-variants-ui.zip`
- `03-sanctuary-sand-core.zip`
- `04-sanctuary-sand-details.zip`

Each ZIP already contains paths rooted at `assets/ui/sanctuary/first-bloom/`.

The `Import Sanctuary asset packs` workflow automatically extracts the packs, verifies required files, removes the staging ZIPs, and commits the production assets back to this branch.
