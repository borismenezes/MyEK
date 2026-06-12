# Release train — shared dependencies & bridge protocol

MyEK is a Module Federation host whose remotes ship independently (OTA), but
they all execute against **one** copy of every shared singleton (React,
React Native, navigation, TanStack Query, `@myek/*` — the host's copy). That
makes the share scope a *coordination point*: most changes need no
coordination at all, a few need a train.

## What needs no coordination (the default)

- Shipping/updating a remote: build → publish to OTA → catalog. No host
  release, no other team involved.
- **Additive** changes to the contract packages (`@myek/sdk` types,
  `@myek/platform` slots, `@myek/api-client`, `@myek/ui` exports): old
  bundles ignore what they don't know. This is why the additive-only rule
  exists — it's what keeps teams decoupled.

## What rides the train (coordinated window)

A **train** = one window in which the host is released and *all* remotes are
rebuilt and republished against the same workspace HEAD.

Triggers:

1. **Bumping any package in `SHARED_PACKAGES` or `WORKSPACE_PACKAGES`**
   (`packages/sdk/rspack/shared-versions.mjs`). The host provides these at
   runtime; a remote built against a different major (or a behaviourally
   different minor) is undefined territory.
2. **Bumping `PROTOCOL_VERSION`** in `@myek/platform` — only ever done for a
   breaking slot-shape change, which already implies every consumer must
   rebuild. Keep the old slot populated until the train completes.
3. React Native / Re.Pack / rspack upgrades (they move multiple shared
   packages at once).

Order of operations: merge the bump → release the host (app store / MDM) →
rebuild + republish every remote → verify `mf.shared.mismatch` stops firing.
Until the host release reaches devices, **old hosts + new remotes** coexist:
that's why the bump itself must stay backwards-compatible whenever possible,
and why `minShellVersion` exists for when it can't.

## How drift is detected

Every build stamps an **opaque compat token** — `sha256(sorted shared
versions + PROTOCOL_VERSION)` — into the host bundle (DefinePlugin) and each
remote's `mf-manifest.json` (`compat`). On every manifest fetch the host
compares and logs `mf.shared.mismatch` (structured, per-remote). A burst of
mismatch events after a merge = a remote missed the train.

The token is a hash **by design**: the manifest is served unauthenticated,
and a public artifact must not enumerate dependency versions, git SHAs,
build timestamps, or builder identity (fingerprinting / CVE-targeting
surface). Build provenance belongs in CI metadata and the authenticated
catalog only.

## Rules of thumb

- Adding a shared package = train. Prefer NOT sharing a dependency unless it
  must be a singleton (React context identity, native module, query cache).
- A remote that hasn't been rebuilt in a long time is a liability — treat
  recurring `mf.shared.mismatch` for a remote as a bug against its owning
  team, not noise.
