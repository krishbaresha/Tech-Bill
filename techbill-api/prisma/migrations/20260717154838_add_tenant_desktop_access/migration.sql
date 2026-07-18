-- Per-shop desktop kill-switch (2026-07-17): mirrors app_access_enabled
-- (mobile). Lets a platform admin disable a shop's desktop software access
-- independently of whether it holds a valid license key.

-- AddColumn
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "desktop_access_enabled" BOOLEAN NOT NULL DEFAULT false;
