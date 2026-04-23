import { AuthenticatedUser } from "../../auth/AuthenticatedUser";
import { AppError } from "../../errors/AppError";
import { AuthorizationService } from "../../services/AuthorizationService";
import { Artist } from "../../../domain/entities/Artist";
import { ArtistRepository, UpdateArtistInput } from "../../../domain/repositories/ArtistRepository";

export class UpdateArtistProfileUseCase {
  constructor(
    private readonly artistRepository: ArtistRepository,
    private readonly authorizationService: AuthorizationService
  ) {}

  public async execute(artistId: string, input: UpdateArtistInput, user: AuthenticatedUser): Promise<Artist> {
    this.authorizationService.assertArtistOwnership(user, artistId);

    const artistExists = await this.artistRepository.existsById(artistId);
    if (!artistExists) {
      throw new AppError(404, "ArtistNotFound", "Artist not found.");
    }

    if (!input.displayName && input.biography === undefined) {
      throw new AppError(400, "ValidationError", "At least one artist profile field must be provided.");
    }

    return this.artistRepository.updateProfile(artistId, input);
  }
}
