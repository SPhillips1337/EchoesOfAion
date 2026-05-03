const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');

module.exports = [
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsparser,
            ecmaVersion: 2020,
            sourceType: 'module'
        },
        plugins: {
            '@typescript-eslint': tseslint
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            'no-console': 'off'
        }
    }
];
