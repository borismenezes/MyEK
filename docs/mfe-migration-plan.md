# MyEK → Module Federation 2 micro-frontend — migration plan

Status: draft. Reference implementation: `enterprise-app` (Re.Pack + MF2). Backend
serving already exists in `enterprise-backend` (OTA `MfController` + Registry catalog).
Bundle signing is **out of scope for now** (architecture-ready, enforce later).

---

## 0. Goal
Turn MyEK from one bare-RN/Metro app into an **MF2 micro-frontend**: a thin **host
shell** (nav, auth, theme, catalog) that loads feature **mini-apps (remotes)** at
runtime, delivered **OTA** from the backend. Independently buildable/deployable
features; the shell knows nothing about them at compile time.

## 1. Requirements
- **Host shell owns:** the 4-tab nav (Home/Services/AI/Profile), MSAL ID-token auth,
  theme, the Home grid + edit drawer composition, the Services list, profile chrome,
  catalog fetch + **runtime** remote registration, `ScriptManager` MMKV storage,
  per-remote error boundaries + fallbacks.
- **Remotes (mini-apps):** each exposes `./widgets` (Home tiles) and/or `./screens`
  (detail/full screens). No compile-time list in the host (`remotes: {}` empty).
- **Shared singletons** (host eager, remotes lazy `import:false`): `react`,
  `react-native`, `@react-navigation/*`, plus a MyEK workspace package set
  (`sdk`/`ui`/`platform`) carrying theme, auth/shell context, api-client, shared types.
- **Delivery:** OTA, **app-scoped** (multi-application). Serve =
  `GET /v1/mf/{app}/{platform}/{remote}/**` (e.g. `/v1/mf/myek/ios/leave/mf-manifest.json`).
  Discover = **per-app catalog** `GET /v1/services/catalog?app=myek&platform=ios&shellVersion=X`
  → Registry composes `mf` coords (manifestUrl) for that app+platform.
- **Toolchain (match enterprise-app):** Re.Pack **5.2.5**, `@module-federation/enhanced`
  **2.3.1**, Rspack **1.7.x**; pin React/RN/navigation versions across host + remotes.
- **Structure:** **monorepo** (`host/` + `apps/<remote>/` + `packages/sdk`), **standalone**
  — MyEK ships its own `sdk`/`ui`/`platform` packages (no dependency on enterprise-app, which
  may be deprecated).
- **First milestone:** host shell + **one pilot remote (Leave)**, proven end-to-end over
  OTA, then expand.

## 1a. Decisions (locked)
- **App layer in the path/namespace** so multiple apps can coexist (MyEK now, others later):
  `app` is a first-class segment in the URL, storage, and catalog. Keep it lean — one extra
  segment, not a new subsystem.
- **Separate per-app catalog** (MyEK's catalog is distinct from enterprise-app's).
- **Platform = serve/bundle dimension, NOT a separate manifest.** Each platform builds its
  own bundle/chunks served under `/{platform}/`; the *service manifest* (metadata + `mf`
  coords + exposes) is **one platform-agnostic definition** — the catalog injects `platform`
  into `manifestUrl`. No duplicated per-platform manifests.
- **Monorepo + standalone sdk** (above).
- **AI tab stays in-host** for now; federate `myek-ai` after the widget/screen remotes prove out.
- **Auth handoff:** shared-singleton context (the federated `platform` package) for
  React-tree state, plus a `globalThis` token-getter for the imperative api-client — same as
  enterprise-app (see §8).

## 1b. Path & namespace layout
```
URL      /v1/mf/{app}/{platform}/{remote}/{file}     e.g. /v1/mf/myek/android/leave/mf-manifest.json
storage  ${OTA_MF_DIR}/{app}/{platform}/{remote}/    e.g. bundles/mf/myek/android/leave/…
catalog  GET /v1/services/catalog?app=myek&platform=ios
```
`app` ∈ {`myek`, …future}. `platform` ∈ {`ios`,`android`}. `remote` is the per-app remoteName
(now app-scoped, so a plain `leave` is fine — no `myek-` prefix needed since `app` already
namespaces it).

## 2. Target architecture (mirrors enterprise-app)
| Concern | enterprise-app reference | MyEK target |
|---|---|---|
| Host config | `rspack.config.mjs` (`ModuleFederationPluginV2`, `name:'host'`, `remotes:{}`, `shared:getSharedDependencies({eager:true})`, `chunkIds:'named'`, `publicPath:'noop:///'`, core/resolver/prefetch runtime plugins) | same, `uniqueName:'myek-host'` |
| Remote config | `packages/sdk/rspack/remote-config.mjs` (`exposes {'./screens','./widgets'}`, shared lazy `eager:false`, `filename:'{name}.container.js.bundle'`) | reuse the same builder shape per remote |
| Shared deps | `packages/sdk/src/index.ts` `SHARED_VERSIONS` (single source of truth) | a MyEK `sdk` package with pinned `SHARED_VERSIONS` |
| Runtime registration | `src/services/dynamicRemotes.ts` (`init` once, `registerCatalogRemotes(services)`, `loadExpose(svc,key)`, LKG manifest cache, preload) | port near-verbatim |
| Bootstrap | `index.js` → `ScriptManager.shared.setStorage(scriptStorage)`; `App` → ShellProvider + ServiceProvider | same; reuse MyEK auth/theme as the shell providers |
| Mount | `src/shell/FederatedTabHost.tsx` (`React.lazy(loadExpose)` + `Suspense` + error boundary) | host widget slots + tab/detail mounts use the same pattern |
| Serve | backend `MfController` `/v1/mf/{platform}/{remote}/**` | unchanged (already there) |
| Discover | `/v1/services/catalog` → `CatalogView.MfView{remoteName,manifestUrl,exposes,bundleHash}` | unchanged shape; MyEK remotes get their own remoteNames |

Key gotchas (from the deep-dive): `chunkIds:'named'` on host + every remote; shared
versions identical across host/remote/sdk; host eager / remotes lazy; do **not** add a
custom `ScriptManager.addResolver` (the built-in ResolverPlugin rebases URLs); manifest
URL is runtime/catalog-driven, never hardcoded.

## 3. Service & widget inventory → remotes
Host-owned (NOT remotes): tab navigation, login/auth, theme, Home grid layout + edit
drawer, Services list shell, Profile/More chrome, header/greeting.

Remote names are app-scoped (`app=myek` namespaces them), so plain ids are fine.

| Remote (`remoteName`) | `./widgets` (Home tile) | `./screens` | Surfaces | Backend data (BFF) |
|---|---|---|---|---|
| `leave` (pilot) | Leave balance (BalanceMeter) | Leave detail (balance + requests) | HOME, SERVICES_TAB | `/v1/myek/leave/widget`, `/leave/details` |
| `payslip` | Payslip (MetricCard) | Payslip sheet/details | HOME, SERVICES_TAB | `/v1/myek/payslip/widget` |
| `timesheet` | Timesheet (HoursProgress) | Timesheet detail | HOME, SERVICES_TAB | `/v1/myek/timesheet/widget`, `/timesheet/details` |
| `attendance` | Attendance (ProgressRing) | Attendance week | HOME, SERVICES_TAB | `/v1/myek/attendance/widget`, `/attendance/week` |
| `business-card` | Identity card + vCard QR | Profile / ID sheet | HOME | `/v1/myek/business-card`, `/profile-picture`, `/user` |
| `ai` (in-host first) | — | AI chat (the AI tab body) | AI_TAB | `/v1/ai/chat` (SSE) |
| `applications` | Applications counter | — | HOME | bundled (no live source) |

Pilot = **`leave`** under app `myek` (widget + screen + real data → exercises the whole pipeline).

## 4. Manifests (the "define manifests and all" piece)
Three manifest layers, all already modeled in the backend (`libs/manifest-common`):

**(a) Per-remote service manifest** — `/internal/manifest` polled by the Registry. One
per MyEK remote, **platform-agnostic**, tagged with its `app`. Example (`leave`):
```yaml
app: myek                    # NEW: which application this remote belongs to
service:
  id: leave
  name: Leave
  icon: calendar
  version: 1.0.0
  minShellVersion: 1.0.0
  status: ACTIVE
  surfaces: [HOME, SERVICES_TAB]
mf:
  remoteName: leave
  exposes:
    widgets: ./widgets       # Home tile registered into the host widget registry
    screens: ./screens       # detail stack opened from Home/Services
  bundleHash: <content-hash> # cache key; changes per rebuild
```

**(b) Catalog `mf` coords** — derived by the Registry, served per-app at
`/v1/services/catalog?app=myek&platform=ios|android`. Wire shape (`CatalogView.MfView`):
```jsonc
{ "id":"leave","name":"Leave","icon":"calendar","version":"1.0.0",
  "minShellVersion":"1.0.0","status":"ACTIVE","surfaces":["HOME","SERVICES_TAB"],
  "mf": { "remoteName":"leave",
          "manifestUrl":"https://<edge>/v1/mf/myek/ios/leave/mf-manifest.json",
          "exposes":{"widgets":"./widgets","screens":"./screens"},
          "bundleHash":"<hash>" } }
```
`manifestUrl` is composed by `OtaMfUrlBuilder` (prod) / `DevMfUrlBuilder` (local dev
ports), now with the `{app}` + `{platform}` segments. MyEK never hardcodes it.

**(c) MF runtime manifest** — `mf-manifest.json` emitted by Rspack per remote, served by
the backend `MfController` alongside the chunks. Produced by the build, not authored.

**Host widget contract:** `./widgets` resolves to a `Record<widgetId, WidgetEntry>` the
host merges into its widget registry (today's `WidgetRegistry`); `./screens` resolves to a
default-exported navigator/screen the host mounts via `FederatedTabHost`.

## 5. Migration path (phased; each phase ships + is reversible)
- **P0 — Workspace.** Convert MyEK to a monorepo: `host/` (shell) + `apps/<remote>/` +
  `packages/sdk` (shared singletons + the rspack remote-config builder). Adopt Re.Pack +
  Rspack + `@module-federation/enhanced` at enterprise-app's versions. App still runs as a
  monolith (no remotes yet).
- **P1 — Host shell on Re.Pack.** Move nav/auth/theme/catalog/ScriptManager into the host;
  build with `ModuleFederationPluginV2` (`remotes:{}`). All current screens still in-host.
  Add `dynamicRemotes.ts` (init + register + loadExpose) + LKG cache, dormant.
- **P2 — Pilot remote `myek-leave`.** Extract the leave tile + detail into `apps/leave`,
  expose `./widgets`+`./screens`; host loads it from a **local dev server** first, then
  from OTA. Prove register → resolve → render → fallback.
- **P3 — OTA pipeline.** Build remote → place bundle in `OTA_MF_DIR` (`/v1/mf/...`) →
  Registry catalog carries the `myek-leave` `mf` block → host resolves over OTA. Wire dev
  ports (`DevMfUrlBuilder`) for local iteration.
- **P4 — Migrate the rest.** payslip, timesheet, attendance, business-card, ai,
  applications → remotes, one at a time (each independently shippable).
- **P5 — Cutover + cleanup.** Remove in-host copies once their remotes are stable; the
  host keeps only shell + composition.

## 6. Fallback (pragmatic — not strict)
- **Offline / fetch fail:** LKG manifest cache (MMKV) + persisted `ScriptManager`
  chunk cache → last-good remote loads from disk; widgets already fall back to bundled
  default data.
- **Broken remote:** per-remote `Suspense` + error boundary → a failed remote shows a
  tile/screen error and a retry; it never crashes the shell.
- **During migration:** the **in-host copy stays as the safety net** — if a remote can't
  load, the host renders the bundled version of that feature. We relax strictness here on
  purpose: best-effort graceful degradation, not hard gating.
- **Not now:** signing enforcement, staged channels/promotion, hard min-shell gating —
  deferred; revisit post-pilot.

## 7. Backend changes for the app layer (incremental, non-breaking)
Add `{app}` as a first-class segment; keep the current 2-segment paths working so
**enterprise-app needs no immediate change**.
- **`MfController`**: serve `GET /v1/mf/{app}/{platform}/{remote}/**` from
  `${OTA_MF_DIR}/{app}/{platform}/{remote}`. Keep the existing `/v1/mf/{platform}/{remote}/**`
  as a **back-compat alias** bound to a default app (`employee-app`) so enterprise-app's
  current bundles/URLs keep resolving (no file moves required).
- **Manifest schema** (`libs/manifest-common`): add an `app` field to the service manifest
  (default `employee-app` when absent).
- **Registry catalog**: bucket services by `app`; `GET /v1/services/catalog` gains `?app=`
  (absent → legacy/`employee-app`). `OtaMfUrlBuilder`/`DevMfUrlBuilder` emit the `{app}`
  segment in `manifestUrl`.
- **Storage**: new apps write under `${OTA_MF_DIR}/{app}/…`; legacy layout served via the
  alias until enterprise-app migrates or is retired.

### enterprise-app (your Q4)
No work now. It rides the back-compat alias (implicit `employee-app`). Migrating it to the
explicit `/v1/mf/employee-app/...` segment is optional and can be deferred to whenever it's
convenient — or skipped entirely if it's deprecated. New apps (MyEK) are app-scoped from day one.

## 8. Auth handoff (your Q5 — is `globalThis` standard?)
Two complementary mechanisms, mirroring enterprise-app:
- **Shared-singleton context (the standard MF way):** the federated `platform`/`sdk`
  package exports the auth/shell context + store as a **singleton** `shared` dependency;
  remotes import it and bind to the host's single instance. This is the recommended,
  industry-standard Module Federation pattern for cross-bundle state (theme, auth, query client).
- **`globalThis` token-getter (pragmatic complement, ADR-0022):** a bare imperative
  accessor the api-client reads. Not the "textbook" mechanism — it's a widely-used escape
  hatch for the imperative token getter, because singleton resolution of a *plain function*
  across separately-built / OTA-delivered RN bundles isn't always reliable.
- **Verdict:** the shared singleton is the standard; `globalThis` is a pragmatic supplement
  for the one imperative seam. Adopt both (proven in this exact Re.Pack + OTA stack) rather
  than inventing a new scheme.

## 9. Resolved operational decisions
- **Publish = manual via rsync** (as today): build the remote, `rsync` the output into
  `${OTA_MF_DIR}/{app}/{platform}/{remote}/`. No publish endpoint for now.
- **Versioning/gating = loose:** track per-remote version + `minShellVersion`, but **warn,
  don't hard-block** on mismatch for now.
- **`app` lives on the remote's `/internal/manifest`** (each remote declares its own app;
  default `employee-app` if absent). Single value now; widen to a list only if a remote ever
  needs to serve multiple apps. No separate Registry-side mapping table.
