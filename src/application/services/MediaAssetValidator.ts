import { AppError } from "../errors/AppError";

export type MediaAssetType = "AUDIO" | "TRACK_COVER" | "ALBUM_COVER" | "PROFILE_IMAGE";

export interface MediaAssetMetadata {
  assetId: string;
  assetType: MediaAssetType;
  ownerUserId: string;
  contentType: string;
  sizeBytes: number;
  durationSeconds?: number | null;
  exists: boolean;
}

export interface MediaAssetValidator {
  getMetadata(assetId: string, authorizationHeader: string): Promise<MediaAssetMetadata>;
}

export async function assertMediaAssetMatches(
  validator: MediaAssetValidator | undefined,
  assetId: string,
  expectedType: MediaAssetType,
  ownerUserId: string,
  authorizationHeader?: string
): Promise<MediaAssetMetadata | null> {
  if (!validator) {
    return null;
  }

  if (!authorizationHeader) {
    throw new AppError(401, "Unauthorized", "Authentication context is required to validate media assets.");
  }

  const metadata = await validator.getMetadata(assetId, authorizationHeader);
  if (!metadata.exists || metadata.assetType !== expectedType) {
    throw new AppError(
      400,
      "ValidationError",
      `Asset ${assetId} must exist and be of type ${expectedType}.`
    );
  }

  if (metadata.ownerUserId !== ownerUserId) {
    throw new AppError(
      403,
      "Forbidden",
      "The referenced media asset does not belong to the authenticated user."
    );
  }

  return metadata;
}
