// Metro-конфиг Expo SDK 57. Расширяет дефолт Expo.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Не бандлить тест-файлы: expo-router сканирует src/app через require.context и
// исполняет попавшие туда модули; тест, импортирующий 'vitest', падает в рантайме.
// Тесты живут вне src/app (entities, shared/engine), но это защита на будущее.
config.resolver.blockList = [/\.(test|spec)\.[jt]sx?$/];

module.exports = config;
