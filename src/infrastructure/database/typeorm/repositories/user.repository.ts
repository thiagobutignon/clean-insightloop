import { Repository, DataSource, SelectQueryBuilder, IsNull, MoreThan } from 'typeorm';
import { UserOrmEntity } from '../entities/user.orm-entity';
import { UserRepository, UserSearchCriteria } from '../../../../domain/repositories/user.repository.interface';
import { User, UserProperties } from '../../../../domain/entities/user/user.entity';
import { 
  UserId, 
  Email, 
  Name, 
  HashedPassword, 
  UserRole, 
  UserRoleType, 
  UserStatus, 
  UserStatusType 
} from '../../../../domain/entities/user/user.value-objects';
import { UserNotFoundException } from '../../../../domain/exceptions/domain.exception';

export class TypeORMUserRepository implements UserRepository {
  private repository: Repository<UserOrmEntity>;

  constructor(private dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(UserOrmEntity);
  }

  async findById(id: UserId): Promise<User | null> {
    const userOrm = await this.repository.findOne({
      where: { 
        id: id.getValue(),
        deletedAt: IsNull() 
      }
    });

    return userOrm ? this.toDomainEntity(userOrm) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const userOrm = await this.repository.findOne({
      where: { 
        email: email.getValue(),
        deletedAt: IsNull() 
      }
    });

    return userOrm ? this.toDomainEntity(userOrm) : null;
  }

  async save(user: User): Promise<void> {
    const existingUser = await this.repository.findOne({
      where: { id: user.id.getValue() }
    });

    if (existingUser) {
      // Update existing user
      await this.repository.update(
        { id: user.id.getValue() },
        this.toOrmEntity(user, existingUser)
      );
    } else {
      // Create new user
      const ormEntity = this.toOrmEntity(user);
      await this.repository.save(ormEntity);
    }
  }

  async exists(email: Email): Promise<boolean> {
    const count = await this.repository.count({
      where: { 
        email: email.getValue(),
        deletedAt: IsNull() 
      }
    });

    return count > 0;
  }

  async findAll(criteria?: UserSearchCriteria): Promise<User[]> {
    const queryBuilder = this.createQueryBuilder();
    this.applyCriteria(queryBuilder, criteria);

    const userOrms = await queryBuilder.getMany();
    return userOrms.map(userOrm => this.toDomainEntity(userOrm));
  }

  async count(criteria?: UserSearchCriteria): Promise<number> {
    const queryBuilder = this.createQueryBuilder();
    this.applyCriteria(queryBuilder, criteria);

    return queryBuilder.getCount();
  }

  async delete(id: UserId): Promise<void> {
    const user = await this.repository.findOne({
      where: { id: id.getValue() }
    });

    if (!user) {
      throw new UserNotFoundException(id.getValue());
    }

    // Soft delete
    await this.repository.update(
      { id: id.getValue() },
      { 
        deletedAt: new Date(),
        status: 'inactive'
      }
    );
  }

  async findByRole(role: UserRole): Promise<User[]> {
    const userOrms = await this.repository.find({
      where: { 
        role: role.getValue(),
        deletedAt: IsNull() 
      },
      order: { createdAt: 'DESC' }
    });

    return userOrms.map(userOrm => this.toDomainEntity(userOrm));
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<User[]> {
    const userOrms = await this.repository
      .createQueryBuilder('user')
      .where('user.deletedAt IS NULL')
      .andWhere('user.createdAt >= :startDate', { startDate })
      .andWhere('user.createdAt <= :endDate', { endDate })
      .orderBy('user.createdAt', 'DESC')
      .getMany();

    return userOrms.map(userOrm => this.toDomainEntity(userOrm));
  }

  async findRecentlyCreated(limit: number): Promise<User[]> {
    const userOrms = await this.repository.find({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take: limit
    });

    return userOrms.map(userOrm => this.toDomainEntity(userOrm));
  }

  async findPendingVerification(): Promise<User[]> {
    const userOrms = await this.repository.find({
      where: { 
        status: 'pending_verification',
        deletedAt: IsNull() 
      },
      order: { createdAt: 'ASC' }
    });

    return userOrms.map(userOrm => this.toDomainEntity(userOrm));
  }

  // Additional repository methods for specific use cases

  async findByEmailVerificationToken(token: string): Promise<User | null> {
    const userOrm = await this.repository.findOne({
      where: { 
        emailVerificationToken: token,
        deletedAt: IsNull() 
      }
    });

    return userOrm ? this.toDomainEntity(userOrm) : null;
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    const userOrm = await this.repository.findOne({
      where: { 
        passwordResetToken: token,
        passwordResetExpires: MoreThan(new Date()),
        deletedAt: IsNull() 
      }
    });

    return userOrm ? this.toDomainEntity(userOrm) : null;
  }

  async findActiveUsers(): Promise<User[]> {
    const userOrms = await this.repository.find({
      where: { 
        status: 'active',
        emailVerified: true,
        deletedAt: IsNull() 
      },
      order: { lastLoginAt: 'DESC' }
    });

    return userOrms.map(userOrm => this.toDomainEntity(userOrm));
  }

  async findInactiveUsers(days: number): Promise<User[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const userOrms = await this.repository
      .createQueryBuilder('user')
      .where('user.deletedAt IS NULL')
      .andWhere('user.status = :status', { status: 'active' })
      .andWhere('(user.lastLoginAt IS NULL OR user.lastLoginAt < :cutoffDate)', { cutoffDate })
      .orderBy('user.lastLoginAt', 'ASC')
      .getMany();

    return userOrms.map(userOrm => this.toDomainEntity(userOrm));
  }

  // Helper methods

  private createQueryBuilder(): SelectQueryBuilder<UserOrmEntity> {
    return this.repository
      .createQueryBuilder('user')
      .where('user.deletedAt IS NULL');
  }

  private applyCriteria(
    queryBuilder: SelectQueryBuilder<UserOrmEntity>, 
    criteria?: UserSearchCriteria
  ): void {
    if (!criteria) {
      queryBuilder.orderBy('user.createdAt', 'DESC');
      return;
    }

    if (criteria.role) {
      queryBuilder.andWhere('user.role = :role', { role: criteria.role.getValue() });
    }

    if (criteria.status) {
      queryBuilder.andWhere('user.status = :status', { status: criteria.status });
    }

    if (criteria.emailContains) {
      queryBuilder.andWhere('user.email ILIKE :emailContains', { 
        emailContains: `%${criteria.emailContains}%` 
      });
    }

    if (criteria.nameContains) {
      queryBuilder.andWhere('user.name ILIKE :nameContains', { 
        nameContains: `%${criteria.nameContains}%` 
      });
    }

    if (criteria.createdAfter) {
      queryBuilder.andWhere('user.createdAt >= :createdAfter', { 
        createdAfter: criteria.createdAfter 
      });
    }

    if (criteria.createdBefore) {
      queryBuilder.andWhere('user.createdAt <= :createdBefore', { 
        createdBefore: criteria.createdBefore 
      });
    }

    // Apply pagination
    if (criteria.offset) {
      queryBuilder.offset(criteria.offset);
    }

    if (criteria.limit) {
      queryBuilder.limit(criteria.limit);
    } else {
      queryBuilder.limit(20); // Default limit
    }

    queryBuilder.orderBy('user.createdAt', 'DESC');
  }

  private toDomainEntity(ormEntity: UserOrmEntity): User {
    const properties: UserProperties = {
      id: new UserId(ormEntity.id),
      email: new Email(ormEntity.email),
      name: new Name(ormEntity.name),
      password: new HashedPassword(ormEntity.passwordHash),
      role: new UserRole(ormEntity.role as UserRoleType),
      status: new UserStatus(ormEntity.status as UserStatusType),
      createdAt: ormEntity.createdAt,
      updatedAt: ormEntity.updatedAt
    };

    return User.reconstruct(properties);
  }

  private toOrmEntity(domainEntity: User, existingOrm?: UserOrmEntity): Partial<UserOrmEntity> {
    const ormData: Partial<UserOrmEntity> = {
      id: domainEntity.id.getValue(),
      email: domainEntity.email.getValue(),
      name: domainEntity.name.getValue(),
      passwordHash: domainEntity.password.getHash(),
      role: domainEntity.role.getValue(),
      status: domainEntity.status.getValue(),
      updatedAt: domainEntity.updatedAt
    };

    // If it's a new entity, set createdAt
    if (!existingOrm) {
      ormData.createdAt = domainEntity.createdAt;
    }

    return ormData;
  }
}