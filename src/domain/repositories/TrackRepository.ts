import { Track } from "../entities/Track";
import { CatalogStatus } from "../enums/CatalogStatus";
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
  retire(trackId: string): Promise<Track>;
  detachAlbum(albumId: string): Promise<number>;
  searchPublishedByTitle(query: string, pagination: Pagination): Promise<Track[]>;
  countAllForAdmin(includeRetired: boolean): Promise<number>;
  listAllForAdmin(includeRetired: boolean, pagination: Pagination): Promise<AdminTrackListItem[]>;
  listByArtist(artistId: string, includeRetired: boolean): Promise<Track[]>;
  listPublishedByAlbum(albumId: string): Promise<Track[]>;
  listPublishedByIds(trackIds: string[]): Promise<PublishedTrackListItem[]>;
}
