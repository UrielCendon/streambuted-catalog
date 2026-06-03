import { AuthorizationService } from "../../../../src/application/services/AuthorizationService";
import { DeleteAlbumUseCase } from "../../../../src/application/useCases/albums/DeleteAlbumUseCase";
import { CatalogStatus } from "../../../../src/domain/enums/CatalogStatus";
import { CatalogVisibilityReason } from "../../../../src/domain/enums/CatalogVisibilityReason";
import { AlbumRepository } from "../../../../src/domain/repositories/AlbumRepository";
import { TrackRepository } from "../../../../src/domain/repositories/TrackRepository";

describe("DeleteAlbumUseCase", () => {
  const buildUseCase = () => {
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
      useCase: new DeleteAlbumUseCase(albumRepository, trackRepository, new AuthorizationService()),
      albumRepository,
      trackRepository
    };
  };

  it("marks an album deleted and cascades the artist deletion to its tracks", async () => {
    const { useCase, albumRepository, trackRepository } = buildUseCase();
    albumRepository.findById.mockResolvedValue({
      albumId: "album-1",
      artistId: "artist-1",
      title: "Album",
      coverAssetId: "cover-1",
      status: CatalogStatus.Publicado,
      visibilityReason: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    albumRepository.markDeleted.mockResolvedValue({
      albumId: "album-1",
      artistId: "artist-1",
      title: "Album",
      coverAssetId: "cover-1",
      status: CatalogStatus.Retirado,
      visibilityReason: CatalogVisibilityReason.ArtistDeleted,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const result = await useCase.execute("album-1", {
      subject: "artist-1",
      role: "ARTIST"
    });

    expect(result.visibilityReason).toBe(CatalogVisibilityReason.ArtistDeleted);
    expect(trackRepository.markDeletedByAlbum).toHaveBeenCalledWith("album-1");
  });

  it("returns the same album when it was already deleted by the artist", async () => {
    const { useCase, albumRepository, trackRepository } = buildUseCase();
    const deletedAlbum = {
      albumId: "album-1",
      artistId: "artist-1",
      title: "Album",
      coverAssetId: "cover-1",
      status: CatalogStatus.Retirado,
      visibilityReason: CatalogVisibilityReason.ArtistDeleted,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    albumRepository.findById.mockResolvedValue(deletedAlbum);

    const result = await useCase.execute("album-1", {
      subject: "artist-1",
      role: "ARTIST"
    });

    expect(result).toBe(deletedAlbum);
    expect(trackRepository.markDeletedByAlbum).not.toHaveBeenCalled();
  });
});
