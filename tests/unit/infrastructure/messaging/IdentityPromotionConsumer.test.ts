import { HandleUserPromotedUseCase } from "../../../../src/application/useCases/artists/HandleUserPromotedUseCase";
import { IdentityPromotionConsumer } from "../../../../src/infrastructure/messaging/IdentityPromotionConsumer";
import crypto from "node:crypto";

describe("IdentityPromotionConsumer", () => {
  const previousEventSigningSecret = process.env.EVENT_SIGNING_SECRET;

  beforeEach(() => {
    // 64+ chars to satisfy HMAC key-length expectations.
    process.env.EVENT_SIGNING_SECRET = "x".repeat(64);
  });

  afterEach(() => {
    if (previousEventSigningSecret === undefined) {
      delete process.env.EVENT_SIGNING_SECRET;
    } else {
      process.env.EVENT_SIGNING_SECRET = previousEventSigningSecret;
    }
  });

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

    const payloadString = JSON.stringify({
      payload: {
        eventId: "6de42d7d-24bc-466f-8908-7acfece7f77e",
        userId: "9d0c95ba-5fa2-43ee-a8dd-49a151ed36cb",
        email: "artist@streambuted.dev",
        username: "artist",
        previousRole: "listener",
        newRole: "artist",
        promotedAt: "2026-04-22T12:00:00Z"
      }
    });

    const signature = crypto
      .createHmac("sha256", process.env.EVENT_SIGNING_SECRET ?? "")
      .update(payloadString, "utf8")
      .digest("base64");

    const message = {
      content: Buffer.from(payloadString),
      properties: {
        headers: {
          "X-Event-Signature": signature
        }
      }
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
