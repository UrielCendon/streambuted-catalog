import { z } from "zod";

const uuidSchema = z.string().uuid();
const catalogNameSchema = z.string().trim().min(1).max(100);
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
    displayName: catalogNameSchema.optional(),
    display_name: catalogNameSchema.optional(),
    biography: z.string().trim().max(1000).nullable().optional(),
    profileImageAssetId: uuidSchema.nullable().optional(),
    profile_image_asset_id: uuidSchema.nullable().optional()
  })
  .transform((value) => ({
    displayName: value.displayName ?? value.display_name,
    biography: value.biography,
    profileImageAssetId: firstDefined(value, "profileImageAssetId", "profile_image_asset_id")
  }))
  .refine((value) => hasAtLeastOneField(value, ["displayName", "biography", "profileImageAssetId"]), {
    message: "Debes enviar al menos un campo del perfil."
  });

const createAlbumBodySchema = z
  .object({
    title: catalogNameSchema,
    coverAssetId: uuidSchema.optional(),
    cover_asset_id: uuidSchema.optional()
  })
  .refine((value) => hasAtLeastOneAlias(value, ["coverAssetId", "cover_asset_id"]), {
    message: "Debes enviar coverAssetId o cover_asset_id."
  })
  .transform((value) => ({
    title: value.title,
    coverAssetId: value.coverAssetId ?? value.cover_asset_id
  }));

const updateAlbumBodySchema = z
  .object({
    title: catalogNameSchema.optional(),
    coverAssetId: uuidSchema.optional(),
    cover_asset_id: uuidSchema.optional()
  })
  .transform((value) => ({
    title: value.title,
    coverAssetId: value.coverAssetId ?? value.cover_asset_id
  }))
  .refine((value) => hasAtLeastOneField(value, ["title", "coverAssetId"]), {
    message: "Debes enviar al menos un campo del album."
  });

const createTrackBodySchema = z
  .object({
    albumId: uuidSchema.nullable().optional(),
    album_id: uuidSchema.nullable().optional(),
    title: catalogNameSchema,
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
    message: "Debes enviar audioAssetId o audio_asset_id."
  })
  .refine((value) => hasAtLeastOneOf(value, ["genre", "genero"]), {
    message: "Debes enviar genre o genero."
  })
  .refine((value) => hasAtLeastOneAlias(value, ["coverAssetId", "cover_asset_id"]), {
    message: "Debes enviar coverAssetId o cover_asset_id."
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
    title: catalogNameSchema,
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
    message: "Debes enviar audioAssetId o audio_asset_id."
  })
  .refine((value) => hasAtLeastOneOf(value, ["genre", "genero"]), {
    message: "Debes enviar genre o genero."
  })
  .refine((value) => hasAtLeastOneAlias(value, ["coverAssetId", "cover_asset_id"]), {
    message: "Debes enviar coverAssetId o cover_asset_id."
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
    title: catalogNameSchema.optional(),
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
    message: "Debes enviar al menos un campo de la pista."
  });

export const searchCatalogSchema = z.object({
  params: z.object({}).passthrough(),
  query: z
    .object({
    searchTerm: z.string().trim().min(1).max(100).optional(),
    q: z.string().trim().min(1).max(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0)
  })
    .refine((value) => value.searchTerm !== undefined || value.q !== undefined, {
      message: "Debes enviar searchTerm o q para buscar."
    })
    .transform((value) => ({
      searchTerm: value.searchTerm ?? value.q,
      limit: value.limit,
      offset: value.offset
    })),
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
