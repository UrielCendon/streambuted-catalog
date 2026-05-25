import { z } from "zod";

const uuidSchema = z.string().uuid();
const genreSchema = z.string().trim().min(1).max(80);
const durationSecondsSchema = z.number().finite().positive().nullable();
const optionalBooleanQuerySchema = z.preprocess((value) => {
  if (value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }

  return value;
}, z.boolean());

const hasAtLeastOneField = (value: Record<string, unknown>, fieldNames: string[]): boolean =>
  fieldNames.some((fieldName) => value[fieldName] !== undefined);

const hasAtLeastOneAlias = (value: Record<string, unknown>, aliases: [string, string]): boolean =>
  value[aliases[0]] !== undefined || value[aliases[1]] !== undefined;

const hasAtLeastOneOf = (value: Record<string, unknown>, fieldNames: string[]): boolean =>
  fieldNames.some((fieldName) => value[fieldName] !== undefined);

const firstDefined = <T extends Record<string, unknown>>(value: T, firstKey: keyof T, secondKey: keyof T) =>
  value[firstKey] !== undefined ? value[firstKey] : value[secondKey];

const createArtistProfileBodySchema = z
  .object({
    displayName: z.string().trim().min(1).max(120).optional(),
    display_name: z.string().trim().min(1).max(120).optional(),
    biography: z.string().trim().max(4000).nullable().optional(),
    profileImageAssetId: uuidSchema.nullable().optional(),
    profile_image_asset_id: uuidSchema.nullable().optional()
  })
  .transform((value) => ({
    displayName: value.displayName ?? value.display_name,
    biography: value.biography,
    profileImageAssetId: firstDefined(value, "profileImageAssetId", "profile_image_asset_id")
  }))
  .refine((value) => hasAtLeastOneField(value, ["displayName", "biography", "profileImageAssetId"]), {
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
    genre: genreSchema.optional(),
    genero: genreSchema.optional(),
    audioAssetId: uuidSchema.optional(),
    audio_asset_id: uuidSchema.optional(),
    coverAssetId: uuidSchema.optional(),
    cover_asset_id: uuidSchema.optional(),
    durationSeconds: durationSecondsSchema.optional(),
    duration_seconds: durationSecondsSchema.optional()
  })
  .refine((value) => hasAtLeastOneAlias(value, ["audioAssetId", "audio_asset_id"]), {
    message: "audioAssetId or audio_asset_id is required."
  })
  .refine((value) => hasAtLeastOneOf(value, ["genre", "genero"]), {
    message: "genre or genero is required."
  })
  .refine((value) => hasAtLeastOneAlias(value, ["coverAssetId", "cover_asset_id"]), {
    message: "coverAssetId or cover_asset_id is required."
  })
  .transform((value) => ({
    albumId: firstDefined(value, "albumId", "album_id"),
    title: value.title,
    genre: value.genre ?? value.genero,
    audioAssetId: value.audioAssetId ?? value.audio_asset_id,
    coverAssetId: value.coverAssetId ?? value.cover_asset_id,
    durationSeconds: firstDefined(value, "durationSeconds", "duration_seconds")
  }));

const createTrackInAlbumBodySchema = z
  .object({
    title: z.string().trim().min(1).max(220),
    genre: genreSchema.optional(),
    genero: genreSchema.optional(),
    audioAssetId: uuidSchema.optional(),
    audio_asset_id: uuidSchema.optional(),
    coverAssetId: uuidSchema.optional(),
    cover_asset_id: uuidSchema.optional(),
    durationSeconds: durationSecondsSchema.optional(),
    duration_seconds: durationSecondsSchema.optional()
  })
  .refine((value) => hasAtLeastOneAlias(value, ["audioAssetId", "audio_asset_id"]), {
    message: "audioAssetId or audio_asset_id is required."
  })
  .refine((value) => hasAtLeastOneOf(value, ["genre", "genero"]), {
    message: "genre or genero is required."
  })
  .refine((value) => hasAtLeastOneAlias(value, ["coverAssetId", "cover_asset_id"]), {
    message: "coverAssetId or cover_asset_id is required."
  })
  .transform((value) => ({
    title: value.title,
    genre: value.genre ?? value.genero,
    audioAssetId: value.audioAssetId ?? value.audio_asset_id,
    coverAssetId: value.coverAssetId ?? value.cover_asset_id,
    durationSeconds: firstDefined(value, "durationSeconds", "duration_seconds")
  }));

const updateTrackBodySchema = z
  .object({
    albumId: uuidSchema.nullable().optional(),
    album_id: uuidSchema.nullable().optional(),
    title: z.string().trim().min(1).max(220).optional(),
    genre: genreSchema.optional(),
    genero: genreSchema.optional(),
    audioAssetId: uuidSchema.optional(),
    audio_asset_id: uuidSchema.optional(),
    coverAssetId: uuidSchema.optional(),
    cover_asset_id: uuidSchema.optional(),
    durationSeconds: durationSecondsSchema.optional(),
    duration_seconds: durationSecondsSchema.optional()
  })
  .transform((value) => ({
    albumId: firstDefined(value, "albumId", "album_id"),
    title: value.title,
    genre: value.genre ?? value.genero,
    audioAssetId: value.audioAssetId ?? value.audio_asset_id,
    coverAssetId: value.coverAssetId ?? value.cover_asset_id,
    durationSeconds: firstDefined(value, "durationSeconds", "duration_seconds")
  }))
  .refine((value) => hasAtLeastOneField(value, ["albumId", "title", "genre", "audioAssetId", "coverAssetId", "durationSeconds"]), {
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

export const adminCatalogListSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({
    includeRetired: optionalBooleanQuerySchema,
    limit: z.coerce.number().int().min(1).max(100).default(50),
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

export const batchTrackIdsSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z.object({
    trackIds: z.array(uuidSchema).min(1).max(100)
  })
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
