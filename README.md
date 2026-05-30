# Spectrum Tokens

Spectrum Tokens is a standalone design-system color generator from ABLE-UI, LLC. It creates primitive color scales, semantic role colors, dark-mode tokens, and production-ready exports from a single primary color.

## Features

- Primary color input through a color picker or manual hex value.
- Adjustable light tint and dark shade reach for generated scales.
- Visible-spectrum primitive rows for yellow, orange, red, magenta, violet, blue, cyan, green, and grey.
- Semantic role swatches for primary, secondary, accent, note, info, success, warning, and error.
- Light and dark theme preview with class-based dark-token exports.
- Copy menus for token names, hex values, CSS variables, CSS property declarations, SCSS variables, and SCSS variable declarations.
- Export formats for Global CSS, JavaScript, Figma-compatible JSON, Tokens JSON, `_palette.scss`, and Tailwind config.
- PWA install metadata, generated icons, service worker caching, and an offline app shell.

## Usage

Open [index.html](./index.html) directly in a browser, or run the local static server:

```bash
npm start
```

The local server builds minified assets first and serves the static app with cache headers suitable for local Lighthouse testing.

## Development

Build production assets:

```bash
npm run build
```

Run reusable QA checks:

```bash
npm run qa
```

The QA suite checks JavaScript syntax, asset paths, no inline CSS, production minification, ARIA wiring, PWA files, responsive CSS expectations, generated exports, and WCAG AA swatch text contrast.

## Release

The stable release is `v1.0.0` at commit `272fd884f2131b2d`.

## Pantone

Pantone metadata is not included. Accurate Pantone matching requires licensed reference data and appropriate color-management context.

## License

See [LICENSE](./LICENSE).
