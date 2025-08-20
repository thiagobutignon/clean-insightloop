import * as bcrypt from 'bcrypt';
import { ValueObject } from '../shared/value-object.base';
import { InvalidEmailException, InvalidPasswordException, InvalidNameException } from '../../exceptions/domain.exception';

// UserId Value Object
export class UserId extends ValueObject {
  constructor(private readonly value: string) {
    super();
    this.validate();
  }

  private validate(): void {
    if (!this.value || this.value.trim() === '') {
      throw new Error('User ID cannot be empty');
    }
  }

  getValue(): string {
    return this.value;
  }

  protected getEqualityComponents(): any[] {
    return [this.value];
  }

  static generate(): UserId {
    // Simple UUID v4 generation
    return new UserId(
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      })
    );
  }
}

// Email Value Object
export class Email extends ValueObject {
  constructor(private readonly value: string) {
    super();
    this.validate();
  }

  private validate(): void {
    if (!this.value) {
      throw new InvalidEmailException('Email cannot be empty');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.value.toLowerCase())) {
      throw new InvalidEmailException(`Invalid email format: ${this.value}`);
    }

    if (this.value.length > 320) {
      throw new InvalidEmailException('Email is too long');
    }
  }

  getValue(): string {
    return this.value.toLowerCase();
  }

  protected getEqualityComponents(): any[] {
    return [this.value.toLowerCase()];
  }
}

// Name Value Object
export class Name extends ValueObject {
  constructor(private readonly value: string) {
    super();
    this.validate();
  }

  private validate(): void {
    if (!this.value || this.value.trim() === '') {
      throw new InvalidNameException('Name cannot be empty');
    }

    if (this.value.trim().length < 2) {
      throw new InvalidNameException('Name must be at least 2 characters long');
    }

    if (this.value.trim().length > 100) {
      throw new InvalidNameException('Name cannot be longer than 100 characters');
    }

    // Allow letters, spaces, hyphens, and apostrophes
    const nameRegex = /^[a-zA-ZÀ-ÿ\s\-']+$/;
    if (!nameRegex.test(this.value.trim())) {
      throw new InvalidNameException('Name contains invalid characters');
    }
  }

  getValue(): string {
    return this.value.trim();
  }

  protected getEqualityComponents(): any[] {
    return [this.value.trim()];
  }
}

// HashedPassword Value Object
export class HashedPassword extends ValueObject {
  constructor(private readonly hash: string) {
    super();
    this.validate();
  }

  private validate(): void {
    if (!this.hash || this.hash.trim() === '') {
      throw new Error('Password hash cannot be empty');
    }

    // Basic bcrypt hash format validation
    if (!this.hash.startsWith('$2b$') && !this.hash.startsWith('$2a$') && !this.hash.startsWith('$2y$')) {
      throw new Error('Invalid password hash format');
    }
  }

  static async fromPlainText(plainPassword: string, saltRounds: number = 12): Promise<HashedPassword> {
    this.validatePlainPassword(plainPassword);
    const hash = await bcrypt.hash(plainPassword, saltRounds);
    return new HashedPassword(hash);
  }

  private static validatePlainPassword(password: string): void {
    if (!password) {
      throw new InvalidPasswordException('Password cannot be empty');
    }

    if (password.length < 8) {
      throw new InvalidPasswordException('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      throw new InvalidPasswordException('Password cannot be longer than 128 characters');
    }

    // At least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      throw new InvalidPasswordException('Password must contain at least one uppercase letter');
    }

    // At least one lowercase letter
    if (!/[a-z]/.test(password)) {
      throw new InvalidPasswordException('Password must contain at least one lowercase letter');
    }

    // At least one number
    if (!/\d/.test(password)) {
      throw new InvalidPasswordException('Password must contain at least one number');
    }

    // At least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      throw new InvalidPasswordException('Password must contain at least one special character');
    }
  }

  async verify(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.hash);
  }

  getHash(): string {
    return this.hash;
  }

  protected getEqualityComponents(): any[] {
    return [this.hash];
  }
}

// UserRole Enum and Value Object
export enum UserRoleType {
  FREE = 'free',
  PAID = 'paid',
  ADMIN = 'admin',
  ENTERPRISE = 'enterprise'
}

export class UserRole extends ValueObject {
  constructor(private readonly role: UserRoleType) {
    super();
    this.validate();
  }

  private validate(): void {
    if (!Object.values(UserRoleType).includes(this.role)) {
      throw new Error(`Invalid user role: ${this.role}`);
    }
  }

  getValue(): UserRoleType {
    return this.role;
  }

  isFree(): boolean {
    return this.role === UserRoleType.FREE;
  }

  isPaid(): boolean {
    return this.role === UserRoleType.PAID;
  }

  isAdmin(): boolean {
    return this.role === UserRoleType.ADMIN;
  }

  isEnterprise(): boolean {
    return this.role === UserRoleType.ENTERPRISE;
  }

  canManageUsers(): boolean {
    return this.isAdmin() || this.isEnterprise();
  }

  canChangeRoleTo(targetRole: UserRoleType): boolean {
    if (this.isAdmin()) {
      // Admin can change to any role except admin (business rule: cannot promote to admin)
      return targetRole !== UserRoleType.ADMIN;
    }

    if (this.isEnterprise()) {
      return targetRole !== UserRoleType.ADMIN; // Enterprise cannot create admins
    }

    return false; // Free and Paid users cannot change roles
  }

  protected getEqualityComponents(): any[] {
    return [this.role];
  }

  static free(): UserRole {
    return new UserRole(UserRoleType.FREE);
  }

  static paid(): UserRole {
    return new UserRole(UserRoleType.PAID);
  }

  static admin(): UserRole {
    return new UserRole(UserRoleType.ADMIN);
  }

  static enterprise(): UserRole {
    return new UserRole(UserRoleType.ENTERPRISE);
  }
}

// UserStatus Enum and Value Object
export enum UserStatusType {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification'
}

export class UserStatus extends ValueObject {
  constructor(private readonly status: UserStatusType) {
    super();
    this.validate();
  }

  private validate(): void {
    if (!Object.values(UserStatusType).includes(this.status)) {
      throw new Error(`Invalid user status: ${this.status}`);
    }
  }

  getValue(): UserStatusType {
    return this.status;
  }

  isActive(): boolean {
    return this.status === UserStatusType.ACTIVE;
  }

  isInactive(): boolean {
    return this.status === UserStatusType.INACTIVE;
  }

  isSuspended(): boolean {
    return this.status === UserStatusType.SUSPENDED;
  }

  isPendingVerification(): boolean {
    return this.status === UserStatusType.PENDING_VERIFICATION;
  }

  canLogin(): boolean {
    return this.isActive();
  }

  protected getEqualityComponents(): any[] {
    return [this.status];
  }

  static active(): UserStatus {
    return new UserStatus(UserStatusType.ACTIVE);
  }

  static inactive(): UserStatus {
    return new UserStatus(UserStatusType.INACTIVE);
  }

  static suspended(): UserStatus {
    return new UserStatus(UserStatusType.SUSPENDED);
  }

  static pendingVerification(): UserStatus {
    return new UserStatus(UserStatusType.PENDING_VERIFICATION);
  }
}