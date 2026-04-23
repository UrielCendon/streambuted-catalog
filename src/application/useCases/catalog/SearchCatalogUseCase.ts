import { Artist } from "../../../domain/entities/Artist";
import { Album } from "../../../domain/entities/Album";
import { Track } from "../../../domain/entities/Track";
import { AlbumRepository } from "../../../domain/repositories/AlbumRepository";
import { ArtistRepository } from "../../../domain/repositories/ArtistRepository";
import { TrackRepository } from "../../../domain/repositories/TrackRepository";

export interface SearchCatalogQuery {
  query: string;
  limit: number;
  offset: number;
}

export interface SearchCatalogResult {
  artists: Artist[];
  albums: Album[];
  tracks: Track[];
}

export class SearchCatalogUseCase {
  constructor(
    private readonly artistRepository: ArtistRepository,
    private readonly albumRepository: AlbumRepository,
    private readonly trackRepository: TrackRepository
  ) {}

  public async execute(searchQuery: SearchCatalogQuery): Promise<SearchCatalogResult> {
    const pagination = { limit: searchQuery.limit, offset: searchQuery.offset };

    const [artists, albums, tracks] = await Promise.all([
      this.artistRepository.searchByDisplayName(searchQuery.query, pagination),
      this.albumRepository.searchPublishedByTitle(searchQuery.query, pagination),
      this.trackRepository.searchPublishedByTitle(searchQuery.query, pagination)
    ]);

    return { artists, albums, tracks };
  }
}
