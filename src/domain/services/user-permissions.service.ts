import { UserRole, UserRoleType, UserStatus } from '../entities/user/user.value-objects';

export class UserPermissions {
  /**
   * Check if a user with the given role can change another user's role
   */
  static canChangeRole(
    performerRole: UserRoleType,
    targetCurrentRole: UserRoleType,
    targetNewRole: UserRoleType
  ): boolean {
    const roleHierarchy = {
      [UserRoleType.FREE]: 0,
      [UserRoleType.PAID]: 1,
      [UserRoleType.ENTERPRISE]: 2,
      [UserRoleType.ADMIN]: 3
    };

    const performerLevel = roleHierarchy[performerRole];
    const targetCurrentLevel = roleHierarchy[targetCurrentRole];
    const targetNewLevel = roleHierarchy[targetNewRole];

    // Only admins can change roles
    if (performerRole !== UserRoleType.ADMIN) {
      return false;
    }

    // Admins can change any role to any other role
    // but let's add some business rules:

    // Cannot downgrade yourself (this should be handled at the application level)
    // Cannot promote someone to admin level (business decision)
    if (targetNewRole === UserRoleType.ADMIN) {
      return false;
    }

    return true;
  }

  /**
   * Check if a user can create another user with the specified role
   */
  static canCreateUserWithRole(
    creatorRole: UserRoleType,
    newUserRole: UserRoleType
  ): boolean {
    const roleHierarchy = {
      [UserRoleType.FREE]: 0,
      [UserRoleType.PAID]: 1,
      [UserRoleType.ENTERPRISE]: 2,
      [UserRoleType.ADMIN]: 3
    };

    const creatorLevel = roleHierarchy[creatorRole];
    const newUserLevel = roleHierarchy[newUserRole];

    // Only admin and enterprise can create users
    if (creatorRole !== UserRoleType.ADMIN && creatorRole !== UserRoleType.ENTERPRISE) {
      return false;
    }

    // Enterprise users cannot create admin users
    if (creatorRole === UserRoleType.ENTERPRISE && newUserRole === UserRoleType.ADMIN) {
      return false;
    }

    // Admins can create any type of user except other admins
    if (creatorRole === UserRoleType.ADMIN && newUserRole === UserRoleType.ADMIN) {
      return false;
    }

    return true;
  }

  /**
   * Check if a user can access a specific feature based on their role
   */
  static canAccessFeature(userRole: UserRoleType, requiredRole: UserRoleType): boolean {
    const roleHierarchy = {
      [UserRoleType.FREE]: 0,
      [UserRoleType.PAID]: 1,
      [UserRoleType.ENTERPRISE]: 2,
      [UserRoleType.ADMIN]: 3
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  /**
   * Get the features available for a specific role
   */
  static getAvailableFeatures(userRole: UserRoleType): string[] {
    const features = {
      [UserRoleType.FREE]: [
        'basic_dashboard',
        'profile_management',
        'basic_support'
      ],
      [UserRoleType.PAID]: [
        'basic_dashboard',
        'profile_management',
        'basic_support',
        'advanced_analytics',
        'priority_support',
        'export_data'
      ],
      [UserRoleType.ENTERPRISE]: [
        'basic_dashboard',
        'profile_management',
        'basic_support',
        'advanced_analytics',
        'priority_support',
        'export_data',
        'team_management',
        'api_access',
        'custom_integrations',
        'dedicated_support'
      ],
      [UserRoleType.ADMIN]: [
        'basic_dashboard',
        'profile_management',
        'basic_support',
        'advanced_analytics',
        'priority_support',
        'export_data',
        'team_management',
        'api_access',
        'custom_integrations',
        'dedicated_support',
        'user_management',
        'system_configuration',
        'audit_logs',
        'security_settings'
      ]
    };

    return features[userRole] || [];
  }

  /**
   * Check if a user can manage other users
   */
  static canManageUsers(userRole: UserRoleType): boolean {
    return userRole === UserRoleType.ADMIN || userRole === UserRoleType.ENTERPRISE;
  }

  /**
   * Check if a user can view system analytics
   */
  static canViewSystemAnalytics(userRole: UserRoleType): boolean {
    return userRole === UserRoleType.ADMIN;
  }

  /**
   * Check if a user can modify system settings
   */
  static canModifySystemSettings(userRole: UserRoleType): boolean {
    return userRole === UserRoleType.ADMIN;
  }

  /**
   * Get the maximum number of team members a user can manage
   */
  static getMaxTeamMembers(userRole: UserRoleType): number {
    const limits = {
      [UserRoleType.FREE]: 0,
      [UserRoleType.PAID]: 5,
      [UserRoleType.ENTERPRISE]: 100,
      [UserRoleType.ADMIN]: Number.MAX_SAFE_INTEGER
    };

    return limits[userRole] || 0;
  }

  /**
   * Get rate limits for API calls based on user role
   */
  static getApiRateLimit(userRole: UserRoleType): { requestsPerMinute: number; requestsPerHour: number } {
    const limits = {
      [UserRoleType.FREE]: { requestsPerMinute: 10, requestsPerHour: 100 },
      [UserRoleType.PAID]: { requestsPerMinute: 60, requestsPerHour: 1000 },
      [UserRoleType.ENTERPRISE]: { requestsPerMinute: 300, requestsPerHour: 10000 },
      [UserRoleType.ADMIN]: { requestsPerMinute: 1000, requestsPerHour: 50000 }
    };

    return limits[userRole] || limits[UserRoleType.FREE];
  }
}