ALTER TABLE "Transaction"
ADD COLUMN "exchange_rate" DECIMAL(18, 6) NOT NULL DEFAULT 1,
ADD COLUMN "amount_in_uzs" DECIMAL(14, 2);

UPDATE "Transaction"
SET
  "exchange_rate" = 1,
  "amount_in_uzs" = "amount"
WHERE "amount_in_uzs" IS NULL;

ALTER TABLE "Transaction"
ALTER COLUMN "amount_in_uzs" SET NOT NULL;

CREATE INDEX "Transaction_coupleId_currency_happenedAt_idx"
ON "Transaction"("coupleId", "currency", "happenedAt");
