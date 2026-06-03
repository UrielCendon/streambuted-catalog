import { AuthorizationService } from "../../../../src/application/services/AuthorizationService";
import { ReinstateTrackUseCase } from "../../../../src/application/useCases/tracks/ReinstateTrackUseCase";
import { CatalogStatus } from "../../../../src/domain/enums/CatalogStatus";
import { CatalogVisibilityReason } from "../../../../src/domain/enums/CatalogVisibilityReason";
import { AlbumRepository } from "../../../../src/domain/repositories/AlbumRepository";
import { TrackRepository } from "../../../../src/domain/repositories/TrackRepository";

describe("ReinstateTrackUseCase", () => {
  const buildUseCase = () => {
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

    return {
      useCase: new ReinstateTrackUseCase(trackRepository, albumRepository, new AuthorizationService()),
      trackRepository,
      albumRepository
    };
  };

  it("reinstates a track that was retired by an admin", async () => {
    const { useCase, trackRepository } = buildUseCase();
    trackRepository.findById.mockResolvedValue({
      trackId: "track-1",
      artistId: "artist-1",
      albumId: null,
      title: "Song",
      genre: "Rock",
      audioAssetId: "audio-1",
      coverAssetId: "cover-1",
      durationSeconds: 180,
      status: CatalogStatus.Retirado,
      visibilityReason: CatalogVisibilityReason.AdminRetired,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    trackRepository.reinstate.mockResolvedValue({
      trackId: "track-1",
      artistId: "artist-1",
      albumId: null,
      title: "Song",
      genre: "Rock",
      audioAssetId: "audio-1",
      coverAssetId: "cover-1",
      durationSeconds: 180,
      status: CatalogStatus.Publicado,
      visibilityReason: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const result = await useCase.execute("track-1", {
      subject: "admin-1",
      role: "ADMIN"
    });

    expect(result.status).toBe(CatalogStatus.Publicado);
  });

  it("rejects reingresar for tracks deleted by the artist", async () => {
    const { useCase, trackRepository } = buildUseCase();
    trackRepository.findById.mockResolvedValue({
      trackId: "track-1",
      artistId: "artist-1",
      albumId: null,
      title: "Song",
      genre: "Rock",
      audioAssetId: "audio-1",
      coverAssetId: "cover-1",
      durationSeconds: 180,
      status: CatalogStatus.Retirado,
      visibilityReason: CatalogVisibilityReason.ArtistDeleted,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await expect(useCase.execute("track-1", {
      subject: "admin-1",
      role: "ADMIN"
    })).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rejects reingresar a track while its album is still retired", async () => {
    const { useCase, trackRepository, albumRepository } = buildUseCase();
    trackRepository.findById.mockResolvedValue({
      trackId: "track-1",
      artistId: "artist-1",
      albumId: "album-1",
      title: "Song",
      genre: "Rock",
      audioAssetId: "audio-1",
      coverAssetId: "cover-1",
      durationSeconds: 180,
      status: CatalogStatus.Retirado,
      visibilityReason: CatalogVisibilityReason.AdminRetired,
      createdAt: new Date(),
      updatedAt: new Date()
    });
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

    await expect(useCase.execute("track-1", {
      subject: "admin-1",
      role: "ADMIN"
    })).rejects.toMatchObject({ statusCode: 409 });
  });
});
