import { AuthenticatedUser } from "../../auth/AuthenticatedUser";
import { AppError } from "../../errors/AppError";
import { AuthorizationService } from "../../services/AuthorizationService";
import {
  assertMediaAssetMatches,
  MediaAssetValidator
} from "../../services/MediaAssetValidator";
import { CatalogEventRecorder } from "../../services/CatalogEventRecorder";
import { Album } from "../../../domain/entities/Album";
import { AlbumRepository, UpdateAlbumInput } from "../../../domain/repositories/AlbumRepository";

export class UpdateAlbumUseCase {
  constructor(
    private readonly albumRepository: AlbumRepository,
    private readonly authorizationService: AuthorizationService,
    private readonly mediaAssetValidator?: MediaAssetValidator,
    private readonly catalogEventRecorder?: CatalogEventRecorder
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

    if (input.coverAssetId) {
      await assertMediaAssetMatches(
        this.mediaAssetValidator,
        input.coverAssetId,
        "ALBUM_COVER",
        user.subject,
        user.authorizationHeader
      );
    }

    const updatedAlbum = await this.albumRepository.update(albumId, input);
    await this.catalogEventRecorder?.recordAlbumSnapshot(updatedAlbum);
    return updatedAlbum;
  }
}
