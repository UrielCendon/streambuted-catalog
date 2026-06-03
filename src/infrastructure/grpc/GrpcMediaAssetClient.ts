import fs from "fs";
import path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { AppError } from "../../application/errors/AppError";
import {
  MediaAssetMetadata,
  MediaAssetValidator
} from "../../application/services/MediaAssetValidator";

const DEFAULT_MEDIA_GRPC_TARGET = "media-service:9093";
const DEFAULT_MEDIA_GRPC_TIMEOUT_MS = 2000;

interface GrpcGetAssetMetadataRequest {
  assetId: string;
}

interface GrpcAssetMetadataResponse {
  assetId?: string;
  assetType?: string;
  ownerUserId?: string;
  contentType?: string;
  sizeBytes?: number | string;
  durationSeconds?: number | string;
  exists?: boolean;
}

type GetAssetMetadataCallback = (
  error: grpc.ServiceError | null,
  response?: GrpcAssetMetadataResponse
) => void;

export interface MediaAssetGrpcClient {
  getAssetMetadata(
    request: GrpcGetAssetMetadataRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: GetAssetMetadataCallback
  ): grpc.ClientUnaryCall;
}

interface MediaAssetServiceClientConstructor {
  new (address: string, credentials: grpc.ChannelCredentials): MediaAssetGrpcClient;
}

interface LoadedMediaPackage {
  streambuted?: {
    media?: {
      v1?: {
        MediaAssetService?: unknown;
      };
    };
  };
}

interface GrpcMediaAssetClientOptions {
  timeoutMs?: number;
  protoPath?: string;
  client?: MediaAssetGrpcClient;
}

export class GrpcMediaAssetClient implements MediaAssetValidator {
  private readonly client: MediaAssetGrpcClient;
  private readonly timeoutMs: number;

  constructor(target = DEFAULT_MEDIA_GRPC_TARGET, options: GrpcMediaAssetClientOptions = {}) {
    const normalizedTarget = target.trim();
    if (!normalizedTarget) {
      throw new Error("MEDIA_GRPC_TARGET must be configured.");
    }

    this.timeoutMs = options.timeoutMs ?? DEFAULT_MEDIA_GRPC_TIMEOUT_MS;
    this.client = options.client ?? buildMediaAssetClient(normalizedTarget, options.protoPath);
  }

  public async getMetadata(
    assetId: string,
    authorizationHeader: string
  ): Promise<MediaAssetMetadata> {
    if (!authorizationHeader.trim()) {
      throw new AppError(401, "Unauthorized", "Se requiere contexto de autenticacion para validar archivos multimedia.");
    }

    const metadata = new grpc.Metadata();
    metadata.set("authorization", authorizationHeader);
    const deadline = new Date(Date.now() + this.timeoutMs);

    return new Promise((resolve, reject) => {
      this.client.getAssetMetadata(
        { assetId },
        metadata,
        { deadline },
        (error, response) => {
          if (error) {
            reject(mapGrpcError(error, assetId));
            return;
          }

          try {
            resolve(normalizeMetadataResponse(response, assetId));
          } catch (normalizationError) {
            reject(normalizationError);
          }
        }
      );
    });
  }
}

const buildMediaAssetClient = (
  target: string,
  configuredProtoPath?: string
): MediaAssetGrpcClient => {
  const packageDefinition = protoLoader.loadSync(
    resolveMediaAssetProtoPath(configuredProtoPath),
    {
      keepCase: false,
      longs: Number,
      enums: String,
      defaults: false,
      oneofs: true
    }
  );

  const loadedPackage = grpc.loadPackageDefinition(packageDefinition) as LoadedMediaPackage;
  const clientConstructor = loadedPackage.streambuted?.media?.v1?.MediaAssetService;

  if (!isMediaAssetServiceClientConstructor(clientConstructor)) {
    throw new Error("MediaAssetService gRPC contract could not be loaded.");
  }

  return new clientConstructor(target, grpc.credentials.createInsecure());
};

const isMediaAssetServiceClientConstructor = (
  value: unknown
): value is MediaAssetServiceClientConstructor => typeof value === "function";

const resolveMediaAssetProtoPath = (configuredProtoPath?: string): string => {
  const candidates = [
    configuredProtoPath,
    process.env.MEDIA_ASSET_PROTO_PATH,
    path.resolve(process.cwd(), "contracts/media/media_asset.proto"),
    path.resolve(process.cwd(), "../contracts/media/media_asset.proto"),
    path.resolve(process.cwd(), "../../contracts/media/media_asset.proto"),
    path.resolve(__dirname, "../../../contracts/media/media_asset.proto"),
    path.resolve(__dirname, "../../../../contracts/media/media_asset.proto")
  ].filter((candidate): candidate is string => Boolean(candidate));

  const resolvedPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!resolvedPath) {
    throw new Error("Unable to locate contracts/media/media_asset.proto.");
  }

  return resolvedPath;
};

const normalizeMetadataResponse = (
  response: GrpcAssetMetadataResponse | undefined,
  assetId: string
): MediaAssetMetadata => {
  if (
    !response ||
    typeof response.assetId !== "string" ||
    typeof response.assetType !== "string" ||
    typeof response.ownerUserId !== "string" ||
    typeof response.contentType !== "string" ||
    typeof response.exists !== "boolean"
  ) {
    throw new AppError(
      502,
      "MediaServiceUnavailable",
      "No se pudo validar la informacion relacionada con esta accion."
    );
  }

  const parsedDurationSeconds = response.durationSeconds === undefined
    ? null
    : Number(response.durationSeconds);
  const durationSeconds = parsedDurationSeconds !== null &&
    Number.isFinite(parsedDurationSeconds) &&
    parsedDurationSeconds > 0
    ? parsedDurationSeconds
    : null;

  return {
    assetId: response.assetId || assetId,
    assetType: response.assetType as MediaAssetMetadata["assetType"],
    ownerUserId: response.ownerUserId,
    contentType: response.contentType,
    sizeBytes: Number(response.sizeBytes ?? 0),
    durationSeconds,
    exists: response.exists
  };
};

const mapGrpcError = (error: grpc.ServiceError, assetId: string): AppError => {
  switch (error.code) {
    case grpc.status.UNAUTHENTICATED:
      return new AppError(401, "Unauthorized", "Tu sesion expiro. Inicia sesion nuevamente.");
    case grpc.status.PERMISSION_DENIED:
      return new AppError(403, "Forbidden", "El archivo multimedia indicado no es accesible.");
    case grpc.status.NOT_FOUND:
    case grpc.status.INVALID_ARGUMENT:
      return new AppError(400, "ValidationError", `No se encontro el archivo multimedia ${assetId}.`);
    case grpc.status.UNAVAILABLE:
      return new AppError(
        503,
        "MediaServiceUnavailable",
        "Esta funcion no esta disponible en este momento. Intenta de nuevo mas tarde."
      );
    case grpc.status.DEADLINE_EXCEEDED:
      return new AppError(
        504,
        "MediaServiceTimeout",
        "La solicitud tardo demasiado y no se pudo completar. Intenta nuevamente."
      );
    default:
      return new AppError(
        502,
        "MediaServiceUnavailable",
        "No se pudo validar la informacion relacionada con esta accion."
      );
  }
};
