// Сколько прослушиваний уже потрачено — переживает закрытие экрана, иначе лимит обходится выходом.
import * as SecureStore from 'expo-secure-store';

const key = (activityId: string) => `praxis.plays.${activityId.replace(/[^\w.-]/g, '_')}`;

export async function getPlays(activityId: string): Promise<number> {
  const n = Number(await SecureStore.getItemAsync(key(activityId)));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export async function addPlay(activityId: string): Promise<number> {
  const next = (await getPlays(activityId)) + 1;
  await SecureStore.setItemAsync(key(activityId), String(next));
  return next;
}
