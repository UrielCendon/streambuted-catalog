import { PrismaClient } from "@prisma/client";
import { PrismaAlbumRepository } from "../../../../src/infrastructure/repositories/PrismaAlbumRepository";
import { PrismaArtistRepository } from "../../../../src/infrastructure/repositories/PrismaArtistRepository";
import { PrismaTrackRepository } from "../../../../src/infrastructure/repositories/PrismaTrackRepository";

function createPrismaMock() {
  return {
    $queryRaw: jest.fn().mockResolvedValue([])
  } as unknown as PrismaClient & { $queryRaw: jest.Mock };
}

function getSqlText(query: unknown): string {
  const sql = query as { strings?: string[]; sql?: string };

  if (Array.isArray(sql.strings)) {
    return sql.strings.join(" ");
  }

  return sql.sql ?? String(query);
}

describe("Prisma search repositories", () => {
  it("searches artists with accent-insensitive SQL", async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaArtistRepository(prisma);

    await repository.searchByDisplayName("cancion", { limit: 20, offset: 0 });

    const sql = getSqlText(prisma.$queryRaw.mock.calls[0][0]);
    expect(sql).toContain("unaccent(lower(display_name))");
    expect(sql).toContain("unaccent(lower(");
  });

  it("searches published albums with accent-insensitive SQL", async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaAlbumRepository(prisma);

    await repository.searchPublishedByTitle("album", { limit: 20, offset: 0 });

    const sql = getSqlText(prisma.$queryRaw.mock.calls[0][0]);
    expect(sql).toContain("status =");
    expect(sql).toContain("unaccent(lower(title))");
  });

  it("searches published tracks by title and genre with accent-insensitive SQL", async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaTrackRepository(prisma);

    await repository.searchPublishedByTitle("electronica", { limit: 20, offset: 0 });

    const sql = getSqlText(prisma.$queryRaw.mock.calls[0][0]);
    expect(sql).toContain("unaccent(lower(title))");
    expect(sql).toContain("unaccent(lower(genre))");
  });
});
