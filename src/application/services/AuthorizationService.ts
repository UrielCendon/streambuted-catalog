import { AuthenticatedUser } from "../auth/AuthenticatedUser";
import { AppError } from "../errors/AppError";

export class AuthorizationService {
  public assertArtistRole(user: AuthenticatedUser): void {
    if (this.normalizeRole(user.role) !== "ARTIST") {
      throw new AppError(403, "Forbidden", "Only users with role ARTIST can publish or edit catalog content.");
    }
  }

  public assertOwnership(user: AuthenticatedUser, artistId: string): void {
    if (user.subject !== artistId) {
      throw new AppError(403, "Forbidden", "The artist_id must match the authenticated token subject.");
    }
  }

  public assertArtistOwnership(user: AuthenticatedUser, artistId: string): void {
    this.assertArtistRole(user);
    this.assertOwnership(user, artistId);
  }

  private normalizeRole(role: string): string {
    const normalizedRole = role.trim().toUpperCase();
    if (normalizedRole.startsWith("ROLE_")) {
      return normalizedRole.slice(5);
    }

    return normalizedRole;
  }
}
