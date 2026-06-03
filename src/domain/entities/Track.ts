import { CatalogStatus } from "../enums/CatalogStatus";
import { CatalogVisibilityReason } from "../enums/CatalogVisibilityReason";

export interface Track {
  trackId: string;
  artistId: string;
  albumId: string | null;
  title: string;
  genre: string;
  audioAssetId: string;
  coverAssetId: string;
  durationSeconds: number | null;
  status: CatalogStatus;
  visibilityReason: CatalogVisibilityReason | null;
  createdAt: Date;
  updatedAt: Date;
}
