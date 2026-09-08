const js = require('@eslint/js');

/** Soft lint config — keeps CI green while new code is checked. */
module.exports = [
  {
    ignores: [
      'node_modules/**',
      'functions/**',
      'notification-server/**',
      '.expo/**',
      'dist/**',
      'android/**',
      'ios/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        __DEV__: 'readonly',
        console: 'readonly',
        process: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        AbortController: 'readonly',
        FormData: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        alert: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_|^React$',
          ignoreRestSiblings: true,
        },
      ],
      'no-undef': 'warn',
      'no-empty': 'warn',
      'no-console': 'off',
      'no-constant-condition': 'warn',
    },
  },
];
