import {
  CatalogStatus as PrismaCatalogStatus,
  CatalogVisibilityReason as PrismaCatalogVisibilityReason,
  Prisma,
  PrismaClient
} from "@prisma/client";
import { Album } from "../../domain/entities/Album";
import { CatalogStatus } from "../../domain/enums/CatalogStatus";
import { CatalogVisibilityReason } from "../../domain/enums/CatalogVisibilityReason";
import {
  AdminAlbumListItem,
  AlbumRepository,
  CreateAlbumInput,
  UpdateAlbumInput
} from "../../domain/repositories/AlbumRepository";
import { Pagination } from "../../domain/valueObjects/Pagination";

const toPrismaStatus = (status: CatalogStatus): PrismaCatalogStatus => status as PrismaCatalogStatus;
const toDomainStatus = (status: PrismaCatalogStatus): CatalogStatus => status as CatalogStatus;
const toPrismaVisibilityReason = (
  visibilityReason: CatalogVisibilityReason | null | undefined
): PrismaCatalogVisibilityReason | null | undefined =>
  visibilityReason === undefined ? undefined : visibilityReason as PrismaCatalogVisibilityReason | null;
const toDomainVisibilityReason = (
  visibilityReason: PrismaCatalogVisibilityReason | null
): CatalogVisibilityReason | null => visibilityReason as CatalogVisibilityReason | null;

const PRISMA_STATUS_PUBLICADO: PrismaCatalogStatus = "PUBLICADO";
const PRISMA_STATUS_RETIRADO: PrismaCatalogStatus = "RETIRADO";
const PRISMA_VISIBILITY_ADMIN_RETIRED: PrismaCatalogVisibilityReason = "ADMIN_RETIRED";
const PRISMA_VISIBILITY_ARTIST_DELETED: PrismaCatalogVisibilityReason = "ARTIST_DELETED";

function buildAdminAlbumWhere(
  includeRetired: boolean,
  searchTerm?: string
): Prisma.AlbumWhereInput {
  const normalizedSearchTerm = searchTerm?.trim();
  const where: Prisma.AlbumWhereInput = includeRetired
    ? {
      OR: [
        { status: PRISMA_STATUS_PUBLICADO },
        { visibilityReason: PRISMA_VISIBILITY_ADMIN_RETIRED }
      ]
    }
    : { status: PRISMA_STATUS_PUBLICADO };

  if (!normalizedSearchTerm) {
    return where;
  }

  const statusMatches: PrismaCatalogStatus[] = [];
  const comparableSearchTerm = normalizedSearchTerm.toLowerCase();

  if ("publicado".includes(comparableSearchTerm) || comparableSearchTerm.includes("public")) {
    statusMatches.push(PRISMA_STATUS_PUBLICADO);
  }

  if ("retirado".includes(comparableSearchTerm) || comparableSearchTerm.includes("retir")) {
    statusMatches.push(PRISMA_STATUS_RETIRADO);
  }

  return {
    AND: [
      where,
      {
        OR: [
          { title: { contains: normalizedSearchTerm, mode: "insensitive" } },
          { artist: { displayName: { contains: normalizedSearchTerm, mode: "insensitive" } } },
          ...(statusMatches.length > 0 ? [{ status: { in: statusMatches } }] : [])
        ]
      }
    ]
  };
}

const mapAlbum = (album: {
  albumId: string;
  artistId: string;
  title: string;
  coverAssetId: string;
  status: PrismaCatalogStatus;
  visibilityReason: PrismaCatalogVisibilityReason | null;
  createdAt: Date;
  updatedAt: Date;
}): Album => ({
  albumId: album.albumId,
  artistId: album.artistId,
  title: album.title,
  coverAssetId: album.coverAssetId,
  status: toDomainStatus(album.status),
  visibilityReason: toDomainVisibilityReason(album.visibilityReason),
  createdAt: album.createdAt,
  updatedAt: album.updatedAt
});

const mapAdminAlbum = (album: Parameters<typeof mapAlbum>[0] & {
  artist: { displayName: string };
  trackCount: number;
}): AdminAlbumListItem => ({
  ...mapAlbum(album),
  artistName: album.artist.displayName,
  trackCount: album.trackCount
});

export class PrismaAlbumRepository implements AlbumRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async create(input: CreateAlbumInput): Promise<Album> {
    const album = await this.prisma.album.create({
      data: {
        artistId: input.artistId,
        title: input.title,
        coverAssetId: input.coverAssetId,
        status: toPrismaStatus(input.status ?? CatalogStatus.Publicado),
        visibilityReason: toPrismaVisibilityReason(input.visibilityReason ?? null)
      }
    });

    return mapAlbum(album);
  }

  public async findById(albumId: string): Promise<Album | null> {
    const album = await this.prisma.album.findUnique({
      where: { albumId }
    });

    return album ? mapAlbum(album) : null;
  }

  public async update(albumId: string, input: UpdateAlbumInput): Promise<Album> {
    const album = await this.prisma.album.update({
      where: { albumId },
      data: {
        title: input.title,
        coverAssetId: input.coverAssetId
      }
    });

    return mapAlbum(album);
  }

  public async retire(albumId: string, visibilityReason: CatalogVisibilityReason): Promise<Album> {
    const album = await this.prisma.album.update({
      where: { albumId },
      data: {
        status: PRISMA_STATUS_RETIRADO,
        visibilityReason: toPrismaVisibilityReason(visibilityReason)
      }
    });

    return mapAlbum(album);
  }

  public async reinstate(albumId: string): Promise<Album> {
    const album = await this.prisma.album.update({
      where: { albumId },
      data: {
        status: PRISMA_STATUS_PUBLICADO,
        visibilityReason: null
      }
    });

    return mapAlbum(album);
  }

  public async markDeleted(albumId: string): Promise<Album> {
    const album = await this.prisma.album.update({
      where: { albumId },
      data: {
        status: PRISMA_STATUS_RETIRADO,
        visibilityReason: PRISMA_VISIBILITY_ARTIST_DELETED
      }
    });

    return mapAlbum(album);
  }

  public async searchPublishedByTitle(query: string, pagination: Pagination): Promise<Album[]> {
    const albums = await this.prisma.$queryRaw<Array<Parameters<typeof mapAlbum>[0]>>(Prisma.sql`
      SELECT
        album_id AS "albumId",
        artist_id AS "artistId",
        title,
        cover_asset_id AS "coverAssetId",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM album
      WHERE status = ${PRISMA_STATUS_PUBLICADO}::"CatalogStatus"
        AND unaccent(lower(title)) LIKE '%' || unaccent(lower(${query})) || '%'
      ORDER BY title ASC
      LIMIT ${pagination.limit}
      OFFSET ${pagination.offset}
    `);

    return albums.map(mapAlbum);
  }

  public async countAllForAdmin(includeRetired: boolean, searchTerm?: string): Promise<number> {
    return this.prisma.album.count({
      where: buildAdminAlbumWhere(includeRetired, searchTerm)
    });
  }

  public async listAllForAdmin(
    includeRetired: boolean,
    pagination: Pagination,
    searchTerm?: string
  ): Promise<AdminAlbumListItem[]> {
    const albums = await this.prisma.album.findMany({
      where: buildAdminAlbumWhere(includeRetired, searchTerm),
      include: {
        artist: {
          select: { displayName: true }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: pagination.limit,
      skip: pagination.offset
    });

    const albumIds = albums.map((album) => album.albumId);
    const trackCounts = albumIds.length === 0
      ? []
      : await this.prisma.track.groupBy({
        by: ["albumId"],
        where: {
          albumId: { in: albumIds },
          status: PRISMA_STATUS_PUBLICADO
        },
        _count: {
          _all: true
        }
      });

    const trackCountByAlbumId = new Map(
      trackCounts.map((entry) => [entry.albumId, entry._count._all])
    );

    return albums.map((album) => mapAdminAlbum({
      ...album,
      trackCount: trackCountByAlbumId.get(album.albumId) ?? 0
    }));
  }

  public async listByArtist(artistId: string, includeRetired: boolean): Promise<Album[]> {
    const albums = await this.prisma.album.findMany({
      where: {
        artistId,
        ...(includeRetired
          ? {
            OR: [
              { status: PRISMA_STATUS_PUBLICADO },
              { visibilityReason: PRISMA_VISIBILITY_ADMIN_RETIRED }
            ]
          }
          : { status: PRISMA_STATUS_PUBLICADO })
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return albums.map(mapAlbum);
  }
}
