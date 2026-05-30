-- CreateEnum
CREATE TYPE "AuthEmailProvider" AS ENUM ('SMTP');

-- CreateEnum
CREATE TYPE "AuthEmailCodePurpose" AS ENUM ('LOGIN', 'PASSWORD_RESET');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "google_sub" TEXT;

-- CreateTable
CREATE TABLE "auth_email_provider_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "provider" "AuthEmailProvider" NOT NULL DEFAULT 'SMTP',
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "from_email" TEXT,
    "from_name" TEXT,
    "smtp_host" TEXT,
    "smtp_port" INTEGER,
    "smtp_secure" BOOLEAN NOT NULL DEFAULT true,
    "smtp_user" TEXT,
    "smtp_password_encrypted" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_email_provider_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_google_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "client_id" TEXT,
    "hosted_domain" TEXT,
    "auto_create_users" BOOLEAN NOT NULL DEFAULT true,
    "link_by_verified_email" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_google_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_email_code" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "purpose" "AuthEmailCodePurpose" NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "request_ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_email_code_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_google_sub_key" ON "User"("google_sub");

-- CreateIndex
CREATE INDEX "auth_email_code_email_purpose_created_at_idx" ON "auth_email_code"("email", "purpose", "created_at");

-- CreateIndex
CREATE INDEX "auth_email_code_email_purpose_expires_at_idx" ON "auth_email_code"("email", "purpose", "expires_at");

-- CreateIndex
CREATE INDEX "auth_email_code_expires_at_idx" ON "auth_email_code"("expires_at");

