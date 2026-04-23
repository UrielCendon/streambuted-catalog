import { Track } from "../entities/Track";
import { CatalogStatus } from "../enums/CatalogStatus";
import { Pagination } from "../valueObjects/Pagination";

export interface CreateTrackInput {
  artistId: string;
  albumId?: string | null;
  title: string;
  audioAssetId: string;
  coverAssetId: string;
  status?: CatalogStatus;
}

export interface UpdateTrackInput {
  albumId?: string | null;
  title?: string;
  audioAssetId?: string;
  coverAssetId?: string;
}

export interface TrackRepository {
  create(input: CreateTrackInput): Promise<Track>;
  findById(trackId: string): Promise<Track | null>;
  update(trackId: string, input: UpdateTrackInput): Promise<Track>;
  retire(trackId: string): Promise<Track>;
  searchPublishedByTitle(query: string, pagination: Pagination): Promise<Track[]>;
  listByArtist(artistId: string, includeRetired: boolean): Promise<Track[]>;
}
