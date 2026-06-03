import { AuthenticatedUser } from "../../auth/AuthenticatedUser";
import { AppError } from "../../errors/AppError";
import { AuthorizationService } from "../../services/AuthorizationService";
import { CatalogEventRecorder } from "../../services/CatalogEventRecorder";
import { Track } from "../../../domain/entities/Track";
import { CatalogStatus } from "../../../domain/enums/CatalogStatus";
import { CatalogVisibilityReason } from "../../../domain/enums/CatalogVisibilityReason";
import { AlbumRepository } from "../../../domain/repositories/AlbumRepository";
import { TrackRepository } from "../../../domain/repositories/TrackRepository";

export class ReinstateTrackUseCase {
  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly albumRepository: AlbumRepository,
    private readonly authorizationService: AuthorizationService,
    private readonly catalogEventRecorder?: CatalogEventRecorder
  ) {}

  public async execute(trackId: string, user: AuthenticatedUser): Promise<Track> {
    const track = await this.trackRepository.findById(trackId);
    if (!track || track.visibilityReason === CatalogVisibilityReason.ArtistDeleted) {
      throw new AppError(404, "TrackNotFound", "La pista no existe o ya no esta disponible.");
    }

    this.authorizationService.assertAdminRole(user);

    if (track.status === CatalogStatus.Publicado) {
      return track;
    }

    if (track.visibilityReason !== CatalogVisibilityReason.AdminRetired) {
      throw new AppError(409, "TrackStateConflict", "La pista ya no esta disponible para esta accion.");
    }

    if (track.albumId) {
      const album = await this.albumRepository.findById(track.albumId);
      if (album?.status === CatalogStatus.Retirado) {
        throw new AppError(409, "TrackStateConflict", "La pista no puede reingresar mientras su album siga retirado.");
      }
    }

    const reinstatedTrack = await this.trackRepository.reinstate(trackId);
    await this.catalogEventRecorder?.recordTrackSnapshot(reinstatedTrack);
    return reinstatedTrack;
  }
}
