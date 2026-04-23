import { createApplication } from "./app";
import { prismaClient } from "./infrastructure/prisma/prismaClient";

const port = Number(process.env.PORT ?? 8082);

const bootstrap = async (): Promise<void> => {
  const { app, identityPromotionConsumer } = createApplication();

  void identityPromotionConsumer.start();

  const server = app.listen(port, () => {
    console.log(`Catalog Service running on port ${port}`);
  });

  const shutdown = async (): Promise<void> => {
    console.log("Shutting down Catalog Service...");
    server.close(async () => {
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
