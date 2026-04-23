import { AppError } from "../../errors/AppError";
import { Album } from "../../../domain/entities/Album";
import { CatalogStatus } from "../../../domain/enums/CatalogStatus";
import { AlbumRepository } from "../../../domain/repositories/AlbumRepository";

export class GetAlbumByIdUseCase {
  constructor(private readonly albumRepository: AlbumRepository) {}

  public async execute(albumId: string): Promise<Album> {
    const album = await this.albumRepository.findById(albumId);
    if (!album || album.status !== CatalogStatus.Publicado) {
      throw new AppError(404, "AlbumNotFound", "Album not found.");
    }

    return album;
  }
}
