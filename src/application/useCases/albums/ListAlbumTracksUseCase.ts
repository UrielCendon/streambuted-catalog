import { AppError } from "../../errors/AppError";
import { Track } from "../../../domain/entities/Track";
import { CatalogStatus } from "../../../domain/enums/CatalogStatus";
import { AlbumRepository } from "../../../domain/repositories/AlbumRepository";
import { TrackRepository } from "../../../domain/repositories/TrackRepository";

export class ListAlbumTracksUseCase {
  constructor(
    private readonly albumRepository: AlbumRepository,
    private readonly trackRepository: TrackRepository
  ) {}

  public async execute(albumId: string): Promise<Track[]> {
    const album = await this.albumRepository.findById(albumId);
    if (!album || album.status !== CatalogStatus.Publicado) {
      throw new AppError(404, "AlbumNotFound", "El album no existe o ya no esta disponible.");
    }

    return this.trackRepository.listPublishedByAlbum(albumId);
  }
}
