import { User } from '../../../domain/entities/user/user.entity';
import { UserResponseDto } from '../../use-cases/user/create-user/create-user.dto';

export class UserMapper {
  /**
   * Map User entity to response DTO
   */
  static toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id.getValue(),
      name: user.name.getValue(),
      email: user.email.getValue(),
      role: user.role.getValue(),
      status: user.status.getValue(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };
  }

  /**
   * Map User entity to summary DTO (without sensitive information)
   */
  static toSummaryDto(user: User): Omit<UserResponseDto, 'email'> {
    return {
      id: user.id.getValue(),
      name: user.name.getValue(),
      role: user.role.getValue(),
      status: user.status.getValue(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };
  }

  /**
   * Map multiple users to response DTOs
   */
  static toResponseDtos(users: User[]): UserResponseDto[] {
    return users.map(user => this.toResponseDto(user));
  }

  /**
   * Map User entity to public profile DTO
   */
  static toPublicProfileDto(user: User): {
    id: string;
    name: string;
    role: string;
    status: string;
    joinedAt: string;
  } {
    return {
      id: user.id.getValue(),
      name: user.name.getValue(),
      role: user.role.getValue(),
      status: user.status.getValue(),
      joinedAt: user.createdAt.toISOString()
    };
  }

  /**
   * Map User entity for admin view (with all details)
   */
  static toAdminDto(user: User): UserResponseDto & {
    permissions: string[];
    lastLoginAt?: string;
  } {
    return {
      ...this.toResponseDto(user),
      permissions: this.getUserPermissions(user),
      // lastLoginAt would come from a separate tracking system
    };
  }

  private static getUserPermissions(user: User): string[] {
    const permissions: string[] = [];

    if (user.canLogin()) {
      permissions.push('login');
    }

    if (user.canManageUsers()) {
      permissions.push('manage_users');
    }

    if (user.role.isAdmin()) {
      permissions.push('admin_access', 'system_settings', 'view_analytics');
    }

    if (user.role.isEnterprise() || user.role.isAdmin()) {
      permissions.push('team_management', 'api_access');
    }

    if (user.role.isPaid() || user.role.isEnterprise() || user.role.isAdmin()) {
      permissions.push('advanced_features', 'priority_support');
    }

    return permissions;
  }
}