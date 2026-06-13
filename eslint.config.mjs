import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['build', 'dist', 'coverage', 'node_modules'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...js.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Test files and the Vitest setup run with Vitest globals.
    files: ['**/*.test.{js,jsx}', 'src/setupTests.js'],
    languageOptions: {
      globals: { ...globals.node, ...globals.vitest },
    },
  },
  {
    // Build tooling runs in Node.
    files: ['vite.config.js', 'eslint.config.mjs'],
    languageOptions: { globals: { ...globals.node } },
  },
];
