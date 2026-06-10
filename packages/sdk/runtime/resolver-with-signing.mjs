// MF2 runtime plugin — bundled into the host (and remotes), runs on device.
//
// Identical to Re.Pack's stock `@callstack/repack/mf/resolver-plugin`, except it
// injects `verifyScriptSignature` into every locator the resolver produces. That
// flag tells Re.Pack's native ScriptManager to verify each remote chunk's
// appended JWT signature (written by CodeSigningPlugin at build time) against the
// `RepackPublicKey` embedded in Info.plist (iOS) / AndroidManifest (Android)
// before executing it.
//
// Wrapping `RepackResolverPlugin(config)` (which spreads `config` into the
// locator) reuses the stock URL-rebasing verbatim — a custom
// `ScriptManager.shared.addResolver` would shadow it and reintroduce RUNTIME-006
// (see repack_mf2_findings). Swapped in via ModuleFederationPluginV2's
// `defaultRuntimePlugins` in place of the stock resolver-plugin.

import RepackResolverPlugin from '@callstack/repack/mf/resolver-plugin';

// ROLLOUT: 'lax' verifies a chunk only if it carries a signature, and lets
// unsigned chunks through — required while remotes are migrating to signed
// bundles (a 'strict' host would REJECT every not-yet-resigned remote and brick
// the home grid). Once ALL published remotes are rebuilt + signed + republished,
// flip this to `__DEV__ ? 'lax' : 'strict'` so release hard-rejects unsigned/
// tampered chunks (the actual integrity guarantee). 'lax' is NOT a safe
// end-state for release — it lets an attacker strip the signature.
const verifyScriptSignature = 'lax';

export default () => RepackResolverPlugin({ verifyScriptSignature });
