import { AppError } from "../../errors/AppError";
import { Track } from "../../../domain/entities/Track";
import { CatalogStatus } from "../../../domain/enums/CatalogStatus";
import { TrackRepository } from "../../../domain/repositories/TrackRepository";

export class GetTrackByIdUseCase {
  constructor(private readonly trackRepository: TrackRepository) {}

  public async execute(trackId: string): Promise<Track> {
    const track = await this.trackRepository.findById(trackId);
    if (!track || track.status !== CatalogStatus.Publicado) {
      throw new AppError(404, "TrackNotFound", "Track not found.");
    }

    return track;
  }
}
