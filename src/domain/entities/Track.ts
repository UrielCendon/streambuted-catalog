import { CatalogStatus } from "../enums/CatalogStatus";

export interface Track {
  trackId: string;
  artistId: string;
  albumId: string | null;
  title: string;
  audioAssetId: string;
  coverAssetId: string;
  status: CatalogStatus;
  createdAt: Date;
  updatedAt: Date;
}
