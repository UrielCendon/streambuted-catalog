import { Router } from "express";
import { CatalogController } from "../controllers/CatalogController";
import { RequestHandler } from "express-serve-static-core";
import { validateRequest } from "../middleware/ValidateRequest";
import {
  albumIdParamSchema,
  artistIdParamSchema,
  createAlbumSchema,
  createTrackInAlbumSchema,
  createTrackSchema,
  searchCatalogSchema,
  trackIdParamSchema,
  updateAlbumSchema,
  updateArtistProfileSchema,
  updateTrackSchema
} from "../schemas/CatalogSchemas";

export const buildCatalogRouter = (
  catalogController: CatalogController,
  authenticationMiddleware: RequestHandler
): Router => {
  const router = Router();

  router.get("/search", validateRequest(searchCatalogSchema), catalogController.searchCatalog);

  router.get("/artists/:artistId", validateRequest(artistIdParamSchema), catalogController.getArtistById);
  router.patch(
    "/artists/:artistId",
    authenticationMiddleware,
    validateRequest(updateArtistProfileSchema),
    catalogController.updateArtistProfile
  );
  router.get("/artists/:artistId/albums", validateRequest(artistIdParamSchema), catalogController.listArtistAlbums);
  router.get("/artists/:artistId/tracks", validateRequest(artistIdParamSchema), catalogController.listArtistTracks);

  router.get("/albums/:albumId", validateRequest(albumIdParamSchema), catalogController.getAlbumById);
  router.post("/albums", authenticationMiddleware, validateRequest(createAlbumSchema), catalogController.createAlbum);
  router.patch(
    "/albums/:albumId",
    authenticationMiddleware,
    validateRequest(updateAlbumSchema),
    catalogController.updateAlbum
  );
  router.put(
    "/albums/:albumId",
    authenticationMiddleware,
    validateRequest(updateAlbumSchema),
    catalogController.updateAlbum
  );
  router.patch(
    "/albums/:albumId/retire",
    authenticationMiddleware,
    validateRequest(albumIdParamSchema),
    catalogController.retireAlbum
  );
  router.post(
    "/albums/:albumId/tracks",
    authenticationMiddleware,
    validateRequest(createTrackInAlbumSchema),
    catalogController.createTrackInAlbum
  );

  router.get("/tracks/:trackId", validateRequest(trackIdParamSchema), catalogController.getTrackById);
  router.post("/tracks", authenticationMiddleware, validateRequest(createTrackSchema), catalogController.createTrack);
  router.patch(
    "/tracks/:trackId",
    authenticationMiddleware,
    validateRequest(updateTrackSchema),
    catalogController.updateTrack
  );
  router.put(
    "/tracks/:trackId",
    authenticationMiddleware,
    validateRequest(updateTrackSchema),
    catalogController.updateTrack
  );
  router.patch(
    "/tracks/:trackId/retire",
    authenticationMiddleware,
    validateRequest(trackIdParamSchema),
    catalogController.retireTrack
  );

  return router;
};
