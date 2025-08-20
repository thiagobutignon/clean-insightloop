import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUsersTable1692000000001 implements MigrationInterface {
  name = 'CreateUsersTable1692000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()'
          },
          {
            name: 'email',
            type: 'varchar',
            length: '320',
            isUnique: true,
            isNullable: false
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false
          },
          {
            name: 'password_hash',
            type: 'varchar',
            length: '255',
            isNullable: false
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['free', 'paid', 'admin', 'enterprise'],
            default: "'free'",
            isNullable: false
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive', 'suspended', 'pending_verification'],
            default: "'active'",
            isNullable: false
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
            default: null
          },
          {
            name: 'last_login_ip',
            type: 'varchar',
            length: '45',
            isNullable: true
          },
          {
            name: 'last_login_at',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'login_attempts',
            type: 'int',
            default: 0,
            isNullable: false
          },
          {
            name: 'locked_until',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'user_agent',
            type: 'varchar',
            length: '500',
            isNullable: true
          },
          {
            name: 'email_verified',
            type: 'boolean',
            default: false,
            isNullable: false
          },
          {
            name: 'email_verified_at',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'email_verification_token',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'password_reset_token',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'password_reset_expires',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'password_changed_at',
            type: 'timestamp',
            isNullable: true
          }
        ]
      }),
      true
    );

    // Create indexes using raw SQL for better compatibility
    await queryRunner.query('CREATE UNIQUE INDEX IDX_users_email ON users (email)');
    await queryRunner.query('CREATE INDEX IDX_users_role ON users (role)');
    await queryRunner.query('CREATE INDEX IDX_users_status ON users (status)');
    await queryRunner.query('CREATE INDEX IDX_users_created_at ON users (created_at)');
    await queryRunner.query('CREATE INDEX IDX_users_deleted_at ON users (deleted_at)');
    await queryRunner.query('CREATE INDEX IDX_users_last_login_at ON users (last_login_at)');
    await queryRunner.query('CREATE INDEX IDX_users_email_verification_token ON users (email_verification_token)');
    await queryRunner.query('CREATE INDEX IDX_users_password_reset_token ON users (password_reset_token)');
    await queryRunner.query('CREATE INDEX IDX_users_active_lookup ON users (status, deleted_at, email_verified)');

    // Add check constraints for business rules
    await queryRunner.query(`
      ALTER TABLE users 
      ADD CONSTRAINT CHK_users_email_format 
      CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')
    `);

    await queryRunner.query(`
      ALTER TABLE users 
      ADD CONSTRAINT CHK_users_name_length 
      CHECK (char_length(trim(name)) >= 2)
    `);

    await queryRunner.query(`
      ALTER TABLE users 
      ADD CONSTRAINT CHK_users_login_attempts 
      CHECK (login_attempts >= 0 AND login_attempts <= 10)
    `);

    // Add trigger for updated_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_users_updated_at 
      BEFORE UPDATE ON users 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column();
    `);

    // Add comment to table
    await queryRunner.query(`
      COMMENT ON TABLE users IS 'User account information with authentication and authorization data';
    `);

    // Add comments to important columns
    await queryRunner.query(`
      COMMENT ON COLUMN users.id IS 'Unique identifier for the user';
      COMMENT ON COLUMN users.email IS 'User email address (unique, used for login)';
      COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password';
      COMMENT ON COLUMN users.role IS 'User role for authorization (free, paid, admin, enterprise)';
      COMMENT ON COLUMN users.status IS 'User account status';
      COMMENT ON COLUMN users.deleted_at IS 'Soft delete timestamp';
      COMMENT ON COLUMN users.login_attempts IS 'Failed login attempts counter';
      COMMENT ON COLUMN users.locked_until IS 'Account lock expiry timestamp';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger and function
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_users_updated_at ON users;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column();`);

    // Drop table (indexes will be dropped automatically)
    await queryRunner.dropTable('users');
  }
}