# Catalog Service — StreamButed

Microservicio de catálogo musical para **artistas, álbumes y pistas** en StreamButed.

## Stack tecnológico

| Componente | Tecnología |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express + TypeScript |
| Arquitectura | Clean Architecture (Domain, Application, Infrastructure, Interfaces) |
| Base de datos | PostgreSQL + Prisma ORM |
| Validación | Zod |
| Mensajería | RabbitMQ (`amqplib`) |
| Pruebas unitarias | Jest |
| Seguridad JWT | Validación local vía **JWKS** (RS256) |

## Reglas de negocio implementadas

1. Solo usuarios con `role: ARTIST` pueden publicar/editar/retirar contenido.
2. Para operaciones de escritura, el `artist_id` efectivo se deriva del `sub` del JWT.
3. El retiro de pistas/álbumes es lógico (`status = RETIRADO`), sin borrado físico.
4. `/catalog/search` solo devuelve contenido publicado (`PUBLICADO`) para álbumes y pistas.
5. `audio_asset_id` y `cover_asset_id` se persisten como UUIDs sin validación externa contra Media Service.

## Integración con Identity Service

- Validación del access token **localmente** usando JWKS publicado por Identity: `GET /api/v1/auth/.well-known/jwks.json`.
- Algoritmo esperado: `RS256`.
- El JWKS se cachea en memoria (sin llamada síncrona por cada request).
- El `accessToken` se envía en `Authorization: Bearer <token>`.
- El `refresh_token` viaja como cookie HttpOnly, por lo que el frontend debe usar `withCredentials: true` al consumir endpoints de autenticación en Identity.
- Consumer RabbitMQ:
  - **Exchange:** `identity.events`
  - **Routing key:** `user.promoted`
  - **Queue (configurable):** `RABBITMQ_USER_PROMOTED_QUEUE` (default: `catalog.user.promoted`)
- Al recibir `user.promoted`, se crea/actualiza automáticamente un artista local con:
  - `artist_id = userId`
  - `display_name = username` (fallback a email/local-part)

### Guía rápida Frontend (`withCredentials: true`)

```ts
const loginResponse = await axios.post(
  "/api/v1/auth/login",
  { email, password },
  { withCredentials: true }
);

const { accessToken } = loginResponse.data;

await axios.get("/api/v1/catalog/search", {
  headers: { Authorization: `Bearer ${accessToken}` }
});

await axios.post(
  "/api/v1/auth/refresh",
  {},
  { withCredentials: true }
);
```

## Variables de entorno

1. Configura las variables en el `.env` unificado de la raíz (`StreamButed/.env`).
2. Reemplaza todos los valores `CHANGE_ME_*` antes de ejecutar con Docker Compose.
3. Configura `JWT_JWKS_URL` (y opcionalmente `JWT_ISSUER`/`JWT_AUDIENCE`) para validar tokens.

```bash
PORT=8082
DATABASE_URL=postgresql://streambuted:CHANGE_ME_DB_PASSWORD@catalog-postgres:5432/streambuted_catalog?schema=public
JWT_JWKS_URL=http://identity-service:8081/api/v1/auth/.well-known/jwks.json
JWT_ISSUER=http://identity-service:8081
JWT_AUDIENCE=
RABBITMQ_URL=amqp://streambuted:CHANGE_ME_RABBITMQ_PASSWORD@rabbitmq:5672
RABBITMQ_USER_PROMOTED_QUEUE=catalog.user.promoted
```

## Orquestación recomendada (Compose maestro)

Desde la raíz del repositorio:

```bash
docker compose up -d --build
```

Para detener todo el ecosistema:

```bash
docker compose down
```

## Modelo de datos (Prisma)

- `Artist`
  - `artist_id` (UUID PK)
  - `display_name`
  - `biography`
  - timestamps
- `Album`
  - `album_id` (UUID PK)
  - `artist_id` (FK)
  - `title`
  - `cover_asset_id` (UUID)
  - `status` (`PUBLICADO` / `RETIRADO`)
- `Track`
  - `track_id` (UUID PK)
  - `artist_id` (FK)
  - `album_id` (FK nullable)
  - `title`
  - `audio_asset_id` (UUID)
  - `cover_asset_id` (UUID)
  - `status` (`PUBLICADO` / `RETIRADO`)

## Endpoints

Base paths soportados:
- `/catalog` (compatibilidad)
- `/api/v1/catalog` (estándar versionado)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/catalog/search?q=...&limit=20&offset=0` | Público | Búsqueda de artistas, álbumes y pistas (solo publicados en álbumes/pistas) |
| GET | `/catalog/artists/:artistId` | Público | Obtener artista |
| PATCH | `/catalog/artists/:artistId` | Bearer JWT | Editar perfil del artista propietario (transicional; candidato a migrarse a Identity) |
| GET | `/catalog/artists/:artistId/albums` | Público | Listar álbumes publicados de un artista |
| GET | `/catalog/artists/:artistId/tracks` | Público | Listar pistas publicadas de un artista |
| GET | `/catalog/albums/:albumId` | Público | Obtener álbum publicado |
| POST | `/catalog/albums` | Bearer JWT | Crear álbum (el artista se deriva de `sub` del JWT) |
| POST | `/catalog/albums/:albumId/tracks` | Bearer JWT | Crear pista dentro de un álbum (el artista se deriva de `sub` del JWT) |
| PATCH | `/catalog/albums/:albumId` | Bearer JWT | Editar álbum (ARTIST propietario) |
| PUT | `/catalog/albums/:albumId` | Bearer JWT | Alias de actualización de álbum (equivalente funcional de PATCH) |
| PATCH | `/catalog/albums/:albumId/retire` | Bearer JWT | Retirar álbum lógicamente |
| GET | `/catalog/tracks/:trackId` | Público | Obtener pista publicada |
| POST | `/catalog/tracks` | Bearer JWT | Crear pista (el artista se deriva de `sub` del JWT) |
| PATCH | `/catalog/tracks/:trackId` | Bearer JWT | Editar pista (ARTIST propietario) |
| PUT | `/catalog/tracks/:trackId` | Bearer JWT | Alias de actualización de pista (equivalente funcional de PATCH) |
| PATCH | `/catalog/tracks/:trackId/retire` | Bearer JWT | Retirar pista lógicamente |

Las mismas rutas también están disponibles bajo `/api/v1/catalog/...`.

Endpoints operativos:

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/health` | Público | Health check del proceso |
| GET | `/api/v1/health` | Público | Health check versionado |

Notas de contrato:
- En `POST /catalog/albums` y `POST /catalog/tracks` no se debe enviar `artistId` en el body.
- El backend usa `request.authenticatedUser.subject` como fuente de verdad para el artista autenticado.

## Ejecución local

```bash
cd services/catalog-service
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Servicio disponible en `http://localhost:8082`.

## Pruebas

```bash
npm test
```

Incluye pruebas unitarias de valor para:
- permisos por rol y ownership (`ARTIST` + `sub`)
- retiro lógico de contenido
- búsqueda de catálogo
- consumo de evento `user.promoted`

## Docker

```bash
docker compose up -d --build
```

Ejecuta ese comando desde la raíz del monorepo para levantar infraestructura y servicios juntos.

---

## Estructura del proyecto

```
services/catalog-service/
├── .dockerignore
├── .gitignore
├── Dockerfile
├── jest.config.js
├── package.json
├── README.md
├── tsconfig.json
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│       ├── migration_lock.toml
│       └── 20260423010000_init/
│           └── migration.sql
├── src/
│   ├── app.ts
│   ├── main.ts
│   ├── application/
│   │   ├── auth/
│   │   │   └── AuthenticatedUser.ts
│   │   ├── errors/
│   │   │   └── AppError.ts
│   │   ├── services/
│   │   │   └── AuthorizationService.ts
│   │   └── useCases/
│   │       ├── albums/
│   │       │   ├── CreateAlbumUseCase.ts
│   │       │   ├── GetAlbumByIdUseCase.ts
│   │       │   ├── ListArtistAlbumsUseCase.ts
│   │       │   ├── RetireAlbumUseCase.ts
│   │       │   └── UpdateAlbumUseCase.ts
│   │       ├── artists/
│   │       │   ├── GetArtistByIdUseCase.ts
│   │       │   ├── HandleUserPromotedUseCase.ts
│   │       │   └── UpdateArtistProfileUseCase.ts
│   │       ├── catalog/
│   │       │   └── SearchCatalogUseCase.ts
│   │       └── tracks/
│   │           ├── CreateTrackUseCase.ts
│   │           ├── GetTrackByIdUseCase.ts
│   │           ├── ListArtistTracksUseCase.ts
│   │           ├── RetireTrackUseCase.ts
│   │           └── UpdateTrackUseCase.ts
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── Album.ts
│   │   │   ├── Artist.ts
│   │   │   └── Track.ts
│   │   ├── enums/
│   │   │   └── CatalogStatus.ts
│   │   ├── repositories/
│   │   │   ├── AlbumRepository.ts
│   │   │   ├── ArtistRepository.ts
│   │   │   └── TrackRepository.ts
│   │   └── valueObjects/
│   │       └── Pagination.ts
│   ├── infrastructure/
│   │   ├── messaging/
│   │   │   └── IdentityPromotionConsumer.ts
│   │   ├── prisma/
│   │   │   └── prismaClient.ts
│   │   └── repositories/
│   │       ├── PrismaAlbumRepository.ts
│   │       ├── PrismaArtistRepository.ts
│   │       └── PrismaTrackRepository.ts
│   └── interfaces/
│       └── http/
│           ├── controllers/
│           │   └── CatalogController.ts
│           ├── middleware/
│           │   ├── AuthenticationMiddleware.ts
│           │   ├── ErrorHandlerMiddleware.ts
│           │   └── ValidateRequest.ts
│           ├── routes/
│           │   └── CatalogRoutes.ts
│           ├── schemas/
│           │   └── CatalogSchemas.ts
│           └── types/
│               └── express.d.ts
└── tests/
    └── unit/
        └── useCases/
            ├── albums/
            │   └── RetireAlbumUseCase.test.ts
            ├── artists/
            │   └── HandleUserPromotedUseCase.test.ts
            ├── catalog/
            │   └── SearchCatalogUseCase.test.ts
            └── tracks/
                └── CreateTrackUseCase.test.ts
```
