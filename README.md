# @tm-aistudios/wl-site-kit

Generic verification, lint, and guard utilities for static sites. Zero build step: ship ESM `.mjs` plus hand-written `.d.ts` so consumer repos can install from GitHub and run in CI on Node 22.

## Install

```bash
npm install --save-dev "github:TM-AIStudios/wl-site-kit#<tag-or-commit>"
```

## Programmatic API

```js
import {
  lintCssImportantSource,
  lintInlineStyleSource,
  lintAntiSlopSource,
  defaultCopyBans,
  lintCorrectionsSource,
} from '@tm-aistudios/wl-site-kit';
```

Subpath exports: `@tm-aistudios/wl-site-kit/css-important`, `/inline-style`, `/anti-slop-copy`, `/check-corrections`.

### CSS `!important` guard

Flags `!important` outside `@media (prefers-reduced-motion: reduce)` with a fix hint.

### Inline `style=` guard

Flags inline `style=` attributes; optional `stylesheetHint` in options.

### Anti-slop copy guard

`defaultCopyBans` covers generic marketing phrases and decorative star rows. Use `extraBans` and `excludeIds` in consumer repos for site-specific rules without forking this package.

### Corrections ledger

Parses `docs/corrections.md` tables (`Date | Correction | Layer | Guard`) and ensures each `Guard` names a `package.json` script or an existing file under `--root`.

## CLI

| Binary | Purpose |
|--------|---------|
| `wl-lint-guards` | Scan `--root` with `--css`, `--copy`, and/or `--html` path lists (files or directories) |
| `wl-check-corrections` | Validate corrections ledger (`--file`, default `docs/corrections.md`) |
| `wl-site-verify` | Optional `--build`, serve `--dir`, check `--routes` for HTTP 200 and console/page errors; optional Playwright screenshots via `--out` and `--viewports` |

`playwright` is an **optional** peer dependency (only for screenshots and richer error capture).

## Development

```bash
npm ci
npm run typecheck
npm test
npm run test:consumer
```

## License

MIT