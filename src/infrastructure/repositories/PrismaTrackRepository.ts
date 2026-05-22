import { CatalogStatus as PrismaCatalogStatus, Prisma, PrismaClient } from "@prisma/client";
import { Track } from "../../domain/entities/Track";
import { CatalogStatus } from "../../domain/enums/CatalogStatus";
import {
  AdminTrackListItem,
  CreateTrackInput,
  TrackRepository,
  UpdateTrackInput
} from "../../domain/repositories/TrackRepository";
import { Pagination } from "../../domain/valueObjects/Pagination";

const toPrismaStatus = (status: CatalogStatus): PrismaCatalogStatus => status as PrismaCatalogStatus;
const toDomainStatus = (status: PrismaCatalogStatus): CatalogStatus => status as CatalogStatus;

const PRISMA_STATUS_PUBLICADO: PrismaCatalogStatus = "PUBLICADO";
const PRISMA_STATUS_RETIRADO: PrismaCatalogStatus = "RETIRADO";

const mapTrack = (track: {
  trackId: string;
  artistId: string;
  albumId: string | null;
  title: string;
  genre: string;
  audioAssetId: string;
  coverAssetId: string;
  durationSeconds: number | null;
  status: PrismaCatalogStatus;
  createdAt: Date;
  updatedAt: Date;
}): Track => ({
  trackId: track.trackId,
  artistId: track.artistId,
  albumId: track.albumId,
  title: track.title,
  genre: track.genre,
  audioAssetId: track.audioAssetId,
  coverAssetId: track.coverAssetId,
  durationSeconds: track.durationSeconds,
  status: toDomainStatus(track.status),
  createdAt: track.createdAt,
  updatedAt: track.updatedAt
});

const mapAdminTrack = (track: Parameters<typeof mapTrack>[0] & {
  artist: { displayName: string };
  album: { title: string } | null;
}): AdminTrackListItem => ({
  ...mapTrack(track),
  artistName: track.artist.displayName,
  albumTitle: track.album?.title ?? null
});

export class PrismaTrackRepository implements TrackRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async create(input: CreateTrackInput): Promise<Track> {
    const track = await this.prisma.track.create({
      data: {
        artistId: input.artistId,
        albumId: input.albumId ?? null,
        title: input.title,
        genre: input.genre,
        audioAssetId: input.audioAssetId,
        coverAssetId: input.coverAssetId,
        durationSeconds: input.durationSeconds ?? null,
        status: toPrismaStatus(input.status ?? CatalogStatus.Publicado)
      }
    });

    return mapTrack(track);
  }

  public async findById(trackId: string): Promise<Track | null> {
    const track = await this.prisma.track.findUnique({
      where: { trackId }
    });

    return track ? mapTrack(track) : null;
  }

  public async update(trackId: string, input: UpdateTrackInput): Promise<Track> {
    const track = await this.prisma.track.update({
      where: { trackId },
      data: {
        albumId: input.albumId,
        title: input.title,
        genre: input.genre,
        audioAssetId: input.audioAssetId,
        coverAssetId: input.coverAssetId,
        durationSeconds: input.durationSeconds
      }
    });

    return mapTrack(track);
  }

  public async retire(trackId: string): Promise<Track> {
    const track = await this.prisma.track.update({
      where: { trackId },
      data: {
        status: PRISMA_STATUS_RETIRADO
      }
    });

    return mapTrack(track);
  }

  public async detachAlbum(albumId: string): Promise<number> {
    const result = await this.prisma.track.updateMany({
      where: { albumId },
      data: { albumId: null }
    });

    return result.count;
  }

  public async searchPublishedByTitle(query: string, pagination: Pagination): Promise<Track[]> {
    const tracks = await this.prisma.$queryRaw<Array<Parameters<typeof mapTrack>[0]>>(Prisma.sql`
      SELECT
        track_id AS "trackId",
        artist_id AS "artistId",
        album_id AS "albumId",
        title,
        genre,
        audio_asset_id AS "audioAssetId",
        cover_asset_id AS "coverAssetId",
        duration_seconds AS "durationSeconds",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM track
      WHERE status = ${PRISMA_STATUS_PUBLICADO}::"CatalogStatus"
        AND (
          unaccent(lower(title)) LIKE '%' || unaccent(lower(${query})) || '%'
          OR unaccent(lower(genre)) LIKE '%' || unaccent(lower(${query})) || '%'
        )
      ORDER BY title ASC
      LIMIT ${pagination.limit}
      OFFSET ${pagination.offset}
    `);

    return tracks.map(mapTrack);
  }

  public async countAllForAdmin(includeRetired: boolean): Promise<number> {
    return this.prisma.track.count({
      where: includeRetired ? {} : { status: PRISMA_STATUS_PUBLICADO }
    });
  }

  public async listAllForAdmin(includeRetired: boolean, pagination: Pagination): Promise<AdminTrackListItem[]> {
    const tracks = await this.prisma.track.findMany({
      where: includeRetired ? {} : { status: PRISMA_STATUS_PUBLICADO },
      include: {
        artist: {
          select: { displayName: true }
        },
        album: {
          select: { title: true }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: pagination.limit,
      skip: pagination.offset
    });

    return tracks.map(mapAdminTrack);
  }

  public async listByArtist(artistId: string, includeRetired: boolean): Promise<Track[]> {
    const tracks = await this.prisma.track.findMany({
      where: {
        artistId,
        ...(includeRetired ? {} : { status: PRISMA_STATUS_PUBLICADO })
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return tracks.map(mapTrack);
  }

  public async listPublishedByAlbum(albumId: string): Promise<Track[]> {
    const tracks = await this.prisma.track.findMany({
      where: {
        albumId,
        status: PRISMA_STATUS_PUBLICADO
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return tracks.map(mapTrack);
  }
}
