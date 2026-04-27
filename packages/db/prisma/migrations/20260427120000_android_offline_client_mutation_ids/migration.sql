-- Add idempotency keys for Android offline-create sync retries.
ALTER TABLE "Transaction" ADD COLUMN "client_mutation_id" TEXT;
ALTER TABLE "goods_item" ADD COLUMN "client_mutation_id" TEXT;

CREATE UNIQUE INDEX "Transaction_client_mutation_id_key" ON "Transaction"("client_mutation_id");
CREATE UNIQUE INDEX "goods_item_client_mutation_id_key" ON "goods_item"("client_mutation_id");
