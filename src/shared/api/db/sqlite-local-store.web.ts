// Web-замена LocalStore (Metro подхватывает .web.ts вместо нативного файла).
// expo-sqlite на web требует wa-sqlite.wasm + COEP/OPFS — избыточно для mobile-first.
// Здесь — in-memory реализация того же порта: web-превью работает (данные не персистентны).
import type { Activity, JobRecord, LocalStore, Response, SrsCardRecord } from '@/shared/engine';

/** In-memory LocalStore для web. Публичный API совпадает с нативным SqliteLocalStore. */
export class SqliteLocalStore implements LocalStore {
  private readonly activities = new Map<string, Activity>();
  private readonly responses = new Map<string, Response>();
  private readonly srsCards = new Map<string, SrsCardRecord>();
  private readonly jobs = new Map<string, JobRecord>();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_dbName = 'praxis.db') {}

  /** No-op: схема в памяти не нужна. */
  migrate(): void {}

  // --- activity ---
  async upsertActivity(a: Activity): Promise<void> {
    this.activities.set(a.id, a);
  }

  async getActivity(id: string): Promise<Activity | null> {
    return this.activities.get(id) ?? null;
  }

  async listActivities(filter?: { module?: string; type?: string }): Promise<Activity[]> {
    return [...this.activities.values()].filter(
      (a) =>
        (filter?.module === undefined || a.module === filter.module) &&
        (filter?.type === undefined || a.type === filter.type),
    );
  }

  // --- response (event log) ---
  async appendResponse(r: Response): Promise<void> {
    this.responses.set(r.id, r);
  }

  async getResponse(id: string): Promise<Response | null> {
    return this.responses.get(id) ?? null;
  }

  async listResponses(): Promise<Response[]> {
    return [...this.responses.values()];
  }

  async listUnsyncedResponses(): Promise<Response[]> {
    return [...this.responses.values()].filter((r) => !r.synced);
  }

  async markResponseSynced(id: string): Promise<void> {
    const r = this.responses.get(id);
    if (r) this.responses.set(id, { ...r, synced: true });
  }

  // --- srs ---
  async upsertSrsCard(c: SrsCardRecord): Promise<void> {
    this.srsCards.set(c.id, c);
  }

  async getSrsCard(id: string): Promise<SrsCardRecord | null> {
    return this.srsCards.get(id) ?? null;
  }

  async listSrsCards(): Promise<SrsCardRecord[]> {
    return [...this.srsCards.values()];
  }

  async listDueSrsCards(nowIso: string): Promise<SrsCardRecord[]> {
    return [...this.srsCards.values()]
      .filter((c) => c.dueAt <= nowIso)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  }

  // --- jobs ---
  async enqueueJob(j: JobRecord): Promise<void> {
    if (!this.jobs.has(j.id)) this.jobs.set(j.id, j); // идемпотентно по id
  }

  async listPendingJobs(): Promise<JobRecord[]> {
    return [...this.jobs.values()].filter((j) => j.status === 'pending');
  }

  async updateJob(id: string, patch: Partial<JobRecord>): Promise<void> {
    const j = this.jobs.get(id);
    if (j) this.jobs.set(id, { ...j, ...patch });
  }
}

export function createSqliteLocalStore(dbName?: string): SqliteLocalStore {
  const store = new SqliteLocalStore(dbName);
  store.migrate();
  return store;
}
