// MF2 remote entry for the leave mini-app. The exposed modules (./screens,
// ./widgets) are wired in apps/leave/rspack.config.mjs via the shared remote
// builder; this entry just re-exports the workspace package.
export * from '@myek/leave';
