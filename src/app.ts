import cors from "cors";
import dotenv from "dotenv";
import express, { Express } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { AuthorizationService } from "./application/services/AuthorizationService";
import { CreateAlbumUseCase } from "./application/useCases/albums/CreateAlbumUseCase";
import { GetAlbumByIdUseCase } from "./application/useCases/albums/GetAlbumByIdUseCase";
import { ListArtistAlbumsUseCase } from "./application/useCases/albums/ListArtistAlbumsUseCase";
import { RetireAlbumUseCase } from "./application/useCases/albums/RetireAlbumUseCase";
import { UpdateAlbumUseCase } from "./application/useCases/albums/UpdateAlbumUseCase";
import { GetArtistByIdUseCase } from "./application/useCases/artists/GetArtistByIdUseCase";
import { HandleUserPromotedUseCase } from "./application/useCases/artists/HandleUserPromotedUseCase";
import { UpdateArtistProfileUseCase } from "./application/useCases/artists/UpdateArtistProfileUseCase";
import { SearchCatalogUseCase } from "./application/useCases/catalog/SearchCatalogUseCase";
import { CreateTrackUseCase } from "./application/useCases/tracks/CreateTrackUseCase";
import { GetTrackByIdUseCase } from "./application/useCases/tracks/GetTrackByIdUseCase";
import { ListArtistTracksUseCase } from "./application/useCases/tracks/ListArtistTracksUseCase";
import { RetireTrackUseCase } from "./application/useCases/tracks/RetireTrackUseCase";
import { UpdateTrackUseCase } from "./application/useCases/tracks/UpdateTrackUseCase";
import { IdentityPromotionConsumer } from "./infrastructure/messaging/IdentityPromotionConsumer";
import { prismaClient } from "./infrastructure/prisma/prismaClient";
import { PrismaAlbumRepository } from "./infrastructure/repositories/PrismaAlbumRepository";
import { PrismaArtistRepository } from "./infrastructure/repositories/PrismaArtistRepository";
import { PrismaTrackRepository } from "./infrastructure/repositories/PrismaTrackRepository";
import { CatalogController } from "./interfaces/http/controllers/CatalogController";
import { createAuthenticationMiddleware } from "./interfaces/http/middleware/AuthenticationMiddleware";
import { errorHandlerMiddleware, notFoundMiddleware } from "./interfaces/http/middleware/ErrorHandlerMiddleware";
import { buildCatalogRouter } from "./interfaces/http/routes/CatalogRoutes";

dotenv.config();

const parseAllowedOrigins = (): string[] => {
  const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (configuredOrigins.length === 0 || configuredOrigins.includes("*")) {
    throw new Error("Invalid CORS_ALLOWED_ORIGINS: define explicit origins and avoid wildcard '*'.");
  }

  return configuredOrigins;
};

export interface ApplicationContext {
  app: Express;
  identityPromotionConsumer: IdentityPromotionConsumer;
}

export const createApplication = (): ApplicationContext => {
  const jwtSecret = process.env.JWT_SECRET;
  const allowedOrigins = parseAllowedOrigins();

  if (!jwtSecret || jwtSecret.trim().length === 0) {
    throw new Error("Missing required environment variable: JWT_SECRET");
  }

  if (jwtSecret.trim().length < 64) {
    throw new Error("Invalid JWT_SECRET: HS512 requires at least 64 characters.");
  }

  const artistRepository = new PrismaArtistRepository(prismaClient);
  const albumRepository = new PrismaAlbumRepository(prismaClient);
  const trackRepository = new PrismaTrackRepository(prismaClient);

  const authorizationService = new AuthorizationService();

  const createAlbumUseCase = new CreateAlbumUseCase(albumRepository, artistRepository, authorizationService);
  const getAlbumByIdUseCase = new GetAlbumByIdUseCase(albumRepository);
  const updateAlbumUseCase = new UpdateAlbumUseCase(albumRepository, authorizationService);
  const retireAlbumUseCase = new RetireAlbumUseCase(albumRepository, authorizationService);
  const listArtistAlbumsUseCase = new ListArtistAlbumsUseCase(albumRepository);

  const createTrackUseCase = new CreateTrackUseCase(trackRepository, artistRepository, albumRepository, authorizationService);
  const getTrackByIdUseCase = new GetTrackByIdUseCase(trackRepository);
  const updateTrackUseCase = new UpdateTrackUseCase(trackRepository, albumRepository, authorizationService);
  const retireTrackUseCase = new RetireTrackUseCase(trackRepository, authorizationService);
  const listArtistTracksUseCase = new ListArtistTracksUseCase(trackRepository);

  const getArtistByIdUseCase = new GetArtistByIdUseCase(artistRepository);
  const updateArtistProfileUseCase = new UpdateArtistProfileUseCase(artistRepository, authorizationService);

  const searchCatalogUseCase = new SearchCatalogUseCase(artistRepository, albumRepository, trackRepository);
  const handleUserPromotedUseCase = new HandleUserPromotedUseCase(artistRepository);

  const catalogController = new CatalogController({
    searchCatalogUseCase,
    createAlbumUseCase,
    updateAlbumUseCase,
    retireAlbumUseCase,
    getAlbumByIdUseCase,
    listArtistAlbumsUseCase,
    createTrackUseCase,
    updateTrackUseCase,
    retireTrackUseCase,
    getTrackByIdUseCase,
    listArtistTracksUseCase,
    getArtistByIdUseCase,
    updateArtistProfileUseCase
  });

  const app = express();
  app.use(helmet());
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", ...allowedOrigins],
        connectSrc: ["'self'", ...allowedOrigins],
        imgSrc: ["'self'", 'data:' ],
        styleSrc: ["'self'", 'https:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"]
      }
    })
  );
  app.use(cors({
    origin: allowedOrigins,
    credentials: true
  }));
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("combined"));

  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  app.get("/api/v1/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  const authenticationMiddleware = createAuthenticationMiddleware(jwtSecret);
  const catalogRouter = buildCatalogRouter(catalogController, authenticationMiddleware);
  app.use("/catalog", catalogRouter);
  app.use("/api/v1/catalog", catalogRouter);
  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  const identityPromotionConsumer = new IdentityPromotionConsumer(
    process.env.RABBITMQ_URL ?? "amqp://guest:guest@localhost:5672",
    process.env.RABBITMQ_USER_PROMOTED_QUEUE ?? "catalog.user.promoted",
    handleUserPromotedUseCase
  );

  return {
    app,
    identityPromotionConsumer
  };
};
