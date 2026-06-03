import { Track } from "../entities/Track";
import { CatalogStatus } from "../enums/CatalogStatus";
import { CatalogVisibilityReason } from "../enums/CatalogVisibilityReason";
import { Pagination } from "../valueObjects/Pagination";

export interface CreateTrackInput {
  artistId: string;
  albumId?: string | null;
  title: string;
  genre: string;
  audioAssetId: string;
  coverAssetId: string;
  durationSeconds?: number | null;
  status?: CatalogStatus;
  visibilityReason?: CatalogVisibilityReason | null;
}

export interface UpdateTrackInput {
  albumId?: string | null;
  title?: string;
  genre?: string;
  audioAssetId?: string;
  coverAssetId?: string;
  durationSeconds?: number | null;
}

export interface AdminTrackListItem extends Track {
  artistName: string;
  albumTitle: string | null;
}

export interface PublishedTrackListItem extends Track {
  artistName: string;
  albumTitle: string | null;
}

export interface TrackRepository {
  create(input: CreateTrackInput): Promise<Track>;
  findById(trackId: string): Promise<Track | null>;
  update(trackId: string, input: UpdateTrackInput): Promise<Track>;
  retire(trackId: string, visibilityReason: CatalogVisibilityReason): Promise<Track>;
  reinstate(trackId: string): Promise<Track>;
  retireByAlbum(albumId: string, visibilityReason: CatalogVisibilityReason): Promise<number>;
  reinstateByAlbum(albumId: string): Promise<number>;
  markDeleted(trackId: string): Promise<Track>;
  markDeletedByAlbum(albumId: string): Promise<number>;
  searchPublishedByTitle(query: string, pagination: Pagination): Promise<Track[]>;
  countAllForAdmin(includeRetired: boolean, searchTerm?: string): Promise<number>;
  listAllForAdmin(includeRetired: boolean, pagination: Pagination, searchTerm?: string): Promise<AdminTrackListItem[]>;
  listByArtist(artistId: string, includeRetired: boolean): Promise<Track[]>;
  listPublishedByAlbum(albumId: string): Promise<Track[]>;
  listPublishedByIds(trackIds: string[]): Promise<PublishedTrackListItem[]>;
}
