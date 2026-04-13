CREATE TYPE "GoodsScope" AS ENUM ('PERSONAL', 'SHARED');
CREATE TYPE "GoodsConsumptionUnit" AS ENUM ('HOUR', 'DAY', 'WEEK', 'PERMANENT');
CREATE TYPE "GoodsItemEventType" AS ENUM ('INITIAL', 'RESTOCK', 'CONSUME', 'ADJUST_UP', 'ADJUST_DOWN', 'SET_BALANCE', 'AUTO_CONSUMED', 'POLICY_UPDATED', 'MOVED', 'EXPIRY_UPDATED', 'ARCHIVED');
CREATE TYPE "GoodsEventSource" AS ENUM ('USER', 'SYSTEM', 'ADMIN');
CREATE TYPE "GoodsUomGroup" AS ENUM ('COUNT', 'MASS', 'VOLUME', 'OTHER');

CREATE TABLE "goods_place" (
    "id" TEXT NOT NULL,
    "couple_id" TEXT NOT NULL,
    "scope" "GoodsScope" NOT NULL,
    "owner_user_id" TEXT,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goods_place_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "goods_category" (
    "id" TEXT NOT NULL,
    "couple_id" TEXT NOT NULL,
    "scope" "GoodsScope" NOT NULL,
    "owner_user_id" TEXT,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "is_seeded" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goods_category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "goods_uom" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "group_key" "GoodsUomGroup" NOT NULL DEFAULT 'OTHER',
    "decimals" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goods_uom_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "goods_item" (
    "id" TEXT NOT NULL,
    "couple_id" TEXT NOT NULL,
    "scope" "GoodsScope" NOT NULL,
    "owner_user_id" TEXT,
    "place_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "uom_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "note" TEXT,
    "quantity_base" DECIMAL(14,3) NOT NULL,
    "quantity_base_as_of" TIMESTAMP(3) NOT NULL,
    "low_stock_threshold" DECIMAL(14,3) NOT NULL,
    "target_quantity" DECIMAL(14,3) NOT NULL,
    "consumption_rate_value" DECIMAL(14,3),
    "consumption_rate_unit" "GoodsConsumptionUnit" NOT NULL DEFAULT 'PERMANENT',
    "consumption_rate_per_hour" DECIMAL(18,8),
    "consumption_started_at" TIMESTAMP(3),
    "expiration_date" TIMESTAMP(3),
    "last_stock_event_at" TIMESTAMP(3) NOT NULL,
    "last_manual_event_at" TIMESTAMP(3),
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goods_item_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "goods_item_event" (
    "id" TEXT NOT NULL,
    "goods_item_id" TEXT NOT NULL,
    "event_type" "GoodsItemEventType" NOT NULL,
    "quantity_delta" DECIMAL(14,3) NOT NULL,
    "quantity_after" DECIMAL(14,3) NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "source" "GoodsEventSource" NOT NULL DEFAULT 'USER',
    "reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goods_item_event_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "goods_uom_code_key" ON "goods_uom"("code");
CREATE INDEX "goods_place_couple_id_scope_owner_user_id_normalized_name_idx" ON "goods_place"("couple_id", "scope", "owner_user_id", "normalized_name");
CREATE INDEX "goods_place_couple_id_is_archived_idx" ON "goods_place"("couple_id", "is_archived");
CREATE INDEX "goods_category_couple_id_scope_owner_user_id_normalized_name_idx" ON "goods_category"("couple_id", "scope", "owner_user_id", "normalized_name");
CREATE INDEX "goods_category_couple_id_is_archived_idx" ON "goods_category"("couple_id", "is_archived");
CREATE INDEX "goods_uom_is_active_sort_order_idx" ON "goods_uom"("is_active", "sort_order");
CREATE INDEX "goods_item_couple_id_scope_owner_user_id_is_archived_idx" ON "goods_item"("couple_id", "scope", "owner_user_id", "is_archived");
CREATE INDEX "goods_item_place_id_category_id_idx" ON "goods_item"("place_id", "category_id");
CREATE INDEX "goods_item_normalized_name_idx" ON "goods_item"("normalized_name");
CREATE INDEX "goods_item_expiration_date_idx" ON "goods_item"("expiration_date");
CREATE INDEX "goods_item_last_stock_event_at_idx" ON "goods_item"("last_stock_event_at");
CREATE INDEX "goods_item_event_goods_item_id_occurred_at_idx" ON "goods_item_event"("goods_item_id", "occurred_at" DESC);
CREATE INDEX "goods_item_event_event_type_occurred_at_idx" ON "goods_item_event"("event_type", "occurred_at" DESC);

ALTER TABLE "goods_place"
ADD CONSTRAINT "goods_place_couple_id_fkey"
FOREIGN KEY ("couple_id") REFERENCES "Couple"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "goods_place"
ADD CONSTRAINT "goods_place_owner_user_id_fkey"
FOREIGN KEY ("owner_user_id") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "goods_place"
ADD CONSTRAINT "goods_place_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "goods_category"
ADD CONSTRAINT "goods_category_couple_id_fkey"
FOREIGN KEY ("couple_id") REFERENCES "Couple"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "goods_category"
ADD CONSTRAINT "goods_category_owner_user_id_fkey"
FOREIGN KEY ("owner_user_id") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "goods_category"
ADD CONSTRAINT "goods_category_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "goods_item"
ADD CONSTRAINT "goods_item_couple_id_fkey"
FOREIGN KEY ("couple_id") REFERENCES "Couple"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "goods_item"
ADD CONSTRAINT "goods_item_owner_user_id_fkey"
FOREIGN KEY ("owner_user_id") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "goods_item"
ADD CONSTRAINT "goods_item_place_id_fkey"
FOREIGN KEY ("place_id") REFERENCES "goods_place"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "goods_item"
ADD CONSTRAINT "goods_item_category_id_fkey"
FOREIGN KEY ("category_id") REFERENCES "goods_category"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "goods_item"
ADD CONSTRAINT "goods_item_uom_id_fkey"
FOREIGN KEY ("uom_id") REFERENCES "goods_uom"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "goods_item"
ADD CONSTRAINT "goods_item_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "goods_item_event"
ADD CONSTRAINT "goods_item_event_goods_item_id_fkey"
FOREIGN KEY ("goods_item_id") REFERENCES "goods_item"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "goods_item_event"
ADD CONSTRAINT "goods_item_event_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "goods_uom" ("id", "code", "label", "group_key", "decimals", "sort_order", "updated_at")
VALUES
  ('goods_uom_kg', 'kg', 'Kilogram', 'MASS', 3, 10, CURRENT_TIMESTAMP),
  ('goods_uom_g', 'g', 'Gram', 'MASS', 0, 20, CURRENT_TIMESTAMP),
  ('goods_uom_l', 'L', 'Liter', 'VOLUME', 3, 30, CURRENT_TIMESTAMP),
  ('goods_uom_ml', 'ml', 'Milliliter', 'VOLUME', 0, 40, CURRENT_TIMESTAMP),
  ('goods_uom_pcs', 'pcs', 'Pieces', 'COUNT', 0, 50, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
