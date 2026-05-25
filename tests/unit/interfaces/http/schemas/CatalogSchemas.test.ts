import {
  createAlbumSchema,
  createTrackInAlbumSchema,
  createTrackSchema,
  searchCatalogSchema,
  updateTrackSchema
} from "../../../../../src/interfaces/http/schemas/CatalogSchemas";

describe("CatalogSchemas", () => {
  it("accepts create album payloads without artistId in the body", () => {
    const result = createAlbumSchema.safeParse({
      params: {},
      query: {},
      body: {
        title: "My Album",
        cover_asset_id: "f4a4bde9-f5be-414e-bb37-6c546c08231f"
      }
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body).toEqual({
        title: "My Album",
        coverAssetId: "f4a4bde9-f5be-414e-bb37-6c546c08231f"
      });
    }
  });

  it("accepts create track payloads without artist aliases", () => {
    const result = createTrackSchema.safeParse({
      params: {},
      query: {},
      body: {
        album_id: "b5d52ff9-2e9c-4cbe-910a-2e5b30c7eaeb",
        title: "My Track",
        genero: "Rock",
        audioAssetId: "6dd6f07f-fc96-4f9b-ab08-8444f8519758",
        coverAssetId: "f4a4bde9-f5be-414e-bb37-6c546c08231f"
      }
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body).toEqual({
        albumId: "b5d52ff9-2e9c-4cbe-910a-2e5b30c7eaeb",
        title: "My Track",
        genre: "Rock",
        audioAssetId: "6dd6f07f-fc96-4f9b-ab08-8444f8519758",
        coverAssetId: "f4a4bde9-f5be-414e-bb37-6c546c08231f",
        durationSeconds: undefined
      });
    }
  });

  it("accepts nested album track creation payloads", () => {
    const result = createTrackInAlbumSchema.safeParse({
      params: {
        albumId: "b5d52ff9-2e9c-4cbe-910a-2e5b30c7eaeb"
      },
      query: {},
      body: {
        title: "Inside Album",
        genre: "Electronica",
        audio_asset_id: "6dd6f07f-fc96-4f9b-ab08-8444f8519758",
        cover_asset_id: "f4a4bde9-f5be-414e-bb37-6c546c08231f"
      }
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.params.albumId).toBe("b5d52ff9-2e9c-4cbe-910a-2e5b30c7eaeb");
      expect(result.data.body).toEqual({
        title: "Inside Album",
        genre: "Electronica",
        audioAssetId: "6dd6f07f-fc96-4f9b-ab08-8444f8519758",
        coverAssetId: "f4a4bde9-f5be-414e-bb37-6c546c08231f",
        durationSeconds: undefined
      });
    }
  });

  it("preserves null albumId when updating a track to single", () => {
    const result = updateTrackSchema.safeParse({
      params: {
        trackId: "4f2c4561-f4a1-4ac6-ad45-7de0e7149a6f"
      },
      query: {},
      body: {
        albumId: null
      }
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body).toEqual({
        albumId: null,
        title: undefined,
        genre: undefined,
        audioAssetId: undefined,
        coverAssetId: undefined,
        durationSeconds: undefined
      });
    }
  });

  it("normalizes searchTerm and keeps q as a compatibility alias", () => {
    const preferred = searchCatalogSchema.safeParse({
      params: {},
      query: { searchTerm: " az ", limit: "20", offset: "0" },
      body: {}
    });
    const legacy = searchCatalogSchema.safeParse({
      params: {},
      query: { q: "az" },
      body: {}
    });

    expect(preferred.success).toBe(true);
    expect(legacy.success).toBe(true);
    if (preferred.success) {
      expect(preferred.data.query.searchTerm).toBe("az");
    }
    if (legacy.success) {
      expect(legacy.data.query.searchTerm).toBe("az");
    }
  });

  it("rejects catalog names and search terms longer than 100 characters", () => {
    const tooLong = "x".repeat(101);

    expect(createAlbumSchema.safeParse({
      params: {},
      query: {},
      body: {
        title: tooLong,
        coverAssetId: "f4a4bde9-f5be-414e-bb37-6c546c08231f"
      }
    }).success).toBe(false);
    expect(createTrackSchema.safeParse({
      params: {},
      query: {},
      body: {
        title: tooLong,
        genre: "Rock",
        audioAssetId: "6dd6f07f-fc96-4f9b-ab08-8444f8519758",
        coverAssetId: "f4a4bde9-f5be-414e-bb37-6c546c08231f"
      }
    }).success).toBe(false);
    expect(searchCatalogSchema.safeParse({
      params: {},
      query: { searchTerm: tooLong },
      body: {}
    }).success).toBe(false);
  });
});
