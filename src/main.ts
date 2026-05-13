import { createApplication } from "./app";
import { prismaClient } from "./infrastructure/prisma/prismaClient";
import {
  startCatalogPlaybackGrpcServer,
  stopCatalogPlaybackGrpcServer
} from "./interfaces/grpc/CatalogPlaybackGrpcServer";

const port = Number(process.env.PORT ?? 8082);
const catalogGrpcPort = Number(process.env.CATALOG_GRPC_PORT ?? 9092);

const bootstrap = async (): Promise<void> => {
  const { app, identityPromotionConsumer, catalogPlaybackGrpcServer } = createApplication();

  void identityPromotionConsumer.start();
  await startCatalogPlaybackGrpcServer(catalogPlaybackGrpcServer, catalogGrpcPort);
  console.log(`Catalog Playback gRPC server running on port ${catalogGrpcPort}`);

  const server = app.listen(port, () => {
    console.log(`Catalog Service running on port ${port}`);
  });

  const shutdown = async (): Promise<void> => {
    console.log("Shutting down Catalog Service...");
    server.close(async () => {
      await stopCatalogPlaybackGrpcServer(catalogPlaybackGrpcServer);
      await identityPromotionConsumer.stop();
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
  console.error("Catalog Service failed to start:", error);
  await prismaClient.$disconnect();
  process.exit(1);
});
