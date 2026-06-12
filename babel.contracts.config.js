/**
 * Babel config for the widget CONTRACT tests (jest.contracts.config.js).
 *
 * Same as babel.config.js minus the worklets plugin: it injects dev-mode
 * style checks that require reanimated/worklets native internals, which
 * don't exist under jest — and the contract suite renders plain components,
 * no worklets. Service packages don't use the host aliases, but the harness
 * lives in packages/sdk and the fixtures are plain JSON, so the rest of the
 * pipeline matches the app build.
 */
module.exports = {
  presets: ['module:@react-native/babel-preset'],
};
