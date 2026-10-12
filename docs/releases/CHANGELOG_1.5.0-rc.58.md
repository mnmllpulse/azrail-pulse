# AZRAIL PULSE 1.5.0-rc.58

## Series F — Image Studio 2.0 F21–F40

- Added Reference Board and region-aware actions.
- Added reviewed Image Model Quick Switcher: AUTO / FLUX.2 Klein 4B / 9B.
- Added Layers Panel and browser Mask Editor with Brush/Erase/Feather/Invert/Save.
- Added explicit provider-gated contracts for inpaint/outpaint/remove/replace/background-replace; unsupported mask operations are not faked through generic edit prompts.
- Added version genealogy from durable `reference_artifact_id` and `variation_index`.
- Added Style Lock, Character/Product Consistency and bounded Brand Constraints.
- Structural UI Mode now fails closed for raster generation.
- Added restoration-aware upscale mode.
- Added measured Image QA foundation persisted through the shared Professional Review API.
- Added local non-destructive Export Center for PNG/JPEG/WebP and common production presets.
- Image job configuration now records advanced controls and mask provenance.

## Release boundary

No GitHub push, Cloudflare mutation/deploy or Canva edit was performed. Production remains locked behind the existing Node24/staging/security/approval gates.
