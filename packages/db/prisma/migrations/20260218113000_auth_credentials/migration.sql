-- AlterTable
ALTER TABLE "User"
ADD COLUMN "lastTelegramChatId" BIGINT,
ADD COLUMN "email" TEXT,
ADD COLUMN "passwordHash" TEXT,
ADD COLUMN "passwordSetAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
