import { Album } from "../entities/Album";
import { CatalogStatus } from "../enums/CatalogStatus";
import { Pagination } from "../valueObjects/Pagination";

export interface CreateAlbumInput {
  artistId: string;
  title: string;
  coverAssetId: string;
  status?: CatalogStatus;
}

export interface UpdateAlbumInput {
  title?: string;
  coverAssetId?: string;
}

export interface AlbumRepository {
  create(input: CreateAlbumInput): Promise<Album>;
  findById(albumId: string): Promise<Album | null>;
  update(albumId: string, input: UpdateAlbumInput): Promise<Album>;
  retire(albumId: string): Promise<Album>;
  searchPublishedByTitle(query: string, pagination: Pagination): Promise<Album[]>;
  listByArtist(artistId: string, includeRetired: boolean): Promise<Album[]>;
}
