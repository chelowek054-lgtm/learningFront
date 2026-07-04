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
    async pull(): Promise<SyncPullResult> {
      const r = await api<PullBody>('/sync/pull');
      return {
        activities: r.activities,
        responses: r.responses,
        doneJobs: r.jobs,
        srsCards: r.srsCards,
      };
    },
  };
}
