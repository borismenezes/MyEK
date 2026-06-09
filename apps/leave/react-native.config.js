module.exports = {
  // Routes `react-native start` (the remote dev server) to Re.Pack so the host
  // can load this remote from localhost during development.
  commands: require('@callstack/repack/commands/rspack'),
};
