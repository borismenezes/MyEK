# Adding a service (federated mini-app) — the golden path

A service ships as an OTA-published Module Federation remote. The host has
**zero compile-time knowledge of it**: everything below is team-local plus one
backend catalog change. If a step seems to require editing host `src/`,
`rspack.config.mjs`, or another team's package — stop; that's not the path.

## 1. Scaffold

```bash
node scripts/generate-service.mjs <service-id>   # kebab-case, e.g. expense-claims
npm install                                      # link the new workspace packages
```

This creates the entire team-owned surface:

| Path | What it is |
|---|---|
| `packages/<id>/src/types.ts` | Payload types (+ widget contract re-exported from `@myek/sdk`) |
| `packages/<id>/src/api.ts` | Your BFF calls via `@myek/api-client` (auth + base URL come from the host) |
| `packages/<id>/src/widgets/` | Home-grid tiles — **self-fetching** via the shared QueryClient |
| `packages/<id>/src/screens/` | Full-screen surface (`./screens` expose) |
| `packages/<id>/src/__fixtures__/` + `__tests__/` | Contract test: your widgets render against recorded payloads in CI |
| `apps/<id>/` | The MF2 build wrapper (dev-server port auto-assigned) |

## 2. Implement

- Define the real payload in `types.ts`, point `api.ts` at your BFF route
  (`/v1/myek/<id>/…`), build the widget/screen with `@myek/ui` tokens
  (`useTheme()` — never hardcode colors; the tile must follow light/dark).
- Host capabilities (open profile, clipboard, …) via
  `hostAction(...)` from `@myek/platform` — typed names in `@myek/sdk`.
  Missing a capability? Ask platform; don't reach into host internals.
- Update `__fixtures__/<widgetId>.json` to the real payload shape — the
  contract test renders every exposed widget with it.

```bash
npm run verify        # typecheck + lint + api-surface + contract tests
```

## 3. Dev loop against the host

```bash
cd apps/<id> && npm start        # Re.Pack dev server on your assigned port
```

Run the host app and point its catalog entry (or a dev override) at
`http://localhost:<port>/<platform>/mf-manifest.json`.

## 4. Build + publish

```bash
cd apps/<id>
npm run build:mf          # android  → dist/android/<id>/
npm run build:mf:ios      # ios      → dist/ios/<id>/
```

Publish `dist/<platform>/<id>/` to the OTA service under
`/myek/<platform>/<remoteName>/` (remote name is the snake_case id). Bundles
are signed at build time (release builds); the manifest carries per-chunk
integrity and the opaque `compat` token — never add version/build metadata to
it (see docs/release-train.md).

## 5. Backend catalog (the only non-team-local step)

Add the service to the **myek app catalog** in enterprise-backend:

- service entry with `mf` block: `remoteName` (snake_case), per-platform
  `manifestUrl`, `exposes` (`./screens`, `./widgets`), `bundleHash`
- widget mapping: `{ id: "<widgetId>", serviceId: "<id>", selfFetching: true }`
- optionally `minShellVersion` if you depend on a recent shell capability

The host discovers the service on its next catalog load. No host release.

## Rules that keep this scalable

1. **Never import host `src/*`** — only `@myek/{sdk,ui,platform,api-client}`.
2. **Contracts are additive-only** (`@myek/sdk` types, platform slots). The
   api-surface check will make you look at every change; old published
   bundles outlive shell releases.
3. **Don't add shared dependencies casually** — a new entry in
   `shared-versions.mjs` is a release-train event (docs/release-train.md).
4. Keep the contract test honest: fixture = the real BFF payload, not a
   convenient one.
