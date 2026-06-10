# MyEK — Employee Super‑App (Module Federation micro‑frontend)

MyEK is the Enterprise employee super‑app: a React Native client whose home
grid, detail screens and identity surfaces are **federated remotes delivered
over the air**. The app shell ("host") ships once through the app store; every
feature after that is published as an OTA bundle and appears with **no app‑store
release and no host rebuild**.

- **Client:** React Native 0.85 / React 19, bundled with **Re.Pack** (Rspack), a
  **Module Federation 2** *host*.
- **Features:** independent MF2 *remotes* (`leave`, `attendance`, `payslip`,
  `timesheet`, `business-card`, …) composed at runtime from a backend catalog.
- **Backend:** Spring Boot microservices (`enterprise-backend`) behind a gateway,
  a BFF under `/v1/myek/**`, a Registry catalog, an OTA bundle service, and an AI
  assistant with MCP tool federation.

> Deep dives: [`docs/mfe-migration-plan.md`](docs/mfe-migration-plan.md).
> Backend: the `enterprise-backend` repo.

---

## 1. Architecture

### The shell is empty; the catalog fills it
The host's MF container is built with **`remotes: {}`** — it has *zero*
compile‑time knowledge of any feature. At runtime it:

1. Signs in (Azure MSAL / Entra ID, OIDC).
2. Fetches the **per‑app catalog**: `GET /v1/services/catalog?app=myek&platform=…`
   (Core proxies the Registry, which aggregates each service's manifest).
3. Maps each `widgetId → remote` (name + MF manifest URL on the OTA service).
4. `loadRemote`s the federated component and renders it; falls back to the
   in‑host component while loading or on failure.

```
┌─────────────────────────────── UI (React Native MF2 host) ───────────────────────────────┐
│  Dashboard grid · AI Assistant · Profile        federated widgets ↓ (OTA)                  │
│  leave · attendance · payslip · timesheet · business-card                                  │
└───────────────┬────────────────────────────────────────────────────────────────┬─────────┘
        catalog ?app=myek                                            OTA /v1/mf/{app}/{plat}/{remote}
                │                                                                  │
┌───────────────▼──────── Backend (enterprise-backend) ────────────────────────────▼─────────┐
│  Gateway (JWT) → Core/BFF (/v1/myek/**) · Registry (catalog) · OTA · AI (MCP) ·             │
│  domain services: leave / time / profile / rewards   →   MariaDB / systems of record       │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Key properties
- **Widget data is via props.** The *host* fetches each widget's data from the
  BFF (`/v1/myek/<x>/widget`) and passes it down — remotes are presentation‑only
  and don't fetch/authenticate themselves (the AI tab is the exception).
- **OTA delivery + integrity.** Remotes are served from the OTA service. Each
  chunk is **code‑signed** (RS256 JWT); the host verifies every chunk against an
  embedded public key (`verifyScriptSignature: 'strict'` in release). This is
  the integrity control (TLS pinning is not currently configured).
- **Catalog‑driven, additive.** A widget the catalog doesn't map renders
  in‑host; federation is purely additive. A new remote = a backend catalog entry
  + an OTA publish.

### Shared libraries (`packages/`)
| Package | Role |
|---|---|
| `@myek/sdk` | Rspack build helpers (`buildRemoteRspackConfig`, the integrity + signing plugins, `SHARED_VERSIONS` / `getSharedDependencies`). |
| `@myek/ui` | Design tokens (`theme`, `widgetTheme`) + shared vector `Icon`. Every remote styles with this so tiles match the host. |
| `@myek/platform` | Cross‑bundle bridge: host publishes the signed‑in user + an `openProfile` action onto `globalThis` slots (ADR‑0022 style); remotes read them. Also the vCard builder. **Never put the bearer token here — share an authed client, not a token.** |
| `@myek/<feature>` | A feature's UI: `./widgets` (`{widgetId: Component}`) + `./screens`. e.g. `@myek/leave`, `@myek/business-card`. |

### Repo layout
```
src/                       host shell (navigation, auth, stores, WidgetRegistry/Renderer,
                           src/services/federation/* — runtime registration + OTA cache)
packages/<feature>/        feature UI (widgets + screens), consumed by its remote
packages/{sdk,ui,platform} shared libraries
apps/<feature>/            MF2 remote build wrapper (rspack.config.mjs → @myek/sdk)
rspack.config.mjs          host MF config (remotes:{}, eager shared, signing resolver)
ios/ · android/            native projects (RepackPublicKey embedded for verification)
docs/                      architecture + migration plan
```

---

## 2. Prerequisites
- Node 20+ and npm (workspaces) · Watchman recommended
- iOS: Xcode 16+, CocoaPods (`bundle install` / `pod install`)
- Android: Android SDK + NDK per RN 0.85
- Access to the backend (default `https://thon.mohsal.dev`; override via `.env`)
- `code-signing.pem` (OTA private key) present locally to **build/publish
  remotes** — fetch from Vault: `vault kv get -field=private_key_b64 -mount=secret enterprise/ota-signing | base64 -d > code-signing.pem` (gitignored)

```bash
npm install                       # links workspaces (packages/* + apps/*)
( cd ios && pod install )         # CocoaPods (Hermes is OFF for iOS — see §6)
```

---

## 3. Run in development
The host bundles with Re.Pack (`react-native.config.js` routes the RN CLI to
Re.Pack's commands). Two dev modes:

**A. Host dev, remotes from the live OTA backend** (simplest):
```bash
npm start                 # Re.Pack dev server for the host
npm run ios               # or: npm run android
```
The home grid loads the *published* remotes from `OTA_BASE_URL`.

**B. Host + a remote dev server** (live‑edit a remote):
```bash
# terminal 1 — host
npm start
# terminal 2 — the remote you're editing (each app has its own port)
cd apps/leave && npm run start            # iOS dev server :9001
npm run ios
```
In dev the signing resolver runs `'lax'`, so unsigned dev‑server chunks load.

---

## 4. Build for production

### 4a. Build + sign + publish a remote (OTA — no app release)
```bash
cd apps/<feature>
npm run build:mf:ios        # → dist/ios/<feature>/      (chunks signed: RS256 JWT)
npm run build:mf            # → dist/android/<feature>/

# publish to the OTA service (replaces the live bundle):
rsync … dist/ios/<feature>/      → {OTA}/v1/mf/myek/ios/<remoteName>/
rsync … dist/android/<feature>/  → {OTA}/v1/mf/myek/android/<remoteName>/
```
`build:mf*` signs every chunk with `code-signing.pem` (production mode only).
Users get the update on next relaunch — the host detects the changed manifest,
evicts the old chunks, downloads + verifies the new ones.

### 4b. Build the host app (app‑store / device — needed only for host changes)
```bash
# iOS (release, device) — see §6 for the required Re.Pack build config
npm run ios:device                # or xcodebuild -scheme MyEK -configuration Release …
# Android
npm run android:prod              # or ./gradlew assembleRelease
```
Verify before shipping: the embedded `main.jsbundle` contains `federation` /
`mf-manifest` markers (Re.Pack bundle, not Metro).

---

## 5. Create a new federated service

Example: a `rewards` widget + screen.

**1) Feature package — `packages/rewards/`** (`@myek/rewards`):
```
src/widgets/RewardsWidget.tsx     # uses @myek/ui tokens; data via WidgetProps `data`
src/widgets/index.ts              # export default { rewards: RewardsWidget }
src/screens/RewardsScreen.tsx + index.ts
src/types.ts                      # WidgetProps + the payload shape
src/index.ts                      # re-export widgets/screens/types
package.json                      # exports: ".", "./screens", "./widgets"; dep @myek/ui (+ @myek/platform if it needs the user)
```

**2) Remote build wrapper — `apps/rewards/`** (`@myek/rewards-remote`):
```js
// rspack.config.mjs
import { buildRemoteRspackConfig } from '@myek/sdk/rspack/remote-config';
export default buildRemoteRspackConfig({
  appsDir: __dirname, serviceId: 'rewards', mfName: 'rewards', uniqueName: 'myek-rewards',
});
```
+ `react-native.config.js` (`commands: require('@callstack/repack/commands/rspack')`),
`src/index.ts` (`export * from '@myek/rewards'`), and `build:mf*` scripts.
(`mfName`/`remoteName` must be lower snake_case — e.g. `business_card`.)

**3) Link:** `npm install` (from repo root).

**4) Host registry (`src/widgets/WidgetRegistry.ts`):** add a `rewards` entry —
its `component` is the **in‑host fallback** and it carries the home‑grid layout
defaults. Federation renders the remote when the catalog maps `rewards`, else
this component.

**5) Backend catalog (`enterprise-backend`):** add to
`services/registry/.../application.yml` under `app.mf.apps.myek`:
```yaml
- serviceId: rewards
  remoteName: rewards
  name: Rewards
  surfaces: [SERVICES_TAB]
  exposes: { screens: "./screens", widgets: "./widgets" }
  widgetIds: [rewards]
```
Redeploy the registry. (If the widget needs data, add a BFF `/v1/myek/rewards/widget`.)

**6) Build, sign, publish** (§4a) for iOS + Android.

**7) Relaunch** — the tile loads federated. **No host rebuild** *unless* the
remote needs a new host capability (e.g. a new `@myek/platform` field) — then
rebuild the host once to ship that capability + the embedded key.

---

## 6. Build gotchas & conventions
- **iOS must bundle with Re.Pack, Hermes OFF.** `ios/.xcode.env` sets
  `CLI_PATH=$REACT_NATIVE_PATH/cli.js`, `BUNDLE_COMMAND=bundle`,
  `USE_HERMES=false`; the `Podfile` sets `:hermes_enabled => false`. Without
  `CLI_PATH` the Xcode phase falls back to Metro and crashes on MF dynamic
  imports. (Android keeps Hermes **on**.)
- **iOS device builds:** `xcodebuild -destination id=<hardware UDID>` (from
  `xcrun xctrace list devices`), `devicectl install --device <CoreDevice GUID>`;
  keep the phone unlocked.
- **Code signing:** keypair is `code-signing.pem` (private, gitignored — in
  Vault) + the public key embedded in `ios/MyEK/Info.plist` (`RepackPublicKey`)
  and `android/.../res/values/strings.xml`. Release verifies `'strict'` — **every
  published remote must be signed**, or it's rejected (falls back to in‑host).
- **`SHARED_VERSIONS`** is duplicated in `packages/sdk/src/index.ts`,
  `packages/sdk/rspack/remote-config.mjs`, and `rspack.config.mjs` — keep them in
  sync (a mismatch breaks the singleton guarantee).
- **`@myek/platform`** carries only non‑secret host state on `globalThis`
  (user identity, `openProfile`). Do **not** expose the auth token there.

---

## 7. OTA update flow (the payoff)
```
edit packages/<feature> → cd apps/<feature> && npm run build:mf[:ios]
   → rsync dist to the OTA bundle dir → user relaunches
```
On relaunch the host re‑fetches the manifest, sees the integrity change, evicts
the stale chunks, downloads + **verifies** the new ones, and renders the update.
No reinstall, no app‑store review. A broken/unreachable bundle degrades to the
in‑host fallback.

---

## 8. Commands
```bash
npm start                 # host dev server (Re.Pack)
npm run ios | android     # run on simulator/emulator
npm run ios:device        # release build on a connected iPhone
npm run lint              # eslint
npm test                  # jest
cd apps/<f> && npm run build:mf[:ios]   # build + sign a remote bundle
```
