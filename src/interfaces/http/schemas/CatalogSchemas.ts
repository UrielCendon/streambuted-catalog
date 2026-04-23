import { z } from "zod";

const uuidSchema = z.string().uuid();

const hasAtLeastOneField = (value: Record<string, unknown>, fieldNames: string[]): boolean =>
  fieldNames.some((fieldName) => value[fieldName] !== undefined);

const hasAtLeastOneAlias = (value: Record<string, unknown>, aliases: [string, string]): boolean =>
  value[aliases[0]] !== undefined || value[aliases[1]] !== undefined;

const createArtistProfileBodySchema = z
  .object({
    displayName: z.string().trim().min(1).max(120).optional(),
    display_name: z.string().trim().min(1).max(120).optional(),
    biography: z.string().trim().max(4000).nullable().optional()
  })
  .transform((value) => ({
    displayName: value.displayName ?? value.display_name,
    biography: value.biography
  }))
  .refine((value) => hasAtLeastOneField(value, ["displayName", "biography"]), {
    message: "At least one profile field must be provided."
  });

const createAlbumBodySchema = z
  .object({
    title: z.string().trim().min(1).max(220),
    coverAssetId: uuidSchema.optional(),
    cover_asset_id: uuidSchema.optional()
  })
  .refine((value) => hasAtLeastOneAlias(value, ["coverAssetId", "cover_asset_id"]), {
    message: "coverAssetId or cover_asset_id is required."
  })
  .transform((value) => ({
    title: value.title,
    coverAssetId: value.coverAssetId ?? value.cover_asset_id
  }));

const updateAlbumBodySchema = z
  .object({
    title: z.string().trim().min(1).max(220).optional(),
    coverAssetId: uuidSchema.optional(),
    cover_asset_id: uuidSchema.optional()
  })
  .transform((value) => ({
    title: value.title,
    coverAssetId: value.coverAssetId ?? value.cover_asset_id
  }))
  .refine((value) => hasAtLeastOneField(value, ["title", "coverAssetId"]), {
    message: "At least one album field must be provided."
  });

const createTrackBodySchema = z
  .object({
    albumId: uuidSchema.nullable().optional(),
    album_id: uuidSchema.nullable().optional(),
    title: z.string().trim().min(1).max(220),
    audioAssetId: uuidSchema.optional(),
    audio_asset_id: uuidSchema.optional(),
    coverAssetId: uuidSchema.optional(),
    cover_asset_id: uuidSchema.optional()
  })
  .refine((value) => hasAtLeastOneAlias(value, ["audioAssetId", "audio_asset_id"]), {
    message: "audioAssetId or audio_asset_id is required."
  })
  .refine((value) => hasAtLeastOneAlias(value, ["coverAssetId", "cover_asset_id"]), {
    message: "coverAssetId or cover_asset_id is required."
  })
  .transform((value) => ({
    albumId: value.albumId ?? value.album_id,
    title: value.title,
    audioAssetId: value.audioAssetId ?? value.audio_asset_id,
    coverAssetId: value.coverAssetId ?? value.cover_asset_id
  }));

const createTrackInAlbumBodySchema = z
  .object({
    title: z.string().trim().min(1).max(220),
    audioAssetId: uuidSchema.optional(),
    audio_asset_id: uuidSchema.optional(),
    coverAssetId: uuidSchema.optional(),
    cover_asset_id: uuidSchema.optional()
  })
  .refine((value) => hasAtLeastOneAlias(value, ["audioAssetId", "audio_asset_id"]), {
    message: "audioAssetId or audio_asset_id is required."
  })
  .refine((value) => hasAtLeastOneAlias(value, ["coverAssetId", "cover_asset_id"]), {
    message: "coverAssetId or cover_asset_id is required."
  })
  .transform((value) => ({
    title: value.title,
    audioAssetId: value.audioAssetId ?? value.audio_asset_id,
    coverAssetId: value.coverAssetId ?? value.cover_asset_id
  }));

const updateTrackBodySchema = z
  .object({
    albumId: uuidSchema.nullable().optional(),
    album_id: uuidSchema.nullable().optional(),
    title: z.string().trim().min(1).max(220).optional(),
    audioAssetId: uuidSchema.optional(),
    audio_asset_id: uuidSchema.optional(),
    coverAssetId: uuidSchema.optional(),
    cover_asset_id: uuidSchema.optional()
  })
  .transform((value) => ({
    albumId: value.albumId ?? value.album_id,
    title: value.title,
    audioAssetId: value.audioAssetId ?? value.audio_asset_id,
    coverAssetId: value.coverAssetId ?? value.cover_asset_id
  }))
  .refine((value) => hasAtLeastOneField(value, ["albumId", "title", "audioAssetId", "coverAssetId"]), {
    message: "At least one track field must be provided."
  });

export const searchCatalogSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({
    q: z.string().trim().min(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0)
  }),
  body: z.object({}).passthrough()
});

export const artistIdParamSchema = z.object({
  params: z.object({
    artistId: uuidSchema
  }),
  query: z.object({}).passthrough(),
  body: z.object({}).passthrough()
});

export const updateArtistProfileSchema = z.object({
  params: z.object({
    artistId: uuidSchema
  }),
  query: z.object({}).passthrough(),
  body: createArtistProfileBodySchema
});

export const albumIdParamSchema = z.object({
  params: z.object({
    albumId: uuidSchema
  }),
  query: z.object({}).passthrough(),
  body: z.object({}).passthrough()
});

export const createAlbumSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: createAlbumBodySchema
});

export const updateAlbumSchema = z.object({
  params: z.object({
    albumId: uuidSchema
  }),
  query: z.object({}).passthrough(),
  body: updateAlbumBodySchema
});

export const trackIdParamSchema = z.object({
  params: z.object({
    trackId: uuidSchema
  }),
  query: z.object({}).passthrough(),
  body: z.object({}).passthrough()
});

export const createTrackSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: createTrackBodySchema
});

export const createTrackInAlbumSchema = z.object({
  params: z.object({
    albumId: uuidSchema
  }),
  query: z.object({}).passthrough(),
  body: createTrackInAlbumBodySchema
});

export const updateTrackSchema = z.object({
  params: z.object({
    trackId: uuidSchema
  }),
  query: z.object({}).passthrough(),
  body: updateTrackBodySchema
});
