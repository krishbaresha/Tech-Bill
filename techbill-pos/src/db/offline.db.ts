import Dexie, { type Table } from 'dexie';

const MAX_RETRIES = 3;

export interface PendingSale {
  id?: number;
  payload: string;
  createdAt: Date;
  retries: number;
  status: 'pending' | 'failed';
}

export interface SyncQueueItem {
  id?: number;
  table: 'products' | 'customers' | 'inventory_units' | 'sales' | 'sale_items' | 'returns' | 'credit_records';
  localId: string;
  remoteId?: string;
  data: Record<string, unknown>;
  createdAt: Date;
  retries: number;
  status: 'pending' | 'failed' | 'rejected';
  rejectionReason?: string;
}

export interface SyncStateItem {
  key: string;
  value: string;
}

export interface ConflictLogItem {
  id?: number;
  table: string;
  localId: string;
  reason: string;
  serverData: Record<string, unknown>;
  timestamp: Date;
}

class TechBillDB extends Dexie {
  pendingSales!: Table<PendingSale>;
  syncQueue!: Table<SyncQueueItem>;
  syncState!: Table<SyncStateItem>;
  conflictLogs!: Table<ConflictLogItem>;

  constructor() {
    super('techbill');
    this.version(1).stores({ pendingSales: '++id, createdAt' });
    this.version(2).stores({ pendingSales: '++id, createdAt, status' });
    this.version(3).stores({
      pendingSales: '++id, createdAt, status',
      syncQueue: '++id, table, localId, status, createdAt',
      syncState: '&key',
      conflictLogs: '++id, table, localId, timestamp',
    });
  }
}

export const db = new TechBillDB();

export async function queueSale(payload: unknown): Promise<void> {
  await db.pendingSales.add({
    payload: JSON.stringify(payload),
    createdAt: new Date(),
    retries: 0,
    status: 'pending',
  });
}

export async function queueSyncItem(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retries' | 'status'>): Promise<void> {
  await db.syncQueue.add({
    ...item,
    createdAt: new Date(),
    retries: 0,
    status: 'pending',
  });
}

export async function getPendingCount(): Promise<number> {
  const legacyCount = await db.pendingSales.where('status').equals('pending').count();
  const queueCount = await db.syncQueue.where('status').equals('pending').count();
  return legacyCount + queueCount;
}

export async function getFailedCount(): Promise<number> {
  const legacyCount = await db.pendingSales.where('status').equals('failed').count();
  const queueCount = await db.syncQueue.where('status').equals('failed').count();
  return legacyCount + queueCount;
}

export async function processPendingSales(
  submitFn: (payload: unknown) => Promise<unknown>,
  onFailedItem?: (sale: PendingSale) => void,
): Promise<void> {
  const pending = await db.pendingSales.where('status').equals('pending').toArray();
  for (const sale of pending) {
    if (sale.retries >= MAX_RETRIES) {
      await db.pendingSales.update(sale.id!, { status: 'failed' });
      onFailedItem?.(sale);
      continue;
    }
    try {
      await submitFn(JSON.parse(sale.payload) as unknown);
      await db.pendingSales.delete(sale.id!);
    } catch {
      await db.pendingSales.update(sale.id!, { retries: sale.retries + 1 });
    }
  }
}

