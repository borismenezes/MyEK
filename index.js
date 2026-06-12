/**
 * @format
 */

// Re.Pack ScriptManager: the singleton is auto-initialized natively. We do NOT
// register a custom resolver — Re.Pack's ResolverPlugin (via the host's MF
// defaultRuntimePlugins) rebases chunk URLs from the federation manifest.
// `setStorage` gives ScriptManager a persistent (MMKV) backend for downloaded
// chunk locators, so a federated remote fetched once loads from disk on later
// (incl. offline) launches. See src/services/scriptStorage.ts.
import { ScriptManager } from '@callstack/repack/client';
import { scriptStorage } from './src/services/scriptStorage';

import { AppRegistry, LogBox, NativeModules, Text } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

ScriptManager.shared.setStorage(scriptStorage);

// Apply Urbanist as the default font for every <Text> in the app. The
// theme tokens already declared `font.family: 'Urbanist'` (see
// `src/theme/tokens.ts`), but no Text actually read it — RN doesn't
// inherit `fontFamily` like CSS does, so each Text would otherwise fall
// back to the system font. Setting it once on `defaultProps.style` means
// section headers, the employee name, and every other text node pick up
// Urbanist while still honouring whatever `fontWeight` the call site
// passes (the bundled font is a variable TTF with weights 100–900, so
// `fontWeight: '700'` picks the right axis without per-weight files).
//
// Individual Text components can still override `fontFamily` if they
// ever need to — RN merges defaultProps.style with the per-call style,
// later props win.
const TextAny = Text;
TextAny.defaultProps = TextAny.defaultProps || {};
TextAny.defaultProps.style = [{ fontFamily: 'Urbanist' }, TextAny.defaultProps.style];

if (__DEV__) {
  // Suppress all in-app LogBox overlays (warnings + errors).
  // Output still flows to the Metro console for inspection.
  LogBox.ignoreAllLogs(true);
  // Disable shake-to-open for the RN dev menu so an accidental jolt
  // doesn't pop it. Cmd+D (iOS sim) and Cmd+M (Android emulator) still
  // open it intentionally.
  //
  // Reach in via NativeModules instead of the public DevSettings module:
  // RN 0.85's JS-side DevSettings dropped setIsShakeToShowDevMenuEnabled
  // from its public surface, but the underlying TurboModule still exposes
  // it. NativeModules.DevSettings works in both bridge and bridgeless
  // modes via RN's compat shim.
  NativeModules.DevSettings?.setIsShakeToShowDevMenuEnabled?.(false);
}

AppRegistry.registerComponent(appName, () => App);
