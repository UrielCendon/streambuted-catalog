type OpenApiDocument = Record<string, unknown>;

const uuid = {
  type: "string",
  format: "uuid"
};

const isoDateTime = {
  type: "string",
  format: "date-time"
};

const bearerSecurity = [{ BearerAuth: [] }];

const errorResponses = {
  400: { $ref: "#/components/responses/BadRequest" },
  401: { $ref: "#/components/responses/Unauthorized" },
  403: { $ref: "#/components/responses/Forbidden" },
  404: { $ref: "#/components/responses/NotFound" },
  409: { $ref: "#/components/responses/Conflict" },
  500: { $ref: "#/components/responses/InternalServerError" }
};

const jsonContent = (schema: Record<string, unknown>): Record<string, unknown> => ({
  "application/json": {
    schema
  }
});

const ok = (
  description: string,
  schema: Record<string, unknown>
): Record<string, unknown> => ({
  description,
  content: jsonContent(schema)
});

const created = (
  description: string,
  schema: Record<string, unknown>
): Record<string, unknown> => ({
  description,
  content: jsonContent(schema)
});

const pathUuidParameter = (name: string, description: string): Record<string, unknown> => ({
  name,
  in: "path",
  required: true,
  description,
  schema: uuid
});

const paginationParameters = [
  {
    name: "limit",
    in: "query",
    required: false,
    schema: {
      type: "integer",
      minimum: 1,
      maximum: 100,
      default: 50
    }
  },
  {
    name: "offset",
    in: "query",
    required: false,
    schema: {
      type: "integer",
      minimum: 0,
      default: 0
    }
  }
];

const includeRetiredParameter = {
  name: "includeRetired",
  in: "query",
  required: false,
  description: "Incluye recursos retirados o eliminados logicamente.",
  schema: {
    type: "boolean",
    default: true
  }
};

const searchQueryParameter = {
  name: "q",
  in: "query",
  required: false,
  description: "Texto de busqueda. Tambien se acepta searchTerm por compatibilidad.",
  schema: {
    type: "string",
    minLength: 1,
    maxLength: 100
  }
};

const requestBody = (
  schema: Record<string, unknown>,
  description = "Payload JSON"
): Record<string, unknown> => ({
  required: true,
  description,
  content: jsonContent(schema)
});

export const catalogOpenApiDocument: OpenApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "StreamButed Catalog Service",
    version: "1.0.0",
    description:
      "Catalogo musical de StreamButed. Gestiona artistas, albumes y pistas; valida ownership mediante JWT de identity-service y publica eventos de catalogo."
  },
  servers: [
    {
      url: "/",
      description: "Gateway o host actual"
    }
  ],
  tags: [
    { name: "Catalog", description: "Busqueda y lectura publica del catalogo." },
    { name: "Artists", description: "Perfil publico y administrado de artistas." },
    { name: "Albums", description: "Gestion y lectura de albumes." },
    { name: "Tracks", description: "Gestion y lectura de pistas." },
    { name: "Admin", description: "Listados administrativos protegidos." },
    { name: "Health", description: "Health checks HTTP." }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Access token emitido por identity-service."
      }
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        required: ["error", "code", "message", "statusCode", "timestamp"],
        properties: {
          error: { type: "string" },
          code: { type: "string" },
          message: { type: "string" },
          statusCode: { type: "integer" },
          details: { nullable: true },
          timestamp: isoDateTime
        }
      },
      HealthResponse: {
        type: "object",
        required: ["status"],
        properties: {
          status: { type: "string", example: "ok" }
        }
      },
      Pagination: {
        type: "object",
        required: ["limit", "offset", "total"],
        properties: {
          limit: { type: "integer", minimum: 1, example: 50 },
          offset: { type: "integer", minimum: 0, example: 0 },
          total: { type: "integer", minimum: 0, example: 125 }
        }
      },
      Artist: {
        type: "object",
        required: ["artistId", "displayName", "createdAt", "updatedAt"],
        properties: {
          artistId: uuid,
          displayName: { type: "string", example: "Luna Azul" },
          biography: { type: "string", nullable: true },
          profileImageAssetId: { ...uuid, nullable: true },
          createdAt: isoDateTime,
          updatedAt: isoDateTime
        }
      },
      Album: {
        type: "object",
        required: ["albumId", "artistId", "title", "coverAssetId", "status", "createdAt", "updatedAt"],
        properties: {
          albumId: uuid,
          artistId: uuid,
          title: { type: "string", example: "Noches Electricas" },
          coverAssetId: uuid,
          status: { $ref: "#/components/schemas/CatalogStatus" },
          visibilityReason: { $ref: "#/components/schemas/CatalogVisibilityReason" },
          createdAt: isoDateTime,
          updatedAt: isoDateTime
        }
      },
      AdminAlbum: {
        allOf: [
          { $ref: "#/components/schemas/Album" },
          {
            type: "object",
            required: ["artistName", "trackCount"],
            properties: {
              artistName: { type: "string" },
              trackCount: { type: "integer", minimum: 0 }
            }
          }
        ]
      },
      Track: {
        type: "object",
        required: [
          "trackId",
          "artistId",
          "title",
          "genre",
          "audioAssetId",
          "coverAssetId",
          "status",
          "createdAt",
          "updatedAt"
        ],
        properties: {
          trackId: uuid,
          artistId: uuid,
          albumId: { ...uuid, nullable: true },
          title: { type: "string", example: "Primer Latido" },
          genre: { type: "string", example: "indie" },
          audioAssetId: uuid,
          coverAssetId: uuid,
          durationSeconds: { type: "number", nullable: true, example: 214 },
          status: { $ref: "#/components/schemas/CatalogStatus" },
          visibilityReason: { $ref: "#/components/schemas/CatalogVisibilityReason" },
          createdAt: isoDateTime,
          updatedAt: isoDateTime
        }
      },
      AdminTrack: {
        allOf: [
          { $ref: "#/components/schemas/Track" },
          {
            type: "object",
            required: ["artistName"],
            properties: {
              artistName: { type: "string" },
              albumTitle: { type: "string", nullable: true }
            }
          }
        ]
      },
      CatalogStatus: {
        type: "string",
        enum: ["PUBLICADO", "RETIRADO"]
      },
      CatalogVisibilityReason: {
        type: "string",
        nullable: true,
        enum: ["ADMIN_RETIRED", "ARTIST_DELETED"]
      },
      SearchCatalogResponse: {
        type: "object",
        required: ["artists", "albums", "tracks"],
        properties: {
          artists: { type: "array", items: { $ref: "#/components/schemas/Artist" } },
          albums: { type: "array", items: { $ref: "#/components/schemas/Album" } },
          tracks: { type: "array", items: { $ref: "#/components/schemas/Track" } }
        }
      },
      AdminAlbumsResponse: {
        type: "object",
        required: ["data", "pagination"],
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/AdminAlbum" } },
          pagination: { $ref: "#/components/schemas/Pagination" }
        }
      },
      AdminTracksResponse: {
        type: "object",
        required: ["data", "pagination"],
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/AdminTrack" } },
          pagination: { $ref: "#/components/schemas/Pagination" }
        }
      },
      AlbumTracksResponse: {
        type: "object",
        required: ["albumId", "tracks"],
        properties: {
          albumId: uuid,
          tracks: { type: "array", items: { $ref: "#/components/schemas/Track" } }
        }
      },
      TrackBatchResponse: {
        type: "object",
        required: ["tracks"],
        properties: {
          tracks: { type: "array", items: { $ref: "#/components/schemas/AdminTrack" } }
        }
      },
      CreateAlbumRequest: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string", minLength: 1, maxLength: 100 },
          coverAssetId: uuid,
          cover_asset_id: uuid
        }
      },
      UpdateAlbumRequest: {
        type: "object",
        minProperties: 1,
        properties: {
          title: { type: "string", minLength: 1, maxLength: 100 },
          coverAssetId: uuid,
          cover_asset_id: uuid
        }
      },
      UpdateArtistProfileRequest: {
        type: "object",
        minProperties: 1,
        properties: {
          displayName: { type: "string", minLength: 1, maxLength: 100 },
          display_name: { type: "string", minLength: 1, maxLength: 100 },
          biography: { type: "string", nullable: true, maxLength: 1000 },
          profileImageAssetId: { ...uuid, nullable: true },
          profile_image_asset_id: { ...uuid, nullable: true }
        }
      },
      CreateTrackRequest: {
        type: "object",
        required: ["title"],
        properties: {
          albumId: { ...uuid, nullable: true },
          album_id: { ...uuid, nullable: true },
          title: { type: "string", minLength: 1, maxLength: 100 },
          genre: { type: "string", minLength: 1, maxLength: 80 },
          genero: { type: "string", minLength: 1, maxLength: 80 },
          audioAssetId: uuid,
          audio_asset_id: uuid,
          coverAssetId: uuid,
          cover_asset_id: uuid,
          durationSeconds: { type: "number", nullable: true },
          duration_seconds: { type: "number", nullable: true }
        }
      },
      UpdateTrackRequest: {
        type: "object",
        minProperties: 1,
        properties: {
          albumId: { ...uuid, nullable: true },
          album_id: { ...uuid, nullable: true },
          title: { type: "string", minLength: 1, maxLength: 100 },
          genre: { type: "string", minLength: 1, maxLength: 80 },
          genero: { type: "string", minLength: 1, maxLength: 80 },
          audioAssetId: uuid,
          audio_asset_id: uuid,
          coverAssetId: uuid,
          cover_asset_id: uuid,
          durationSeconds: { type: "number", nullable: true },
          duration_seconds: { type: "number", nullable: true }
        }
      },
      BatchTrackIdsRequest: {
        type: "object",
        required: ["trackIds"],
        properties: {
          trackIds: {
            type: "array",
            minItems: 1,
            maxItems: 100,
            items: uuid
          }
        }
      }
    },
    responses: {
      BadRequest: {
        description: "Solicitud invalida.",
        content: jsonContent({ $ref: "#/components/schemas/ErrorResponse" })
      },
      Unauthorized: {
        description: "JWT ausente o invalido.",
        content: jsonContent({ $ref: "#/components/schemas/ErrorResponse" })
      },
      Forbidden: {
        description: "Permisos insuficientes.",
        content: jsonContent({ $ref: "#/components/schemas/ErrorResponse" })
      },
      NotFound: {
        description: "Recurso no encontrado.",
        content: jsonContent({ $ref: "#/components/schemas/ErrorResponse" })
      },
      Conflict: {
        description: "Conflicto de datos o referencias.",
        content: jsonContent({ $ref: "#/components/schemas/ErrorResponse" })
      },
      InternalServerError: {
        description: "Error inesperado.",
        content: jsonContent({ $ref: "#/components/schemas/ErrorResponse" })
      }
    }
  },
  paths: {
    "/api/v1/catalog/health": {
      get: {
        tags: ["Health"],
        summary: "Health check publico del catalogo",
        responses: {
          200: ok("Catalog service activo.", { $ref: "#/components/schemas/HealthResponse" })
        }
      }
    },
    "/api/v1/catalog/search": {
      get: {
        tags: ["Catalog"],
        summary: "Buscar artistas, albumes y pistas publicadas",
        parameters: [
          {
            name: "q",
            in: "query",
            required: false,
            schema: { type: "string", minLength: 1, maxLength: 100 }
          },
          {
            name: "searchTerm",
            in: "query",
            required: false,
            schema: { type: "string", minLength: 1, maxLength: 100 }
          },
          ...paginationParameters
        ],
        responses: {
          200: ok("Resultados agrupados por tipo.", { $ref: "#/components/schemas/SearchCatalogResponse" }),
          400: errorResponses[400],
          500: errorResponses[500]
        }
      }
    },
    "/api/v1/catalog/admin/albums": {
      get: {
        tags: ["Admin"],
        summary: "Listar albumes para moderacion",
        security: bearerSecurity,
        parameters: [includeRetiredParameter, searchQueryParameter, ...paginationParameters],
        responses: {
          200: ok("Albumes paginados.", { $ref: "#/components/schemas/AdminAlbumsResponse" }),
          ...errorResponses
        }
      }
    },
    "/api/v1/catalog/admin/tracks": {
      get: {
        tags: ["Admin"],
        summary: "Listar pistas para moderacion",
        security: bearerSecurity,
        parameters: [includeRetiredParameter, searchQueryParameter, ...paginationParameters],
        responses: {
          200: ok("Pistas paginadas.", { $ref: "#/components/schemas/AdminTracksResponse" }),
          ...errorResponses
        }
      }
    },
    "/api/v1/catalog/artists/{artistId}": {
      get: {
        tags: ["Artists"],
        summary: "Obtener perfil publico de artista",
        parameters: [pathUuidParameter("artistId", "Identificador del artista.")],
        responses: {
          200: ok("Artista encontrado.", { $ref: "#/components/schemas/Artist" }),
          404: errorResponses[404],
          500: errorResponses[500]
        }
      },
      patch: {
        tags: ["Artists"],
        summary: "Actualizar perfil de artista",
        security: bearerSecurity,
        parameters: [pathUuidParameter("artistId", "Identificador del artista.")],
        requestBody: requestBody({ $ref: "#/components/schemas/UpdateArtistProfileRequest" }),
        responses: {
          200: ok("Perfil actualizado.", { $ref: "#/components/schemas/Artist" }),
          ...errorResponses
        }
      }
    },
    "/api/v1/catalog/artists/{artistId}/albums": {
      get: {
        tags: ["Artists"],
        summary: "Listar albumes publicados de un artista",
        parameters: [pathUuidParameter("artistId", "Identificador del artista.")],
        responses: {
          200: ok("Albumes publicados.", { type: "array", items: { $ref: "#/components/schemas/Album" } }),
          404: errorResponses[404],
          500: errorResponses[500]
        }
      }
    },
    "/api/v1/catalog/artists/{artistId}/albums/managed": {
      get: {
        tags: ["Artists"],
        summary: "Listar albumes administrables de un artista",
        security: bearerSecurity,
        parameters: [pathUuidParameter("artistId", "Identificador del artista.")],
        responses: {
          200: ok("Albumes administrables.", { type: "array", items: { $ref: "#/components/schemas/Album" } }),
          ...errorResponses
        }
      }
    },
    "/api/v1/catalog/artists/{artistId}/tracks": {
      get: {
        tags: ["Artists"],
        summary: "Listar pistas publicadas de un artista",
        parameters: [pathUuidParameter("artistId", "Identificador del artista.")],
        responses: {
          200: ok("Pistas publicadas.", { type: "array", items: { $ref: "#/components/schemas/Track" } }),
          404: errorResponses[404],
          500: errorResponses[500]
        }
      }
    },
    "/api/v1/catalog/artists/{artistId}/tracks/managed": {
      get: {
        tags: ["Artists"],
        summary: "Listar pistas administrables de un artista",
        security: bearerSecurity,
        parameters: [pathUuidParameter("artistId", "Identificador del artista.")],
        responses: {
          200: ok("Pistas administrables.", { type: "array", items: { $ref: "#/components/schemas/Track" } }),
          ...errorResponses
        }
      }
    },
    "/api/v1/catalog/albums": {
      post: {
        tags: ["Albums"],
        summary: "Crear album para el artista autenticado",
        security: bearerSecurity,
        requestBody: requestBody({ $ref: "#/components/schemas/CreateAlbumRequest" }),
        responses: {
          201: created("Album creado.", { $ref: "#/components/schemas/Album" }),
          ...errorResponses
        }
      }
    },
    "/api/v1/catalog/albums/{albumId}": {
      get: {
        tags: ["Albums"],
        summary: "Obtener album por id",
        parameters: [pathUuidParameter("albumId", "Identificador del album.")],
        responses: {
          200: ok("Album encontrado.", { $ref: "#/components/schemas/Album" }),
          404: errorResponses[404],
          500: errorResponses[500]
        }
      },
      put: {
        tags: ["Albums"],
        summary: "Actualizar album",
        security: bearerSecurity,
        parameters: [pathUuidParameter("albumId", "Identificador del album.")],
        requestBody: requestBody({ $ref: "#/components/schemas/UpdateAlbumRequest" }),
        responses: {
          200: ok("Album actualizado.", { $ref: "#/components/schemas/Album" }),
          ...errorResponses
        }
      },
      patch: {
        tags: ["Albums"],
        summary: "Actualizar album parcialmente",
        security: bearerSecurity,
        parameters: [pathUuidParameter("albumId", "Identificador del album.")],
        requestBody: requestBody({ $ref: "#/components/schemas/UpdateAlbumRequest" }),
        responses: {
          200: ok("Album actualizado.", { $ref: "#/components/schemas/Album" }),
          ...errorResponses
        }
      },
      delete: {
        tags: ["Albums"],
        summary: "Eliminar logicamente un album",
        security: bearerSecurity,
        parameters: [pathUuidParameter("albumId", "Identificador del album.")],
        responses: {
          200: ok("Album eliminado logicamente.", { $ref: "#/components/schemas/Album" }),
          ...errorResponses
        }
      }
    },
    "/api/v1/catalog/albums/{albumId}/tracks": {
      get: {
        tags: ["Albums"],
        summary: "Listar pistas publicadas de un album",
        parameters: [pathUuidParameter("albumId", "Identificador del album.")],
        responses: {
          200: ok("Pistas del album.", { $ref: "#/components/schemas/AlbumTracksResponse" }),
          404: errorResponses[404],
          500: errorResponses[500]
        }
      },
      post: {
        tags: ["Albums"],
        summary: "Crear pista dentro de un album",
        security: bearerSecurity,
        parameters: [pathUuidParameter("albumId", "Identificador del album.")],
        requestBody: requestBody({ $ref: "#/components/schemas/CreateTrackRequest" }),
        responses: {
          201: created("Pista creada.", { $ref: "#/components/schemas/Track" }),
          ...errorResponses
        }
      }
    },
    "/api/v1/catalog/albums/{albumId}/retire": {
      patch: {
        tags: ["Albums"],
        summary: "Retirar album del catalogo publico",
        security: bearerSecurity,
        parameters: [pathUuidParameter("albumId", "Identificador del album.")],
        responses: {
          200: ok("Album retirado.", { $ref: "#/components/schemas/Album" }),
          ...errorResponses
        }
      }
    },
    "/api/v1/catalog/albums/{albumId}/reinstate": {
      patch: {
        tags: ["Albums"],
        summary: "Restaurar album retirado",
        security: bearerSecurity,
        parameters: [pathUuidParameter("albumId", "Identificador del album.")],
        responses: {
          200: ok("Album restaurado.", { $ref: "#/components/schemas/Album" }),
          ...errorResponses
        }
      }
    },
    "/api/v1/catalog/tracks": {
      post: {
        tags: ["Tracks"],
        summary: "Crear pista para el artista autenticado",
        security: bearerSecurity,
        requestBody: requestBody({ $ref: "#/components/schemas/CreateTrackRequest" }),
        responses: {
          201: created("Pista creada.", { $ref: "#/components/schemas/Track" }),
          ...errorResponses
        }
      }
    },
    "/api/v1/catalog/tracks/batch": {
      post: {
        tags: ["Tracks"],
        summary: "Resolver pistas publicadas por lote de ids",
        requestBody: requestBody({ $ref: "#/components/schemas/BatchTrackIdsRequest" }),
        responses: {
          200: ok("Pistas encontradas.", { $ref: "#/components/schemas/TrackBatchResponse" }),
          400: errorResponses[400],
          500: errorResponses[500]
        }
      }
    },
    "/api/v1/catalog/tracks/{trackId}": {
      get: {
        tags: ["Tracks"],
        summary: "Obtener pista por id",
        parameters: [pathUuidParameter("trackId", "Identificador de la pista.")],
        responses: {
          200: ok("Pista encontrada.", { $ref: "#/components/schemas/Track" }),
          404: errorResponses[404],
          500: errorResponses[500]
        }
      },
      put: {
        tags: ["Tracks"],
        summary: "Actualizar pista",
        security: bearerSecurity,
        parameters: [pathUuidParameter("trackId", "Identificador de la pista.")],
        requestBody: requestBody({ $ref: "#/components/schemas/UpdateTrackRequest" }),
        responses: {
          200: ok("Pista actualizada.", { $ref: "#/components/schemas/Track" }),
          ...errorResponses
        }
      },
      patch: {
        tags: ["Tracks"],
        summary: "Actualizar pista parcialmente",
        security: bearerSecurity,
        parameters: [pathUuidParameter("trackId", "Identificador de la pista.")],
        requestBody: requestBody({ $ref: "#/components/schemas/UpdateTrackRequest" }),
        responses: {
          200: ok("Pista actualizada.", { $ref: "#/components/schemas/Track" }),
          ...errorResponses
        }
      },
      delete: {
        tags: ["Tracks"],
        summary: "Eliminar logicamente una pista",
        security: bearerSecurity,
        parameters: [pathUuidParameter("trackId", "Identificador de la pista.")],
        responses: {
          200: ok("Pista eliminada logicamente.", { $ref: "#/components/schemas/Track" }),
          ...errorResponses
        }
      }
    },
    "/api/v1/catalog/tracks/{trackId}/retire": {
      patch: {
        tags: ["Tracks"],
        summary: "Retirar pista del catalogo publico",
        security: bearerSecurity,
        parameters: [pathUuidParameter("trackId", "Identificador de la pista.")],
        responses: {
          200: ok("Pista retirada.", { $ref: "#/components/schemas/Track" }),
          ...errorResponses
        }
      }
    },
    "/api/v1/catalog/tracks/{trackId}/reinstate": {
      patch: {
        tags: ["Tracks"],
        summary: "Restaurar pista retirada",
        security: bearerSecurity,
        parameters: [pathUuidParameter("trackId", "Identificador de la pista.")],
        responses: {
          200: ok("Pista restaurada.", { $ref: "#/components/schemas/Track" }),
          ...errorResponses
        }
      }
    }
  }
};

export const renderSwaggerUiHtml = (
  serviceName: string,
  initializerPath: string
): string => `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${serviceName} API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      :root {
        color-scheme: dark;
        --sb-bg: #101417;
        --sb-panel: #171d20;
        --sb-border: #3a454b;
        --sb-text: #f3f7f5;
        --sb-muted: #a8b5b0;
        --sb-accent: #32d296;
        --sb-blue: #62a8ff;
      }
      body { margin: 0; background: var(--sb-bg); }
      .swagger-ui { color: var(--sb-text); font-family: Inter, Segoe UI, Arial, sans-serif; }
      .swagger-ui .topbar { display: none; }
      .swagger-ui .wrapper, .swagger-ui .information-container, .swagger-ui .scheme-container {
        background: var(--sb-bg);
        max-width: none;
        padding-left: 28px;
        padding-right: 28px;
      }
      .swagger-ui .info { margin: 48px 0 36px; }
      .swagger-ui .info .title, .swagger-ui .opblock-tag, .swagger-ui h1, .swagger-ui h2,
      .swagger-ui h3, .swagger-ui h4, .swagger-ui h5, .swagger-ui p, .swagger-ui label,
      .swagger-ui table thead tr td, .swagger-ui table thead tr th,
      .swagger-ui .parameter__name, .swagger-ui .parameter__type,
      .swagger-ui .response-col_status, .swagger-ui .response-col_description,
      .swagger-ui .tab li, .swagger-ui .model-title, .swagger-ui .model,
      .swagger-ui .prop-format, .swagger-ui .servers-title {
        color: var(--sb-text) !important;
      }
      .swagger-ui .info .title small, .swagger-ui .info .base-url, .swagger-ui .markdown p,
      .swagger-ui .opblock-tag small, .swagger-ui .parameter__deprecated,
      .swagger-ui .prop-type { color: var(--sb-muted) !important; }
      .swagger-ui .scheme-container {
        background: var(--sb-panel);
        border: 1px solid var(--sb-border);
        box-shadow: none;
        margin: 0 0 34px;
        padding-top: 24px;
        padding-bottom: 24px;
      }
      .swagger-ui .opblock,
      .swagger-ui .opblock .opblock-section-header,
      .swagger-ui .responses-inner,
      .swagger-ui .opblock-description-wrapper,
      .swagger-ui .parameters-container,
      .swagger-ui .model-box,
      .swagger-ui section.models {
        background: var(--sb-panel);
        border-color: var(--sb-border);
        box-shadow: none;
      }
      .swagger-ui input, .swagger-ui select, .swagger-ui textarea {
        background: #0f1417 !important;
        border-color: #c8d2d8 !important;
        color: var(--sb-text) !important;
      }
      .swagger-ui .btn, .swagger-ui .auth-wrapper .authorize {
        background: transparent;
        border-color: var(--sb-accent);
        color: var(--sb-accent);
      }
      .swagger-ui a, .swagger-ui .info a { color: var(--sb-blue) !important; }
      .swagger-ui .filter .operation-filter-input {
        background: #11171a !important;
        border: 2px solid #c8d2d8 !important;
        color: var(--sb-text) !important;
      }
      .swagger-ui .dialog-ux .modal-ux,
      .swagger-ui .dialog-ux .modal-ux-header,
      .swagger-ui .dialog-ux .modal-ux-content {
        background: var(--sb-panel);
        border-color: var(--sb-border);
        color: var(--sb-text);
      }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
    <script src="${initializerPath}"></script>
  </body>
</html>`;

export const renderSwaggerUiInitializer = (openApiUrl: string): string => `
window.addEventListener("load", () => {
  window.ui = SwaggerUIBundle({
    url: ${JSON.stringify(openApiUrl)},
    dom_id: "#swagger-ui",
    deepLinking: true,
    displayRequestDuration: true,
    filter: true,
    persistAuthorization: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset
    ],
    layout: "StandaloneLayout"
  });
});
`;
