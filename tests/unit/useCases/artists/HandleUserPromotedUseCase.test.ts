import { HandleUserPromotedUseCase } from "../../../../src/application/useCases/artists/HandleUserPromotedUseCase";
import { ArtistRepository } from "../../../../src/domain/repositories/ArtistRepository";

describe("HandleUserPromotedUseCase", () => {
  it("upserts a local artist using userId as artist_id when user.promoted event arrives", async () => {
    const artistRepository: jest.Mocked<ArtistRepository> = {
      create: jest.fn(),
      upsertPromotedArtist: jest.fn().mockResolvedValue({
        artistId: "e1cc9f53-c052-4e3d-a0cc-894de7d75dd1",
        displayName: "newartist",
        biography: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      findById: jest.fn(),
      updateProfile: jest.fn(),
      existsById: jest.fn(),
      searchByDisplayName: jest.fn()
    };

    const useCase = new HandleUserPromotedUseCase(artistRepository);
    await useCase.execute({
      eventId: "39da99eb-1ee5-4440-8f2c-1f8ec28759cd",
      userId: "e1cc9f53-c052-4e3d-a0cc-894de7d75dd1",
      email: "artist@streambuted.dev",
      username: "newartist",
      previousRole: "listener",
      newRole: "artist",
      promotedAt: "2026-04-23T00:00:00Z"
    });

    expect(artistRepository.upsertPromotedArtist).toHaveBeenCalledWith({
      artistId: "e1cc9f53-c052-4e3d-a0cc-894de7d75dd1",
      displayName: "newartist",
      biography: null
    });
  });
});
