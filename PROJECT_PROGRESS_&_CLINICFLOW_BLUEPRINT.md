# ⚡ TechBill POS & ClinicFlow Master Progress & Architecture Blueprint

---

## 🌟 1. Accomplished Features & System Enhancements

### A. Direct Email Snapshot Delivery with Attachments
- **SMTP Configuration**: Integrated Resend SMTP using custom verified domain `techbill.app` (`SMTP_FROM="TechBill Vault <noreply@techbill.app>"`).
- **Branded HTML Email**: Designed TechBill dark glassmorphism email template with live shop stats summary (Invoices, Stock Units, Customers, Total Revenue) and SHA-256 HMAC checksum verification banner.
- **Direct Attachment Delivery**:
  - The `.techbill` Gzip snapshot binary is attached directly to every backup email.
  - Shopkeepers can download the `.techbill` file in 1-click from their email inbox and restore it into the POS via the Restore Center modal.
- **Strict Recipient Isolation**:
  - Database column `auto_backup_email` added to PostgreSQL `shop_settings` table.
  - The email backup is sent **strictly** to the email address specified by the shopkeeper in POS Settings (`autoBackupEmail`), nowhere else!

### B. Automated 24-Hour Disaster Recovery Cron Job
- **Backend Cron (`@Cron(EVERY_DAY_AT_MIDNIGHT)`)**:
  - Runs automatically every night at 00:00 AM in `RestorePointService`.
  - Captures full A-to-Z store data for all active tenants.
  - Uploads snapshot offsite to **Cloudflare R2 Bucket** (`techbill-backups/snapshots/`).
  - Emails `.techbill` attachment to the shopkeeper's configured email address.
  - Silently logs execution status in server logs.

### C. Multi-Counter & Multi-Cashier Synchronization Architecture
- **Race Condition Protection**: Pessimistic/Optimistic atomic database locks on inventory units (`status: 'IN_STOCK' -> 'SOLD'`) prevent over-selling or negative stock across concurrent counters.
- **Prefix Sequence System**: Per-counter invoice prefix (`C1-1001`, `C2-1001`, `C3-1001`) eliminates invoice number collisions.
- **Cashier Shifts & Reconciliation**: `CashReconciliation` module tracks shift start cash, card payments, and end-of-shift balances for each counter/cashier separately.
- **Cross-Counter Returns**: Global receipt lookup allows returning items purchased at Counter 1 at Counter 3 safely without double refunds.

---

## 🏥 2. ClinicFlow & Medical Store Integration Blueprint

### Planned Workflow (TechBill Clinic & Pharmacy Edition):
1. **Reception / Token Counter**:
   - Search patient by Name, Phone, or Relation (`S/O`, `D/O`, `W/O`).
   - Register new patient (Gender, Age, Phone, Relation).
   - Collect OPD Consultation Fee & print Token # for specific Doctor (Male / Lady Dr.).
2. **Doctor Mobile App / Portal**:
   - Real-time notification when a new token is queued.
   - Doctor consults patient and snaps a photo of the handwritten prescription pad or lab reports using their phone camera.
   - **Canvas Image Compressor Pipeline**: Converts 4MB camera photo to < 80 KB WebP image before upload (zero DB/server bloat).
   - Saves visit record and calls next patient.
3. **Pharmacy Checkout (TechBill POS)**:
   - Patient shows prescription at Pharmacy counter.
   - Cashier loads prescribed medicines, applies discounts, or adds to Patient Credit Ledger (Udhaar).
4. **Digital Medical File Vault**:
   - Full timeline of past visits, doctor prescriptions, lab reports, and payment/credit history stored under patient profile.

---

## 📂 Key Source Code References
- **NestJS Restore Service**: [`restore-point.service.ts`](file:///e:/Tech-Bill/Tech-Bill/techbill-api/src/modules/restore-point/restore-point.service.ts)
- **Public Signed Restore Controller**: [`public-restore-point.controller.ts`](file:///e:/Tech-Bill/Tech-Bill/techbill-api/src/modules/restore-point/public-restore-point.controller.ts)
- **POS Restore Modal**: [`RestorePointModal.tsx`](file:///e:/Tech-Bill/Tech-Bill/techbill-pos/src/components/RestorePointModal.tsx)
- **Prisma Schema**: [`schema.prisma`](file:///e:/Tech-Bill/Tech-Bill/techbill-api/prisma/schema.prisma)
- **ClinicFlow Project Folder**: [`ClinicFlow Folder`](file:///e:/Tech-Bill/Tech-Bill/ClinicFlow)
