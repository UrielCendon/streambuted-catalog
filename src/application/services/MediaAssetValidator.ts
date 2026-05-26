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
    throw new AppError(401, "Unauthorized", "Se requiere contexto de autenticacion para validar archivos multimedia.");
  }

  const metadata = await validator.getMetadata(assetId, authorizationHeader);
  if (!metadata.exists || metadata.assetType !== expectedType) {
    throw new AppError(
      400,
      "ValidationError",
      `El archivo ${assetId} debe existir y ser de tipo ${expectedType}.`
    );
  }

  if (metadata.ownerUserId !== ownerUserId) {
    throw new AppError(
      403,
      "Forbidden",
      "El archivo multimedia indicado no pertenece al usuario autenticado."
    );
  }

  return metadata;
}
