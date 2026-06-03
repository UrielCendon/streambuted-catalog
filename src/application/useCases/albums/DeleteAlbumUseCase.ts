import { AuthenticatedUser } from "../../auth/AuthenticatedUser";
import { AppError } from "../../errors/AppError";
import { AuthorizationService } from "../../services/AuthorizationService";
import { CatalogEventRecorder } from "../../services/CatalogEventRecorder";
import { Album } from "../../../domain/entities/Album";
import { CatalogVisibilityReason } from "../../../domain/enums/CatalogVisibilityReason";
import { AlbumRepository } from "../../../domain/repositories/AlbumRepository";
import { TrackRepository } from "../../../domain/repositories/TrackRepository";

export class DeleteAlbumUseCase {
  constructor(
    private readonly albumRepository: AlbumRepository,
    private readonly trackRepository: TrackRepository,
    private readonly authorizationService: AuthorizationService,
    private readonly catalogEventRecorder?: CatalogEventRecorder
  ) {}

  public async execute(albumId: string, user: AuthenticatedUser): Promise<Album> {
    const album = await this.albumRepository.findById(albumId);
    if (!album) {
      throw new AppError(404, "AlbumNotFound", "El album no existe o ya no esta disponible.");
    }

    this.authorizationService.assertArtistOwnership(user, album.artistId);

    if (album.visibilityReason === CatalogVisibilityReason.ArtistDeleted) {
      return album;
    }

    const deletedAlbum = await this.albumRepository.markDeleted(albumId);
    await this.trackRepository.markDeletedByAlbum(albumId);
    await this.catalogEventRecorder?.recordAlbumSnapshot(deletedAlbum);
    return deletedAlbum;
  }
}
