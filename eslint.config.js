// https://docs.expo.dev/guides/using-eslint/
const fs = require('fs');
const path = require('path');
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Границы слоёв FSD (T-0022): импорт только вниз по списку, без зависимостей
// между срезами одного слоя. Сверху вниз; shared — основание, срезов не имеет.
const LAYERS = ['app', 'pages', 'widgets', 'features', 'entities', 'shared'];
// Слои, внутри которых срезы (папки первого уровня) не знают друг о друге.
const SLICED = ['pages', 'widgets', 'features', 'entities'];
const SRC = path.join(__dirname, 'src');

function slices(layer) {
  return fs
    .readdirSync(path.join(SRC, layer), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

const layerBoundaryRules = [];
LAYERS.forEach((layer, i) => {
  // Слои выше текущего: `@/features/x` из entities — нарушение.
  const above = LAYERS.slice(0, i);
  if (above.length) {
    layerBoundaryRules.push({
      files: [`src/${layer}/**/*.{ts,tsx}`],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: above.map((up) => ({
              group: [`@/${up}`, `@/${up}/**`],
              message: `FSD: слой «${layer}» не может импортировать из вышележащего «${up}».`,
            })),
          },
        ],
      },
    });
  }
});
SLICED.forEach((layer) => {
  const names = slices(layer);
  const above = LAYERS.slice(0, LAYERS.indexOf(layer));
  names.forEach((name) => {
    layerBoundaryRules.push({
      files: [`src/${layer}/${name}/**/*.{ts,tsx}`],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              ...above.map((up) => ({
                group: [`@/${up}`, `@/${up}/**`],
                message: `FSD: слой «${layer}» не может импортировать из вышележащего «${up}».`,
              })),
              ...names
                .filter((other) => other !== name)
                .map((other) => ({
                  group: [`@/${layer}/${other}`, `@/${layer}/${other}/**`],
                  message: `FSD: срез «${layer}/${name}» не должен знать о соседнем срезе «${other}».`,
                })),
            ],
          },
        ],
      },
    });
  });
});

module.exports = defineConfig([
  expoConfig,
  {
    // dist — сборка; .expo — генерируется dev-сервером (типы роутов, временные
    // модули). Линтовать их бессмысленно: файлы не наши и в git не попадают.
    ignores: ['dist/*', '.expo/*'],
  },
  ...layerBoundaryRules,
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
