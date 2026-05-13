export interface Artist {
  artistId: string;
  displayName: string;
  biography: string | null;
  profileImageAssetId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
