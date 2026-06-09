/**
 * Host shell version — gates which remotes this build can load. A remote whose
 * `minShellVersion` exceeds this is filtered out before the user can reach it.
 * Matches the in-app version string (`MyEk · vX.Y.Z`).
 */
export const SHELL_VERSION = '4.2.1';

/**
 * `a >= b` for dotted numeric versions (e.g. '4.2.1'). Pre-release/build
 * metadata is ignored (split on the first '-'/'+'). Missing segments are 0,
 * so '4.2' >= '4.2.0'. Non-numeric segments compare as 0 — good enough for the
 * loose gating we want (warn, don't hard-block).
 */
export function semverGte(a: string, b: string): boolean {
  const parse = (v: string): number[] =>
    v
      .split(/[-+]/)[0]
      .split('.')
      .map(n => parseInt(n, 10) || 0);
  const av = parse(a);
  const bv = parse(b);
  const len = Math.max(av.length, bv.length);
  for (let i = 0; i < len; i++) {
    const x = av[i] ?? 0;
    const y = bv[i] ?? 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return true; // equal
}
