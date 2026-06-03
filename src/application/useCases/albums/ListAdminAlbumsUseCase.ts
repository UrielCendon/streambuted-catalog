import { AuthenticatedUser } from "../../auth/AuthenticatedUser";
import { AuthorizationService } from "../../services/AuthorizationService";
import { AdminAlbumListItem, AlbumRepository } from "../../../domain/repositories/AlbumRepository";
import { Pagination } from "../../../domain/valueObjects/Pagination";

export interface AdminAlbumListResponse {
  data: AdminAlbumListItem[];
  pagination: Pagination & { total: number };
}

export class ListAdminAlbumsUseCase {
  constructor(
    private readonly albumRepository: AlbumRepository,
    private readonly authorizationService: AuthorizationService
  ) {}

  public async execute(
    user: AuthenticatedUser,
    includeRetired: boolean,
    pagination: Pagination,
    searchTerm?: string
  ): Promise<AdminAlbumListResponse> {
    this.authorizationService.assertAdminRole(user);

    const [data, total] = await Promise.all([
      this.albumRepository.listAllForAdmin(includeRetired, pagination, searchTerm),
      this.albumRepository.countAllForAdmin(includeRetired, searchTerm)
    ]);

    return {
      data,
      pagination: {
        ...pagination,
        total
      }
    };
  }
}
