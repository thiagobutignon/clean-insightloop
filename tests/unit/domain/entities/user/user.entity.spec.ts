import { User } from '../../../../../src/domain/entities/user/user.entity';
import { 
  UserId, 
  Email, 
  Name, 
  HashedPassword, 
  UserRole, 
  UserRoleType, 
  UserStatus, 
  UserStatusType 
} from '../../../../../src/domain/entities/user/user.value-objects';
import { 
  UserAlreadyActiveException,
  InsufficientPermissionsException,
  RoleChangeNotAllowedException
} from '../../../../../src/domain/exceptions/domain.exception';

describe('User Entity', () => {
  let validEmail: Email;
  let validName: Name;
  let validPassword: HashedPassword;
  let validUserId: UserId;

  beforeEach(() => {
    validEmail = new Email('test@example.com');
    validName = new Name('John Doe');
    validPassword = new HashedPassword('$2b$12$hashedpassword');
    validUserId = new UserId('550e8400-e29b-41d4-a716-446655440000');
  });

  describe('User Creation', () => {
    it('should create a user with valid data', () => {
      const user = User.create(
        validEmail,
        validName,
        validPassword
      );

      expect(user).toBeDefined();
      expect(user.email).toBe(validEmail);
      expect(user.name).toBe(validName);
      expect(user.password).toBe(validPassword);
      expect(user.role.getValue()).toBe(UserRoleType.FREE);
      expect(user.status.getValue()).toBe(UserStatusType.ACTIVE);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a user with specified role and status', () => {
      const role = UserRole.paid();
      const status = UserStatus.pendingVerification();

      const user = User.create(
        validEmail,
        validName,
        validPassword,
        role,
        status
      );

      expect(user.role.getValue()).toBe(UserRoleType.PAID);
      expect(user.status.getValue()).toBe(UserStatusType.PENDING_VERIFICATION);
    });

    it('should generate domain events when created', () => {
      const user = User.create(
        validEmail,
        validName,
        validPassword
      );

      const events = user.domainEvents;
      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('UserCreated');
    });

    it('should assign unique ID when created', () => {
      const user1 = User.create(validEmail, validName, validPassword);
      const user2 = User.create(
        new Email('another@example.com'),
        validName,
        validPassword
      );

      expect(user1.id).not.toBe(user2.id);
    });
  });

  describe('User Reconstruction', () => {
    it('should reconstruct user from properties', () => {
      const properties = {
        id: validUserId,
        email: validEmail,
        name: validName,
        password: validPassword,
        role: UserRole.admin(),
        status: UserStatus.active(),
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02')
      };

      const user = User.reconstruct(properties);

      expect(user.id).toBe(validUserId);
      expect(user.email).toBe(validEmail);
      expect(user.role.getValue()).toBe(UserRoleType.ADMIN);
      expect(user.createdAt).toEqual(new Date('2023-01-01'));
      expect(user.updatedAt).toEqual(new Date('2023-01-02'));
    });

    it('should not generate domain events when reconstructed', () => {
      const properties = {
        id: validUserId,
        email: validEmail,
        name: validName,
        password: validPassword,
        role: UserRole.free(),
        status: UserStatus.active(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const user = User.reconstruct(properties);
      expect(user.domainEvents).toHaveLength(0);
    });
  });

  describe('Role Management', () => {
    let user: User;
    let adminUser: User;

    beforeEach(() => {
      user = User.create(validEmail, validName, validPassword);
      adminUser = User.create(
        new Email('admin@example.com'),
        new Name('Admin User'),
        validPassword,
        UserRole.admin()
      );
    });

    it('should allow admin to change user role', () => {
      const newRole = UserRole.paid();
      
      user.changeRole(newRole, adminUser.role, adminUser.id);

      expect(user.role.getValue()).toBe(UserRoleType.PAID);
      expect(user.domainEvents).toHaveLength(2); // UserCreated + UserRoleChanged
      expect(user.domainEvents[1].eventName).toBe('UserRoleChanged');
    });

    it('should throw error when non-admin tries to change role', () => {
      const regularUser = User.create(
        new Email('regular@example.com'),
        validName,
        validPassword
      );
      const newRole = UserRole.paid();

      expect(() => {
        user.changeRole(newRole, regularUser.role, regularUser.id);
      }).toThrow(InsufficientPermissionsException);
    });

    it('should not allow creating admin users through role change', () => {
      const newRole = UserRole.admin();

      expect(() => {
        user.changeRole(newRole, adminUser.role, adminUser.id);
      }).toThrow(RoleChangeNotAllowedException);
    });

    it('should update timestamp when role is changed', () => {
      const originalUpdatedAt = user.updatedAt;
      
      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        user.changeRole(UserRole.paid(), adminUser.role, adminUser.id);
        expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      }, 10);
    });
  });

  describe('Status Management', () => {
    let user: User;

    beforeEach(() => {
      user = User.create(
        validEmail,
        validName,
        validPassword,
        UserRole.free(),
        UserStatus.pendingVerification()
      );
    });

    it('should activate pending user', () => {
      user.activate();

      expect(user.status.getValue()).toBe(UserStatusType.ACTIVE);
      expect(user.domainEvents).toHaveLength(2); // UserCreated + UserStatusChanged
    });

    it('should throw error when activating already active user', () => {
      const activeUser = User.create(validEmail, validName, validPassword);

      expect(() => {
        activeUser.activate();
      }).toThrow(UserAlreadyActiveException);
    });

    it('should suspend user', () => {
      const activeUser = User.create(validEmail, validName, validPassword);
      
      activeUser.suspend();

      expect(activeUser.status.getValue()).toBe(UserStatusType.SUSPENDED);
    });

    it('should deactivate user', () => {
      const activeUser = User.create(validEmail, validName, validPassword);
      
      activeUser.deactivate();

      expect(activeUser.status.getValue()).toBe(UserStatusType.INACTIVE);
    });
  });

  describe('Profile Management', () => {
    let user: User;

    beforeEach(() => {
      user = User.create(validEmail, validName, validPassword);
    });

    it('should update user name', () => {
      const newName = new Name('Jane Doe');
      
      user.updateName(newName);

      expect(user.name).toBe(newName);
      expect(user.name.getValue()).toBe('Jane Doe');
    });

    it('should update password', async () => {
      const newPassword = new HashedPassword('$2b$12$newhashedpassword');
      
      await user.changePassword(newPassword);

      expect(user.password).toBe(newPassword);
    });

    it('should verify correct password', async () => {
      // Mock bcrypt.compare for this test
      const mockPassword = {
        verify: jest.fn().mockResolvedValue(true),
        getHash: () => '$2b$12$mockhashedpassword'
      } as any;

      const userWithMockPassword = User.create(
        validEmail,
        validName,
        mockPassword
      );

      const isValid = await userWithMockPassword.verifyPassword('correctpassword');
      expect(isValid).toBe(true);
      expect(mockPassword.verify).toHaveBeenCalledWith('correctpassword');
    });

    it('should reject incorrect password', async () => {
      const mockPassword = {
        verify: jest.fn().mockResolvedValue(false),
        getHash: () => '$2b$12$mockhashedpassword'
      } as any;

      const userWithMockPassword = User.create(
        validEmail,
        validName,
        mockPassword
      );

      const isValid = await userWithMockPassword.verifyPassword('wrongpassword');
      expect(isValid).toBe(false);
    });
  });

  describe('Business Rules', () => {
    let user: User;

    beforeEach(() => {
      user = User.create(validEmail, validName, validPassword);
    });

    it('should allow login for active user', () => {
      expect(user.canLogin()).toBe(true);
    });

    it('should not allow login for inactive user', () => {
      user.deactivate();
      expect(user.canLogin()).toBe(false);
    });

    it('should not allow login for suspended user', () => {
      user.suspend();
      expect(user.canLogin()).toBe(false);
    });

    it('should check feature access based on role', () => {
      const freeUser = User.create(validEmail, validName, validPassword);
      const paidUser = User.create(
        new Email('paid@example.com'),
        validName,
        validPassword,
        UserRole.paid()
      );

      expect(freeUser.canAccessFeature(UserRoleType.FREE)).toBe(true);
      expect(freeUser.canAccessFeature(UserRoleType.PAID)).toBe(false);
      expect(paidUser.canAccessFeature(UserRoleType.FREE)).toBe(true);
      expect(paidUser.canAccessFeature(UserRoleType.PAID)).toBe(true);
    });

    it('should check user management permissions', () => {
      const freeUser = User.create(validEmail, validName, validPassword);
      const adminUser = User.create(
        new Email('admin@example.com'),
        validName,
        validPassword,
        UserRole.admin()
      );

      expect(freeUser.canManageUsers()).toBe(false);
      expect(adminUser.canManageUsers()).toBe(true);
    });

    it('should validate login requirements', () => {
      const activeUser = User.create(validEmail, validName, validPassword);
      const suspendedUser = User.create(
        new Email('suspended@example.com'),
        validName,
        validPassword,
        UserRole.free(),
        UserStatus.suspended()
      );

      expect(() => activeUser.validateForLogin()).not.toThrow();
      expect(() => suspendedUser.validateForLogin()).toThrow();
    });
  });

  describe('Entity Behavior', () => {
    it('should implement equals correctly', () => {
      const user1 = User.create(validEmail, validName, validPassword);
      const user2 = User.reconstruct({
        id: user1.id,
        email: validEmail,
        name: validName,
        password: validPassword,
        role: UserRole.free(),
        status: UserStatus.active(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      const user3 = User.create(
        new Email('different@example.com'),
        validName,
        validPassword
      );

      expect(user1.equals(user2)).toBe(true);
      expect(user1.equals(user3)).toBe(false);
      expect(user1.equals(undefined)).toBe(false);
    });

    it('should generate string representation', () => {
      const user = User.create(validEmail, validName, validPassword);
      const stringRepresentation = user.toString();

      expect(stringRepresentation).toContain('User');
      expect(stringRepresentation).toContain(user.id.getValue());
      expect(stringRepresentation).toContain('test@example.com');
      expect(stringRepresentation).toContain('free');
      expect(stringRepresentation).toContain('active');
    });

    it('should clear domain events', () => {
      const user = User.create(validEmail, validName, validPassword);
      
      expect(user.domainEvents).toHaveLength(1);
      
      user.clearEvents();
      
      expect(user.domainEvents).toHaveLength(0);
    });

    it('should return user properties', () => {
      const user = User.create(validEmail, validName, validPassword);
      const properties = user.getProperties();

      expect(properties.id).toBe(user.id);
      expect(properties.email).toBe(user.email);
      expect(properties.name).toBe(user.name);
      expect(properties.password).toBe(user.password);
      expect(properties.role).toBe(user.role);
      expect(properties.status).toBe(user.status);
      expect(properties.createdAt).toBe(user.createdAt);
      expect(properties.updatedAt).toBe(user.updatedAt);
    });
  });
});