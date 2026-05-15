import path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { CatalogStatus } from "../../../../src/domain/enums/CatalogStatus";
import { TrackRepository } from "../../../../src/domain/repositories/TrackRepository";
import { createCatalogPlaybackGrpcServer } from "../../../../src/interfaces/grpc/CatalogPlaybackGrpcServer";

const TRACK_ID = "8ec8d920-a0f4-467d-ad47-53ecf694cbf4";
const AUDIO_ASSET_ID = "d63f4e03-8f01-4f79-8da4-2faf3a9eb20f";

interface PlayableTrackResponse {
  trackId: string;
  status: CatalogStatus;
  audioAssetId: string;
  durationSeconds: number;
  exists: boolean;
}

type GetPlayableTrackCallback = (
  error: grpc.ServiceError | null,
  response: PlayableTrackResponse
) => void;

type CatalogPlaybackClient = grpc.Client & {
  getPlayableTrack(request: { trackId: string }, callback: GetPlayableTrackCallback): void;
};

interface CatalogPlaybackProtoPackage {
  streambuted: {
    catalog: {
      v1: {
        CatalogPlaybackService: new (
          address: string,
          credentials: grpc.ChannelCredentials
        ) => CatalogPlaybackClient;
      };
    };
  };
}

describe("CatalogPlaybackGrpcServer", () => {
  it("returns playable track metadata over gRPC", async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({
        trackId: TRACK_ID,
        artistId: "artist-1",
        albumId: null,
        title: "Cancion",
        genre: "Pop",
        audioAssetId: AUDIO_ASSET_ID,
        coverAssetId: "cover-1",
        durationSeconds: 138,
        status: CatalogStatus.Publicado,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    } as unknown as TrackRepository;
    const server = createCatalogPlaybackGrpcServer(repository);
    const port = await bindServer(server);
    const client = createClient(port);

    const response = await getPlayableTrack(client, TRACK_ID);

    expect(response).toMatchObject({
      trackId: TRACK_ID,
      status: CatalogStatus.Publicado,
      audioAssetId: AUDIO_ASSET_ID,
      durationSeconds: 138,
      exists: true
    });
    await shutdownServer(server);
  });

  it("maps missing tracks to NOT_FOUND", async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue(null)
    } as unknown as TrackRepository;
    const server = createCatalogPlaybackGrpcServer(repository);
    const port = await bindServer(server);
    const client = createClient(port);

    await expect(getPlayableTrack(client, TRACK_ID)).rejects.toMatchObject({
      code: grpc.status.NOT_FOUND
    });
    await shutdownServer(server);
  });
});

const bindServer = async (server: grpc.Server): Promise<number> =>
  new Promise((resolve, reject) => {
    server.bindAsync(
      "127.0.0.1:0",
      grpc.ServerCredentials.createInsecure(),
      (error, port) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      }
    );
  });

const shutdownServer = async (server: grpc.Server): Promise<void> =>
  new Promise((resolve) => {
    server.tryShutdown(() => resolve());
  });

const createClient = (port: number): CatalogPlaybackClient => {
  const protoPath = path.resolve(
    process.cwd(),
    "../../contracts/catalog/catalog_playback.proto"
  );
  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: false,
    longs: Number,
    enums: String,
    defaults: false,
    oneofs: true
  });
  const loadedPackage = grpc.loadPackageDefinition(
    packageDefinition
  ) as unknown as CatalogPlaybackProtoPackage;
  return new loadedPackage.streambuted.catalog.v1.CatalogPlaybackService(
    `127.0.0.1:${port}`,
    grpc.credentials.createInsecure()
  );
};

const getPlayableTrack = async (
  client: CatalogPlaybackClient,
  trackId: string
): Promise<PlayableTrackResponse> =>
  new Promise((resolve, reject) => {
    client.getPlayableTrack({ trackId }, (error, response) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(response);
    });
  });
