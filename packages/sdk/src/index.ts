/**
 * @myek/sdk — Module Federation build helpers for the MyEK host and remotes.
 *
 * The shared-singleton package list and version resolution live in
 * `../rspack/shared-versions.mjs` (`SHARED_PACKAGES` +
 * `resolveSharedVersions(rootDir)`): versions are read from the installed
 * node_modules at build time by both the host rspack config and the remote
 * builder (`../rspack/remote-config.mjs`), so the share scope can't drift from
 * what's actually bundled. This package does NOT enumerate remotes by name —
 * remote discovery is runtime/catalog-driven (see the host's dynamic-remotes
 * wiring). Mirrors enterprise-app's `@employee-app/sdk` pattern.
 *
 * (This entry point intentionally exports nothing yet; it becomes the home of
 * runtime-shared TS utilities — e.g. @myek/platform bridge types — as the
 * workspace packages land.)
 */
export {};
