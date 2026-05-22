import { CatalogStatus as PrismaCatalogStatus, Prisma, PrismaClient } from "@prisma/client";
import { Album } from "../../domain/entities/Album";
import { CatalogStatus } from "../../domain/enums/CatalogStatus";
import {
  AdminAlbumListItem,
  AlbumRepository,
  CreateAlbumInput,
  UpdateAlbumInput
} from "../../domain/repositories/AlbumRepository";
import { Pagination } from "../../domain/valueObjects/Pagination";

const toPrismaStatus = (status: CatalogStatus): PrismaCatalogStatus => status as PrismaCatalogStatus;
const toDomainStatus = (status: PrismaCatalogStatus): CatalogStatus => status as CatalogStatus;

const PRISMA_STATUS_PUBLICADO: PrismaCatalogStatus = "PUBLICADO";
const PRISMA_STATUS_RETIRADO: PrismaCatalogStatus = "RETIRADO";

const mapAlbum = (album: {
  albumId: string;
  artistId: string;
  title: string;
  coverAssetId: string;
  status: PrismaCatalogStatus;
  createdAt: Date;
  updatedAt: Date;
}): Album => ({
  albumId: album.albumId,
  artistId: album.artistId,
  title: album.title,
  coverAssetId: album.coverAssetId,
  status: toDomainStatus(album.status),
  createdAt: album.createdAt,
  updatedAt: album.updatedAt
});

const mapAdminAlbum = (album: Parameters<typeof mapAlbum>[0] & {
  artist: { displayName: string };
  _count: { tracks: number };
}): AdminAlbumListItem => ({
  ...mapAlbum(album),
  artistName: album.artist.displayName,
  trackCount: album._count.tracks
});

export class PrismaAlbumRepository implements AlbumRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async create(input: CreateAlbumInput): Promise<Album> {
    const album = await this.prisma.album.create({
      data: {
        artistId: input.artistId,
        title: input.title,
        coverAssetId: input.coverAssetId,
        status: toPrismaStatus(input.status ?? CatalogStatus.Publicado)
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

  public async retire(albumId: string): Promise<Album> {
    const album = await this.prisma.album.update({
      where: { albumId },
      data: {
        status: PRISMA_STATUS_RETIRADO
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

  public async countAllForAdmin(includeRetired: boolean): Promise<number> {
    return this.prisma.album.count({
      where: includeRetired ? {} : { status: PRISMA_STATUS_PUBLICADO }
    });
  }

  public async listAllForAdmin(includeRetired: boolean, pagination: Pagination): Promise<AdminAlbumListItem[]> {
    const albums = await this.prisma.album.findMany({
      where: includeRetired ? {} : { status: PRISMA_STATUS_PUBLICADO },
      include: {
        artist: {
          select: { displayName: true }
        },
        _count: {
          select: { tracks: true }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: pagination.limit,
      skip: pagination.offset
    });

    return albums.map(mapAdminAlbum);
  }

  public async listByArtist(artistId: string, includeRetired: boolean): Promise<Album[]> {
    const albums = await this.prisma.album.findMany({
      where: {
        artistId,
        ...(includeRetired ? {} : { status: PRISMA_STATUS_PUBLICADO })
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return albums.map(mapAlbum);
  }
}
