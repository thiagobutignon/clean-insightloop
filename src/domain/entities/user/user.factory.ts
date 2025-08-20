import { User } from './user.entity';
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
import { UserAlreadyExistsException } from '../../exceptions/domain.exception';
import { UserRepository } from '../../repositories/user.repository.interface';

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  role?: UserRoleType;
  status?: UserStatusType;
}

export class UserFactory {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Create a new user with validation and business rules
   */
  async createUser(request: CreateUserRequest): Promise<User> {
    // Create value objects with validation
    const email = new Email(request.email);
    const name = new Name(request.name);
    const password = await HashedPassword.fromPlainText(request.password);
    const role = request.role ? new UserRole(request.role) : UserRole.free();
    const status = request.status ? new UserStatus(request.status) : UserStatus.active();

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new UserAlreadyExistsException(email.getValue());
    }

    // Create the user entity
    return User.create(email, name, password, role, status);
  }

  /**
   * Create a user for registration (always free and active)
   */
  async createRegistrationUser(email: string, name: string, password: string): Promise<User> {
    return this.createUser({
      email,
      name,
      password,
      role: UserRoleType.FREE,
      status: UserStatusType.ACTIVE
    });
  }

  /**
   * Create an admin user (for system initialization)
   */
  async createAdminUser(email: string, name: string, password: string): Promise<User> {
    return this.createUser({
      email,
      name,
      password,
      role: UserRoleType.ADMIN,
      status: UserStatusType.ACTIVE
    });
  }

  /**
   * Create a user with pending verification status
   */
  async createUserWithVerification(email: string, name: string, password: string): Promise<User> {
    return this.createUser({
      email,
      name,
      password,
      role: UserRoleType.FREE,
      status: UserStatusType.PENDING_VERIFICATION
    });
  }

  /**
   * Reconstruct a user from persistence data
   */
  static reconstructFromPersistence(data: {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    role: UserRoleType;
    status: UserStatusType;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return User.reconstruct({
      id: new UserId(data.id),
      email: new Email(data.email),
      name: new Name(data.name),
      password: new HashedPassword(data.passwordHash),
      role: new UserRole(data.role),
      status: new UserStatus(data.status),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    });
  }

  /**
   * Create multiple users (batch creation)
   */
  async createUsers(requests: CreateUserRequest[]): Promise<User[]> {
    const users: User[] = [];
    
    for (const request of requests) {
      const user = await this.createUser(request);
      users.push(user);
    }

    return users;
  }

  /**
   * Validate user creation request
   */
  static validateCreateUserRequest(request: CreateUserRequest): void {
    if (!request.email || !request.name || !request.password) {
      throw new Error('Email, name, and password are required');
    }

    // Additional business validation can be added here
    if (request.role === UserRoleType.ADMIN) {
      throw new Error('Admin users cannot be created through normal registration');
    }
  }
}