-- AlterTable
ALTER TABLE "User" ADD COLUMN "coupleCode" TEXT;

-- CreateTable
CREATE TABLE "couple_bind" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "couple_id" TEXT NOT NULL,
    "user_couple_code" TEXT NOT NULL,
    "inserted_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "couple_bind_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_coupleCode_key" ON "User"("coupleCode");

-- CreateIndex
CREATE UNIQUE INDEX "couple_bind_user_id_key" ON "couple_bind"("user_id");

-- CreateIndex
CREATE INDEX "couple_bind_couple_id_idx" ON "couple_bind"("couple_id");

-- AddForeignKey
ALTER TABLE "couple_bind" ADD CONSTRAINT "couple_bind_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_bind" ADD CONSTRAINT "couple_bind_couple_id_fkey" FOREIGN KEY ("couple_id") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;
