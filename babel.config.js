module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // dotenv MUST run before module-resolver so the @env import is rewritten
    // to inline values before module-resolver attempts to resolve it as a path.
    [
      'module:react-native-dotenv',
      {
        envName: 'APP_ENV',
        moduleName: '@env',
        path: '.env',
        safe: false,
        allowUndefined: true,
        verbose: false,
      },
    ],
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.ts', '.android.ts', '.ts', '.ios.tsx', '.android.tsx', '.tsx', '.jsx', '.js', '.json'],
        alias: {
          // Use a regex-anchored key so `@` only matches the `@/foo` form and
          // does NOT swallow `@env` (the dotenv module).
          '^@/(.+)': './src/\\1',
          '@api': './src/api',
          '@auth': './src/auth',
          '@components': './src/components',
          '@widgets': './src/widgets',
          '@screens': './src/screens',
          '@store': './src/store',
          '@hooks': './src/hooks',
          '@services': './src/services',
          '@utils': './src/utils',
          '@offline': './src/offline',
          '@types': './src/types',
          '@theme': './src/theme',
          '@navigation': './src/navigation',
          '@config': './src/config',
          '@aiAgent': './src/aiAgent',
        },
      },
    ],
    // Reanimated 4: plugin moved to react-native-worklets
    'react-native-worklets/plugin',
  ],
};
