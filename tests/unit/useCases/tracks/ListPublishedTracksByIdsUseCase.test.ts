import { ListPublishedTracksByIdsUseCase } from "../../../../src/application/useCases/tracks/ListPublishedTracksByIdsUseCase";
import { CatalogStatus } from "../../../../src/domain/enums/CatalogStatus";
import { TrackRepository } from "../../../../src/domain/repositories/TrackRepository";

describe("ListPublishedTracksByIdsUseCase", () => {
  it("deduplicates ids and delegates published lookup to the repository", async () => {
    const trackRepository: jest.Mocked<TrackRepository> = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      retire: jest.fn(),
      detachAlbum: jest.fn(),
      searchPublishedByTitle: jest.fn(),
      listByArtist: jest.fn(),
      countAllForAdmin: jest.fn(),
      listAllForAdmin: jest.fn(),
      listPublishedByAlbum: jest.fn(),
      listPublishedByIds: jest.fn().mockResolvedValue([
        {
          trackId: "8ec8d920-a0f4-467d-ad47-53ecf694cbf4",
          artistId: "e0341908-4f89-4cb4-aa7a-63ea1294f08b",
          albumId: null,
          title: "Midnight Signals",
          genre: "Electronica",
          audioAssetId: "d63f4e03-8f01-4f79-8da4-2faf3a9eb20f",
          coverAssetId: "13fa6760-b0b2-40a8-a590-4622f7613656",
          durationSeconds: 185,
          status: CatalogStatus.Publicado,
          artistName: "The Lights",
          albumTitle: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ])
    };

    const useCase = new ListPublishedTracksByIdsUseCase(trackRepository);
    const result = await useCase.execute([
      "8ec8d920-a0f4-467d-ad47-53ecf694cbf4",
      "8ec8d920-a0f4-467d-ad47-53ecf694cbf4"
    ]);

    expect(result).toHaveLength(1);
    expect(trackRepository.listPublishedByIds).toHaveBeenCalledWith([
      "8ec8d920-a0f4-467d-ad47-53ecf694cbf4"
    ]);
  });
});
