import { AuthenticatedUser } from "../../auth/AuthenticatedUser";
import { AuthorizationService } from "../../services/AuthorizationService";
import { AdminTrackListItem, TrackRepository } from "../../../domain/repositories/TrackRepository";
import { Pagination } from "../../../domain/valueObjects/Pagination";

export interface AdminTrackListResponse {
  data: AdminTrackListItem[];
  pagination: Pagination & { total: number };
}

export class ListAdminTracksUseCase {
  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly authorizationService: AuthorizationService
  ) {}

  public async execute(
    user: AuthenticatedUser,
    includeRetired: boolean,
    pagination: Pagination,
    searchTerm?: string
  ): Promise<AdminTrackListResponse> {
    this.authorizationService.assertAdminRole(user);

    const [data, total] = await Promise.all([
      this.trackRepository.listAllForAdmin(includeRetired, pagination, searchTerm),
      this.trackRepository.countAllForAdmin(includeRetired, searchTerm)
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
