import { AuthorizationService } from "../../../../src/application/services/AuthorizationService";
import { CreateTrackUseCase } from "../../../../src/application/useCases/tracks/CreateTrackUseCase";
import { CatalogStatus } from "../../../../src/domain/enums/CatalogStatus";
import { AlbumRepository } from "../../../../src/domain/repositories/AlbumRepository";
import { ArtistRepository } from "../../../../src/domain/repositories/ArtistRepository";
import { TrackRepository } from "../../../../src/domain/repositories/TrackRepository";

describe("CreateTrackUseCase", () => {
  const buildUseCase = () => {
    const trackRepository: jest.Mocked<TrackRepository> = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      retire: jest.fn(),
      searchPublishedByTitle: jest.fn(),
      listByArtist: jest.fn()
    };

    const artistRepository: jest.Mocked<ArtistRepository> = {
      create: jest.fn(),
      upsertPromotedArtist: jest.fn(),
      findById: jest.fn(),
      updateProfile: jest.fn(),
      existsById: jest.fn(),
      searchByDisplayName: jest.fn()
    };

    const albumRepository: jest.Mocked<AlbumRepository> = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      retire: jest.fn(),
      searchPublishedByTitle: jest.fn(),
      listByArtist: jest.fn()
    };

    const useCase = new CreateTrackUseCase(
      trackRepository,
      artistRepository,
      albumRepository,
      new AuthorizationService()
    );

    return {
      useCase,
      trackRepository,
      artistRepository,
      albumRepository
    };
  };

  it("creates a track when the user is ARTIST and owns the artist_id", async () => {
    const { useCase, trackRepository, artistRepository } = buildUseCase();
    artistRepository.existsById.mockResolvedValue(true);
    trackRepository.create.mockResolvedValue({
      trackId: "9be6e47a-e796-44fd-83cd-53f2f7ff9155",
      artistId: "8dbf424d-c519-4b2a-8018-2992a5f3f0fd",
      albumId: null,
      title: "Test Track",
      audioAssetId: "173d3f1d-9ddb-44e6-af70-779d8bfa9c45",
      coverAssetId: "688f6a27-a86a-4f8c-af24-2ec6a13eafca",
      status: CatalogStatus.Publicado,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const result = await useCase.execute(
      {
        artistId: "8dbf424d-c519-4b2a-8018-2992a5f3f0fd",
        title: "Test Track",
        audioAssetId: "173d3f1d-9ddb-44e6-af70-779d8bfa9c45",
        coverAssetId: "688f6a27-a86a-4f8c-af24-2ec6a13eafca"
      },
      {
        subject: "8dbf424d-c519-4b2a-8018-2992a5f3f0fd",
        role: "ARTIST"
      }
    );

    expect(result.status).toBe(CatalogStatus.Publicado);
    expect(trackRepository.create).toHaveBeenCalledTimes(1);
  });

  it("throws forbidden when the requester role is not ARTIST", async () => {
    const { useCase } = buildUseCase();

    await expect(
      useCase.execute(
        {
          artistId: "8dbf424d-c519-4b2a-8018-2992a5f3f0fd",
          title: "Test Track",
          audioAssetId: "173d3f1d-9ddb-44e6-af70-779d8bfa9c45",
          coverAssetId: "688f6a27-a86a-4f8c-af24-2ec6a13eafca"
        },
        {
          subject: "8dbf424d-c519-4b2a-8018-2992a5f3f0fd",
          role: "LISTENER"
        }
      )
    ).rejects.toMatchObject({
      statusCode: 403
    });
  });

  it("throws forbidden when artist_id does not match JWT subject", async () => {
    const { useCase } = buildUseCase();

    await expect(
      useCase.execute(
        {
          artistId: "8dbf424d-c519-4b2a-8018-2992a5f3f0fd",
          title: "Test Track",
          audioAssetId: "173d3f1d-9ddb-44e6-af70-779d8bfa9c45",
          coverAssetId: "688f6a27-a86a-4f8c-af24-2ec6a13eafca"
        },
        {
          subject: "d3d87e12-3fd0-4d3f-af1e-77330831257b",
          role: "ARTIST"
        }
      )
    ).rejects.toMatchObject({
      statusCode: 403
    });
  });
});
