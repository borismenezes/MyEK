// Shared build-time env loader for the host and every MF2 remote.
//
//   APP_ENV=production → load .env.production only (reproducible release
//                        builds; the per-dev .env.local override is ignored).
//   otherwise          → load .env, then .env.local (override) — dev workflow.
//
// dotenv never overwrites a variable already present in process.env, so a
// single value can still be hard-overridden from the shell.
//
// NOTE: MyEK also inlines `@env` imports via react-native-dotenv (babel) at
// transform time. This loader is for build-config-level env (e.g. OTA_BASE_URL,
// DEFAULT_THEME, MF dev flags) the rspack config / DefinePlugin may read.

import path from 'node:path';
import dotenv from 'dotenv';

/** @param {string} repoRoot absolute path to the app root (where .env* live). */
export function loadBuildEnv(repoRoot) {
  if (process.env.APP_ENV === 'production') {
    dotenv.config({ path: path.resolve(repoRoot, '.env.production') });
    return;
  }
  dotenv.config({ path: path.resolve(repoRoot, '.env') });
  dotenv.config({ path: path.resolve(repoRoot, '.env.local'), override: true });
}
