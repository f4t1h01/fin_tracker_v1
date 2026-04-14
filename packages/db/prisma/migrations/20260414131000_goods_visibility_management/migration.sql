ALTER TABLE "goods_place"
ADD COLUMN "is_visible" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "goods_category"
ADD COLUMN "is_visible" BOOLEAN NOT NULL DEFAULT true;
