# PRD — Bundler & Build Optimisation

## Background

Token Deathclock is a static GitHub Pages site. Its browser-facing assets are
assembled from multiple source files using hand-rolled Node.js concatenation scripts
(`scripts/build-js.js`, `scripts/build-css.js`). The generated files are served
unminified:

| File | Unminified size |
|------|----------------|
| `script.js` | ~140 KB |
| `death-clock-core.js` | ~35 KB |
| `styles.css` | ~86 KB |

Total uncompressed payload: **~261 KB** of first-party assets.

Minification is the single highest-impact optimisation available for a zero-backend,
purely static site — it does not require restructuring source files or introducing a
module system.

---

## Goal

Reduce the size of shipped browser assets by adding a minification step to the
existing build pipeline, with minimal change to the source layout.

---

## Options Considered

### 1. esbuild

- Written in Go; fastest bundler/minifier available (~100× faster than webpack).
- Single devDependency, zero runtime dependencies.
- Handles JS + CSS minification in one tool.
- No configuration file required — usable purely as a Node.js API call.
- Produces correct output for IIFE-wrapped classic scripts (no module-format
  conversion needed).

### 2. Rollup + @rollup/plugin-terser

- Excellent for ES-module libraries with tree-shaking.
- Requires converting source files to use `export`/`import` statements — significant
  restructuring for no additional gain since all code is already included.
- Slower than esbuild; more configuration overhead.

### 3. Webpack

- Industry-standard but heavyweight for this use case.
- Complex configuration; built for large SPA projects.
- Overkill for a static site with a few concatenated files.
- Significantly slower cold-build times.

### 4. Parcel

- Zero-config bundler with automatic asset discovery.
- Rewrites HTML, script tags, and asset paths — incompatible with the current
  GitHub Pages static layout without restructuring.
- Harder to integrate into the existing custom build scripts.

### 5. Vite

- Modern DX-focused build tool; primarily aimed at dev-server + SPA builds.
- Requires ES-module source format.
- Would need significant restructuring of the IIFE/globals architecture.

### 6. Terser (JS) + csso / clean-css (CSS)

- Mature, widely-used standalone minifiers.
- Requires two separate devDependencies.
- Slower than esbuild; no meaningful quality difference for this project.

---

## Decision

**esbuild** is the clear winner.

Reasons:
- Fastest build time (milliseconds); keeps CI builds snappy.
- Single devDependency covers both JS and CSS.
- No source-file changes needed — accepts the concatenated output and returns a
  minified version.
- Well-maintained; no known security vulnerabilities.

---

## Implementation

### What changes

1. **`esbuild` devDependency** added (`^0.28.0`).
2. **`scripts/build-js.js`** — concatenation unchanged; esbuild minifies the
   result in-process before writing `script.js`.
3. **`scripts/build-css.js`** — same pattern; esbuild minifies before writing
   `styles.css`.
4. **`package.json`** — new `build` convenience script runs all six build
   steps in sequence.
5. **Deploy workflow** — unchanged; `npm run build:js` and `npm run build:css`
   now produce minified output automatically.

### What does NOT change

- Source file layout (`src/js/`, `styles/`) is untouched.
- The IIFE wrapper in `script.js` is preserved.
- `death-clock-core.js` and `chart-date-adapter.js` are **not** minified by
  the build scripts (they have their own separate concerns); they could be
  minified in a future step.

---

## JavaScript file organisation

The question of whether to move browser JS files to `scripts/` or another
directory was evaluated separately:

| File | Category | Verdict |
|------|----------|---------|
| `src/js/*.js` | Source — already organised | **Keep in `src/js/`** |
| `scripts/*.js` | Build tooling (Node.js) | **Keep in `scripts/`** |
| `script.js` | Generated browser output | **Keep at root** (GitHub Pages serves from root) |
| `death-clock-core.js` | Runtime core, served by Pages | **Keep at root** |
| `chart-date-adapter.js` | CDN adapter, served by Pages | **Keep at root** |
| `*-data.js` | Generated data modules, served by Pages | **Keep at root** |

**Conclusion:** the `scripts/` directory is for Node.js build tooling only.
Mixing browser JS into it would be confusing. The generated runtime files must
stay at the repo root because GitHub Pages publishes from `publish_dir: .` in the
deploy workflow.  Moving them to a `dist/` subdirectory would require updating all
`<script src="">` paths in `index.html` and the `exclude_assets` list in the
deploy workflow — a valid future refactor, but outside the scope of this PRD.

---

## Expected outcome

| File | Before | After (estimated) | Saving |
|------|--------|--------------------|--------|
| `script.js` | ~140 KB | ~55–65 KB | ~55% |
| `styles.css` | ~86 KB | ~65–70 KB | ~20% |

Total first-party asset saving: approximately **105–115 KB** uncompressed (an
additional ~20–30% on top of gzip compression that GitHub Pages provides
automatically).
