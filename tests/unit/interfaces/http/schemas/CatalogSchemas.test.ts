import {
  createAlbumSchema,
  createTrackInAlbumSchema,
  createTrackSchema
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
        audioAssetId: "6dd6f07f-fc96-4f9b-ab08-8444f8519758",
        coverAssetId: "f4a4bde9-f5be-414e-bb37-6c546c08231f"
      }
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body).toEqual({
        albumId: "b5d52ff9-2e9c-4cbe-910a-2e5b30c7eaeb",
        title: "My Track",
        audioAssetId: "6dd6f07f-fc96-4f9b-ab08-8444f8519758",
        coverAssetId: "f4a4bde9-f5be-414e-bb37-6c546c08231f"
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
        audio_asset_id: "6dd6f07f-fc96-4f9b-ab08-8444f8519758",
        cover_asset_id: "f4a4bde9-f5be-414e-bb37-6c546c08231f"
      }
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.params.albumId).toBe("b5d52ff9-2e9c-4cbe-910a-2e5b30c7eaeb");
      expect(result.data.body).toEqual({
        title: "Inside Album",
        audioAssetId: "6dd6f07f-fc96-4f9b-ab08-8444f8519758",
        coverAssetId: "f4a4bde9-f5be-414e-bb37-6c546c08231f"
      });
    }
  });
});
