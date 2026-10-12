import { defineConfig } from 'vitest/config';

// Тесты идут на русском: язык интерфейса по умолчанию берётся с устройства, а ожидания в тестах — русские.
export default defineConfig({
  test: { setupFiles: ['./src/test-setup.ts'] },
});
