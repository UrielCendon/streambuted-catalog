import { AuthenticatedUser } from "../../auth/AuthenticatedUser";
import { AppError } from "../../errors/AppError";
import { AuthorizationService } from "../../services/AuthorizationService";
import { Album } from "../../../domain/entities/Album";
import { CatalogStatus } from "../../../domain/enums/CatalogStatus";
import { AlbumRepository } from "../../../domain/repositories/AlbumRepository";

export class RetireAlbumUseCase {
  constructor(
    private readonly albumRepository: AlbumRepository,
    private readonly authorizationService: AuthorizationService
  ) {}

  public async execute(albumId: string, user: AuthenticatedUser): Promise<Album> {
    const album = await this.albumRepository.findById(albumId);
    if (!album) {
      throw new AppError(404, "AlbumNotFound", "Album not found.");
    }

    this.authorizationService.assertArtistOwnership(user, album.artistId);

    if (album.status === CatalogStatus.Retirado) {
      return album;
    }

    return this.albumRepository.retire(albumId);
  }
}
