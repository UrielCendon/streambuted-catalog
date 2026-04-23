import { AuthenticatedUser } from "../../auth/AuthenticatedUser";
import { AppError } from "../../errors/AppError";
import { AuthorizationService } from "../../services/AuthorizationService";
import { Track } from "../../../domain/entities/Track";
import { AlbumRepository } from "../../../domain/repositories/AlbumRepository";
import { TrackRepository, UpdateTrackInput } from "../../../domain/repositories/TrackRepository";

export class UpdateTrackUseCase {
  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly albumRepository: AlbumRepository,
    private readonly authorizationService: AuthorizationService
  ) {}

  public async execute(trackId: string, input: UpdateTrackInput, user: AuthenticatedUser): Promise<Track> {
    const track = await this.trackRepository.findById(trackId);
    if (!track) {
      throw new AppError(404, "TrackNotFound", "Track not found.");
    }

    this.authorizationService.assertArtistOwnership(user, track.artistId);

    if (
      input.title === undefined &&
      input.audioAssetId === undefined &&
      input.coverAssetId === undefined &&
      input.albumId === undefined
    ) {
      throw new AppError(400, "ValidationError", "At least one track field must be provided.");
    }

    if (input.albumId !== undefined && input.albumId !== null) {
      const album = await this.albumRepository.findById(input.albumId);
      if (!album) {
        throw new AppError(404, "AlbumNotFound", "Album not found.");
      }

      if (album.artistId !== track.artistId) {
        throw new AppError(400, "ValidationError", "The album does not belong to the track artist.");
      }
    }

    return this.trackRepository.update(trackId, input);
  }
}
