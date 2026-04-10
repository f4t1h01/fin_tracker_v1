ALTER TABLE "0admin"
ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "last_login_at" TIMESTAMP(3);

CREATE TABLE "admin_audit_log" (
    "id" TEXT NOT NULL,
    "admin_email" TEXT,
    "action_type" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "reason" TEXT,
    "request_metadata" JSONB,
    "before_state" JSONB,
    "after_state" JSONB,
    "outcome" TEXT NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_audit_log_created_at_idx" ON "admin_audit_log"("created_at");
CREATE INDEX "admin_audit_log_admin_email_created_at_idx" ON "admin_audit_log"("admin_email", "created_at");
CREATE INDEX "admin_audit_log_action_type_created_at_idx" ON "admin_audit_log"("action_type", "created_at");
CREATE INDEX "admin_audit_log_target_type_target_id_idx" ON "admin_audit_log"("target_type", "target_id");
CREATE INDEX "admin_audit_log_outcome_created_at_idx" ON "admin_audit_log"("outcome", "created_at");
