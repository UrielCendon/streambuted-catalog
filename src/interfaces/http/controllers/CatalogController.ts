import { NextFunction, Request, Response } from "express";
import { GetArtistByIdUseCase } from "../../../application/useCases/artists/GetArtistByIdUseCase";
import { UpdateArtistProfileUseCase } from "../../../application/useCases/artists/UpdateArtistProfileUseCase";
import { CreateAlbumUseCase } from "../../../application/useCases/albums/CreateAlbumUseCase";
import { GetAlbumByIdUseCase } from "../../../application/useCases/albums/GetAlbumByIdUseCase";
import { ListArtistAlbumsUseCase } from "../../../application/useCases/albums/ListArtistAlbumsUseCase";
import { RetireAlbumUseCase } from "../../../application/useCases/albums/RetireAlbumUseCase";
import { UpdateAlbumUseCase } from "../../../application/useCases/albums/UpdateAlbumUseCase";
import { SearchCatalogUseCase } from "../../../application/useCases/catalog/SearchCatalogUseCase";
import { CreateTrackUseCase } from "../../../application/useCases/tracks/CreateTrackUseCase";
import { GetTrackByIdUseCase } from "../../../application/useCases/tracks/GetTrackByIdUseCase";
import { ListArtistTracksUseCase } from "../../../application/useCases/tracks/ListArtistTracksUseCase";
import { RetireTrackUseCase } from "../../../application/useCases/tracks/RetireTrackUseCase";
import { UpdateTrackUseCase } from "../../../application/useCases/tracks/UpdateTrackUseCase";
import { AppError } from "../../../application/errors/AppError";

interface CatalogControllerDependencies {
  searchCatalogUseCase: SearchCatalogUseCase;
  createAlbumUseCase: CreateAlbumUseCase;
  updateAlbumUseCase: UpdateAlbumUseCase;
  retireAlbumUseCase: RetireAlbumUseCase;
  getAlbumByIdUseCase: GetAlbumByIdUseCase;
  listArtistAlbumsUseCase: ListArtistAlbumsUseCase;
  createTrackUseCase: CreateTrackUseCase;
  updateTrackUseCase: UpdateTrackUseCase;
  retireTrackUseCase: RetireTrackUseCase;
  getTrackByIdUseCase: GetTrackByIdUseCase;
  listArtistTracksUseCase: ListArtistTracksUseCase;
  getArtistByIdUseCase: GetArtistByIdUseCase;
  updateArtistProfileUseCase: UpdateArtistProfileUseCase;
}

export class CatalogController {
  constructor(private readonly dependencies: CatalogControllerDependencies) {}

  public searchCatalog = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const query = request.query.q as string;
      const limit = Number(request.query.limit ?? 20);
      const offset = Number(request.query.offset ?? 0);

      const result = await this.dependencies.searchCatalogUseCase.execute({
        query,
        limit,
        offset
      });

      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public createAlbum = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const authenticatedUser = request.authenticatedUser;
      if (!authenticatedUser) {
        throw new AppError(401, "Unauthorized", "Authentication is required.");
      }

      const album = await this.dependencies.createAlbumUseCase.execute(
        {
          artistId: authenticatedUser.subject,
          title: request.body.title,
          coverAssetId: request.body.coverAssetId ?? request.body.cover_asset_id
        },
        authenticatedUser
      );
      response.status(201).json(album);
    } catch (error) {
      next(error);
    }
  };

  public updateAlbum = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const authenticatedUser = request.authenticatedUser;
      if (!authenticatedUser) {
        throw new AppError(401, "Unauthorized", "Authentication is required.");
      }

      const album = await this.dependencies.updateAlbumUseCase.execute(
        request.params.albumId,
        {
          title: request.body.title,
          coverAssetId: request.body.coverAssetId ?? request.body.cover_asset_id
        },
        authenticatedUser
      );
      response.status(200).json(album);
    } catch (error) {
      next(error);
    }
  };

  public retireAlbum = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const authenticatedUser = request.authenticatedUser;
      if (!authenticatedUser) {
        throw new AppError(401, "Unauthorized", "Authentication is required.");
      }

      const album = await this.dependencies.retireAlbumUseCase.execute(request.params.albumId, authenticatedUser);
      response.status(200).json(album);
    } catch (error) {
      next(error);
    }
  };

  public getAlbumById = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const album = await this.dependencies.getAlbumByIdUseCase.execute(request.params.albumId);
      response.status(200).json(album);
    } catch (error) {
      next(error);
    }
  };

  public listArtistAlbums = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const albums = await this.dependencies.listArtistAlbumsUseCase.execute(request.params.artistId, false);
      response.status(200).json(albums);
    } catch (error) {
      next(error);
    }
  };

  public createTrack = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const authenticatedUser = request.authenticatedUser;
      if (!authenticatedUser) {
        throw new AppError(401, "Unauthorized", "Authentication is required.");
      }

      const createdTrack = await this.dependencies.createTrackUseCase.execute(
        {
          artistId: authenticatedUser.subject,
          albumId: request.body.albumId ?? request.body.album_id,
          title: request.body.title,
          audioAssetId: request.body.audioAssetId ?? request.body.audio_asset_id,
          coverAssetId: request.body.coverAssetId ?? request.body.cover_asset_id
        },
        authenticatedUser
      );
      response.status(201).json(createdTrack);
    } catch (error) {
      next(error);
    }
  };

  public createTrackInAlbum = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const authenticatedUser = request.authenticatedUser;
      if (!authenticatedUser) {
        throw new AppError(401, "Unauthorized", "Authentication is required.");
      }

      const createdTrack = await this.dependencies.createTrackUseCase.execute(
        {
          artistId: authenticatedUser.subject,
          albumId: request.params.albumId,
          title: request.body.title,
          audioAssetId: request.body.audioAssetId ?? request.body.audio_asset_id,
          coverAssetId: request.body.coverAssetId ?? request.body.cover_asset_id
        },
        authenticatedUser
      );
      response.status(201).json(createdTrack);
    } catch (error) {
      next(error);
    }
  };

  public updateTrack = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const authenticatedUser = request.authenticatedUser;
      if (!authenticatedUser) {
        throw new AppError(401, "Unauthorized", "Authentication is required.");
      }

      const track = await this.dependencies.updateTrackUseCase.execute(
        request.params.trackId,
        {
          albumId: request.body.albumId ?? request.body.album_id,
          title: request.body.title,
          audioAssetId: request.body.audioAssetId ?? request.body.audio_asset_id,
          coverAssetId: request.body.coverAssetId ?? request.body.cover_asset_id
        },
        authenticatedUser
      );
      response.status(200).json(track);
    } catch (error) {
      next(error);
    }
  };

  public retireTrack = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const authenticatedUser = request.authenticatedUser;
      if (!authenticatedUser) {
        throw new AppError(401, "Unauthorized", "Authentication is required.");
      }

      const track = await this.dependencies.retireTrackUseCase.execute(request.params.trackId, authenticatedUser);
      response.status(200).json(track);
    } catch (error) {
      next(error);
    }
  };

  public getTrackById = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const track = await this.dependencies.getTrackByIdUseCase.execute(request.params.trackId);
      response.status(200).json(track);
    } catch (error) {
      next(error);
    }
  };

  public listArtistTracks = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const tracks = await this.dependencies.listArtistTracksUseCase.execute(request.params.artistId, false);
      response.status(200).json(tracks);
    } catch (error) {
      next(error);
    }
  };

  public getArtistById = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const artist = await this.dependencies.getArtistByIdUseCase.execute(request.params.artistId);
      response.status(200).json(artist);
    } catch (error) {
      next(error);
    }
  };

  public updateArtistProfile = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const authenticatedUser = request.authenticatedUser;
      if (!authenticatedUser) {
        throw new AppError(401, "Unauthorized", "Authentication is required.");
      }

      const artist = await this.dependencies.updateArtistProfileUseCase.execute(
        request.params.artistId,
        {
          displayName: request.body.displayName ?? request.body.display_name,
          biography: request.body.biography
        },
        authenticatedUser
      );
      response.status(200).json(artist);
    } catch (error) {
      next(error);
    }
  };
}
