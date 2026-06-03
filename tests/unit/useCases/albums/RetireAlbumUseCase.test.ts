import { AuthorizationService } from "../../../../src/application/services/AuthorizationService";
import { RetireAlbumUseCase } from "../../../../src/application/useCases/albums/RetireAlbumUseCase";
import { CatalogStatus } from "../../../../src/domain/enums/CatalogStatus";
import { CatalogVisibilityReason } from "../../../../src/domain/enums/CatalogVisibilityReason";
import { AlbumRepository } from "../../../../src/domain/repositories/AlbumRepository";
import { TrackRepository } from "../../../../src/domain/repositories/TrackRepository";

describe("RetireAlbumUseCase", () => {
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

    const useCase = new RetireAlbumUseCase(albumRepository, trackRepository, new AuthorizationService());
    return { useCase, albumRepository, trackRepository };
  };

  it("changes album status to RETIRADO when an admin retires it", async () => {
    const { useCase, albumRepository, trackRepository } = buildUseCase();
    albumRepository.findById.mockResolvedValue({
      albumId: "a52fd07c-cd4d-4c77-a778-5eeaf7906f58",
      artistId: "6a39fdf8-0966-4d6b-9478-7ec13a1e3f72",
      title: "Lo-Fi Nights",
      coverAssetId: "f3d81a1e-6777-4280-a5e6-dd9db2da1f5b",
      status: CatalogStatus.Publicado,
      visibilityReason: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    albumRepository.retire.mockResolvedValue({
      albumId: "a52fd07c-cd4d-4c77-a778-5eeaf7906f58",
      artistId: "6a39fdf8-0966-4d6b-9478-7ec13a1e3f72",
      title: "Lo-Fi Nights",
      coverAssetId: "f3d81a1e-6777-4280-a5e6-dd9db2da1f5b",
      status: CatalogStatus.Retirado,
      visibilityReason: CatalogVisibilityReason.AdminRetired,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const result = await useCase.execute("a52fd07c-cd4d-4c77-a778-5eeaf7906f58", {
      subject: "admin-1",
      role: "ADMIN"
    });

    expect(result.visibilityReason).toBe(CatalogVisibilityReason.AdminRetired);
    expect(albumRepository.retire).toHaveBeenCalledWith(
      "a52fd07c-cd4d-4c77-a778-5eeaf7906f58",
      CatalogVisibilityReason.AdminRetired
    );
    expect(trackRepository.retireByAlbum).toHaveBeenCalledWith(
      "a52fd07c-cd4d-4c77-a778-5eeaf7906f58",
      CatalogVisibilityReason.AdminRetired
    );
  });

  it("returns the same album when it was already retired by an admin", async () => {
    const { useCase, albumRepository, trackRepository } = buildUseCase();
    const retiredAlbum = {
      albumId: "a52fd07c-cd4d-4c77-a778-5eeaf7906f58",
      artistId: "6a39fdf8-0966-4d6b-9478-7ec13a1e3f72",
      title: "Lo-Fi Nights",
      coverAssetId: "f3d81a1e-6777-4280-a5e6-dd9db2da1f5b",
      status: CatalogStatus.Retirado,
      visibilityReason: CatalogVisibilityReason.AdminRetired,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    albumRepository.findById.mockResolvedValue(retiredAlbum);

    const result = await useCase.execute("a52fd07c-cd4d-4c77-a778-5eeaf7906f58", {
      subject: "admin-1",
      role: "ADMIN"
    });

    expect(result).toBe(retiredAlbum);
    expect(trackRepository.retireByAlbum).toHaveBeenCalledWith(
      "a52fd07c-cd4d-4c77-a778-5eeaf7906f58",
      CatalogVisibilityReason.AdminRetired
    );
  });
});
