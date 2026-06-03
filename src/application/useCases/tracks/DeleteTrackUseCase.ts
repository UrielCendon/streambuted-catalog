import { AuthenticatedUser } from "../../auth/AuthenticatedUser";
import { AppError } from "../../errors/AppError";
import { AuthorizationService } from "../../services/AuthorizationService";
import { CatalogEventRecorder } from "../../services/CatalogEventRecorder";
import { Track } from "../../../domain/entities/Track";
import { CatalogVisibilityReason } from "../../../domain/enums/CatalogVisibilityReason";
import { TrackRepository } from "../../../domain/repositories/TrackRepository";

export class DeleteTrackUseCase {
  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly authorizationService: AuthorizationService,
    private readonly catalogEventRecorder?: CatalogEventRecorder
  ) {}

  public async execute(trackId: string, user: AuthenticatedUser): Promise<Track> {
    const track = await this.trackRepository.findById(trackId);
    if (!track) {
      throw new AppError(404, "TrackNotFound", "La pista no existe o ya no esta disponible.");
    }

    this.authorizationService.assertArtistOwnership(user, track.artistId);

    if (track.visibilityReason === CatalogVisibilityReason.ArtistDeleted) {
      return track;
    }

    const deletedTrack = await this.trackRepository.markDeleted(trackId);
    await this.catalogEventRecorder?.recordTrackSnapshot(deletedTrack);
    return deletedTrack;
  }
}
