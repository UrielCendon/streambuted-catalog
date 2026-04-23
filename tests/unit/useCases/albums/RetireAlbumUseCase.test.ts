import { AuthorizationService } from "../../../../src/application/services/AuthorizationService";
import { RetireAlbumUseCase } from "../../../../src/application/useCases/albums/RetireAlbumUseCase";
import { CatalogStatus } from "../../../../src/domain/enums/CatalogStatus";
import { AlbumRepository } from "../../../../src/domain/repositories/AlbumRepository";

describe("RetireAlbumUseCase", () => {
  const buildUseCase = () => {
    const albumRepository: jest.Mocked<AlbumRepository> = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      retire: jest.fn(),
      searchPublishedByTitle: jest.fn(),
      listByArtist: jest.fn()
    };

    const useCase = new RetireAlbumUseCase(albumRepository, new AuthorizationService());
    return { useCase, albumRepository };
  };

  it("changes album status to RETIRADO instead of deleting it", async () => {
    const { useCase, albumRepository } = buildUseCase();
    albumRepository.findById.mockResolvedValue({
      albumId: "a52fd07c-cd4d-4c77-a778-5eeaf7906f58",
      artistId: "6a39fdf8-0966-4d6b-9478-7ec13a1e3f72",
      title: "Lo-Fi Nights",
      coverAssetId: "f3d81a1e-6777-4280-a5e6-dd9db2da1f5b",
      status: CatalogStatus.Publicado,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    albumRepository.retire.mockResolvedValue({
      albumId: "a52fd07c-cd4d-4c77-a778-5eeaf7906f58",
      artistId: "6a39fdf8-0966-4d6b-9478-7ec13a1e3f72",
      title: "Lo-Fi Nights",
      coverAssetId: "f3d81a1e-6777-4280-a5e6-dd9db2da1f5b",
      status: CatalogStatus.Retirado,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const result = await useCase.execute("a52fd07c-cd4d-4c77-a778-5eeaf7906f58", {
      subject: "6a39fdf8-0966-4d6b-9478-7ec13a1e3f72",
      role: "ARTIST"
    });

    expect(result.status).toBe(CatalogStatus.Retirado);
    expect(albumRepository.retire).toHaveBeenCalledWith("a52fd07c-cd4d-4c77-a778-5eeaf7906f58");
  });
});
