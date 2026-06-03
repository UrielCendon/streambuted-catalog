import { AuthorizationService } from "../../../../src/application/services/AuthorizationService";
import { ReinstateAlbumUseCase } from "../../../../src/application/useCases/albums/ReinstateAlbumUseCase";
import { CatalogStatus } from "../../../../src/domain/enums/CatalogStatus";
import { CatalogVisibilityReason } from "../../../../src/domain/enums/CatalogVisibilityReason";
import { AlbumRepository } from "../../../../src/domain/repositories/AlbumRepository";
import { TrackRepository } from "../../../../src/domain/repositories/TrackRepository";

describe("ReinstateAlbumUseCase", () => {
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
      useCase: new ReinstateAlbumUseCase(albumRepository, trackRepository, new AuthorizationService()),
      albumRepository,
      trackRepository
    };
  };

  it("reinstates an album that was retired by an admin", async () => {
    const { useCase, albumRepository, trackRepository } = buildUseCase();
    albumRepository.findById.mockResolvedValue({
      albumId: "album-1",
      artistId: "artist-1",
      title: "Album",
      coverAssetId: "cover-1",
      status: CatalogStatus.Retirado,
      visibilityReason: CatalogVisibilityReason.AdminRetired,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    albumRepository.reinstate.mockResolvedValue({
      albumId: "album-1",
      artistId: "artist-1",
      title: "Album",
      coverAssetId: "cover-1",
      status: CatalogStatus.Publicado,
      visibilityReason: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const result = await useCase.execute("album-1", {
      subject: "admin-1",
      role: "ADMIN"
    });

    expect(result.status).toBe(CatalogStatus.Publicado);
    expect(trackRepository.reinstateByAlbum).toHaveBeenCalledWith("album-1");
  });

  it("rejects reingresar for albums deleted by the artist", async () => {
    const { useCase, albumRepository, trackRepository } = buildUseCase();
    albumRepository.findById.mockResolvedValue({
      albumId: "album-1",
      artistId: "artist-1",
      title: "Album",
      coverAssetId: "cover-1",
      status: CatalogStatus.Retirado,
      visibilityReason: CatalogVisibilityReason.ArtistDeleted,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await expect(useCase.execute("album-1", {
      subject: "admin-1",
      role: "ADMIN"
    })).rejects.toMatchObject({ statusCode: 404 });
    expect(trackRepository.reinstateByAlbum).not.toHaveBeenCalled();
  });
});
