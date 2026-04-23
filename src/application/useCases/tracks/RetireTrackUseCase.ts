import { AuthenticatedUser } from "../../auth/AuthenticatedUser";
import { AppError } from "../../errors/AppError";
import { AuthorizationService } from "../../services/AuthorizationService";
import { Track } from "../../../domain/entities/Track";
import { CatalogStatus } from "../../../domain/enums/CatalogStatus";
import { TrackRepository } from "../../../domain/repositories/TrackRepository";

export class RetireTrackUseCase {
  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly authorizationService: AuthorizationService
  ) {}

  public async execute(trackId: string, user: AuthenticatedUser): Promise<Track> {
    const track = await this.trackRepository.findById(trackId);
    if (!track) {
      throw new AppError(404, "TrackNotFound", "Track not found.");
    }

    this.authorizationService.assertArtistOwnership(user, track.artistId);

    if (track.status === CatalogStatus.Retirado) {
      return track;
    }

    return this.trackRepository.retire(trackId);
  }
}
