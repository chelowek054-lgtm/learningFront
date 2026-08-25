// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // dist — сборка; .expo — генерируется dev-сервером (типы роутов, временные
    // модули). Линтовать их бессмысленно: файлы не наши и в git не попадают.
    ignores: ['dist/*', '.expo/*'],
  },
  {
    // Служебные скрипты выполняются в Node, а не в RN: без этого __dirname
    // и require считаются необъявленными.
    files: ['scripts/**/*.js', 'eslint.config.js', 'metro.config.js'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        module: 'writable',
        require: 'readonly',
        process: 'readonly',
      },
    },
  },
]);
