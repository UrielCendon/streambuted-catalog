import { SearchCatalogUseCase } from "../../../../src/application/useCases/catalog/SearchCatalogUseCase";
import { AlbumRepository } from "../../../../src/domain/repositories/AlbumRepository";
import { ArtistRepository } from "../../../../src/domain/repositories/ArtistRepository";
import { TrackRepository } from "../../../../src/domain/repositories/TrackRepository";
import { CatalogStatus } from "../../../../src/domain/enums/CatalogStatus";

describe("SearchCatalogUseCase", () => {
  it("returns catalog groups while preserving published status for albums and tracks", async () => {
    const artistRepository: jest.Mocked<ArtistRepository> = {
      create: jest.fn(),
      upsertPromotedArtist: jest.fn(),
      findById: jest.fn(),
      updateProfile: jest.fn(),
      existsById: jest.fn(),
      searchByDisplayName: jest.fn().mockResolvedValue([
        {
          artistId: "e0341908-4f89-4cb4-aa7a-63ea1294f08b",
          displayName: "The Lights",
          biography: "Alt-pop duo",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ])
    };

    const albumRepository: jest.Mocked<AlbumRepository> = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      retire: jest.fn(),
      searchPublishedByTitle: jest.fn().mockResolvedValue([
        {
          albumId: "332f5690-e5ab-4d4a-8f9b-db9eb49e25d9",
          artistId: "e0341908-4f89-4cb4-aa7a-63ea1294f08b",
          title: "Night Drive",
          coverAssetId: "13fa6760-b0b2-40a8-a590-4622f7613656",
          status: CatalogStatus.Publicado,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]),
      listByArtist: jest.fn()
    };

    const trackRepository: jest.Mocked<TrackRepository> = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      retire: jest.fn(),
      searchPublishedByTitle: jest.fn().mockResolvedValue([
        {
          trackId: "8ec8d920-a0f4-467d-ad47-53ecf694cbf4",
          artistId: "e0341908-4f89-4cb4-aa7a-63ea1294f08b",
          albumId: "332f5690-e5ab-4d4a-8f9b-db9eb49e25d9",
          title: "Midnight Signals",
          audioAssetId: "d63f4e03-8f01-4f79-8da4-2faf3a9eb20f",
          coverAssetId: "13fa6760-b0b2-40a8-a590-4622f7613656",
          status: CatalogStatus.Publicado,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]),
      listByArtist: jest.fn()
    };

    const useCase = new SearchCatalogUseCase(artistRepository, albumRepository, trackRepository);
    const result = await useCase.execute({ query: "night", limit: 20, offset: 0 });

    expect(result.artists).toHaveLength(1);
    expect(result.albums[0].status).toBe(CatalogStatus.Publicado);
    expect(result.tracks[0].status).toBe(CatalogStatus.Publicado);
  });
});
