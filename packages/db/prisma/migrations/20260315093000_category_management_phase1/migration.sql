CREATE TYPE "CategoryScope" AS ENUM ('PERSONAL', 'SHARED');

ALTER TABLE "User"
ADD COLUMN "show_shared_categories" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "default_income_category_id" TEXT,
ADD COLUMN "default_expense_category_id" TEXT;

ALTER TABLE "Category"
ADD COLUMN "normalized_name" TEXT,
ADD COLUMN "scope" "CategoryScope" NOT NULL DEFAULT 'PERSONAL',
ADD COLUMN "owner_user_id" TEXT,
ADD COLUMN "parent_category_id" TEXT;

UPDATE "Category"
SET
  "normalized_name" = LOWER(BTRIM("name")),
  "scope" = 'SHARED',
  "owner_user_id" = NULL
WHERE "normalized_name" IS NULL;

ALTER TABLE "Category"
ALTER COLUMN "normalized_name" SET NOT NULL;

ALTER TABLE "User"
ADD CONSTRAINT "User_default_income_category_id_fkey"
FOREIGN KEY ("default_income_category_id") REFERENCES "Category"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "User"
ADD CONSTRAINT "User_default_expense_category_id_fkey"
FOREIGN KEY ("default_expense_category_id") REFERENCES "Category"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Category"
ADD CONSTRAINT "Category_owner_user_id_fkey"
FOREIGN KEY ("owner_user_id") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Category"
ADD CONSTRAINT "Category_parent_category_id_fkey"
FOREIGN KEY ("parent_category_id") REFERENCES "Category"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX IF EXISTS "Category_coupleId_name_kind_key";

CREATE INDEX "Category_coupleId_kind_scope_owner_user_id_parent_category_idx"
ON "Category"("coupleId", "kind", "scope", "owner_user_id", "parent_category_id");

CREATE INDEX "Category_coupleId_parent_category_id_idx"
ON "Category"("coupleId", "parent_category_id");

CREATE INDEX "Category_owner_user_id_coupleId_scope_idx"
ON "Category"("owner_user_id", "coupleId", "scope");

CREATE INDEX "Category_coupleId_kind_normalized_name_idx"
ON "Category"("coupleId", "kind", "normalized_name");
