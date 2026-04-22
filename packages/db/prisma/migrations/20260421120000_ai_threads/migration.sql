CREATE TYPE "AiThreadFeature" AS ENUM ('GOODS_ADVISOR');
CREATE TYPE "AiThreadScope" AS ENUM ('AUTO', 'PERSONAL', 'SHARED');
CREATE TYPE "AiMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

CREATE TABLE "ai_thread" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "couple_id" TEXT,
  "feature" "AiThreadFeature" NOT NULL,
  "scope" "AiThreadScope" NOT NULL DEFAULT 'AUTO',
  "auto_title" TEXT,
  "title_override" TEXT,
  "is_pinned" BOOLEAN NOT NULL DEFAULT false,
  "summary_text" TEXT,
  "last_message_preview" TEXT,
  "last_activity_at" TIMESTAMP(3) NOT NULL,
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ai_thread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_message" (
  "id" TEXT NOT NULL,
  "thread_id" TEXT NOT NULL,
  "role" "AiMessageRole" NOT NULL,
  "user_id" TEXT,
  "text" TEXT NOT NULL,
  "payload" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_message_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_thread_user_id_feature_is_pinned_last_activity_at_idx" ON "ai_thread"("user_id", "feature", "is_pinned", "last_activity_at" DESC);
CREATE INDEX "ai_thread_user_id_feature_expires_at_idx" ON "ai_thread"("user_id", "feature", "expires_at");
CREATE INDEX "ai_thread_couple_id_feature_last_activity_at_idx" ON "ai_thread"("couple_id", "feature", "last_activity_at" DESC);
CREATE INDEX "ai_message_thread_id_created_at_idx" ON "ai_message"("thread_id", "created_at");
CREATE INDEX "ai_message_user_id_created_at_idx" ON "ai_message"("user_id", "created_at");

ALTER TABLE "ai_thread"
ADD CONSTRAINT "ai_thread_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_thread"
ADD CONSTRAINT "ai_thread_couple_id_fkey"
FOREIGN KEY ("couple_id") REFERENCES "Couple"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_message"
ADD CONSTRAINT "ai_message_thread_id_fkey"
FOREIGN KEY ("thread_id") REFERENCES "ai_thread"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_message"
ADD CONSTRAINT "ai_message_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_usage_log"
ADD COLUMN "ai_thread_id" TEXT;

CREATE INDEX "ai_usage_log_ai_thread_id_created_at_idx" ON "ai_usage_log"("ai_thread_id", "created_at");

ALTER TABLE "ai_usage_log"
ADD CONSTRAINT "ai_usage_log_ai_thread_id_fkey"
FOREIGN KEY ("ai_thread_id") REFERENCES "ai_thread"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
