// Версия установленного приложения: идёт с каждым запросом, по ней сервер решает,
// не пора ли обновиться (T-0033). Берётся из app.json, поэтому поднимается вместе со сборкой.
import Constants from 'expo-constants';

export const APP_VERSION: string = Constants.expoConfig?.version ?? '0.0.0';
