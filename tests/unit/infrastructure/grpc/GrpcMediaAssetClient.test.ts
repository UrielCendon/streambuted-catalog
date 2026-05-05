import * as grpc from "@grpc/grpc-js";
import {
  GrpcMediaAssetClient,
  MediaAssetGrpcClient
} from "../../../../src/infrastructure/grpc/GrpcMediaAssetClient";

const emptyUnaryCall = {} as unknown as grpc.ClientUnaryCall;

describe("GrpcMediaAssetClient", () => {
  it("sends the Authorization header as gRPC metadata", async () => {
    let capturedMetadata: grpc.Metadata | undefined;
    let capturedOptions: grpc.CallOptions | undefined;
    const fakeClient: MediaAssetGrpcClient = {
      getAssetMetadata: jest.fn((request, metadata, options, callback) => {
        capturedMetadata = metadata;
        capturedOptions = options;
        callback(null, {
          assetId: request.assetId,
          assetType: "AUDIO",
          ownerUserId: "8dbf424d-c519-4b2a-8018-2992a5f3f0fd",
          contentType: "audio/mpeg",
          sizeBytes: 42,
          exists: true
        });
        return emptyUnaryCall;
      })
    };
    const client = new GrpcMediaAssetClient("media-service:9093", {
      client: fakeClient,
      timeoutMs: 1500
    });

    const metadata = await client.getMetadata(
      "173d3f1d-9ddb-44e6-af70-779d8bfa9c45",
      "Bearer token"
    );

    expect(metadata.assetType).toBe("AUDIO");
    expect(capturedMetadata?.get("authorization")).toEqual(["Bearer token"]);
    expect(capturedOptions?.deadline).toBeInstanceOf(Date);
  });

  it("maps Media gRPC UNAVAILABLE errors to controlled HTTP errors", async () => {
    const grpcError = Object.assign(new Error("unavailable"), {
      code: grpc.status.UNAVAILABLE
    }) as grpc.ServiceError;
    const fakeClient: MediaAssetGrpcClient = {
      getAssetMetadata: jest.fn((_request, _metadata, _options, callback) => {
        callback(grpcError);
        return emptyUnaryCall;
      })
    };
    const client = new GrpcMediaAssetClient("media-service:9093", {
      client: fakeClient
    });

    await expect(
      client.getMetadata("173d3f1d-9ddb-44e6-af70-779d8bfa9c45", "Bearer token")
    ).rejects.toMatchObject({
      statusCode: 503,
      code: "MediaServiceUnavailable"
    });
  });
});
