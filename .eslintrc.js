// .eslintrc.js - Configuração do ESLint

module.exports = {
  root: true,
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  plugins: [],
  env: {
    es6: true,
    node: true,
    jest: true
  },
  rules: {
    // Regras básicas
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-unused-vars': 'warn',
    'no-undef': 'error',

    // Regras de formatação
    indent: ['error', 2],
    quotes: ['error', 'single'],
    semi: ['error', 'always'],

    // Regras de estrutura
    'prefer-const': 'error',
    'no-var': 'error'
  },
  overrides: [
    {
      files: ['**/__tests__/**/*.js', '**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true
      },
      rules: {
        'no-console': 'off' // Permite console.log em testes
      }
    }
  ]
};
