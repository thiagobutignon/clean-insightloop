import { Entity } from '../shared/entity.base';
import { 
  UserId, 
  Email, 
  Name, 
  HashedPassword, 
  UserRole, 
  UserRoleType, 
  UserStatus, 
  UserStatusType 
} from './user.value-objects';
import { 
  UserAlreadyActiveException, 
  InsufficientPermissionsException, 
  RoleChangeNotAllowedException,
  UserNotActiveException,
  UserSuspendedException
} from '../../exceptions/domain.exception';
import { UserCreatedEvent, UserRoleChangedEvent, UserStatusChangedEvent } from '../../events/user.events';

export interface UserProperties {
  id: UserId;
  email: Email;
  name: Name;
  password: HashedPassword;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class User extends Entity<UserId> {
  private constructor(
    id: UserId,
    private _email: Email,
    private _name: Name,
    private _password: HashedPassword,
    private _role: UserRole,
    private _status: UserStatus,
    private _createdAt: Date,
    private _updatedAt: Date
  ) {
    super(id);
  }

  // Factory method for creating new users
  public static create(
    email: Email,
    name: Name,
    password: HashedPassword,
    role?: UserRole,
    status?: UserStatus
  ): User {
    const id = UserId.generate();
    const userRole = role || UserRole.free();
    const userStatus = status || UserStatus.active();
    const now = new Date();

    const user = new User(
      id,
      email,
      name,
      password,
      userRole,
      userStatus,
      now,
      now
    );

    // Add domain event
    user.addDomainEvent(new UserCreatedEvent(
      id.getValue(),
      email.getValue(),
      name.getValue(),
      userRole.getValue(),
      now
    ));

    return user;
  }

  // Factory method for reconstructing users from persistence
  public static reconstruct(properties: UserProperties): User {
    return new User(
      properties.id,
      properties.email,
      properties.name,
      properties.password,
      properties.role,
      properties.status,
      properties.createdAt,
      properties.updatedAt
    );
  }

  // Getters
  public get email(): Email {
    return this._email;
  }

  public get name(): Name {
    return this._name;
  }

  public get password(): HashedPassword {
    return this._password;
  }

  public get role(): UserRole {
    return this._role;
  }

  public get status(): UserStatus {
    return this._status;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  // Business Methods

  public changeRole(newRole: UserRole, performedByRole: UserRole, performedBy: UserId): void {
    if (!this.canChangeRoleTo(newRole, performedByRole)) {
      throw new RoleChangeNotAllowedException(
        this._role.getValue(),
        newRole.getValue(),
        performedByRole.getValue()
      );
    }

    const previousRole = this._role;
    this._role = newRole;
    this._updatedAt = new Date();

    // Add domain event
    this.addDomainEvent(new UserRoleChangedEvent(
      this.id.getValue(),
      previousRole.getValue(),
      newRole.getValue(),
      performedBy.getValue(),
      this._updatedAt
    ));
  }

  public activate(): void {
    if (this._status.isActive()) {
      throw new UserAlreadyActiveException();
    }

    const previousStatus = this._status;
    this._status = UserStatus.active();
    this._updatedAt = new Date();

    // Add domain event
    this.addDomainEvent(new UserStatusChangedEvent(
      this.id.getValue(),
      previousStatus.getValue(),
      this._status.getValue(),
      this._updatedAt
    ));
  }

  public suspend(): void {
    this.changeStatus(UserStatus.suspended());
  }

  public deactivate(): void {
    this.changeStatus(UserStatus.inactive());
  }

  public updateName(name: Name): void {
    this._name = name;
    this._updatedAt = new Date();
  }

  public async changePassword(newPassword: HashedPassword): Promise<void> {
    this._password = newPassword;
    this._updatedAt = new Date();
  }

  public async verifyPassword(plainPassword: string): Promise<boolean> {
    return this._password.verify(plainPassword);
  }

  // Business Rules

  public canLogin(): boolean {
    return this._status.canLogin();
  }

  public canAccessFeature(requiredRole: UserRoleType): boolean {
    if (!this.canLogin()) {
      return false;
    }

    const roleHierarchy = {
      [UserRoleType.FREE]: 0,
      [UserRoleType.PAID]: 1,
      [UserRoleType.ENTERPRISE]: 2,
      [UserRoleType.ADMIN]: 3
    };

    return roleHierarchy[this._role.getValue()] >= roleHierarchy[requiredRole];
  }

  public canManageUsers(): boolean {
    return this._role.canManageUsers() && this.canLogin();
  }

  public canCreateUser(targetRole: UserRoleType): boolean {
    if (!this.canManageUsers()) {
      return false;
    }

    return this._role.canChangeRoleTo(targetRole);
  }

  public requiresVerification(): boolean {
    return this._status.isPendingVerification();
  }

  // Private helper methods

  private canChangeRoleTo(newRole: UserRole, performedByRole: UserRole): boolean {
    // Users cannot change their own roles
    if (!performedByRole.canManageUsers()) {
      throw new InsufficientPermissionsException('change user roles');
    }

    // Check if the performer can assign the target role
    return performedByRole.canChangeRoleTo(newRole.getValue());
  }

  private changeStatus(newStatus: UserStatus): void {
    const previousStatus = this._status;
    this._status = newStatus;
    this._updatedAt = new Date();

    // Add domain event
    this.addDomainEvent(new UserStatusChangedEvent(
      this.id.getValue(),
      previousStatus.getValue(),
      newStatus.getValue(),
      this._updatedAt
    ));
  }

  // Validation methods

  public validateForLogin(): void {
    if (this._status.isSuspended()) {
      throw new UserSuspendedException();
    }

    if (!this._status.canLogin()) {
      throw new UserNotActiveException();
    }
  }

  // Helper method to get user properties for persistence
  public getProperties(): UserProperties {
    return {
      id: this.id,
      email: this._email,
      name: this._name,
      password: this._password,
      role: this._role,
      status: this._status,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }

  // Override toString for better debugging
  public toString(): string {
    return `User(${this.id.getValue()}, ${this._email.getValue()}, ${this._role.getValue()}, ${this._status.getValue()})`;
  }
}