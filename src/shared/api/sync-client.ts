// Реализация порта SyncClient поверх HTTP (WS2). camelCase совпадает с backend-алиасами.
import type {
  Activity,
  JobRecord,
  Response,
  SrsCardRecord,
  SyncClient,
  SyncPullResult,
  SyncPushPayload,
} from '@/shared/engine';
import { api } from './http';

interface PullBody {
  userId: string;
  cursor: string;
  activities: Activity[];
  responses: Response[];
  jobs: JobRecord[];
  srsCards: SrsCardRecord[];
}

export function createSyncClient(): SyncClient {
  return {
    async push(payload: SyncPushPayload): Promise<{ ackIds: string[] }> {
      return api<{ ackIds: string[] }>('/sync/push', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async pull(since?: string): Promise<SyncPullResult> {
      const query = since ? `?since=${encodeURIComponent(since)}` : '';
      const r = await api<PullBody>(`/sync/pull${query}`);
      return {
        userId: r.userId,
        cursor: r.cursor,
        activities: r.activities,
        responses: r.responses,
        finishedJobs: r.jobs,
        srsCards: r.srsCards,
      };
    },
  };
}
