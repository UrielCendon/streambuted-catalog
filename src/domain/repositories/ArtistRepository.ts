import { Artist } from "../entities/Artist";
import { Pagination } from "../valueObjects/Pagination";

export interface CreateArtistInput {
  artistId?: string;
  displayName: string;
  biography?: string | null;
}

export interface UpsertPromotedArtistInput {
  artistId: string;
  displayName: string;
  biography?: string | null;
}

export interface UpdateArtistInput {
  displayName?: string;
  biography?: string | null;
}

export interface ArtistRepository {
  create(input: CreateArtistInput): Promise<Artist>;
  upsertPromotedArtist(input: UpsertPromotedArtistInput): Promise<Artist>;
  findById(artistId: string): Promise<Artist | null>;
  updateProfile(artistId: string, input: UpdateArtistInput): Promise<Artist>;
  existsById(artistId: string): Promise<boolean>;
  searchByDisplayName(query: string, pagination: Pagination): Promise<Artist[]>;
}
