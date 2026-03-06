CREATE TABLE "0admin" (
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "0admin_pkey" PRIMARY KEY ("email")
);

INSERT INTO "0admin" ("email", "password_hash")
VALUES (
  'mfshn12@gmail.com',
  'scrypt:2a5da1a1356b31bc745226d9022e97fd:59ed1ca5657fa3322282770ec160e0086992d57e652ae2477e42f019710ad0d4e3192b4abdf4266218f2c9fbbc361ffda21f4fa15b5479fd592b2fa154acaaf2'
)
ON CONFLICT ("email") DO NOTHING;
