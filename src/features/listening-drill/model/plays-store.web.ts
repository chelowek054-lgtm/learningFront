// Web-вариант: localStorage вместо SecureStore.
const key = (activityId: string) => `praxis.plays.${activityId}`;

export async function getPlays(activityId: string): Promise<number> {
  try {
    const n = Number(globalThis.localStorage?.getItem(key(activityId)));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export async function addPlay(activityId: string): Promise<number> {
  const next = (await getPlays(activityId)) + 1;
  try {
    globalThis.localStorage?.setItem(key(activityId), String(next));
  } catch {
    /* хранилище недоступно: лимит действует в пределах экрана */
  }
  return next;
}
