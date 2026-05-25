import { PublishedTrackListItem, TrackRepository } from "../../../domain/repositories/TrackRepository";

const MAX_BATCH_TRACK_IDS = 100;

export class ListPublishedTracksByIdsUseCase {
  constructor(private readonly trackRepository: TrackRepository) {}

  public async execute(trackIds: string[]): Promise<PublishedTrackListItem[]> {
    const uniqueTrackIds = [...new Set(trackIds)].slice(0, MAX_BATCH_TRACK_IDS);
    return this.trackRepository.listPublishedByIds(uniqueTrackIds);
  }
}
