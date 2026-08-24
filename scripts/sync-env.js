// Переносит EXPO_PUBLIC_* из корневого .env суперпроекта в локальный .env.
//
// Expo читает .env только из корня своего проекта и заглянуть на уровень выше
// не умеет, поэтому единый источник правды (../.env) приходится проецировать
// сюда. Файл .env целиком генерируется этим скриптом — править его бесполезно,
// правки затрёт следующий запуск; менять значения нужно в ../.env.
//
// Запускается автоматически перед start/web/android/ios (npm-хуки pre*).
// Если суперпроекта рядом нет (learningFront склонирован отдельно), скрипт
// молча уступает: локальный .env остаётся как есть.

const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ROOT_ENV = path.resolve(PROJECT_ROOT, '..', '.env');
const LOCAL_ENV = path.join(PROJECT_ROOT, '.env');
const PREFIX = 'EXPO_PUBLIC_';
const HEADER = [
  '# ФАЙЛ СГЕНЕРИРОВАН — не редактировать.',
  '# Источник: ../.env (корень суперпроекта). Правки здесь затрутся.',
  '# Обновляется автоматически перед npm start / web / android / ios.',
  '',
].join('\n');

if (!fs.existsSync(ROOT_ENV)) {
  console.warn(
    `[sync-env] ../.env не найден — оставляю ${path.basename(LOCAL_ENV)} без изменений.\n` +
      '[sync-env] Так и должно быть, если learningFront склонирован отдельно от суперпроекта.',
  );
  process.exit(0);
}

const picked = fs
  .readFileSync(ROOT_ENV, 'utf8')
  .split(/\r?\n/)
  .map((line) => line.match(/^\s*(EXPO_PUBLIC_[A-Z0-9_]*)\s*=(.*)$/))
  .filter(Boolean)
  .map((m) => `${m[1]}=${m[2].trim()}`);

if (picked.length === 0) {
  console.warn(`[sync-env] в ../.env нет ни одной переменной ${PREFIX}* — клиент возьмёт значения по умолчанию.`);
}

const next = `${HEADER}${picked.join('\n')}\n`;
const previous = fs.existsSync(LOCAL_ENV) ? fs.readFileSync(LOCAL_ENV, 'utf8') : null;

if (previous === next) {
  console.log(`[sync-env] .env уже актуален (${picked.length} перем.).`);
} else {
  fs.writeFileSync(LOCAL_ENV, next);
  console.log(`[sync-env] .env обновлён из ../.env (${picked.length} перем.).`);
}
