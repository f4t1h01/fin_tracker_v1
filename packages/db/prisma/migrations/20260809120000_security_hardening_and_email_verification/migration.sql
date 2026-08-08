-- Security hardening: session revocation, verified email ownership,
-- durable currency rates, and per-user idempotency keys.

-- AlterEnum
ALTER TYPE "AuthEmailCodePurpose" ADD VALUE 'REGISTRATION';
ALTER TYPE "AuthEmailCodePurpose" ADD VALUE 'EMAIL_CLAIM';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "email_verified_at" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "0admin" ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;

-- Google-issued identities already proved email ownership, so grandfather only those.
-- Password-only accounts stay unverified on purpose: they can still sign in with a
-- password, but they can no longer be auto-linked to a Google identity by email.
UPDATE "User"
SET "email_verified_at" = "createdAt"
WHERE "email" IS NOT NULL
  AND "google_sub" IS NOT NULL
  AND "email_verified_at" IS NULL;

-- CreateTable
CREATE TABLE "currency_rate_snapshot" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "rates" JSONB NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currency_rate_snapshot_pkey" PRIMARY KEY ("id")
);

-- Scope offline idempotency keys per creator so one client cannot squat another
-- client's mutation id and permanently break its sync.
DROP INDEX IF EXISTS "Transaction_client_mutation_id_key";
DROP INDEX IF EXISTS "goods_item_client_mutation_id_key";

CREATE UNIQUE INDEX "Transaction_userId_client_mutation_id_key" ON "Transaction"("userId", "client_mutation_id");
CREATE UNIQUE INDEX "goods_item_created_by_id_client_mutation_id_key" ON "goods_item"("created_by_id", "client_mutation_id");
