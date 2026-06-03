import { AuthenticatedUser } from "../../auth/AuthenticatedUser";
import { AppError } from "../../errors/AppError";
import { AuthorizationService } from "../../services/AuthorizationService";
import { CatalogEventRecorder } from "../../services/CatalogEventRecorder";
import { Album } from "../../../domain/entities/Album";
import { CatalogStatus } from "../../../domain/enums/CatalogStatus";
import { CatalogVisibilityReason } from "../../../domain/enums/CatalogVisibilityReason";
import { AlbumRepository } from "../../../domain/repositories/AlbumRepository";
import { TrackRepository } from "../../../domain/repositories/TrackRepository";

export class ReinstateAlbumUseCase {
  constructor(
    private readonly albumRepository: AlbumRepository,
    private readonly trackRepository: TrackRepository,
    private readonly authorizationService: AuthorizationService,
    private readonly catalogEventRecorder?: CatalogEventRecorder
  ) {}

  public async execute(albumId: string, user: AuthenticatedUser): Promise<Album> {
    const album = await this.albumRepository.findById(albumId);
    if (!album || album.visibilityReason === CatalogVisibilityReason.ArtistDeleted) {
      throw new AppError(404, "AlbumNotFound", "El album no existe o ya no esta disponible.");
    }

    this.authorizationService.assertAdminRole(user);

    if (album.status === CatalogStatus.Publicado) {
      await this.trackRepository.reinstateByAlbum(albumId);
      return album;
    }

    if (album.visibilityReason !== CatalogVisibilityReason.AdminRetired) {
      throw new AppError(409, "AlbumStateConflict", "El album ya no esta disponible para esta accion.");
    }

    const reinstatedAlbum = await this.albumRepository.reinstate(albumId);
    await this.trackRepository.reinstateByAlbum(albumId);
    await this.catalogEventRecorder?.recordAlbumSnapshot(reinstatedAlbum);
    return reinstatedAlbum;
  }
}
