import { AppError } from "../../errors/AppError";
import { Artist } from "../../../domain/entities/Artist";
import { ArtistRepository } from "../../../domain/repositories/ArtistRepository";

export class GetArtistByIdUseCase {
  constructor(private readonly artistRepository: ArtistRepository) {}

  public async execute(artistId: string): Promise<Artist> {
    const artist = await this.artistRepository.findById(artistId);
    if (!artist) {
      throw new AppError(404, "ArtistNotFound", "Artist not found.");
    }

    return artist;
  }
}
