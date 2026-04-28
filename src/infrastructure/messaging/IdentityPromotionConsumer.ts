import amqplib, { Channel, ChannelModel, ConsumeMessage } from "amqplib";
import crypto from "crypto";
import { z } from "zod";
import { HandleUserPromotedUseCase } from "../../application/useCases/artists/HandleUserPromotedUseCase";

const userPromotedEventSchema = z.object({
  eventId: z.string().uuid().optional(),
  userId: z.string().uuid(),
  email: z.string().email().optional(),
  username: z.string().optional(),
  previousRole: z.string().optional(),
  newRole: z.string().optional(),
  promotedAt: z.union([z.string(), z.number()]).optional()
});

const unwrapPayload = (messagePayload: unknown): unknown => {
  if (!messagePayload || typeof messagePayload !== "object" || Array.isArray(messagePayload)) {
    return messagePayload;
  }

  const payload = (messagePayload as { payload?: unknown }).payload;
  if (payload === undefined) {
    return messagePayload;
  }

  if (typeof payload === "string") {
    try {
      return JSON.parse(payload) as unknown;
    } catch {
      return payload;
    }
  }

  return payload;
};

export class IdentityPromotionConsumer {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isConnecting = false;
  private isRecovering = false;
  private isStopped = false;

  constructor(
    private readonly rabbitMqUrl: string,
    private readonly queueName: string,
    private readonly handleUserPromotedUseCase: HandleUserPromotedUseCase
  ) {}

  public async start(): Promise<void> {
    if (this.isConnecting || (this.connection && this.channel)) {
      return;
    }

    this.isStopped = false;
    this.isConnecting = true;

    try {
      const connection = await amqplib.connect(this.rabbitMqUrl);
      const channel = await connection.createChannel();

      this.connection = connection;
      this.channel = channel;

      this.registerConnectionHandlers(connection);
      this.registerChannelHandlers(channel);

      await channel.assertExchange("identity.events", "topic", { durable: true });
      await channel.assertQueue(this.queueName, { durable: true });
      await channel.bindQueue(this.queueName, "identity.events", "user.promoted");
      await channel.prefetch(10);

      await channel.consume(this.queueName, async (message) => {
        await this.handleMessage(message);
      });

      this.reconnectAttempts = 0;
      console.log("Identity promotion consumer connected to RabbitMQ.");
    } catch (error) {
      console.error("Failed to connect to RabbitMQ:", error);
      await this.cleanupResources();
      this.scheduleReconnect("RabbitMQ startup failed.");
    } finally {
      this.isConnecting = false;
    }
  }

  public async stop(): Promise<void> {
    this.isStopped = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    await this.cleanupResources();
    this.reconnectAttempts = 0;
  }

  private async handleMessage(message: ConsumeMessage | null): Promise<void> {
    if (!this.channel || !message) {
      return;
    }

    try {
      const signingSecret = process.env.EVENT_SIGNING_SECRET;
      if (signingSecret && signingSecret.trim().length > 0) {
        const signatureHeader = message.properties?.headers?.["X-Event-Signature"] as string | undefined;
        const payloadString = message.content.toString();
        const expected = crypto.createHmac("sha256", signingSecret).update(payloadString, "utf8").digest("base64");
        const a = Buffer.from(expected, "utf8");
        const b = Buffer.from(String(signatureHeader ?? ""), "utf8");
        const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
        if (!valid) {
          console.warn("Rejected message due to invalid signature.");
          this.channel.nack(message, false, false);
          return;
        }
      }

      const payload = JSON.parse(message.content.toString()) as unknown;
      const parsedEvent = userPromotedEventSchema.parse(unwrapPayload(payload));
      const event = {
        ...parsedEvent,
        promotedAt:
          parsedEvent.promotedAt === undefined ? undefined : String(parsedEvent.promotedAt)
      };
      await this.handleUserPromotedUseCase.execute(event);
      this.channel.ack(message);
    } catch (error) {
      console.error("Failed to process user.promoted event:", error);

      const isMalformedMessageError = error instanceof SyntaxError || error instanceof z.ZodError;
      this.channel.nack(message, false, !isMalformedMessageError);
    }
  }

  private registerConnectionHandlers(connection: ChannelModel): void {
    connection.on("error", (error) => {
      if (this.isStopped) {
        return;
      }

      console.error("RabbitMQ connection error:", error);
      void this.handleConnectionLoss("RabbitMQ connection error.");
    });

    connection.on("close", () => {
      if (this.isStopped) {
        return;
      }

      console.warn("RabbitMQ connection closed.");
      void this.handleConnectionLoss("RabbitMQ connection closed.");
    });
  }

  private registerChannelHandlers(channel: Channel): void {
    channel.on("error", (error) => {
      if (this.isStopped) {
        return;
      }

      console.error("RabbitMQ channel error:", error);
      void this.handleConnectionLoss("RabbitMQ channel error.");
    });

    channel.on("close", () => {
      if (this.isStopped) {
        return;
      }

      console.warn("RabbitMQ channel closed.");
      void this.handleConnectionLoss("RabbitMQ channel closed.");
    });
  }

  private async handleConnectionLoss(reason: string): Promise<void> {
    if (this.isRecovering || this.isStopped) {
      return;
    }

    this.isRecovering = true;
    try {
      await this.cleanupResources();
      this.scheduleReconnect(reason);
    } finally {
      this.isRecovering = false;
    }
  }

  private scheduleReconnect(reason: string): void {
    if (this.isStopped || this.reconnectTimer) {
      return;
    }

    const delayMs = this.nextReconnectDelayMs();
    console.warn(`${reason} Retrying in ${delayMs}ms (attempt ${this.reconnectAttempts}).`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.start();
    }, delayMs);
  }

  private nextReconnectDelayMs(): number {
    this.reconnectAttempts += 1;

    const baseDelayMs = 1000;
    const maxDelayMs = 30000;
    return Math.min(maxDelayMs, baseDelayMs * 2 ** (this.reconnectAttempts - 1));
  }

  private async cleanupResources(): Promise<void> {
    const currentChannel = this.channel;
    this.channel = null;

    if (currentChannel) {
      currentChannel.removeAllListeners();
      try {
        await currentChannel.close();
      } catch {
        // Ignore channel close errors during shutdown/recovery.
      }
    }

    const currentConnection = this.connection;
    this.connection = null;

    if (currentConnection) {
      currentConnection.removeAllListeners();
      try {
        await currentConnection.close();
      } catch {
        // Ignore connection close errors during shutdown/recovery.
      }
    }
  }
}
