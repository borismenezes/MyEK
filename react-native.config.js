module.exports = {
  // Route the React Native CLI's `start` / `bundle` commands to Re.Pack
  // (rspack.config.mjs) instead of Metro. This is the bundler swap: the native
  // builds (Android Gradle, iOS bundle phase) call `react-native bundle`, which
  // now produces a Re.Pack/Module-Federation bundle. metro.config.js is left in
  // place but unused.
  commands: require('@callstack/repack/commands/rspack'),
};
