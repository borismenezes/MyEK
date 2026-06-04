# MyEK · Emirates Group Employee Portal

A production-grade React Native (TypeScript) implementation of the Emirates Group employee portal — dynamic widgets, API-versioned services, offline-first data, drag-drop home grid, and Microsoft Intune SSO.

## Features

- **Microsoft Intune SSO** — clean adapter interface; the bundled mock implementation can be swapped for real MSAL with one line.
- **API versioning per service** — server tells the client which version to call for each domain (leave, payslip, etc.). Roll out v2 to a subset of users without an app release.
- **Widget system** — every home tile is a config-driven widget loaded from a registry. Add a new widget in two steps: write the component, register it.
- **Drag-drop home grid** — iPhone-style 2-column grid, long-press to enter edit mode, drag to reorder. Powered by Reanimated 3 + Gesture Handler 2.
- **Offline-first** — every widget caches its last response (MMKV). Cache is served instantly on cold start and on connection loss; the offline banner tells the user how stale the data is. A sync manager refreshes everything when the network returns.
- **Themed light + dark** — token-based theme with system-mode support.
- **Feature flags** — server-driven flags merged with build-time defaults and (in debug builds) local overrides.
- **Logging** — scoped logger with pluggable transports; remote stub ready for App Insights / Datadog.

## Project structure

```
src/
├── api/              Axios client, version manager, endpoints
├── auth/             Intune SSO adapter + auth orchestration
├── components/       Reusable UI primitives (Icon, Avatar, Card, DraggableGrid…)
├── widgets/          Widget components, registry, renderer, shell
├── screens/          Login, Home, Services, Profile, More
├── navigation/       Root + Tab navigators
├── store/            Zustand stores (auth, network, cache, theme)
├── hooks/            useWidgetData, useNetworkStatus
├── services/         Business logic (widgetService, homeService)
├── offline/          cacheManager, syncManager
├── theme/            Tokens + ThemeProvider
├── utils/            Logger, storage, feature flags, helpers
├── types/            All TypeScript interfaces
└── config/           Environment-aware config
mocks/                Express mock backend
__tests__/            Jest tests
App.tsx               Providers + bootstrap orchestration
```

## Running locally

### 1. Install

```bash
npm install
cd ios && pod install && cd ..   # iOS only
```

### 2. Start the mock backend

```bash
npm run mock
# 🟢 MyEK mock backend listening on http://localhost:4000
```

### 3. Point the app at the mock

Copy `.env.example` → `.env` and set:

```
API_BASE_URL=http://localhost:4000           # iOS simulator
# API_BASE_URL=http://10.0.2.2:4000          # Android emulator
```

### 4. Run the app

```bash
npm run start          # Metro
npm run ios            # in another terminal
npm run android
```

Tap **Sign in with Microsoft** on the login screen. The mock accepts any grant and returns a full bootstrap (user + apps + widget layout + per-service API versions).

## Architecture

### The auth bootstrap

A single `LoginResult` returned from `/auth/login` is the seed for the whole app. It contains:

```ts
{
  user, session, permissions,
  apps: AppConfig[],            // catalogue of internal apps
  widgetLayout: WidgetConfig[], // home screen layout
  apiVersions: { leave: 'v2', payslip: 'v1', ... },
  featureFlags: { darkMode: true, ... }
}
```

The auth service writes everything into the Zustand store, the version registry, and persistent storage. On cold start `hydrateAuth()` restores all of it before the first frame renders, so the user sees their last-known home grid immediately — even offline.

### Adding a widget

1. **Define the payload** in `types/widgets.ts`:
   ```ts
   export interface RosterPayload { /* ... */ }
   ```
2. **Build the component** in `widgets/RosterWidget.tsx`:
   ```tsx
   export const RosterWidget: React.FC<WidgetProps<RosterPayload>> = ({ data }) => { /* ... */ }
   ```
3. **Register it** in `widgets/WidgetRegistry.ts`:
   ```ts
   roster: {
     widgetId: 'roster',
     name: 'Roster',
     icon: 'plane',
     component: RosterWidget,
     supportedSizes: ['small', 'large'],
     surface: true,
   }
   ```
4. **Have the server include it** in `widgetLayout` for relevant users.

That's it — the renderer picks it up, the cache and offline strategy apply automatically, and it shows up in edit mode for repositioning.

### Versioning a service

Server flips a user from `leave: 'v1'` to `leave: 'v2'` in the `apiVersions` map. Next bootstrap, every widget bound to the leave service hits `/v2/leave/...`. Cache keys include the version, so v1 entries don't bleed into v2 results.

### Offline strategy

`widgetService.fetch()` decision tree:

1. Cache fresh (< 5 min) and not forced → return cache.
2. Offline → cache (any age) or error if none.
3. Online → network; on success cache, on failure fall back to cache.

`syncManager` listens for offline → online transitions and refreshes every visible widget in parallel.

### Swapping the Intune mock for real MSAL

`src/auth/intuneAuth.ts` exposes an `IntuneAdapter` interface. Replace `MockIntuneAdapter` with the commented `MsalIntuneAdapter` sketch (uses `react-native-msal`). No other file needs to change.

## Testing

```bash
npm test           # Jest
npm run typecheck  # tsc --noEmit
npm run lint
```

A starter test for the cache manager lives in `__tests__/cacheManager.test.ts`.

## Notes on this build

- Gradients are approximated with stacked SVG rects to avoid the native `react-native-linear-gradient` dependency. Swap in the real package for production gradients.
- The `FauxQR` component is a deterministic placeholder; replace with `react-native-qrcode-svg` if you need scannable codes.
- The mock backend is intentionally permissive (no auth checks). Don't enable it in any environment a real device can reach.
