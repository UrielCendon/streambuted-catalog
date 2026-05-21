CREATE TABLE IF NOT EXISTS "outbox" (
  "id" uuid PRIMARY KEY,
  "aggregate_id" uuid NOT NULL,
  "event_type" text NOT NULL,
  "routing_key" text NOT NULL,
  "payload" jsonb NOT NULL,
  "status" text NOT NULL DEFAULT 'PENDING',
  "retry_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "processed_at" timestamptz
);

CREATE INDEX IF NOT EXISTS "idx_catalog_outbox_status_created_at"
  ON "outbox" ("status", "created_at");
