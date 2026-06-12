/**
 * Widget contract tests — `npm run verify:contracts`.
 *
 * Separate config from the (app-level) jest.config.js so per-package contract
 * suites run without pulling in the host App tree. Each service package owns
 * its test + fixture under packages/<id>/src; the harness is @myek/sdk/testing.
 */
module.exports = {
  preset: '@react-native/jest-preset',
  testMatch: ['<rootDir>/packages/**/*.contract.test.tsx'],
  moduleNameMapper: {
    '^react-native-svg$': '<rootDir>/test-utils/mocks/svg-stub.js',
    '^react-native-qrcode-svg$': '<rootDir>/test-utils/mocks/svg-stub.js',
    // Reanimated's official jest mock (its ESM entry can't load under jest).
    '^react-native-reanimated$': 'react-native-reanimated/mock',
  },
  // Contract tests use a babel config WITHOUT the worklets plugin (it injects
  // dev checks that need native worklets); see babel.contracts.config.js.
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { configFile: './babel.contracts.config.js' }],
  },
};
