// Реализация порта LocalStore поверх expo-sqlite (SDK 57, sync-API).
// Ф0: схема через CREATE TABLE IF NOT EXISTS при старте (см. WS6-01 в плане).
import * as SQLite from 'expo-sqlite';
import type { Activity, JobRecord, LocalStore, Response, SrsCardRecord } from '@/shared/engine';

const DDL = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS activity (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  module TEXT NOT NULL,
  type TEXT NOT NULL,
  connectivity TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  due_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_activity_module_type ON activity(module, type);

CREATE TABLE IF NOT EXISTS response (
  id TEXT PRIMARY KEY NOT NULL,
  activity_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_answer TEXT NOT NULL,
  grade TEXT,
  local_created_at TEXT NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_response_synced ON response(synced);

CREATE TABLE IF NOT EXISTS srs_card (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  module TEXT NOT NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  source TEXT NOT NULL,
  fsrs_state TEXT NOT NULL,
  due_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_srs_due ON srs_card(due_at);

CREATE TABLE IF NOT EXISTS job (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  input_ref TEXT NOT NULL,
  result TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_job_status ON job(status);
`;

const json = (v: unknown): string => JSON.stringify(v);
const parse = <T>(v: string): T => JSON.parse(v) as T;

interface ActivityRow {
  id: string;
  user_id: string;
  module: string;
  type: string;
  connectivity: string;
  payload: string;
  created_at: string;
  due_at: string | null;
}

interface ResponseRow {
  id: string;
  activity_id: string;
  user_id: string;
  user_answer: string;
  grade: string | null;
  local_created_at: string;
  synced: number;
}

interface SrsRow {
  id: string;
  user_id: string;
  module: string;
  front: string;
  back: string;
  source: string;
  fsrs_state: string;
  due_at: string;
  created_at: string;
}

interface JobRow {
  id: string;
  user_id: string;
  type: string;
  status: string;
  input_ref: string;
  result: string | null;
  attempts: number;
  created_at: string;
  updated_at: string;
}

function toActivity(r: ActivityRow): Activity {
  return {
    id: r.id,
    userId: r.user_id,
    module: r.module,
    type: r.type,
    connectivity: r.connectivity as Activity['connectivity'],
    payload: parse(r.payload),
    createdAt: r.created_at,
    dueAt: r.due_at ?? undefined,
  };
}

function toResponse(r: ResponseRow): Response {
  return {
    id: r.id,
    activityId: r.activity_id,
    userId: r.user_id,
    userAnswer: parse(r.user_answer),
    grade: r.grade ? parse(r.grade) : null,
    localCreatedAt: r.local_created_at,
    synced: r.synced === 1,
  };
}

function toSrsCard(r: SrsRow): SrsCardRecord {
  return {
    id: r.id,
    userId: r.user_id,
    module: r.module,
    front: parse(r.front),
    back: parse(r.back),
    source: r.source as SrsCardRecord['source'],
    fsrsState: parse(r.fsrs_state),
    dueAt: r.due_at,
    createdAt: r.created_at,
  };
}

function toJob(r: JobRow): JobRecord {
  return {
    id: r.id,
    userId: r.user_id,
    type: r.type,
    status: r.status as JobRecord['status'],
    inputRef: parse(r.input_ref),
    result: r.result ? parse(r.result) : null,
    attempts: r.attempts,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** LocalStore на expo-sqlite. Инвариант №1: локальный источник правды для повторений/ответов. */
export class SqliteLocalStore implements LocalStore {
  private readonly db: SQLite.SQLiteDatabase;

  constructor(dbName = 'praxis.db') {
    this.db = SQLite.openDatabaseSync(dbName);
  }

  /** Применяет схему (идемпотентно). Вызывать при старте приложения. */
  migrate(): void {
    this.db.execSync(DDL);
  }

  // --- activity ---
  async upsertActivity(a: Activity): Promise<void> {
    this.db.runSync(
      `INSERT OR REPLACE INTO activity
        (id, user_id, module, type, connectivity, payload, created_at, due_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      a.id,
      a.userId,
      a.module,
      a.type,
      a.connectivity,
      json(a.payload),
      a.createdAt,
      a.dueAt ?? null,
    );
  }

  async getActivity(id: string): Promise<Activity | null> {
    const row = this.db.getFirstSync<ActivityRow>('SELECT * FROM activity WHERE id = ?', id);
    return row ? toActivity(row) : null;
  }

  async listActivities(filter?: { module?: string; type?: string }): Promise<Activity[]> {
    const clauses: string[] = [];
    const params: string[] = [];
    if (filter?.module) {
      clauses.push('module = ?');
      params.push(filter.module);
    }
    if (filter?.type) {
      clauses.push('type = ?');
      params.push(filter.type);
    }
    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
    const rows = this.db.getAllSync<ActivityRow>(`SELECT * FROM activity${where}`, ...params);
    return rows.map(toActivity);
  }

  // --- response (event log) ---
  async appendResponse(r: Response): Promise<void> {
    this.db.runSync(
      `INSERT OR REPLACE INTO response
        (id, activity_id, user_id, user_answer, grade, local_created_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      r.id,
      r.activityId,
      r.userId,
      json(r.userAnswer),
      r.grade ? json(r.grade) : null,
      r.localCreatedAt,
      r.synced ? 1 : 0,
    );
  }

  async getResponse(id: string): Promise<Response | null> {
    const row = this.db.getFirstSync<ResponseRow>('SELECT * FROM response WHERE id = ?', id);
    return row ? toResponse(row) : null;
  }

  async listResponses(): Promise<Response[]> {
    return this.db.getAllSync<ResponseRow>('SELECT * FROM response').map(toResponse);
  }

  async listUnsyncedResponses(): Promise<Response[]> {
    const rows = this.db.getAllSync<ResponseRow>('SELECT * FROM response WHERE synced = 0');
    return rows.map(toResponse);
  }

  async markResponseSynced(id: string): Promise<void> {
    this.db.runSync('UPDATE response SET synced = 1 WHERE id = ?', id);
  }

  // --- srs ---
  async upsertSrsCard(c: SrsCardRecord): Promise<void> {
    this.db.runSync(
      `INSERT OR REPLACE INTO srs_card
        (id, user_id, module, front, back, source, fsrs_state, due_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      c.id,
      c.userId,
      c.module,
      json(c.front),
      json(c.back),
      c.source,
      json(c.fsrsState),
      c.dueAt,
      c.createdAt,
    );
  }

  async getSrsCard(id: string): Promise<SrsCardRecord | null> {
    const row = this.db.getFirstSync<SrsRow>('SELECT * FROM srs_card WHERE id = ?', id);
    return row ? toSrsCard(row) : null;
  }

  async listSrsCards(): Promise<SrsCardRecord[]> {
    return this.db.getAllSync<SrsRow>('SELECT * FROM srs_card').map(toSrsCard);
  }

  async listDueSrsCards(nowIso: string): Promise<SrsCardRecord[]> {
    const rows = this.db.getAllSync<SrsRow>(
      'SELECT * FROM srs_card WHERE due_at <= ? ORDER BY due_at',
      nowIso,
    );
    return rows.map(toSrsCard);
  }

  // --- jobs ---
  async enqueueJob(j: JobRecord): Promise<void> {
    // Идемпотентно по id (инвариант идемпотентности jobs).
    this.db.runSync(
      `INSERT OR IGNORE INTO job
        (id, user_id, type, status, input_ref, result, attempts, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      j.id,
      j.userId,
      j.type,
      j.status,
      json(j.inputRef),
      j.result ? json(j.result) : null,
      j.attempts,
      j.createdAt,
      j.updatedAt,
    );
  }

  async listPendingJobs(): Promise<JobRecord[]> {
    const rows = this.db.getAllSync<JobRow>("SELECT * FROM job WHERE status = 'pending'");
    return rows.map(toJob);
  }

  async updateJob(id: string, patch: Partial<JobRecord>): Promise<void> {
    const sets: string[] = [];
    const params: (string | number | null)[] = [];
    if (patch.status !== undefined) {
      sets.push('status = ?');
      params.push(patch.status);
    }
    if (patch.result !== undefined) {
      sets.push('result = ?');
      params.push(patch.result ? json(patch.result) : null);
    }
    if (patch.attempts !== undefined) {
      sets.push('attempts = ?');
      params.push(patch.attempts);
    }
    if (patch.updatedAt !== undefined) {
      sets.push('updated_at = ?');
      params.push(patch.updatedAt);
    }
    if (!sets.length) return;
    params.push(id);
    this.db.runSync(`UPDATE job SET ${sets.join(', ')} WHERE id = ?`, ...params);
  }
}

/** Фабрика: открывает БД и применяет схему. */
export function createSqliteLocalStore(dbName?: string): SqliteLocalStore {
  const store = new SqliteLocalStore(dbName);
  store.migrate();
  return store;
}
