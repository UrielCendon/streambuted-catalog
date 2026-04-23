CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "CatalogStatus" AS ENUM ('PUBLICADO', 'RETIRADO');

CREATE TABLE "artist" (
    "artist_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "display_name" TEXT NOT NULL,
    "biography" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artist_pkey" PRIMARY KEY ("artist_id")
);

CREATE TABLE "album" (
    "album_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "artist_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "cover_asset_id" UUID NOT NULL,
    "status" "CatalogStatus" NOT NULL DEFAULT 'PUBLICADO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "album_pkey" PRIMARY KEY ("album_id")
);

CREATE TABLE "track" (
    "track_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "artist_id" UUID NOT NULL,
    "album_id" UUID,
    "title" TEXT NOT NULL,
    "audio_asset_id" UUID NOT NULL,
    "cover_asset_id" UUID NOT NULL,
    "status" "CatalogStatus" NOT NULL DEFAULT 'PUBLICADO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "track_pkey" PRIMARY KEY ("track_id")
);

CREATE INDEX "idx_album_artist_id" ON "album"("artist_id");
CREATE INDEX "idx_album_status" ON "album"("status");
CREATE INDEX "idx_track_artist_id" ON "track"("artist_id");
CREATE INDEX "idx_track_album_id" ON "track"("album_id");
CREATE INDEX "idx_track_status" ON "track"("status");

ALTER TABLE "album"
ADD CONSTRAINT "album_artist_id_fkey"
FOREIGN KEY ("artist_id") REFERENCES "artist"("artist_id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "track"
ADD CONSTRAINT "track_artist_id_fkey"
FOREIGN KEY ("artist_id") REFERENCES "artist"("artist_id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "track"
ADD CONSTRAINT "track_album_id_fkey"
FOREIGN KEY ("album_id") REFERENCES "album"("album_id")
ON DELETE SET NULL ON UPDATE CASCADE;
