---
name: "adjust-sprite-sheet"
description: "Normalize raw AI-generated sprite sheets for BR-TD assets. Use when Claude needs to take a rough sprite sheet, fix uneven dimensions, remove neighboring-frame bleed, create Phaser-ready fixed-size frames, update sprite assets, or validate frame boundaries for enemy/tower animations."
---

# Adjust Sprite Sheet

Use this skill when preparing raw sprite sheets for the BR-TD Phaser asset
pipeline.

## Workflow

1. Identify the target contract:
   - Read `src/core/spriteSheets.ts` for existing enemy sheet specs.
   - For the motoboy sheet, keep `8x2`, output frames `256x512`, output cols `8`.
   - If adding a new sheet, add/update the typed contract before wiring runtime code.

2. Inspect the raw sheet:
   - Run `file <raw-sheet>`.
   - If needed, generate a preview with `--preview-grid /tmp/<name>-grid.png`.
   - Check whether frame content touches or crosses cell boundaries.

3. Normalize with the project utility:

   ```bash
   npm run adjust:sprite-sheet -- \
     <raw-sheet.png> \
     <output-sheet.png> \
     --source-cols <cols> \
     --source-rows <rows> \
     --frame-width <frame-width> \
     --frame-height <frame-height> \
     --output-cols <cols> \
     --preview-grid /tmp/<name>-grid.png \
     --validate-frame-edges \
     --edge-margin 1
   ```

4. If frames include strips or body parts from neighbors, use component mode:

   ```bash
   npm run adjust:sprite-sheet -- \
     <raw-sheet.png> \
     <output-sheet.png> \
     --source-cols <cols> \
     --source-rows <rows> \
     --frame-width <frame-width> \
     --frame-height <frame-height> \
     --output-cols <cols> \
     --extract-mode main-component \
     --component-frame-padding 20 \
     --preview-grid /tmp/<name>-grid.png \
     --validate-frame-edges \
     --edge-margin 1
   ```

5. Validate output:
   - Inspect the preview image visually. No visible art should touch red grid lines.
   - Run `npm run check`.
   - Run `npm run build` if the asset is used by the runtime.
   - If replacing a committed asset, mention the final dimensions and validation.

## Notes

- `main-component` mode expects transparent or alpha-isolated subjects. If a raw
  image has a visible checker/solid background, first remove that background or
  use `--trim-bg`/`--trim-alpha` in grid mode.
- Do not compensate for a bad sprite sheet by changing gameplay stats, radius,
  speed, HP, reward, or collision.
- Keep Phaser frame dimensions derived from `src/core/spriteSheets.ts`; do not
  reintroduce hardcoded frame sizes in `BootScene`.
