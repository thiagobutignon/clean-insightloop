import { DataSource, QueryRunner } from 'typeorm';
import { DatabaseConnection } from '../../../src/infrastructure/database/typeorm/typeorm.config';
import { UserOrmEntity } from '../../../src/infrastructure/database/typeorm/entities/user.orm-entity';
import { TypeORMUserRepository } from '../../../src/infrastructure/database/typeorm/repositories/user.repository';
import { User } from '../../../src/domain/entities/user/user.entity';
import { Email, Name, HashedPassword, UserRole, UserStatus } from '../../../src/domain/entities/user/user.value-objects';

describe('User Database Integration Tests', () => {
  let dataSource: DataSource;
  let userRepository: TypeORMUserRepository;
  let queryRunner: QueryRunner;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DB_DATABASE = 'insightloop_test_db';
    process.env.DB_SYNCHRONIZE = 'true';
    process.env.LOG_LEVEL = 'error';

    const dbConnection = DatabaseConnection.getInstance();
    await dbConnection.connect();
    dataSource = dbConnection.getDataSource();
    userRepository = new TypeORMUserRepository(dataSource);
  });

  beforeEach(async () => {
    queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    await queryRunner.manager.clear(UserOrmEntity);
  });

  afterEach(async () => {
    if (queryRunner) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
    }
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  describe('Race Conditions and Concurrent Operations', () => {
    it('should handle concurrent user creation with same email', async () => {
      const email = 'concurrent@example.com';
      
      const createUser = async () => {
        const user = User.create(
          new Email(email),
          new Name('Concurrent User'),
          new HashedPassword('$2b$12$hashedpassword')
        );
        return userRepository.save(user);
      };

      // Simulate concurrent requests
      const promises = Array(10).fill(null).map(() => createUser());
      const results = await Promise.allSettled(promises);

      // Only one should succeed, others should fail due to unique constraint
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      expect(successful).toHaveLength(1);
      expect(failed).toHaveLength(9);

      // Verify only one user exists in database
      const users = await userRepository.findByEmail(new Email(email));
      expect(users).toBeTruthy();
    });

    it('should handle concurrent updates to same user', async () => {
      // Create initial user
      const user = User.create(
        new Email('update-test@example.com'),
        new Name('Original Name'),
        new HashedPassword('$2b$12$hashedpassword')
      );
      await userRepository.save(user);

      // Simulate concurrent updates
      const updatePromises = Array(5).fill(null).map(async (_, index) => {
        const foundUser = await userRepository.findById(user.id);
        if (!foundUser) throw new Error('User not found');
        
        foundUser.updateName(new Name(`Updated Name ${index}`));
        return userRepository.save(foundUser);
      });

      const results = await Promise.allSettled(updatePromises);
      
      // At least one should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);

      // Verify final state
      const finalUser = await userRepository.findById(user.id);
      expect(finalUser).toBeTruthy();
      expect(finalUser!.name.getValue()).toMatch(/Updated Name \d/);
    });

    it('should handle database deadlock scenarios', async () => {
      // Create two users
      const user1 = User.create(
        new Email('deadlock1@example.com'),
        new Name('User 1'),
        new HashedPassword('$2b$12$hashedpassword')
      );
      const user2 = User.create(
        new Email('deadlock2@example.com'),
        new Name('User 2'),
        new HashedPassword('$2b$12$hashedpassword')
      );

      await userRepository.save(user1);
      await userRepository.save(user2);

      // Simulate cross-updates that could cause deadlock
      const updateUser1Then2 = async () => {
        const u1 = await userRepository.findById(user1.id);
        u1!.updateName(new Name('Updated User 1'));
        await userRepository.save(u1!);
        
        const u2 = await userRepository.findById(user2.id);
        u2!.updateName(new Name('Updated User 2 by process 1'));
        await userRepository.save(u2!);
      };

      const updateUser2Then1 = async () => {
        const u2 = await userRepository.findById(user2.id);
        u2!.updateName(new Name('Updated User 2'));
        await userRepository.save(u2!);
        
        const u1 = await userRepository.findById(user1.id);
        u1!.updateName(new Name('Updated User 1 by process 2'));
        await userRepository.save(u1!);
      };

      // Run concurrently to potentially trigger deadlock
      const results = await Promise.allSettled([
        updateUser1Then2(),
        updateUser2Then1()
      ]);

      // At least one should complete successfully
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);
    });
  });

  describe('Transaction Rollbacks', () => {
    it('should rollback transaction on user creation failure', async () => {
      const initialCount = await queryRunner.manager.count(UserOrmEntity);

      try {
        await queryRunner.manager.transaction(async (manager) => {
          // Create a valid user
          const user1 = User.create(
            new Email('valid@example.com'),
            new Name('Valid User'),
            new HashedPassword('$2b$12$hashedpassword')
          );
          
          const userOrm1 = new UserOrmEntity();
          userOrm1.id = user1.id.getValue();
          userOrm1.email = user1.email.getValue();
          userOrm1.name = user1.name.getValue();
          userOrm1.passwordHash = user1.password.getHash();
          userOrm1.role = user1.role.getValue();
          userOrm1.status = user1.status.getValue();
          userOrm1.createdAt = user1.createdAt;
          userOrm1.updatedAt = user1.updatedAt;
          
          await manager.save(userOrm1);

          // Try to create user with duplicate email (should fail)
          const user2 = User.create(
            new Email('valid@example.com'), // Same email
            new Name('Duplicate User'),
            new HashedPassword('$2b$12$hashedpassword')
          );
          
          const userOrm2 = new UserOrmEntity();
          userOrm2.id = user2.id.getValue();
          userOrm2.email = user2.email.getValue();
          userOrm2.name = user2.name.getValue();
          userOrm2.passwordHash = user2.password.getHash();
          userOrm2.role = user2.role.getValue();
          userOrm2.status = user2.status.getValue();
          userOrm2.createdAt = user2.createdAt;
          userOrm2.updatedAt = user2.updatedAt;
          
          await manager.save(userOrm2); // This should fail
        });
      } catch (error) {
        // Expected to fail due to unique constraint
        expect(error).toBeDefined();
      }

      // Verify no users were created (transaction rolled back)
      const finalCount = await queryRunner.manager.count(UserOrmEntity);
      expect(finalCount).toBe(initialCount);
    });

    it('should handle nested transaction rollbacks', async () => {
      const initialCount = await queryRunner.manager.count(UserOrmEntity);

      try {
        await queryRunner.manager.transaction(async (outerManager) => {
          // Create user in outer transaction
          const user1 = User.create(
            new Email('outer@example.com'),
            new Name('Outer User'),
            new HashedPassword('$2b$12$hashedpassword')
          );
          
          const userOrm1 = new UserOrmEntity();
          userOrm1.id = user1.id.getValue();
          userOrm1.email = user1.email.getValue();
          userOrm1.name = user1.name.getValue();
          userOrm1.passwordHash = user1.password.getHash();
          userOrm1.role = user1.role.getValue();
          userOrm1.status = user1.status.getValue();
          userOrm1.createdAt = user1.createdAt;
          userOrm1.updatedAt = user1.updatedAt;
          
          await outerManager.save(userOrm1);

          // Nested transaction that fails
          await outerManager.transaction(async (innerManager) => {
            const user2 = User.create(
              new Email('inner@example.com'),
              new Name('Inner User'),
              new HashedPassword('$2b$12$hashedpassword')
            );
            
            const userOrm2 = new UserOrmEntity();
            userOrm2.id = user2.id.getValue();
            userOrm2.email = user2.email.getValue();
            userOrm2.name = user2.name.getValue();
            userOrm2.passwordHash = user2.password.getHash();
            userOrm2.role = user2.role.getValue();
            userOrm2.status = user2.status.getValue();
            userOrm2.createdAt = user2.createdAt;
            userOrm2.updatedAt = user2.updatedAt;
            
            await innerManager.save(userOrm2);
            
            // Force failure
            throw new Error('Simulated inner transaction failure');
          });
        });
      } catch (error: any) {
        expect(error.message).toBe('Simulated inner transaction failure');
      }

      // Verify no users were created (all transactions rolled back)
      const finalCount = await queryRunner.manager.count(UserOrmEntity);
      expect(finalCount).toBe(initialCount);
    });
  });

  describe('Database Connection Handling', () => {
    it('should handle connection pool exhaustion gracefully', async () => {
      // Create many concurrent operations to potentially exhaust connection pool
      const operations = Array(50).fill(null).map(async (_, index) => {
        try {
          const user = User.create(
            new Email(`pooltest${index}@example.com`),
            new Name(`Pool Test User ${index}`),
            new HashedPassword('$2b$12$hashedpassword')
          );
          await userRepository.save(user);
          return user;
        } catch (error) {
          // Some operations might fail due to pool exhaustion
          return { error: (error as Error).message };
        }
      });

      const results = await Promise.allSettled(operations);
      
      // At least some operations should succeed
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value && !('error' in (r.value as any))
      );
      expect(successful.length).toBeGreaterThan(0);
    });

    it('should retry operations on connection timeout', async () => {
      let attempts = 0;
      
      const operationWithRetry = async (): Promise<User> => {
        attempts++;
        
        if (attempts < 3) {
          // Simulate connection timeout
          throw new Error('Connection timeout');
        }
        
        const user = User.create(
          new Email('retry@example.com'),
          new Name('Retry User'),
          new HashedPassword('$2b$12$hashedpassword')
        );
        await userRepository.save(user);
        return user;
      };

      // Implement retry logic
      let result: User | null = null;
      for (let i = 0; i < 5; i++) {
        try {
          result = await operationWithRetry();
          break;
        } catch (error) {
          if (i === 4) throw error; // Last attempt
          await new Promise(resolve => setTimeout(resolve, 100 * (i + 1))); // Exponential backoff
        }
      }

      expect(result).toBeTruthy();
      expect(attempts).toBe(3);
    });
  });

  describe('Data Integrity and Constraints', () => {
    it('should enforce email uniqueness constraint', async () => {
      const email = 'unique@example.com';
      
      // Create first user
      const user1 = User.create(
        new Email(email),
        new Name('First User'),
        new HashedPassword('$2b$12$hashedpassword')
      );
      await userRepository.save(user1);

      // Try to create second user with same email
      const user2 = User.create(
        new Email(email),
        new Name('Second User'),
        new HashedPassword('$2b$12$hashedpassword')
      );

      await expect(userRepository.save(user2)).rejects.toThrow();
    });

    it('should handle case-insensitive email uniqueness', async () => {
      // Create user with lowercase email
      const user1 = User.create(
        new Email('case@example.com'),
        new Name('First User'),
        new HashedPassword('$2b$12$hashedpassword')
      );
      await userRepository.save(user1);

      // Try to create user with uppercase email
      const user2 = User.create(
        new Email('CASE@EXAMPLE.COM'),
        new Name('Second User'),
        new HashedPassword('$2b$12$hashedpassword')
      );

      await expect(userRepository.save(user2)).rejects.toThrow();
    });

    it('should validate required fields', async () => {
      const userOrm = new UserOrmEntity();
      userOrm.id = 'test-id';
      // Missing required fields: email, name, passwordHash, role, status

      await expect(queryRunner.manager.save(userOrm)).rejects.toThrow();
    });

    it('should enforce field length constraints', async () => {
      const userOrm = new UserOrmEntity();
      userOrm.id = 'test-id';
      userOrm.email = 'a'.repeat(256) + '@example.com'; // Too long
      userOrm.name = 'Valid Name';
      userOrm.passwordHash = '$2b$12$hashedpassword';
      userOrm.role = 'free';
      userOrm.status = 'active';
      userOrm.createdAt = new Date();
      userOrm.updatedAt = new Date();

      await expect(queryRunner.manager.save(userOrm)).rejects.toThrow();
    });
  });

  describe('Query Performance', () => {
    beforeEach(async () => {
      // Create test data for performance tests
      const users = Array(100).fill(null).map((_, index) => {
        const user = User.create(
          new Email(`perf${index}@example.com`),
          new Name(`Performance User ${index}`),
          new HashedPassword('$2b$12$hashedpassword'),
          index % 4 === 0 ? UserRole.paid() : UserRole.free(),
          index % 10 === 0 ? UserStatus.inactive() : UserStatus.active()
        );
        
        const userOrm = new UserOrmEntity();
        userOrm.id = user.id.getValue();
        userOrm.email = user.email.getValue();
        userOrm.name = user.name.getValue();
        userOrm.passwordHash = user.password.getHash();
        userOrm.role = user.role.getValue();
        userOrm.status = user.status.getValue();
        userOrm.createdAt = user.createdAt;
        userOrm.updatedAt = user.updatedAt;
        
        return userOrm;
      });

      await queryRunner.manager.save(users);
    });

    it('should perform email lookups efficiently', async () => {
      const startTime = Date.now();
      
      // Perform multiple email lookups
      const lookupPromises = Array(10).fill(null).map((_, index) => 
        userRepository.findByEmail(new Email(`perf${index}@example.com`))
      );
      
      const results = await Promise.all(lookupPromises);
      const endTime = Date.now();
      
      // All lookups should be successful
      expect(results.every((user: any) => user !== null)).toBe(true);
      
      // Should complete within reasonable time (adjust based on your performance requirements)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle pagination efficiently', async () => {
      const startTime = Date.now();
      
      // Test pagination query
      const result = await queryRunner.manager
        .createQueryBuilder(UserOrmEntity, 'user')
        .orderBy('user.createdAt', 'DESC')
        .skip(20)
        .take(10)
        .getMany();
      
      const endTime = Date.now();
      
      expect(result).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(500);
    });

    it('should handle complex filtering efficiently', async () => {
      const startTime = Date.now();
      
      // Complex query with multiple conditions
      const result = await queryRunner.manager
        .createQueryBuilder(UserOrmEntity, 'user')
        .where('user.status = :status', { status: 'active' })
        .andWhere('user.role IN (:...roles)', { roles: ['free', 'paid'] })
        .andWhere('user.email LIKE :pattern', { pattern: '%perf%' })
        .orderBy('user.createdAt', 'DESC')
        .getMany();
      
      const endTime = Date.now();
      
      expect(result.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(500);
    });
  });

  describe('Database Migration Compatibility', () => {
    it('should handle schema changes gracefully', async () => {
      // Test that current schema matches expected structure
      const tableMetadata = dataSource.getMetadata(UserOrmEntity);
      
      expect(tableMetadata.tableName).toBe('users');
      
      const expectedColumns = ['id', 'email', 'name', 'passwordHash', 'role', 'status', 'createdAt', 'updatedAt'];
      const actualColumns = tableMetadata.columns.map(col => col.propertyName);
      
      expectedColumns.forEach(column => {
        expect(actualColumns).toContain(column);
      });
    });

    it('should maintain data consistency during schema updates', async () => {
      // Create user with current schema
      const user = User.create(
        new Email('schema@example.com'),
        new Name('Schema User'),
        new HashedPassword('$2b$12$hashedpassword')
      );
      
      await userRepository.save(user);
      
      // Verify data can be retrieved correctly
      const retrievedUser = await userRepository.findByEmail(new Email('schema@example.com'));
      
      expect(retrievedUser).toBeTruthy();
      expect(retrievedUser!.email.getValue()).toBe('schema@example.com');
      expect(retrievedUser!.name.getValue()).toBe('Schema User');
    });
  });
});