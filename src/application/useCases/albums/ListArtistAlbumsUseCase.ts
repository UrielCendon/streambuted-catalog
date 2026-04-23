import { Album } from "../../../domain/entities/Album";
import { AlbumRepository } from "../../../domain/repositories/AlbumRepository";

export class ListArtistAlbumsUseCase {
  constructor(private readonly albumRepository: AlbumRepository) {}

  public async execute(artistId: string, includeRetired = false): Promise<Album[]> {
    return this.albumRepository.listByArtist(artistId, includeRetired);
  }
}
