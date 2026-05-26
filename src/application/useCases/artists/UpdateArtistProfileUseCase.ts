import { AuthenticatedUser } from "../../auth/AuthenticatedUser";
import { AppError } from "../../errors/AppError";
import { AuthorizationService } from "../../services/AuthorizationService";
import {
  assertMediaAssetMatches,
  MediaAssetValidator
} from "../../services/MediaAssetValidator";
import { CatalogEventRecorder } from "../../services/CatalogEventRecorder";
import { Artist } from "../../../domain/entities/Artist";
import { ArtistRepository, UpdateArtistInput } from "../../../domain/repositories/ArtistRepository";

export class UpdateArtistProfileUseCase {
  constructor(
    private readonly artistRepository: ArtistRepository,
    private readonly authorizationService: AuthorizationService,
    private readonly mediaAssetValidator?: MediaAssetValidator,
    private readonly catalogEventRecorder?: CatalogEventRecorder
  ) {}

  public async execute(artistId: string, input: UpdateArtistInput, user: AuthenticatedUser): Promise<Artist> {
    this.authorizationService.assertArtistOwnership(user, artistId);

    const artistExists = await this.artistRepository.existsById(artistId);
    if (!artistExists) {
      throw new AppError(404, "ArtistNotFound", "El perfil de artista no existe.");
    }

    if (!input.displayName && input.biography === undefined && input.profileImageAssetId === undefined) {
      throw new AppError(400, "ValidationError", "Debes enviar al menos un campo del perfil de artista.");
    }

    if (input.profileImageAssetId) {
      await assertMediaAssetMatches(
        this.mediaAssetValidator,
        input.profileImageAssetId,
        "PROFILE_IMAGE",
        user.subject,
        user.authorizationHeader
      );
    }

    const updatedArtist = await this.artistRepository.updateProfile(artistId, input);
    await this.catalogEventRecorder?.recordArtistSnapshot(updatedArtist);
    return updatedArtist;
  }
}
