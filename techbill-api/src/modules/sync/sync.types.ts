/**
 * Data-access port for the Sync module — same reasoning as the License port:
 * `backend-additions/` is built standalone (CLAUDE.md §0.1), so nothing here
 * may assume the real Prisma models. The port stores generic "synced rows";
 * mapping them onto the real `Product`/`Sale`/… models (and converting the
 * wire's integer minor units into Prisma `Decimal`) is the merge boundary,
 * isolated in prisma-sync.repository.ts.
 */

/** The tables the desktop client syncs, in dependency order (parents first).
 *  Must match `sync::engine::TABLES` in the Rust client. */
export const SYNCED_TABLES = [
  'products',
  'customers',
  'inventory_units',
  'sales',
  'sale_items',
  'returns',
  'credit_records',
] as const;

export type SyncedTable = (typeof SYNCED_TABLES)[number];

/** FK columns per table and the parent table each references. Push bodies
 *  carry these as the *client's* local ids; the service resolves them to
 *  server ids before anything is stored. Must match the Rust registry. */
export const TABLE_FOREIGN_KEYS: Record<SyncedTable, [string, SyncedTable][]> = {
  products: [],
  customers: [],
  inventory_units: [['product_local_id', 'products']],
  sales: [['customer_local_id', 'customers']],
  sale_items: [
    ['sale_local_id', 'sales'],
    ['inventory_unit_local_id', 'inventory_units'],
  ],
  returns: [
    ['sale_local_id', 'sales'],
    ['inventory_unit_local_id', 'inventory_units'],
  ],
  credit_records: [['customer_local_id', 'customers']],
};

/** One synced row as the server holds it. `data` is the domain columns with
 *  FK values already in server-id space; `seq` is the tenant-scoped change
 *  counter the pull cursor walks. */
export interface SyncedRow {
  id: string;
  tenantId: string;
  table: SyncedTable;
  /** The `local_id` the originating device used — how a re-push of the same
   *  row is recognized, and how that device recognizes the row coming back. */
  clientRowId: string | null;
  data: Record<string, unknown>;
  seq: number;
  /** When THIS SERVER last wrote the row (assigned by the repository at save
   *  time, from the server's own clock). The stock conflict rule compares a
   *  push's base against this — never against client-authored `updated_at`
   *  values, which a rolled-back till clock would poison. */
  updatedAtServer: Date;
}

export interface SyncRepository {
  findById(tenantId: string, table: SyncedTable, id: string): Promise<SyncedRow | null>;
  findByClientRowId(
    tenantId: string,
    table: SyncedTable,
    clientRowId: string,
  ): Promise<SyncedRow | null>;
  /** Insert or replace; the repository assigns/advances `seq` and stamps
   *  `updatedAtServer` from the server clock. */
  save(row: Omit<SyncedRow, 'seq' | 'updatedAtServer'>): Promise<SyncedRow>;
  /** Every row with `seq > since`, ascending, tenant-scoped. */
  changesSince(tenantId: string, since: number): Promise<SyncedRow[]>;
}

export const SYNC_REPOSITORY = Symbol('SYNC_REPOSITORY');

// ─── Wire shapes (must match the Rust client's sync::wire) ──────────────────

export interface PushResultDto {
  table: string;
  localId: string;
  outcome: 'applied' | 'rejected';
  remoteId?: string;
  reason?: string;
  /** Authoritative row for a rejection, FK values as server ids. */
  server?: Record<string, unknown>;
}

export interface PushResponseDto {
  serverTime: string;
  results: PushResultDto[];
}

export interface PullChangeDto {
  table: string;
  remoteId: string;
  clientRowId: string | null;
  data: Record<string, unknown>;
}

export interface PullResponseDto {
  serverTime: string;
  next: string;
  changes: PullChangeDto[];
}
