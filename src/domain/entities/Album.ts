import { CatalogStatus } from "../enums/CatalogStatus";

export interface Album {
  albumId: string;
  artistId: string;
  title: string;
  coverAssetId: string;
  status: CatalogStatus;
  createdAt: Date;
  updatedAt: Date;
}
