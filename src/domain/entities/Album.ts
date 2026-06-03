import { CatalogStatus } from "../enums/CatalogStatus";
import { CatalogVisibilityReason } from "../enums/CatalogVisibilityReason";

export interface Album {
  albumId: string;
  artistId: string;
  title: string;
  coverAssetId: string;
  status: CatalogStatus;
  visibilityReason: CatalogVisibilityReason | null;
  createdAt: Date;
  updatedAt: Date;
}
