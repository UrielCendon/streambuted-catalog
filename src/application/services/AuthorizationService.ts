import { AuthenticatedUser } from "../auth/AuthenticatedUser";
import { AppError } from "../errors/AppError";

export class AuthorizationService {
  public assertAdminRole(user: AuthenticatedUser): void {
    if (this.normalizeRole(user.role) !== "ADMIN") {
      throw new AppError(403, "Forbidden", "Solo los administradores pueden realizar esta accion.");
    }
  }

  public assertArtistRole(user: AuthenticatedUser): void {
    if (this.normalizeRole(user.role) !== "ARTIST") {
      throw new AppError(403, "Forbidden", "Solo los artistas pueden publicar o editar contenido del catalogo.");
    }
  }

  public assertOwnership(user: AuthenticatedUser, artistId: string): void {
    if (user.subject !== artistId) {
      throw new AppError(403, "Forbidden", "El artist_id debe coincidir con el usuario autenticado.");
    }
  }

  public assertArtistOwnership(user: AuthenticatedUser, artistId: string): void {
    this.assertArtistRole(user);
    this.assertOwnership(user, artistId);
  }

  public assertArtistOwnershipOrAdmin(user: AuthenticatedUser, artistId: string): void {
    if (this.normalizeRole(user.role) === "ADMIN") {
      return;
    }

    this.assertArtistOwnership(user, artistId);
  }

  private normalizeRole(role: string): string {
    const normalizedRole = role.trim().toUpperCase();
    if (normalizedRole.startsWith("ROLE_")) {
      return normalizedRole.slice(5);
    }

    return normalizedRole;
  }
}
