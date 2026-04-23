import { HandleUserPromotedUseCase } from "../../../../src/application/useCases/artists/HandleUserPromotedUseCase";
import { IdentityPromotionConsumer } from "../../../../src/infrastructure/messaging/IdentityPromotionConsumer";

describe("IdentityPromotionConsumer", () => {
  it("processes outbox-style messages with nested payload objects", async () => {
    const handleUserPromotedUseCase = {
      execute: jest.fn().mockResolvedValue(undefined)
    } as unknown as HandleUserPromotedUseCase;

    const consumer = new IdentityPromotionConsumer(
      "amqp://guest:guest@localhost:5672",
      "catalog.user.promoted",
      handleUserPromotedUseCase
    );

    const channel = {
      ack: jest.fn(),
      nack: jest.fn()
    };

    (consumer as unknown as { channel: unknown }).channel = channel;

    const message = {
      content: Buffer.from(
        JSON.stringify({
          payload: {
            eventId: "6de42d7d-24bc-466f-8908-7acfece7f77e",
            userId: "9d0c95ba-5fa2-43ee-a8dd-49a151ed36cb",
            email: "artist@streambuted.dev",
            username: "artist",
            previousRole: "listener",
            newRole: "artist",
            promotedAt: "2026-04-22T12:00:00Z"
          }
        })
      )
    };

    await (consumer as unknown as { handleMessage: (message: unknown) => Promise<void> }).handleMessage(message);

    expect(handleUserPromotedUseCase.execute).toHaveBeenCalledWith({
      eventId: "6de42d7d-24bc-466f-8908-7acfece7f77e",
      userId: "9d0c95ba-5fa2-43ee-a8dd-49a151ed36cb",
      email: "artist@streambuted.dev",
      username: "artist",
      previousRole: "listener",
      newRole: "artist",
      promotedAt: "2026-04-22T12:00:00Z"
    });
    expect(channel.ack).toHaveBeenCalledTimes(1);
    expect(channel.nack).not.toHaveBeenCalled();
  });
});
