import { db, type SyncQueueItem } from '../db/offline.db';
import { api } from '../api/client';


const SCHEMA_VERSION = '1.0.0';
const BATCH_SIZE = 50;
const MAX_RETRIES = 3;

// Topological order: parents before children
const TABLE_DEPENDENCY_ORDER: SyncQueueItem['table'][] = [
  'customers',
  'products',
  'inventory_units',
  'sales',
  'sale_items',
  'returns',
  'credit_records',
];

interface PushResponse {
  serverTime: string;
  results: Array<{
    table: string;
    localId: string;
    outcome: 'applied' | 'rejected';
    remoteId?: string;
    reason?: string;
    server?: Record<string, unknown>;
  }>;
}

interface PullResponse {
  serverTime: string;
  next: string;
  changes: Array<{
    table: string;
    remoteId: string;
    clientRowId: string | null;
    data: Record<string, unknown>;
  }>;
}

export class SyncEngine {
  private isSyncing = false;
  private syncTimer: number | null = null;

  startAutoSync(intervalMs = 30000): void {
    if (this.syncTimer !== null) return;
    
    // Trigger immediately on online status change
    window.addEventListener('online', () => void this.syncAll());
    
    // Periodic background sync
    this.syncTimer = window.setInterval(() => {
      if (navigator.onLine) {
        void this.syncAll();
      }
    }, intervalMs);
  }

  stopAutoSync(): void {
    if (this.syncTimer !== null) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  async syncAll(): Promise<{ pushed: number; pulled: number; conflicts: number }> {
    if (this.isSyncing || !navigator.onLine) {
      return { pushed: 0, pulled: 0, conflicts: 0 };
    }

    this.isSyncing = true;
    let totalPushed = 0;
    let totalPulled = 0;
    let totalConflicts = 0;

    try {
      // 1. Push local changes (Chunked & Topologically Sorted)
      const pushStats = await this.pushPendingChanges();
      totalPushed = pushStats.pushed;
      totalConflicts = pushStats.conflicts;

      // 2. Pull server changes (Delta Cursor)
      const pullStats = await this.pullServerChanges();
      totalPulled = pullStats.pulled;

    } catch (err) {
      console.error('[SyncEngine] Error during sync pass:', err);
    } finally {
      this.isSyncing = false;
    }

    return { pushed: totalPushed, pulled: totalPulled, conflicts: totalConflicts };
  }

  private async pushPendingChanges(): Promise<{ pushed: number; conflicts: number }> {
    let pushed = 0;
    let conflicts = 0;

    // Fetch all pending queue items
    const allPending = await db.syncQueue
      .where('status')
      .equals('pending')
      .toArray();

    if (allPending.length === 0) return { pushed, conflicts };

    // Sort items topologically by table dependency
    const sortedPending = allPending.sort((a, b) => {
      const orderA = TABLE_DEPENDENCY_ORDER.indexOf(a.table);
      const orderB = TABLE_DEPENDENCY_ORDER.indexOf(b.table);
      return orderA - orderB;
    });

    // Process in batches of BATCH_SIZE (max 50)
    for (let i = 0; i < sortedPending.length; i += BATCH_SIZE) {
      const batch = sortedPending.slice(i, i + BATCH_SIZE);
      
      const pushPayload = batch.map((item) => ({
        table: item.table,
        localId: item.localId,
        remoteId: item.remoteId,
        data: item.data,
      }));

      try {
        const response = await api.post<PushResponse>('/sync/push', { changes: pushPayload }, {
          headers: {
            'X-App-Schema-Version': SCHEMA_VERSION,
          },
        });

        const serverTime = response.data.serverTime;
        // Record server time offset
        await db.syncState.put({
          key: 'serverTimeOffsetMs',
          value: String(Date.parse(serverTime) - Date.now()),
        });

        for (const res of response.data.results) {
          const item = batch.find((b) => b.localId === res.localId);
          if (!item || item.id === undefined) continue;

          if (res.outcome === 'applied') {
            pushed++;
            // Delete from queue on success
            await db.syncQueue.delete(item.id);
          } else if (res.outcome === 'rejected') {
            conflicts++;
            // Mark rejected and log conflict for manager audit
            await db.syncQueue.update(item.id, {
              status: 'rejected',
              rejectionReason: res.reason ?? 'Rejected by server conflict rule',
            });

            if (res.server) {
              await db.conflictLogs.add({
                table: res.table,
                localId: res.localId,
                reason: res.reason ?? 'Stock or LWW conflict',
                serverData: res.server,
                timestamp: new Date(),
              });
            }
          }
        }
      } catch (err) {
        console.error('[SyncEngine] Batch push HTTP failed:', err);
        // Increment retry count for batch items
        for (const item of batch) {
          if (item.id === undefined) continue;
          const nextRetries = item.retries + 1;
          const nextStatus = nextRetries >= MAX_RETRIES ? 'failed' : 'pending';
          await db.syncQueue.update(item.id, { retries: nextRetries, status: nextStatus });
        }
        // Stop subsequent batches if network connection dropped
        break;
      }
    }

    return { pushed, conflicts };
  }

  private async pullServerChanges(): Promise<{ pulled: number }> {
    let pulled = 0;

    // Fetch current sequence cursor
    const lastSeqRecord = await db.syncState.get('lastSyncedSeq');
    const since = lastSeqRecord ? lastSeqRecord.value : '0';

    try {
      const response = await api.get<PullResponse>(`/sync/pull?since=${since}`, {
        headers: {
          'X-App-Schema-Version': SCHEMA_VERSION,
        },
      });

      const changes = response.data.changes;
      pulled = changes.length;

      if (changes.length > 0) {
        // Save new cursor sequence
        await db.syncState.put({
          key: 'lastSyncedSeq',
          value: response.data.next,
        });
      }
    } catch (err) {
      console.error('[SyncEngine] Pull failed:', err);
    }

    return { pulled };
  }
}

export const syncEngine = new SyncEngine();
