import { createApplication } from "./app";
import { logger } from "./infrastructure/logging/logger";
import { prismaClient } from "./infrastructure/prisma/prismaClient";
import {
  startCatalogPlaybackGrpcServer,
  stopCatalogPlaybackGrpcServer
} from "./interfaces/grpc/CatalogPlaybackGrpcServer";

const HTTP_PORT = Number(process.env.PORT ?? 8082);
const CATALOG_GRPC_PORT = Number(process.env.CATALOG_GRPC_PORT ?? 9092);

const bootstrap = async (): Promise<void> => {
  const { app, identityPromotionConsumer, catalogOutboxProcessor, catalogPlaybackGrpcServer } = createApplication();

  void identityPromotionConsumer.start();
  catalogOutboxProcessor.start();
  await startCatalogPlaybackGrpcServer(catalogPlaybackGrpcServer, CATALOG_GRPC_PORT);
  logger.info(`Catalog Playback gRPC server running on port ${CATALOG_GRPC_PORT}`);

  const server = app.listen(HTTP_PORT, () => {
    logger.info(`Catalog Service running on port ${HTTP_PORT}`);
  });

  const shutdown = async (): Promise<void> => {
    logger.info("Shutting down Catalog Service...");
    server.close(async (error) => {
      if (error) {
        logger.error("Catalog Service failed to close HTTP server cleanly.", error);
      }

      await stopCatalogPlaybackGrpcServer(catalogPlaybackGrpcServer);
      await identityPromotionConsumer.stop();
      catalogOutboxProcessor.stop();
      await prismaClient.$disconnect();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });
};

bootstrap().catch(async (error) => {
  logger.error("Catalog Service failed to start:", error);
  await prismaClient.$disconnect();
  process.exit(1);
});
