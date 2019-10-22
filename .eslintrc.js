module.exports = {
  parser: '@typescript-eslint/parser',

  settings: {
    'import/resolver': {
      'node': {
        'extensions': ['.ts']
      }
    }
  },

  extends: [
    'airbnb/base',
    'prettier',
  ],

  plugins: [
    '@typescript-eslint/eslint-plugin',
    'prettier',
  ],

  parserOptions: {
    sourceType: 'module',
    project: './tsconfig.json',
  },

  rules: {
    'no-unused-vars': 'off',
    'func-names': 'off',
    'no-use-before-define': 'off'
  },
};
