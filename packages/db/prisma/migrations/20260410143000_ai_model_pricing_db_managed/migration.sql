CREATE TABLE "ai_model_pricing" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'OPENAI',
    "model" TEXT NOT NULL,
    "text_input_micros_per_1m" BIGINT,
    "audio_input_micros_per_1m" BIGINT,
    "text_output_micros_per_1m" BIGINT,
    "audio_output_micros_per_1m" BIGINT,
    "notes" TEXT,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retired_at" TIMESTAMP(3),
    "created_by_admin_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_model_pricing_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ai_usage_log"
ADD COLUMN "ai_model_pricing_id" TEXT;

CREATE INDEX "ai_model_pricing_provider_model_effective_from_idx" ON "ai_model_pricing"("provider", "model", "effective_from");
CREATE INDEX "ai_model_pricing_provider_model_retired_at_idx" ON "ai_model_pricing"("provider", "model", "retired_at");
CREATE INDEX "ai_model_pricing_created_at_idx" ON "ai_model_pricing"("created_at");
CREATE INDEX "ai_usage_log_ai_model_pricing_id_idx" ON "ai_usage_log"("ai_model_pricing_id");

ALTER TABLE "ai_usage_log"
ADD CONSTRAINT "ai_usage_log_ai_model_pricing_id_fkey"
FOREIGN KEY ("ai_model_pricing_id") REFERENCES "ai_model_pricing"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
