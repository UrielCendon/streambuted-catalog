import { AuthorizationService } from "../../../../src/application/services/AuthorizationService";
import { DeleteTrackUseCase } from "../../../../src/application/useCases/tracks/DeleteTrackUseCase";
import { CatalogStatus } from "../../../../src/domain/enums/CatalogStatus";
import { CatalogVisibilityReason } from "../../../../src/domain/enums/CatalogVisibilityReason";
import { TrackRepository } from "../../../../src/domain/repositories/TrackRepository";

describe("DeleteTrackUseCase", () => {
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

    return {
      useCase: new DeleteTrackUseCase(trackRepository, new AuthorizationService()),
      trackRepository
    };
  };

  it("marks a track as artist-deleted when its owner deletes it", async () => {
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
      status: CatalogStatus.Publicado,
      visibilityReason: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    trackRepository.markDeleted.mockResolvedValue({
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

    const result = await useCase.execute("track-1", {
      subject: "artist-1",
      role: "ARTIST"
    });

    expect(result.visibilityReason).toBe(CatalogVisibilityReason.ArtistDeleted);
  });

  it("returns the same track when it was already deleted by the artist", async () => {
    const { useCase, trackRepository } = buildUseCase();
    const deletedTrack = {
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
    };
    trackRepository.findById.mockResolvedValue(deletedTrack);

    const result = await useCase.execute("track-1", {
      subject: "artist-1",
      role: "ARTIST"
    });

    expect(result).toBe(deletedTrack);
  });
});
