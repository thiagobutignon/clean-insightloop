import { 
  Entity as TypeORMEntity, 
  PrimaryColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn, 
  Index,
  BeforeInsert,
  BeforeUpdate 
} from 'typeorm';

@TypeORMEntity('users')
@Index(['email'], { unique: true })
@Index(['role'])
@Index(['status'])
@Index(['createdAt'])
export class UserOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('varchar', { length: 320, unique: true })
  email: string;

  @Column('varchar', { length: 100 })
  name: string;

  @Column('varchar', { length: 255, name: 'password_hash' })
  passwordHash: string;

  @Column('enum', { 
    enum: ['free', 'paid', 'admin', 'enterprise'],
    default: 'free'
  })
  role: string;

  @Column('enum', {
    enum: ['active', 'inactive', 'suspended', 'pending_verification'],
    default: 'active'
  })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Soft delete support
  @Column('timestamp', { name: 'deleted_at', nullable: true, default: null })
  deletedAt: Date | null;

  // Additional metadata
  @Column('varchar', { length: 45, name: 'last_login_ip', nullable: true })
  lastLoginIp: string | null;

  @Column('timestamp', { name: 'last_login_at', nullable: true })
  lastLoginAt: Date | null;

  @Column('int', { name: 'login_attempts', default: 0 })
  loginAttempts: number;

  @Column('timestamp', { name: 'locked_until', nullable: true })
  lockedUntil: Date | null;

  @Column('varchar', { length: 500, name: 'user_agent', nullable: true })
  userAgent: string | null;

  // Email verification
  @Column('boolean', { name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column('timestamp', { name: 'email_verified_at', nullable: true })
  emailVerifiedAt: Date | null;

  @Column('varchar', { length: 255, name: 'email_verification_token', nullable: true })
  emailVerificationToken: string | null;

  // Password reset
  @Column('varchar', { length: 255, name: 'password_reset_token', nullable: true })
  passwordResetToken: string | null;

  @Column('timestamp', { name: 'password_reset_expires', nullable: true })
  passwordResetExpires: Date | null;

  @Column('timestamp', { name: 'password_changed_at', nullable: true })
  passwordChangedAt: Date | null;

  // Hooks for automatic data processing
  @BeforeInsert()
  beforeInsert(): void {
    this.email = this.email.toLowerCase();
    this.name = this.name.trim();
  }

  @BeforeUpdate()
  beforeUpdate(): void {
    if (this.email) {
      this.email = this.email.toLowerCase();
    }
    if (this.name) {
      this.name = this.name.trim();
    }
  }

  // Helper methods
  isActive(): boolean {
    return this.status === 'active' && !this.deletedAt;
  }

  isSuspended(): boolean {
    return this.status === 'suspended';
  }

  isLocked(): boolean {
    return this.lockedUntil !== null && this.lockedUntil > new Date();
  }

  canLogin(): boolean {
    return this.isActive() && !this.isLocked() && this.emailVerified;
  }

  incrementLoginAttempts(): void {
    this.loginAttempts += 1;
    
    // Lock account after 5 failed attempts for 30 minutes
    if (this.loginAttempts >= 5) {
      this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }
  }

  resetLoginAttempts(): void {
    this.loginAttempts = 0;
    this.lockedUntil = null;
  }

  updateLastLogin(ip: string, userAgent: string): void {
    this.lastLoginAt = new Date();
    this.lastLoginIp = ip;
    this.userAgent = userAgent;
    this.resetLoginAttempts();
  }

  markEmailAsVerified(): void {
    this.emailVerified = true;
    this.emailVerifiedAt = new Date();
    this.emailVerificationToken = null;
  }

  setPasswordResetToken(token: string, expiresIn: number = 3600000): void { // 1 hour default
    this.passwordResetToken = token;
    this.passwordResetExpires = new Date(Date.now() + expiresIn);
  }

  clearPasswordResetToken(): void {
    this.passwordResetToken = null;
    this.passwordResetExpires = null;
    this.passwordChangedAt = new Date();
  }

  softDelete(): void {
    this.deletedAt = new Date();
    this.status = 'inactive';
  }

  restore(): void {
    this.deletedAt = null;
    this.status = 'active';
  }

  // Validation methods
  isValidPasswordResetToken(token: string): boolean {
    return this.passwordResetToken === token && 
           this.passwordResetExpires !== null && 
           this.passwordResetExpires > new Date();
  }

  isValidEmailVerificationToken(token: string): boolean {
    return this.emailVerificationToken === token && !this.emailVerified;
  }
}