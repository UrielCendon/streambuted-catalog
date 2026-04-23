import { AuthenticatedUser } from "../../auth/AuthenticatedUser";
import { AppError } from "../../errors/AppError";
import { AuthorizationService } from "../../services/AuthorizationService";
import { Album } from "../../../domain/entities/Album";
import { CatalogStatus } from "../../../domain/enums/CatalogStatus";
import { AlbumRepository } from "../../../domain/repositories/AlbumRepository";
import { ArtistRepository } from "../../../domain/repositories/ArtistRepository";

export interface CreateAlbumCommand {
  artistId: string;
  title: string;
  coverAssetId: string;
}

export class CreateAlbumUseCase {
  constructor(
    private readonly albumRepository: AlbumRepository,
    private readonly artistRepository: ArtistRepository,
    private readonly authorizationService: AuthorizationService
  ) {}

  public async execute(command: CreateAlbumCommand, user: AuthenticatedUser): Promise<Album> {
    this.authorizationService.assertArtistOwnership(user, command.artistId);

    const artistExists = await this.artistRepository.existsById(command.artistId);
    if (!artistExists) {
      throw new AppError(404, "ArtistNotFound", "Artist not found.");
    }

    return this.albumRepository.create({
      artistId: command.artistId,
      title: command.title,
      coverAssetId: command.coverAssetId,
      status: CatalogStatus.Publicado
    });
  }
}
