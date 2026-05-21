import amqplib from "amqplib";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { logger } from "../logging/logger";

const CATALOG_EVENTS_EXCHANGE = "catalog.events";
const SIGNATURE_HEADER = "X-Event-Signature";
const HMAC_ALGORITHM = "sha256";
const MAX_RETRY_COUNT = 5;
const FAILED_RETRY_MIN_AGE_MS = 60 * 60 * 1000;
const DEFAULT_POLL_INTERVAL_MS = 5000;

interface OutboxRow {
  id: string;
  routing_key: string;
  payload: unknown;
  retry_count: number;
}

export class CatalogOutboxProcessor {
  private timer: NodeJS.Timeout | null = null;
  private staleRetryTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly rabbitMqUrl: string,
    private readonly signingSecret: string,
    private readonly pollIntervalMs = DEFAULT_POLL_INTERVAL_MS
  ) {
    if (!this.signingSecret || this.signingSecret.trim().length === 0) {
      throw new Error(
        "EVENT_SIGNING_SECRET must be configured and non-empty. " +
        "This environment variable is required for event signing security."
      );
    }
  }

  public start(): void {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      this.runSafely(() => this.processPendingEvents(), "Catalog outbox processing failed");
    }, this.pollIntervalMs);
    this.staleRetryTimer = setInterval(() => {
      this.runSafely(() => this.retryStaleFailedEvents(), "Catalog stale outbox retry failed");
    }, FAILED_RETRY_MIN_AGE_MS);
    this.runSafely(() => this.processPendingEvents(), "Catalog outbox processing failed");
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.staleRetryTimer) {
      clearInterval(this.staleRetryTimer);
      this.staleRetryTimer = null;
    }
  }

  public async processPendingEvents(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    try {
      const rows = await this.prisma.$queryRaw<OutboxRow[]>`
        SELECT
          id::text,
          routing_key,
          payload,
          retry_count
        FROM outbox
        WHERE status = 'PENDING'
        ORDER BY created_at ASC
        LIMIT 50
      `;

      for (const row of rows) {
        await this.processRow(row);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processRow(row: OutboxRow): Promise<void> {
    try {
      await this.publish(row);
      await this.markProcessed(row.id);
    } catch (error) {
      logger.error(`Failed to publish Catalog outbox event id=${row.id}`, error);
      await this.markRetryOrFailed(row);
    }
  }

  private runSafely(task: () => Promise<void>, message: string): void {
    void task().catch((error) => {
      logger.error(message, error);
    });
  }

  private async publish(row: OutboxRow): Promise<void> {
    const payload = JSON.stringify(row.payload);
    const signature = crypto
      .createHmac(HMAC_ALGORITHM, this.signingSecret)
      .update(payload, "utf8")
      .digest("base64");
    const connection = await amqplib.connect(this.rabbitMqUrl);

    try {
      const channel = await connection.createConfirmChannel();
      try {
        await channel.assertExchange(CATALOG_EVENTS_EXCHANGE, "topic", { durable: true });
        channel.publish(
          CATALOG_EVENTS_EXCHANGE,
          row.routing_key,
          Buffer.from(payload, "utf8"),
          {
            contentType: "application/json",
            contentEncoding: "utf8",
            deliveryMode: 2,
            headers: { [SIGNATURE_HEADER]: signature }
          }
        );
        await channel.waitForConfirms();
      } finally {
        await channel.close();
      }
    } finally {
      await connection.close();
    }
  }

  private async markProcessed(id: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE outbox
      SET status = 'PROCESSED', processed_at = NOW()
      WHERE id = CAST(${id} AS uuid)
    `;
  }

  private async markRetryOrFailed(row: OutboxRow): Promise<void> {
    const retryCount = row.retry_count + 1;
    const status = retryCount >= MAX_RETRY_COUNT ? "FAILED" : "PENDING";
    await this.prisma.$executeRaw`
      UPDATE outbox
      SET
        status = ${status},
        retry_count = ${retryCount},
        processed_at = CASE WHEN ${status} = 'FAILED' THEN NOW() ELSE processed_at END
      WHERE id = CAST(${row.id} AS uuid)
    `;
  }

  private async retryStaleFailedEvents(): Promise<void> {
    const cutoff = new Date(Date.now() - FAILED_RETRY_MIN_AGE_MS);
    await this.prisma.$executeRaw`
      UPDATE outbox
      SET status = 'PENDING', retry_count = 0, processed_at = NULL
      WHERE status = 'FAILED'
      AND created_at < ${cutoff}
    `;
  }
}
