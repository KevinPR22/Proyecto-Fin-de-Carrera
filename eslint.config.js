import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import sonarjs from 'eslint-plugin-sonarjs';
import globals from 'globals';

// Análisis estático: reglas recomendadas de JavaScript/TypeScript, de los
// hooks de React y las reglas de SonarQube (eslint-plugin-sonarjs).
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '.astro/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  sonarjs.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['src/**/*.test.ts', 'db/**/*.test.ts'],
    rules: { 'sonarjs/no-duplicate-string': 'off' },
  },
);
