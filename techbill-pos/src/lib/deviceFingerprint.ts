const STORAGE_KEY = 'techbill_desktop_device_id';

/**
 * A stable per-install identifier, persisted in localStorage. Reused as both
 * `machineHash` and `hardwareId` when talking to /license/activate and
 * /license/checkin — the backend treats both as opaque strings (no format
 * validation beyond max length), so this satisfies the contract without a
 * true hardware fingerprint. A user could reset it by clearing local
 * storage and get treated as a "new device" — an accepted trade-off of the
 * lightweight, TS-only activation flow (see the 2026-07-17 plan).
 */
export function getDeviceId(): string {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
