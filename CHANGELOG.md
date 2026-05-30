# Changelog

All notable Spectrum Tokens changes are documented here.

## Unreleased

- Added a Pantone match modal backed by normalized local Pantone definitions and CIEDE2000 ranking.
- Added SCSS variable copy options to swatch menus.
- Added an organized `_palette.scss` export with role, spectrum, semantic, helper, and CSS custom property sections.
- Added saved primary-color swatches and renamed the 7-stop scale depth to Web.
- Mapped the Note role swatch to the generated `purple-300` color.

## [1.0.0] - 2026-05-28

- Added production minified assets and a local static server.
- Improved accessibility with labeled inputs, visible-name-safe swatches, keyboardable tabs and copy menus, reduced-motion and forced-colors support, and WCAG AA swatch contrast.
- Added reusable QA and build scripts covering asset paths, ARIA wiring, no inline CSS, generated exports, responsive CSS, and contrast.

## [0.6.0] - 2026-05-27

- Simplified the generator around color scales rather than multiple spectrum modes.
- Added semantic role swatches and refined role mappings.
- Improved swatch copy menus, tone-strip behavior, and generated spectrum layout.
- Added light and dark token output.
- Kept grey tones tied to the primary color and active theme.

## [0.5.0] - 2026-05-27

- Bootstrapped the Spectrum Tokens single-page app.
- Added primary color controls, generated primitive scales, role previews, and export tabs for production token formats.
