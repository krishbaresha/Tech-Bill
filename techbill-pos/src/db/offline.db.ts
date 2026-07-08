import Dexie, { type Table } from 'dexie';

const MAX_RETRIES = 3;

interface PendingSale {
  id?: number;
  payload: string;
  createdAt: Date;
  retries: number;
  status: 'pending' | 'failed';
}

class TechBillDB extends Dexie {
  pendingSales!: Table<PendingSale>;

  constructor() {
    super('techbill');
    this.version(1).stores({ pendingSales: '++id, createdAt' });
    this.version(2).stores({ pendingSales: '++id, createdAt, status' });
  }
}

const db = new TechBillDB();

export async function queueSale(payload: unknown): Promise<void> {
  await db.pendingSales.add({
    payload: JSON.stringify(payload),
    createdAt: new Date(),
    retries: 0,
    status: 'pending',
  });
}

export async function getPendingCount(): Promise<number> {
  return db.pendingSales.where('status').equals('pending').count();
}

export async function getFailedCount(): Promise<number> {
  return db.pendingSales.where('status').equals('failed').count();
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
