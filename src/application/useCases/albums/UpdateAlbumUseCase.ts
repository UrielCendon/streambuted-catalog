import { AuthenticatedUser } from "../../auth/AuthenticatedUser";
import { AppError } from "../../errors/AppError";
import { AuthorizationService } from "../../services/AuthorizationService";
import { Album } from "../../../domain/entities/Album";
import { AlbumRepository, UpdateAlbumInput } from "../../../domain/repositories/AlbumRepository";

export class UpdateAlbumUseCase {
  constructor(
    private readonly albumRepository: AlbumRepository,
    private readonly authorizationService: AuthorizationService
  ) {}

  public async execute(albumId: string, input: UpdateAlbumInput, user: AuthenticatedUser): Promise<Album> {
    const album = await this.albumRepository.findById(albumId);
    if (!album) {
      throw new AppError(404, "AlbumNotFound", "Album not found.");
    }

    this.authorizationService.assertArtistOwnership(user, album.artistId);

    if (!input.title && !input.coverAssetId) {
      throw new AppError(400, "ValidationError", "At least one album field must be provided.");
    }

    return this.albumRepository.update(albumId, input);
  }
}
