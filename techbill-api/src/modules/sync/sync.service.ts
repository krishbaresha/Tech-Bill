import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  SYNC_REPOSITORY,
  SYNCED_TABLES,
  TABLE_FOREIGN_KEYS,
} from './sync.types';
import type {
  PullResponseDto,
  PushResponseDto,
  PushResultDto,
  SyncedRow,
  SyncedTable,
  SyncRepository,
} from './sync.types';
import type { PushChangeDto } from './dto/push.dto';

/**
 * Delta sync (ARCHITECTURE.md §6), server half.
 *
 * Conflict rules — the same three the client applies, stated from this side:
 * - `inventory_units`: the server is always authoritative. A pushed unit
 *   carries its base (`synced_at` — the server time the till last converged
 *   on that row); if this server has written the row since that base, the
 *   push is rejected with the server's row, *no matter how new the push's own
 *   timestamp is*. Stock never last-write-wins: a till with a generous clock
 *   must not be able to un-sell a unit the webapp sold, and two tills both
 *   believing they hold the same unit is the race this rule exists to prevent.
 * - Everything else: last-write-wins by `updated_at`. A losing push is
 *   rejected *with the winning row attached*, so the client can converge and
 *   log the conflict rather than silently retrying forever.
 * - Tenant isolation: every lookup is scoped to the JWT's tenant. What a
 *   client claims in its row data is discarded — `tenant_id` isn't even
 *   accepted on the wire.
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(@Inject(SYNC_REPOSITORY) private readonly repo: SyncRepository) {}

  async push(tenantId: string, changes: PushChangeDto[]): Promise<PushResponseDto> {
    const results: PushResultDto[] = [];
    for (const change of changes) {
      // An unknown table fails the whole batch, not the row: the desktop
      // client can't converge on a rejection that has no server row, and the
      // only way this happens is a version mismatch a human needs to see.
      if (!isSyncedTable(change.table)) {
        throw new BadRequestException(
          `unknown table in push: ${change.table} — client and server versions may differ`,
        );
      }
      results.push(await this.applyOne(tenantId, change.table, change));
    }
    this.logger.log(
      `push from tenant ${tenantId}: ${results.filter((r) => r.outcome === 'applied').length}/${
        results.length
      } applied`,
    );
    return { serverTime: new Date().toISOString(), results };
  }

  private async applyOne(
    tenantId: string,
    table: SyncedTable,
    change: PushChangeDto,
  ): Promise<PushResultDto> {
    // Resolve FK references (the sender's local ids) into server ids. A
    // parent this server has never seen means the batch is malformed — the
    // client pushes in dependency order, so the parent should be earlier in
    // this same batch or already synced.
    const data: Record<string, unknown> = { ...change.data };
    delete data.tenant_id; // never trusted from the wire
    // The push's base: when this till last converged on the row. Client
    // bookkeeping, consumed here for the stock rule, never stored.
    const base = typeof data.synced_at === 'string' ? Date.parse(data.synced_at) : 0;
    delete data.synced_at;
    for (const [column, parentTable] of TABLE_FOREIGN_KEYS[table]) {
      const ref = data[column];
      if (ref === null || ref === undefined) continue;
      if (typeof ref !== 'string') {
        return this.rejectMalformed(table, change, `${column} is not a string reference`);
      }
      const parent = await this.repo.findByClientRowId(tenantId, parentTable, ref);
      if (!parent) {
        return this.rejectMalformed(
          table,
          change,
          `${column} references a ${parentTable} row the server has never seen`,
        );
      }
      data[column] = parent.id;
    }

    const existing =
      (await this.repo.findByClientRowId(tenantId, table, change.localId)) ??
      (change.remoteId ? await this.repo.findById(tenantId, table, change.remoteId) : null);

    if (!existing) {
      const saved = await this.repo.save({
        id: randomUUID(),
        tenantId,
        table,
        clientRowId: change.localId,
        data,
      });
      return { table, localId: change.localId, outcome: 'applied', remoteId: saved.id };
    }

    // Stock: any server-side write since the till's base wins outright,
    // judged by the server's own clock (`updatedAtServer` vs `base`) so a
    // till's clock can't argue its way past it. Other tables: LWW by
    // `updated_at`, ties keeping the server's copy — the deterministic
    // choice when clocks collide.
    const reject =
      table === 'inventory_units'
        ? existing.updatedAtServer.getTime() > base
        : timestampOf(existing.data, 'stored row') >= timestampOf(data, 'pushed row');

    if (reject) {
      return {
        table,
        localId: change.localId,
        outcome: 'rejected',
        remoteId: existing.id,
        reason:
          table === 'inventory_units'
            ? 'stock state changed on the server first'
            : 'a newer version of this row exists on the server',
        server: pullData(existing),
      };
    }

    const saved = await this.repo.save({
      id: existing.id,
      tenantId,
      table,
      clientRowId: existing.clientRowId ?? change.localId,
      data,
    });
    return { table, localId: change.localId, outcome: 'applied', remoteId: saved.id };
  }

  private rejectMalformed(
    table: SyncedTable,
    change: PushChangeDto,
    reason: string,
  ): never {
    // Same rationale as unknown tables: a malformed reference means the
    // client and server disagree about the world in a way per-row conflict
    // handling can't fix, so fail loudly instead of half-applying a batch.
    throw new BadRequestException(`rejected ${table}/${change.localId}: ${reason}`);
  }

  async pull(tenantId: string, since: string | undefined): Promise<PullResponseDto> {
    const cursor = parseCursor(since);
    const rows = await this.repo.changesSince(tenantId, cursor);
    const next = rows.length > 0 ? rows[rows.length - 1].seq : cursor;
    return {
      serverTime: new Date().toISOString(),
      next: String(next),
      changes: rows.map((row) => ({
        table: row.table,
        remoteId: row.id,
        clientRowId: row.clientRowId,
        data: pullData(row),
      })),
    };
  }
}

function isSyncedTable(table: string): table is SyncedTable {
  return (SYNCED_TABLES as readonly string[]).includes(table);
}

/** The row as a pull change's `data`: domain columns (FKs already in server-id
 *  space) plus the tenant, which the client's schema requires on every row. */
function pullData(row: SyncedRow): Record<string, unknown> {
  return { ...row.data, tenant_id: row.tenantId };
}

function timestampOf(data: Record<string, unknown>, what: string): number {
  const raw = data.updated_at;
  if (typeof raw !== 'string') {
    throw new BadRequestException(`${what} has no updated_at`);
  }
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) {
    throw new BadRequestException(`${what} has an unreadable updated_at: ${raw}`);
  }
  return parsed;
}

function parseCursor(since: string | undefined): number {
  if (since === undefined || since === '') return 0;
  const parsed = Number(since);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new BadRequestException(`bad cursor: ${since}`);
  }
  return parsed;
}
