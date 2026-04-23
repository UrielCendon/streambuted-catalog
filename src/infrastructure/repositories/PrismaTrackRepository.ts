import { CatalogStatus as PrismaCatalogStatus, PrismaClient } from "@prisma/client";
import { Track } from "../../domain/entities/Track";
import { CatalogStatus } from "../../domain/enums/CatalogStatus";
import {
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
  audioAssetId: string;
  coverAssetId: string;
  status: PrismaCatalogStatus;
  createdAt: Date;
  updatedAt: Date;
}): Track => ({
  trackId: track.trackId,
  artistId: track.artistId,
  albumId: track.albumId,
  title: track.title,
  audioAssetId: track.audioAssetId,
  coverAssetId: track.coverAssetId,
  status: toDomainStatus(track.status),
  createdAt: track.createdAt,
  updatedAt: track.updatedAt
});

export class PrismaTrackRepository implements TrackRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async create(input: CreateTrackInput): Promise<Track> {
    const track = await this.prisma.track.create({
      data: {
        artistId: input.artistId,
        albumId: input.albumId ?? null,
        title: input.title,
        audioAssetId: input.audioAssetId,
        coverAssetId: input.coverAssetId,
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
        audioAssetId: input.audioAssetId,
        coverAssetId: input.coverAssetId
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

  public async searchPublishedByTitle(query: string, pagination: Pagination): Promise<Track[]> {
    const tracks = await this.prisma.track.findMany({
      where: {
        status: PRISMA_STATUS_PUBLICADO,
        title: {
          contains: query,
          mode: "insensitive"
        }
      },
      orderBy: {
        title: "asc"
      },
      take: pagination.limit,
      skip: pagination.offset
    });

    return tracks.map(mapTrack);
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
}
