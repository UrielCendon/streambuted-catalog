import { Album } from "../entities/Album";
import { CatalogStatus } from "../enums/CatalogStatus";
import { CatalogVisibilityReason } from "../enums/CatalogVisibilityReason";
import { Pagination } from "../valueObjects/Pagination";

export interface CreateAlbumInput {
  artistId: string;
  title: string;
  coverAssetId: string;
  status?: CatalogStatus;
  visibilityReason?: CatalogVisibilityReason | null;
}

export interface UpdateAlbumInput {
  title?: string;
  coverAssetId?: string;
}

export interface AdminAlbumListItem extends Album {
  artistName: string;
  trackCount: number;
}

export interface AlbumRepository {
  create(input: CreateAlbumInput): Promise<Album>;
  findById(albumId: string): Promise<Album | null>;
  update(albumId: string, input: UpdateAlbumInput): Promise<Album>;
  retire(albumId: string, visibilityReason: CatalogVisibilityReason): Promise<Album>;
  reinstate(albumId: string): Promise<Album>;
  markDeleted(albumId: string): Promise<Album>;
  searchPublishedByTitle(query: string, pagination: Pagination): Promise<Album[]>;
  countAllForAdmin(includeRetired: boolean, searchTerm?: string): Promise<number>;
  listAllForAdmin(includeRetired: boolean, pagination: Pagination, searchTerm?: string): Promise<AdminAlbumListItem[]>;
  listByArtist(artistId: string, includeRetired: boolean): Promise<Album[]>;
}
