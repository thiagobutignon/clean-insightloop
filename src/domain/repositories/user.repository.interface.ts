import { User } from '../entities/user/user.entity';
import { UserId, Email, UserRole } from '../entities/user/user.value-objects';

export interface UserSearchCriteria {
  role?: UserRole;
  status?: string;
  emailContains?: string;
  nameContains?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
}

export interface UserRepository {
  /**
   * Find a user by their unique identifier
   */
  findById(id: UserId): Promise<User | null>;

  /**
   * Find a user by their email address
   */
  findByEmail(email: Email): Promise<User | null>;

  /**
   * Save a user (create or update)
   */
  save(user: User): Promise<void>;

  /**
   * Check if a user exists with the given email
   */
  exists(email: Email): Promise<boolean>;

  /**
   * Find users based on search criteria
   */
  findAll(criteria?: UserSearchCriteria): Promise<User[]>;

  /**
   * Count users based on search criteria
   */
  count(criteria?: UserSearchCriteria): Promise<number>;

  /**
   * Delete a user (soft delete recommended)
   */
  delete(id: UserId): Promise<void>;

  /**
   * Find users by role
   */
  findByRole(role: UserRole): Promise<User[]>;

  /**
   * Find users created within a date range
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<User[]>;

  /**
   * Get recently created users
   */
  findRecentlyCreated(limit: number): Promise<User[]>;

  /**
   * Find users that require verification
   */
  findPendingVerification(): Promise<User[]>;
}