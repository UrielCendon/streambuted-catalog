import { PrismaClient } from "@prisma/client";
import { Artist } from "../../domain/entities/Artist";
import {
  ArtistRepository,
  CreateArtistInput,
  UpdateArtistInput,
  UpsertPromotedArtistInput
} from "../../domain/repositories/ArtistRepository";
import { Pagination } from "../../domain/valueObjects/Pagination";

const mapArtist = (artist: {
  artistId: string;
  displayName: string;
  biography: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Artist => ({
  artistId: artist.artistId,
  displayName: artist.displayName,
  biography: artist.biography,
  createdAt: artist.createdAt,
  updatedAt: artist.updatedAt
});

export class PrismaArtistRepository implements ArtistRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async create(input: CreateArtistInput): Promise<Artist> {
    const artist = await this.prisma.artist.create({
      data: {
        ...(input.artistId ? { artistId: input.artistId } : {}),
        displayName: input.displayName,
        biography: input.biography ?? null
      }
    });

    return mapArtist(artist);
  }

  public async upsertPromotedArtist(input: UpsertPromotedArtistInput): Promise<Artist> {
    const artist = await this.prisma.artist.upsert({
      where: { artistId: input.artistId },
      update: {
        displayName: input.displayName,
        biography: input.biography ?? null
      },
      create: {
        artistId: input.artistId,
        displayName: input.displayName,
        biography: input.biography ?? null
      }
    });

    return mapArtist(artist);
  }

  public async findById(artistId: string): Promise<Artist | null> {
    const artist = await this.prisma.artist.findUnique({
      where: { artistId }
    });

    return artist ? mapArtist(artist) : null;
  }

  public async updateProfile(artistId: string, input: UpdateArtistInput): Promise<Artist> {
    const artist = await this.prisma.artist.update({
      where: { artistId },
      data: {
        displayName: input.displayName,
        biography: input.biography
      }
    });

    return mapArtist(artist);
  }

  public async existsById(artistId: string): Promise<boolean> {
    const count = await this.prisma.artist.count({
      where: { artistId }
    });

    return count > 0;
  }

  public async searchByDisplayName(query: string, pagination: Pagination): Promise<Artist[]> {
    const artists = await this.prisma.artist.findMany({
      where: {
        displayName: {
          contains: query,
          mode: "insensitive"
        }
      },
      orderBy: {
        displayName: "asc"
      },
      take: pagination.limit,
      skip: pagination.offset
    });

    return artists.map(mapArtist);
  }
}
