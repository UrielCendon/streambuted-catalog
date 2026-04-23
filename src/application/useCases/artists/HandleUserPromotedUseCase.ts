import { Artist } from "../../../domain/entities/Artist";
import { ArtistRepository } from "../../../domain/repositories/ArtistRepository";

export interface UserPromotedEvent {
  eventId?: string;
  userId: string;
  email?: string;
  username?: string;
  previousRole?: string;
  newRole?: string;
  promotedAt?: string;
}

export class HandleUserPromotedUseCase {
  constructor(private readonly artistRepository: ArtistRepository) {}

  public async execute(event: UserPromotedEvent): Promise<Artist> {
    const displayName = this.resolveDisplayName(event);
    return this.artistRepository.upsertPromotedArtist({
      artistId: event.userId,
      displayName,
      biography: null
    });
  }

  private resolveDisplayName(event: UserPromotedEvent): string {
    const normalizedUsername = event.username?.trim();
    if (normalizedUsername) {
      return normalizedUsername;
    }

    const normalizedEmail = event.email?.trim();
    if (normalizedEmail) {
      const localPart = normalizedEmail.split("@")[0]?.trim();
      if (localPart) {
        return localPart;
      }
    }

    return `artist-${event.userId.slice(0, 8)}`;
  }
}
