import { PrismaClient } from "@prisma/client";
import { PrismaAlbumRepository } from "../../../../src/infrastructure/repositories/PrismaAlbumRepository";
import { PrismaArtistRepository } from "../../../../src/infrastructure/repositories/PrismaArtistRepository";
import { PrismaTrackRepository } from "../../../../src/infrastructure/repositories/PrismaTrackRepository";

function createPrismaMock() {
  return {
    $queryRaw: jest.fn().mockResolvedValue([]),
    album: {
      findMany: jest.fn().mockResolvedValue([])
    },
    track: {
      groupBy: jest.fn().mockResolvedValue([])
    }
  } as unknown as PrismaClient & {
    $queryRaw: jest.Mock;
    album: { findMany: jest.Mock };
    track: { groupBy: jest.Mock };
  };
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

  it("counts only published album tracks in admin moderation results", async () => {
    const prisma = createPrismaMock();
    prisma.album.findMany.mockResolvedValue([
      {
        albumId: "album-1",
        artistId: "artist-1",
        title: "Album",
        coverAssetId: "cover-1",
        status: "PUBLICADO",
        visibilityReason: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        artist: { displayName: "Ada" }
      }
    ]);
    prisma.track.groupBy.mockResolvedValue([
      {
        albumId: "album-1",
        _count: { _all: 1 }
      }
    ]);
    const repository = new PrismaAlbumRepository(prisma);

    const albums = await repository.listAllForAdmin(true, { limit: 10, offset: 0 });

    expect(albums[0].trackCount).toBe(1);
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
