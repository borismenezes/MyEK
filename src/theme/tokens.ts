import { darkTheme as uiDarkTheme, lightTheme as uiLightTheme } from '@myek/ui';
import type { Theme } from '@/types';

/**
 * Host theme tokens — re-exported from @myek/ui, the CANONICAL token source
 * shared with every federated remote. The host no longer carries its own
 * palette copy: host UI and remote UI literally render from the same objects,
 * so they cannot drift. Palette/shape changes go in packages/ui/src/index.ts
 * (additive-only — it's a contract package; the api-surface check applies).
 *
 * The host's `Theme` type (src/types/theme.ts) is structurally identical to
 * @myek/ui's; the typed re-binding below is where the compiler proves that —
 * if the shapes ever diverge, this file errors.
 */
export const lightTheme: Theme = uiLightTheme;
export const darkTheme: Theme = uiDarkTheme;

export const themes = { light: lightTheme, dark: darkTheme };
