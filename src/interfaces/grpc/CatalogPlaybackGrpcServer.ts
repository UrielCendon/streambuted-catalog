import fs from "fs";
import path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { TrackRepository } from "../../domain/repositories/TrackRepository";

interface GrpcGetPlayableTrackRequest {
  trackId?: string;
}

interface GrpcPlayableTrackResponse {
  trackId: string;
  status: string;
  audioAssetId: string;
  durationSeconds?: number;
  exists: boolean;
}

type GetPlayableTrackCall = grpc.ServerUnaryCall<
  GrpcGetPlayableTrackRequest,
  GrpcPlayableTrackResponse
>;

type GetPlayableTrackCallback = grpc.sendUnaryData<GrpcPlayableTrackResponse>;

interface LoadedCatalogPackage {
  streambuted?: {
    catalog?: {
      v1?: {
        CatalogPlaybackService?: grpc.ServiceClientConstructor;
      };
    };
  };
}

export class CatalogPlaybackGrpcService {
  constructor(private readonly trackRepository: TrackRepository) {}

  public getPlayableTrack = async (
    call: GetPlayableTrackCall,
    callback: GetPlayableTrackCallback
  ): Promise<void> => {
    const trackId = call.request.trackId?.trim();
    if (!trackId) {
      callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: "track_id es obligatorio."
      });
      return;
    }

    try {
      const track = await this.trackRepository.findById(trackId);
      if (!track) {
        callback({
          code: grpc.status.NOT_FOUND,
          message: "La pista no existe o ya no esta disponible."
        });
        return;
      }

      callback(null, {
        trackId: track.trackId,
        status: track.status,
        audioAssetId: track.audioAssetId,
        durationSeconds: track.durationSeconds ?? undefined,
        exists: true
      });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error instanceof Error ? error.message : "No se pudo consultar el catalogo."
      });
    }
  };
}

export const createCatalogPlaybackGrpcServer = (
  trackRepository: TrackRepository,
  protoPath?: string
): grpc.Server => {
  const server = new grpc.Server();
  const serviceDefinition = loadCatalogPlaybackServiceDefinition(protoPath);
  const service = new CatalogPlaybackGrpcService(trackRepository);

  server.addService(serviceDefinition, {
    getPlayableTrack: service.getPlayableTrack
  } as grpc.UntypedServiceImplementation);

  return server;
};

export const startCatalogPlaybackGrpcServer = async (
  server: grpc.Server,
  port: number
): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      }
    );
  });
};

export const stopCatalogPlaybackGrpcServer = async (server: grpc.Server): Promise<void> => {
  await new Promise<void>((resolve) => {
    server.tryShutdown(() => {
      resolve();
    });
  });
};

const loadCatalogPlaybackServiceDefinition = (
  configuredProtoPath?: string
): grpc.ServiceDefinition => {
  const packageDefinition = protoLoader.loadSync(
    resolveCatalogPlaybackProtoPath(configuredProtoPath),
    {
      keepCase: false,
      longs: Number,
      enums: String,
      defaults: false,
      oneofs: true
    }
  );

  const loadedPackage = grpc.loadPackageDefinition(packageDefinition) as LoadedCatalogPackage;
  const clientConstructor = loadedPackage.streambuted?.catalog?.v1?.CatalogPlaybackService;
  if (!clientConstructor?.service) {
    throw new Error("CatalogPlaybackService gRPC contract could not be loaded.");
  }

  return clientConstructor.service;
};

const resolveCatalogPlaybackProtoPath = (configuredProtoPath?: string): string => {
  const candidates = [
    configuredProtoPath,
    process.env.CATALOG_PLAYBACK_PROTO_PATH,
    path.resolve(process.cwd(), "contracts/catalog/catalog_playback.proto"),
    path.resolve(process.cwd(), "../contracts/catalog/catalog_playback.proto"),
    path.resolve(process.cwd(), "../../contracts/catalog/catalog_playback.proto"),
    path.resolve(__dirname, "../../../contracts/catalog/catalog_playback.proto"),
    path.resolve(__dirname, "../../../../contracts/catalog/catalog_playback.proto"),
    path.resolve(__dirname, "../../../../../contracts/catalog/catalog_playback.proto")
  ].filter((candidate): candidate is string => Boolean(candidate));

  const resolvedPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!resolvedPath) {
    throw new Error("Unable to locate contracts/catalog/catalog_playback.proto.");
  }

  return resolvedPath;
};
