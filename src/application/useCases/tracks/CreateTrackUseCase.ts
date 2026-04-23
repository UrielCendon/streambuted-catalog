import { AuthenticatedUser } from "../../auth/AuthenticatedUser";
import { AppError } from "../../errors/AppError";
import { AuthorizationService } from "../../services/AuthorizationService";
import { Track } from "../../../domain/entities/Track";
import { CatalogStatus } from "../../../domain/enums/CatalogStatus";
import { AlbumRepository } from "../../../domain/repositories/AlbumRepository";
import { ArtistRepository } from "../../../domain/repositories/ArtistRepository";
import { TrackRepository } from "../../../domain/repositories/TrackRepository";

export interface CreateTrackCommand {
  artistId: string;
  albumId?: string | null;
  title: string;
  audioAssetId: string;
  coverAssetId: string;
}

export class CreateTrackUseCase {
  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly artistRepository: ArtistRepository,
    private readonly albumRepository: AlbumRepository,
    private readonly authorizationService: AuthorizationService
  ) {}

  public async execute(command: CreateTrackCommand, user: AuthenticatedUser): Promise<Track> {
    this.authorizationService.assertArtistOwnership(user, command.artistId);

    const artistExists = await this.artistRepository.existsById(command.artistId);
    if (!artistExists) {
      throw new AppError(404, "ArtistNotFound", "Artist not found.");
    }

    if (command.albumId) {
      const album = await this.albumRepository.findById(command.albumId);
      if (!album) {
        throw new AppError(404, "AlbumNotFound", "Album not found.");
      }

      if (album.artistId !== command.artistId) {
        throw new AppError(400, "ValidationError", "The album does not belong to the specified artist.");
      }
    }

    return this.trackRepository.create({
      artistId: command.artistId,
      albumId: command.albumId ?? null,
      title: command.title,
      audioAssetId: command.audioAssetId,
      coverAssetId: command.coverAssetId,
      status: CatalogStatus.Publicado
    });
  }
}
