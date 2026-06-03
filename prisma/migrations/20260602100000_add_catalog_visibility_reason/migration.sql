CREATE TYPE "CatalogVisibilityReason" AS ENUM ('ADMIN_RETIRED', 'ARTIST_DELETED');

ALTER TABLE "album"
ADD COLUMN "visibility_reason" "CatalogVisibilityReason";

ALTER TABLE "track"
ADD COLUMN "visibility_reason" "CatalogVisibilityReason";

UPDATE "album"
SET "visibility_reason" = 'ADMIN_RETIRED'
WHERE "status" = 'RETIRADO' AND "visibility_reason" IS NULL;

UPDATE "track"
SET "visibility_reason" = 'ADMIN_RETIRED'
WHERE "status" = 'RETIRADO' AND "visibility_reason" IS NULL;
