import { BadRequestException } from '@nestjs/common';
import { SyncService } from './sync.service';
import type { SyncedRow, SyncedTable, SyncRepository } from './sync.types';
import type { PushChangeDto } from './dto/push.dto';

/** In-memory port implementation, same testing approach as the licence spec:
 *  the service's rules are what's under test, not a database. */
class InMemorySyncRepository implements SyncRepository {
  rows: SyncedRow[] = [];
  private seq = 0;

  async findById(tenantId: string, table: SyncedTable, id: string) {
    return (
      this.rows.find((r) => r.tenantId === tenantId && r.table === table && r.id === id) ?? null
    );
  }

  async findByClientRowId(tenantId: string, table: SyncedTable, clientRowId: string) {
    return (
      this.rows.find(
        (r) =>
          r.tenantId === tenantId && r.table === table && r.clientRowId === clientRowId,
      ) ?? null
    );
  }

  async save(row: Omit<SyncedRow, 'seq' | 'updatedAtServer'>): Promise<SyncedRow> {
    const saved: SyncedRow = { ...row, seq: ++this.seq, updatedAtServer: new Date() };
    this.rows = this.rows.filter(
      (r) => !(r.tenantId === row.tenantId && r.table === row.table && r.id === row.id),
    );
    this.rows.push(saved);
    return saved;
  }

  async changesSince(tenantId: string, since: number): Promise<SyncedRow[]> {
    return this.rows
      .filter((r) => r.tenantId === tenantId && r.seq > since)
      .sort((a, b) => a.seq - b.seq);
  }
}

const T1 = 'tenant-1';
const T2 = 'tenant-2';

function change(partial: Partial<PushChangeDto> & { localId: string }): PushChangeDto {
  return {
    table: 'customers',
    remoteId: undefined,
    data: {
      name: 'Ahmed Raza',
      phone: '03001234567',
      created_at: '2026-07-17T08:00:00Z',
      updated_at: '2026-07-17T09:00:00Z',
      deleted_at: null,
    },
    ...partial,
  };
}

describe('SyncService', () => {
  let repo: InMemorySyncRepository;
  let service: SyncService;

  beforeEach(() => {
    repo = new InMemorySyncRepository();
    service = new SyncService(repo);
  });

  describe('push', () => {
    it('applies a new row and returns its server id', async () => {
      const response = await service.push(T1, [change({ localId: 'l-c1' })]);
      expect(response.results).toEqual([
        expect.objectContaining({ outcome: 'applied', localId: 'l-c1' }),
      ]);
      expect(response.results[0].remoteId).toBeTruthy();
      expect(response.serverTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('re-pushing the same localId updates the row instead of duplicating it', async () => {
      await service.push(T1, [change({ localId: 'l-c1' })]);
      const second = await service.push(T1, [
        change({
          localId: 'l-c1',
          data: { name: 'Ahmed R.', updated_at: '2026-07-17T10:00:00Z' },
        }),
      ]);
      expect(second.results[0].outcome).toBe('applied');
      expect(repo.rows.filter((r) => r.table === 'customers')).toHaveLength(1);
      expect(repo.rows[0].data.name).toBe('Ahmed R.');
    });

    it('discards the tenant claim in row data — the JWT tenant is the tenant', async () => {
      await service.push(T1, [
        change({ localId: 'l-c1', data: { tenant_id: T2, updated_at: '2026-07-17T09:00:00Z' } }),
      ]);
      expect(repo.rows[0].tenantId).toBe(T1);
      expect(repo.rows[0].data.tenant_id).toBeUndefined();
    });

    it('resolves FK references from the client id space to server ids', async () => {
      const products = await service.push(T1, [
        change({
          table: 'products',
          localId: 'l-p1',
          data: { name: 'iPhone 15', selling_price_minor: 17500000, updated_at: '2026-07-17T09:00:00Z' },
        }),
      ]);
      const productRemoteId = products.results[0].remoteId!;
      await service.push(T1, [
        change({
          table: 'inventory_units',
          localId: 'l-u1',
          data: {
            serial_number: 'SN-001',
            product_local_id: 'l-p1',
            status: 'in_stock',
            updated_at: '2026-07-17T09:05:00Z',
          },
        }),
      ]);
      const unit = repo.rows.find((r) => r.table === 'inventory_units')!;
      expect(unit.data.product_local_id).toBe(productRemoteId);
    });

    it('refuses a reference to a parent it has never seen', async () => {
      await expect(
        service.push(T1, [
          change({
            table: 'inventory_units',
            localId: 'l-u1',
            data: { product_local_id: 'l-p-never-pushed', updated_at: '2026-07-17T09:00:00Z' },
          }),
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuses an unknown table loudly rather than skipping it', async () => {
      await expect(
        service.push(T1, [change({ table: 'warranty_claims' as never, localId: 'l-w1' })]),
      ).rejects.toThrow(/unknown table/);
    });

    it('rejects a stale write with the winning row attached (LWW tables)', async () => {
      await service.push(T1, [
        change({ localId: 'l-c1', data: { name: 'Newer', updated_at: '2026-07-17T12:00:00Z' } }),
      ]);
      const stale = await service.push(T1, [
        change({ localId: 'l-c1', data: { name: 'Older', updated_at: '2026-07-17T08:00:00Z' } }),
      ]);
      expect(stale.results[0].outcome).toBe('rejected');
      // The client converges on this row and logs the conflict — without it,
      // the rejection would strand the till re-pushing forever.
      expect(stale.results[0].server).toMatchObject({ name: 'Newer', tenant_id: T1 });
      expect(repo.rows[0].data.name).toBe('Newer');
    });

    it('accepts a strictly newer write over an older server row (LWW tables)', async () => {
      await service.push(T1, [
        change({ localId: 'l-c1', data: { name: 'Older', updated_at: '2026-07-17T08:00:00Z' } }),
      ]);
      const newer = await service.push(T1, [
        change({ localId: 'l-c1', data: { name: 'Newer', updated_at: '2026-07-17T12:00:00Z' } }),
      ]);
      expect(newer.results[0].outcome).toBe('applied');
      expect(repo.rows[0].data.name).toBe('Newer');
    });

    it('never LWWs stock: a server-side unit change since the base beats a newer push', async () => {
      const seeded = await service.push(T1, [
        change({
          table: 'products',
          localId: 'l-p1',
          data: { name: 'iPhone 15', updated_at: '2026-07-17T08:00:00Z' },
        }),
        change({
          table: 'inventory_units',
          localId: 'l-u1',
          data: { product_local_id: 'l-p1', status: 'in_stock', updated_at: '2026-07-17T08:00:00Z' },
        }),
      ]);
      const tillBase = seeded.serverTime; // what the till's synced_at now holds

      // The unit then sells via the webapp — a server-side write, not a push.
      const unit = repo.rows.find((r) => r.table === 'inventory_units')!;
      await repo.save({ ...unit, data: { ...unit.data, status: 'sold', updated_at: '2026-07-17T10:00:00Z' } });
      // Pin the webapp write strictly after the till's base — real clocks can
      // land both in the same millisecond and turn this test flaky.
      repo.rows.find((r) => r.table === 'inventory_units')!.updatedAtServer = new Date(
        Date.parse(tillBase) + 1000,
      );

      // The till, unaware, pushes a *newer-by-wall-clock* edit claiming the
      // unit is still on its shelf. Its base predates the webapp sale.
      const push = await service.push(T1, [
        change({
          table: 'inventory_units',
          localId: 'l-u1',
          data: {
            product_local_id: 'l-p1',
            status: 'in_stock',
            updated_at: '2026-07-17T11:00:00Z',
            synced_at: tillBase,
          },
        }),
      ]);
      expect(push.results[0].outcome).toBe('rejected');
      expect(push.results[0].reason).toMatch(/stock/);
      expect(push.results[0].server).toMatchObject({ status: 'sold' });
      const after = repo.rows.find((r) => r.table === 'inventory_units')!;
      expect(after.data.status).toBe('sold');
    });

    it('a normal sale still pushes: a unit edit whose base is current applies', async () => {
      const seeded = await service.push(T1, [
        change({
          table: 'products',
          localId: 'l-p1',
          data: { name: 'iPhone 15', updated_at: '2026-07-17T08:00:00Z' },
        }),
        change({
          table: 'inventory_units',
          localId: 'l-u1',
          data: { product_local_id: 'l-p1', status: 'in_stock', updated_at: '2026-07-17T08:00:00Z' },
        }),
      ]);

      // The till sells the unit; nothing touched it server-side since the
      // till's base, so the push lands — the rule blocks races, not sales.
      const push = await service.push(T1, [
        change({
          table: 'inventory_units',
          localId: 'l-u1',
          data: {
            product_local_id: 'l-p1',
            status: 'sold',
            updated_at: '2026-07-17T14:00:00Z',
            synced_at: seeded.serverTime,
          },
        }),
      ]);
      expect(push.results[0].outcome).toBe('applied');
      const after = repo.rows.find((r) => r.table === 'inventory_units')!;
      expect(after.data.status).toBe('sold');
      expect(after.data.synced_at).toBeUndefined();
    });
  });

  describe('pull', () => {
    it('returns only changes after the cursor, and advances it', async () => {
      await service.push(T1, [change({ localId: 'l-c1' })]);
      const first = await service.pull(T1, undefined);
      expect(first.changes).toHaveLength(1);
      expect(first.changes[0]).toMatchObject({ table: 'customers', clientRowId: 'l-c1' });
      expect(first.changes[0].data).toMatchObject({ tenant_id: T1 });

      // Nothing new: same cursor comes back, no changes.
      const idle = await service.pull(T1, first.next);
      expect(idle.changes).toHaveLength(0);
      expect(idle.next).toBe(first.next);

      await service.push(T1, [change({ localId: 'l-c2', data: { phone: '03000000002', updated_at: '2026-07-17T09:30:00Z' } })]);
      const second = await service.pull(T1, first.next);
      expect(second.changes).toHaveLength(1);
      expect(second.changes[0].clientRowId).toBe('l-c2');
    });

    it('is tenant-scoped: one shop never pulls another shop\'s rows', async () => {
      await service.push(T1, [change({ localId: 'l-c1' })]);
      await service.push(T2, [change({ localId: 'l-c9', data: { name: 'Other Shop', updated_at: '2026-07-17T09:00:00Z' } })]);
      const pulled = await service.pull(T1, undefined);
      expect(pulled.changes).toHaveLength(1);
      expect(pulled.changes[0].data.name).toBe('Ahmed Raza');
    });

    it('refuses a garbage cursor instead of replaying everything', async () => {
      await expect(service.pull(T1, 'DROP TABLE')).rejects.toThrow(BadRequestException);
    });
  });

  describe('cross-tenant identity', () => {
    it('the same clientRowId in two tenants is two different rows', async () => {
      await service.push(T1, [change({ localId: 'shared-local-id' })]);
      await service.push(T2, [
        change({ localId: 'shared-local-id', data: { name: 'Other', updated_at: '2026-07-17T09:00:00Z' } }),
      ]);
      expect(repo.rows).toHaveLength(2);
      expect(new Set(repo.rows.map((r) => r.id)).size).toBe(2);
    });
  });
});
