// Run this command to generate base config and vs code settings:
// npx @antfu/eslint-config@latest

import antfu from '@antfu/eslint-config';

export default antfu({
  type: 'app',
  vue: true,
  typescript: true,
  formatters: true,
  stylistic: {
    indent: 2,
    semi: true,
    quotes: 'single',
  },
}, {
  files: ['**/*.{ts,mts,tsx,vue}'],
  rules: {
    'ts/no-redeclare': 'off',
    'ts/consistent-type-definitions': ['error', 'type'],
    'no-console': ['warn'],
    'antfu/no-top-level-await': ['off'],
    'node/prefer-global/process': ['off'],
    'perfectionist/sort-imports': ['error', {
      tsconfig: {
        rootDir: '.',
      },
    }],
    'unicorn/filename-case': ['error', {
      cases: {
        kebabCase: true,
        pascalCase: true,
      },
      ignore: ['README.md'],
    }],
  },
});
