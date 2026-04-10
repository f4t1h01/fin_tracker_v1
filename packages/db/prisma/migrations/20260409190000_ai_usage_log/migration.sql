CREATE TABLE "ai_usage_log" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "feature" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "correlation_id" TEXT NOT NULL,
  "provider_request_id" TEXT,
  "user_id" TEXT,
  "couple_id" TEXT,
  "input_tokens" INTEGER,
  "output_tokens" INTEGER,
  "total_tokens" INTEGER,
  "input_text_tokens" INTEGER,
  "input_audio_tokens" INTEGER,
  "input_cached_tokens" INTEGER,
  "output_text_tokens" INTEGER,
  "output_audio_tokens" INTEGER,
  "text_input_price_micros_per_1m" BIGINT,
  "audio_input_price_micros_per_1m" BIGINT,
  "text_output_price_micros_per_1m" BIGINT,
  "audio_output_price_micros_per_1m" BIGINT,
  "input_cost_micros" BIGINT,
  "output_cost_micros" BIGINT,
  "total_cost_micros" BIGINT,
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_usage_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_usage_log_created_at_idx" ON "ai_usage_log"("created_at");
CREATE INDEX "ai_usage_log_model_idx" ON "ai_usage_log"("model");
CREATE INDEX "ai_usage_log_feature_idx" ON "ai_usage_log"("feature");
CREATE INDEX "ai_usage_log_operation_idx" ON "ai_usage_log"("operation");
CREATE INDEX "ai_usage_log_status_idx" ON "ai_usage_log"("status");
CREATE INDEX "ai_usage_log_correlation_id_idx" ON "ai_usage_log"("correlation_id");
CREATE INDEX "ai_usage_log_provider_request_id_idx" ON "ai_usage_log"("provider_request_id");
CREATE INDEX "ai_usage_log_user_id_created_at_idx" ON "ai_usage_log"("user_id", "created_at");
CREATE INDEX "ai_usage_log_couple_id_created_at_idx" ON "ai_usage_log"("couple_id", "created_at");

ALTER TABLE "ai_usage_log" ADD CONSTRAINT "ai_usage_log_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_usage_log" ADD CONSTRAINT "ai_usage_log_couple_id_fkey"
FOREIGN KEY ("couple_id") REFERENCES "Couple"("id") ON DELETE SET NULL ON UPDATE CASCADE;
