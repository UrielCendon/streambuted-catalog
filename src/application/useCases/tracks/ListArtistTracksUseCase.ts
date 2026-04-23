import { Track } from "../../../domain/entities/Track";
import { TrackRepository } from "../../../domain/repositories/TrackRepository";

export class ListArtistTracksUseCase {
  constructor(private readonly trackRepository: TrackRepository) {}

  public async execute(artistId: string, includeRetired = false): Promise<Track[]> {
    return this.trackRepository.listByArtist(artistId, includeRetired);
  }
}
