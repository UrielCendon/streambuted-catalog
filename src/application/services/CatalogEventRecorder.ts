import { Album } from "../../domain/entities/Album";
import { Artist } from "../../domain/entities/Artist";
import { Track } from "../../domain/entities/Track";

export interface CatalogEventRecorder {
  recordArtistSnapshot(artist: Artist): Promise<void>;
  recordAlbumSnapshot(album: Album): Promise<void>;
  recordTrackSnapshot(track: Track): Promise<void>;
}
