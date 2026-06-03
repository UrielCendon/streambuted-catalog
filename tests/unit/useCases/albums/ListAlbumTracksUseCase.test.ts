import { ListAlbumTracksUseCase } from "../../../../src/application/useCases/albums/ListAlbumTracksUseCase";
import { AppError } from "../../../../src/application/errors/AppError";
import { CatalogStatus } from "../../../../src/domain/enums/CatalogStatus";
import { AlbumRepository } from "../../../../src/domain/repositories/AlbumRepository";
import { TrackRepository } from "../../../../src/domain/repositories/TrackRepository";

describe("ListAlbumTracksUseCase", () => {
  const buildRepositories = () => {
    const albumRepository: jest.Mocked<AlbumRepository> = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      retire: jest.fn(),
      reinstate: jest.fn(),
      markDeleted: jest.fn(),
      countAllForAdmin: jest.fn(),
      listAllForAdmin: jest.fn(),
      searchPublishedByTitle: jest.fn(),
      listByArtist: jest.fn()
    };
    const trackRepository: jest.Mocked<TrackRepository> = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      retire: jest.fn(),
      reinstate: jest.fn(),
      retireByAlbum: jest.fn(),
      reinstateByAlbum: jest.fn(),
      markDeleted: jest.fn(),
      markDeletedByAlbum: jest.fn(),
      searchPublishedByTitle: jest.fn(),
      listByArtist: jest.fn(),
      countAllForAdmin: jest.fn(),
      listAllForAdmin: jest.fn(),
      listPublishedByAlbum: jest.fn(),
      listPublishedByIds: jest.fn()
    };

    return {
      albumRepository,
      trackRepository
    };
  };

  it("returns published album tracks in repository order", async () => {
    const { albumRepository, trackRepository } = buildRepositories();
    albumRepository.findById.mockResolvedValue({
      albumId: "332f5690-e5ab-4d4a-8f9b-db9eb49e25d9",
      artistId: "e0341908-4f89-4cb4-aa7a-63ea1294f08b",
      title: "Night Drive",
      coverAssetId: "13fa6760-b0b2-40a8-a590-4622f7613656",
      status: CatalogStatus.Publicado,
      visibilityReason: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    trackRepository.listPublishedByAlbum.mockResolvedValue([
      {
        trackId: "8ec8d920-a0f4-467d-ad47-53ecf694cbf4",
        artistId: "e0341908-4f89-4cb4-aa7a-63ea1294f08b",
        albumId: "332f5690-e5ab-4d4a-8f9b-db9eb49e25d9",
        title: "Midnight Signals",
        genre: "Electronica",
        audioAssetId: "d63f4e03-8f01-4f79-8da4-2faf3a9eb20f",
        coverAssetId: "13fa6760-b0b2-40a8-a590-4622f7613656",
        durationSeconds: 185,
        status: CatalogStatus.Publicado,
        visibilityReason: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    const useCase = new ListAlbumTracksUseCase(albumRepository, trackRepository);
    const result = await useCase.execute("332f5690-e5ab-4d4a-8f9b-db9eb49e25d9");

    expect(result).toHaveLength(1);
    expect(trackRepository.listPublishedByAlbum).toHaveBeenCalledWith("332f5690-e5ab-4d4a-8f9b-db9eb49e25d9");
  });

  it("throws not found when album is retired", async () => {
    const { albumRepository, trackRepository } = buildRepositories();
    albumRepository.findById.mockResolvedValue({
      albumId: "332f5690-e5ab-4d4a-8f9b-db9eb49e25d9",
      artistId: "e0341908-4f89-4cb4-aa7a-63ea1294f08b",
      title: "Night Drive",
      coverAssetId: "13fa6760-b0b2-40a8-a590-4622f7613656",
      status: CatalogStatus.Retirado,
      visibilityReason: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const useCase = new ListAlbumTracksUseCase(albumRepository, trackRepository);

    await expect(useCase.execute("332f5690-e5ab-4d4a-8f9b-db9eb49e25d9")).rejects.toBeInstanceOf(AppError);
    expect(trackRepository.listPublishedByAlbum).not.toHaveBeenCalled();
  });
});
