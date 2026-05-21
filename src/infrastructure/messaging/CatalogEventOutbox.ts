import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { Album } from "../../domain/entities/Album";
import { Artist } from "../../domain/entities/Artist";
import { Track } from "../../domain/entities/Track";
import { CatalogEventRecorder } from "../../application/services/CatalogEventRecorder";

const TRACK_SNAPSHOT_EVENT = "CatalogTrackSnapshotUpdated";
const ALBUM_SNAPSHOT_EVENT = "CatalogAlbumSnapshotUpdated";
const ARTIST_SNAPSHOT_EVENT = "CatalogArtistSnapshotUpdated";

export class CatalogEventOutbox implements CatalogEventRecorder {
  constructor(private readonly prisma: PrismaClient) {}

  public async recordArtistSnapshot(artist: Artist): Promise<void> {
    await this.record(
      ARTIST_SNAPSHOT_EVENT,
      "artist.snapshot.updated",
      artist.artistId,
      {
        eventId: randomUUID(),
        eventType: ARTIST_SNAPSHOT_EVENT,
        artistId: artist.artistId,
        displayName: artist.displayName,
        occurredAt: new Date().toISOString()
      }
    );
  }

  public async recordAlbumSnapshot(album: Album): Promise<void> {
    await this.record(
      ALBUM_SNAPSHOT_EVENT,
      "album.snapshot.updated",
      album.albumId,
      {
        eventId: randomUUID(),
        eventType: ALBUM_SNAPSHOT_EVENT,
        albumId: album.albumId,
        artistId: album.artistId,
        title: album.title,
        status: album.status,
        occurredAt: new Date().toISOString()
      }
    );
  }

  public async recordTrackSnapshot(track: Track): Promise<void> {
    await this.record(
      TRACK_SNAPSHOT_EVENT,
      "track.snapshot.updated",
      track.trackId,
      {
        eventId: randomUUID(),
        eventType: TRACK_SNAPSHOT_EVENT,
        trackId: track.trackId,
        artistId: track.artistId,
        albumId: track.albumId,
        title: track.title,
        genre: track.genre,
        status: track.status,
        occurredAt: new Date().toISOString()
      }
    );
  }

  private async record(
    eventType: string,
    routingKey: string,
    aggregateId: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO outbox (
        id,
        aggregate_id,
        event_type,
        routing_key,
        payload,
        status,
        retry_count,
        created_at
      )
      VALUES (
        CAST(${randomUUID()} AS uuid),
        CAST(${aggregateId} AS uuid),
        ${eventType},
        ${routingKey},
        CAST(${JSON.stringify(payload)} AS jsonb),
        'PENDING',
        0,
        NOW()
      )
    `;
  }
}
