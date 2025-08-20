# Epic 021: Password Management System

## Executive Summary

**Epic Title**: Password Management System with Comprehensive Security Operations
**Business Value**: Enable secure password operations, policy enforcement, and account protection for the InsightLoop platform
**Scope**: Password changes, reset workflows, security policies, history tracking, account lockout, and security notifications
**Priority**: Critical (Foundation Epic - depends on Epic 018, 019, 020)
**Estimated Effort**: 3-4 weeks
**Success Metrics**: 
- 100% test coverage for password security logic
- API response time < 300ms for password operations
- Zero successful brute force attacks
- Complete audit trail for all password operations
- 99.9% uptime for password reset workflow
- Full compliance with OWASP password security guidelines

## Business Context

### Problem Statement
Building upon the user registration (Epic 018), authentication (Epic 019), and profile management (Epic 020) systems, users need comprehensive password management capabilities. This includes secure password changes, robust forgot password workflows, password policy enforcement, account protection against attacks, and complete audit trails for security compliance.

### Business Requirements
- Authenticated users can change their passwords securely
- Robust forgot password workflow with email verification
- Password strength validation and policy enforcement
- Password history tracking to prevent reuse
- Password expiration and rotation policies
- Account lockout protection against brute force attacks
- Security notifications for all password-related activities
- Complete audit trail for compliance and security monitoring
- Rate limiting and abuse protection
- Multi-factor verification for sensitive operations

### Success Criteria
- Users can successfully change passwords with proper validation
- Forgot password workflow has 95%+ completion rate
- Password policies prevent weak passwords and reuse
- Account lockout effectively prevents brute force attacks
- All password operations are properly audited and logged
- Security notifications reach users promptly
- System meets industry security standards (OWASP, NIST)
- Zero successful password-based security breaches

## Domain Model

### Core Entities

#### PasswordManagement Aggregate
```typescript
// Domain Entity
class PasswordManagement extends Entity<UserId> {
  private constructor(
    id: UserId,
    private userId: UserId,
    private currentPasswordHash: HashedPassword,
    private passwordHistory: PasswordHistory,
    private securitySettings: PasswordSecuritySettings,
    private lockoutStatus: AccountLockoutStatus,
    private lastPasswordChange: Date,
    private passwordExpiresAt: Date,
    private failedAttempts: FailedLoginAttempts,
    private createdAt: Date,
    private updatedAt: Date
  ) {
    super(id);
  }

  // Business Rules
  public changePassword(
    currentPassword: string, 
    newPassword: string, 
    changedBy: UserId,
    userAgent: string,
    ipAddress: string
  ): void {
    // Validate current password
    if (!this.currentPasswordHash.verify(currentPassword)) {
      this.recordFailedAttempt(ipAddress, userAgent);
      throw new InvalidCurrentPasswordException();
    }

    // Check if account is locked
    if (this.lockoutStatus.isLocked()) {
      throw new AccountLockedException(this.lockoutStatus.getUnlockTime());
    }

    // Validate new password
    const newPasswordHash = HashedPassword.fromPlaintext(newPassword);
    this.validatePasswordPolicies(newPasswordHash);
    this.validatePasswordHistory(newPasswordHash);

    // Apply password change
    const previousPasswordHash = this.currentPasswordHash;
    this.currentPasswordHash = newPasswordHash;
    this.passwordHistory = this.passwordHistory.addPassword(previousPasswordHash);
    this.lastPasswordChange = new Date();
    this.passwordExpiresAt = this.calculatePasswordExpiration();
    this.failedAttempts = FailedLoginAttempts.reset();
    this.updatedAt = new Date();

    // Add domain event
    this.addDomainEvent(new PasswordChangedEvent(
      this.userId.getValue(),
      changedBy.getValue(),
      ipAddress,
      userAgent,
      'manual_change',
      new Date()
    ));
  }

  public createPasswordResetRequest(
    requestedBy: UserId,
    ipAddress: string,
    userAgent: string
  ): PasswordResetRequest {
    // Check rate limiting
    if (this.securitySettings.isResetRateLimited()) {
      throw new PasswordResetRateLimitException();
    }

    // Create reset request
    const resetRequest = PasswordResetRequest.create(
      this.userId,
      requestedBy,
      ipAddress,
      userAgent
    );

    // Add domain event
    this.addDomainEvent(new PasswordResetRequestedEvent(
      this.userId.getValue(),
      resetRequest.getId().getValue(),
      ipAddress,
      userAgent,
      new Date()
    ));

    return resetRequest;
  }

  public resetPassword(
    resetRequest: PasswordResetRequest,
    newPassword: string,
    ipAddress: string,
    userAgent: string
  ): void {
    // Validate reset request
    if (!resetRequest.isValid()) {
      throw new InvalidPasswordResetRequestException();
    }

    if (resetRequest.isExpired()) {
      throw new PasswordResetRequestExpiredException();
    }

    if (!resetRequest.isValidFor(ipAddress, userAgent)) {
      throw new InvalidPasswordResetContextException();
    }

    // Validate new password
    const newPasswordHash = HashedPassword.fromPlaintext(newPassword);
    this.validatePasswordPolicies(newPasswordHash);
    this.validatePasswordHistory(newPasswordHash);

    // Apply password reset
    const previousPasswordHash = this.currentPasswordHash;
    this.currentPasswordHash = newPasswordHash;
    this.passwordHistory = this.passwordHistory.addPassword(previousPasswordHash);
    this.lastPasswordChange = new Date();
    this.passwordExpiresAt = this.calculatePasswordExpiration();
    this.failedAttempts = FailedLoginAttempts.reset();
    this.lockoutStatus = AccountLockoutStatus.unlocked();
    this.updatedAt = new Date();

    // Mark reset request as used
    resetRequest.markAsUsed();

    // Add domain event
    this.addDomainEvent(new PasswordResetCompletedEvent(
      this.userId.getValue(),
      resetRequest.getId().getValue(),
      ipAddress,
      userAgent,
      new Date()
    ));
  }

  public recordFailedAttempt(ipAddress: string, userAgent: string): void {
    this.failedAttempts = this.failedAttempts.addAttempt(ipAddress, userAgent);
    
    if (this.failedAttempts.hasExceededThreshold()) {
      this.lockoutStatus = AccountLockoutStatus.locked(
        this.securitySettings.getLockoutDuration()
      );

      // Add domain event
      this.addDomainEvent(new AccountLockedEvent(
        this.userId.getValue(),
        this.failedAttempts.getAttemptCount(),
        this.lockoutStatus.getUnlockTime(),
        ipAddress,
        userAgent,
        new Date()
      ));
    }

    this.updatedAt = new Date();
  }

  public unlockAccount(unlockedBy: UserId): void {
    if (!this.lockoutStatus.isLocked()) {
      throw new AccountNotLockedException();
    }

    this.lockoutStatus = AccountLockoutStatus.unlocked();
    this.failedAttempts = FailedLoginAttempts.reset();
    this.updatedAt = new Date();

    // Add domain event
    this.addDomainEvent(new AccountUnlockedEvent(
      this.userId.getValue(),
      unlockedBy.getValue(),
      'manual_unlock',
      new Date()
    ));
  }

  public checkPasswordExpiration(): void {
    if (this.isPasswordExpired()) {
      this.addDomainEvent(new PasswordExpiredEvent(
        this.userId.getValue(),
        this.passwordExpiresAt,
        new Date()
      ));
    }
  }

  public isPasswordExpired(): boolean {
    return new Date() > this.passwordExpiresAt;
  }

  public requiresPasswordChange(): boolean {
    return this.isPasswordExpired() || this.securitySettings.requiresPeriodicChange();
  }

  public canLogin(): boolean {
    return !this.lockoutStatus.isLocked() && !this.isPasswordExpired();
  }

  private validatePasswordPolicies(password: HashedPassword): void {
    const policy = this.securitySettings.getPasswordPolicy();
    
    if (!policy.validateStrength(password)) {
      throw new WeakPasswordException(policy.getRequirements());
    }

    if (!policy.validateComplexity(password)) {
      throw new InsufficientPasswordComplexityException(policy.getComplexityRequirements());
    }
  }

  private validatePasswordHistory(password: HashedPassword): void {
    if (this.passwordHistory.containsPassword(password)) {
      throw new PasswordReuseNotAllowedException(
        this.securitySettings.getPasswordHistoryLimit()
      );
    }
  }

  private calculatePasswordExpiration(): Date {
    const expirationDays = this.securitySettings.getPasswordExpirationDays();
    return new Date(Date.now() + (expirationDays * 24 * 60 * 60 * 1000));
  }

  public getDaysUntilExpiration(): number {
    const now = new Date();
    const diffTime = this.passwordExpiresAt.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  public getPasswordStrength(): PasswordStrength {
    return this.securitySettings.getPasswordPolicy().calculateStrength(this.currentPasswordHash);
  }
}
```

#### PasswordResetRequest Entity
```typescript
class PasswordResetRequest extends Entity<PasswordResetRequestId> {
  private constructor(
    id: PasswordResetRequestId,
    private userId: UserId,
    private requestedBy: UserId,
    private resetToken: ResetToken,
    private status: ResetRequestStatus,
    private ipAddress: string,
    private userAgent: string,
    private verificationCode: VerificationCode,
    private expiresAt: Date,
    private createdAt: Date,
    private usedAt?: Date
  ) {
    super(id);
  }

  public static create(
    userId: UserId,
    requestedBy: UserId,
    ipAddress: string,
    userAgent: string
  ): PasswordResetRequest {
    const id = PasswordResetRequestId.generate();
    const resetToken = ResetToken.generate();
    const verificationCode = VerificationCode.generate();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    return new PasswordResetRequest(
      id,
      userId,
      requestedBy,
      resetToken,
      ResetRequestStatus.pending(),
      ipAddress,
      userAgent,
      verificationCode,
      expiresAt,
      new Date()
    );
  }

  public verify(token: string, code: string): void {
    if (this.isExpired()) {
      throw new PasswordResetRequestExpiredException();
    }

    if (!this.resetToken.verify(token)) {
      throw new InvalidResetTokenException();
    }

    if (!this.verificationCode.verify(code)) {
      throw new InvalidVerificationCodeException();
    }

    this.status = ResetRequestStatus.verified();
  }

  public markAsUsed(): void {
    this.status = ResetRequestStatus.used();
    this.usedAt = new Date();
  }

  public cancel(): void {
    this.status = ResetRequestStatus.cancelled();
  }

  public isValid(): boolean {
    return this.status.isVerified() && !this.isExpired();
  }

  public isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  public isValidFor(ipAddress: string, userAgent: string): boolean {
    // Allow from same IP or relaxed validation based on security settings
    return this.ipAddress === ipAddress || this.allowsCrossDeviceReset();
  }

  public getResetToken(): ResetToken {
    return this.resetToken;
  }

  public getVerificationCode(): VerificationCode {
    return this.verificationCode;
  }

  public getUserId(): UserId {
    return this.userId;
  }

  private allowsCrossDeviceReset(): boolean {
    // Business rule: allow reset from different devices for better UX
    return true;
  }
}
```

#### Value Objects

##### PasswordHistory Value Object
```typescript
class PasswordHistory extends ValueObject {
  private static readonly MAX_HISTORY_SIZE = 10;

  constructor(
    private readonly passwords: ReadonlyArray<HistoricPassword>
  ) {
    super();
    this.validate();
  }

  private validate(): void {
    if (this.passwords.length > PasswordHistory.MAX_HISTORY_SIZE) {
      throw new InvalidPasswordHistoryException(
        'Password history cannot exceed maximum size'
      );
    }
  }

  public addPassword(password: HashedPassword): PasswordHistory {
    const historicPassword = new HistoricPassword(password, new Date());
    const updatedPasswords = [historicPassword, ...this.passwords]
      .slice(0, PasswordHistory.MAX_HISTORY_SIZE);
    
    return new PasswordHistory(updatedPasswords);
  }

  public containsPassword(password: HashedPassword): boolean {
    return this.passwords.some(historic => 
      historic.matches(password)
    );
  }

  public getPasswordCount(): number {
    return this.passwords.length;
  }

  public getOldestPasswordDate(): Date | null {
    if (this.passwords.length === 0) return null;
    return this.passwords[this.passwords.length - 1].getCreatedAt();
  }

  protected getEqualityComponents(): any[] {
    return [this.passwords];
  }

  public static empty(): PasswordHistory {
    return new PasswordHistory([]);
  }
}

class HistoricPassword {
  constructor(
    private readonly passwordHash: HashedPassword,
    private readonly createdAt: Date
  ) {}

  public matches(password: HashedPassword): boolean {
    return this.passwordHash.equals(password);
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }
}
```

##### PasswordSecuritySettings Value Object
```typescript
class PasswordSecuritySettings extends ValueObject {
  constructor(
    private readonly passwordPolicy: PasswordPolicy,
    private readonly lockoutThreshold: number,
    private readonly lockoutDuration: number, // minutes
    private readonly passwordExpirationDays: number,
    private readonly passwordHistoryLimit: number,
    private readonly resetRateLimit: RateLimit
  ) {
    super();
    this.validate();
  }

  private validate(): void {
    if (this.lockoutThreshold < 3 || this.lockoutThreshold > 10) {
      throw new InvalidSecuritySettingsException('Lockout threshold must be between 3 and 10');
    }
    if (this.lockoutDuration < 5 || this.lockoutDuration > 1440) {
      throw new InvalidSecuritySettingsException('Lockout duration must be between 5 minutes and 24 hours');
    }
    if (this.passwordExpirationDays < 30 || this.passwordExpirationDays > 365) {
      throw new InvalidSecuritySettingsException('Password expiration must be between 30 and 365 days');
    }
  }

  public getPasswordPolicy(): PasswordPolicy {
    return this.passwordPolicy;
  }

  public getLockoutThreshold(): number {
    return this.lockoutThreshold;
  }

  public getLockoutDuration(): number {
    return this.lockoutDuration;
  }

  public getPasswordExpirationDays(): number {
    return this.passwordExpirationDays;
  }

  public getPasswordHistoryLimit(): number {
    return this.passwordHistoryLimit;
  }

  public isResetRateLimited(): boolean {
    return this.resetRateLimit.isLimited();
  }

  public requiresPeriodicChange(): boolean {
    return this.passwordExpirationDays > 0;
  }

  protected getEqualityComponents(): any[] {
    return [
      this.passwordPolicy,
      this.lockoutThreshold,
      this.lockoutDuration,
      this.passwordExpirationDays,
      this.passwordHistoryLimit,
      this.resetRateLimit
    ];
  }

  public static getDefault(): PasswordSecuritySettings {
    return new PasswordSecuritySettings(
      PasswordPolicy.getDefault(),
      5, // lockout after 5 failed attempts
      30, // lock for 30 minutes
      90, // passwords expire after 90 days
      5, // remember last 5 passwords
      RateLimit.create(3, 3600) // 3 reset requests per hour
    );
  }
}
```

##### PasswordPolicy Value Object
```typescript
class PasswordPolicy extends ValueObject {
  constructor(
    private readonly minLength: number,
    private readonly maxLength: number,
    private readonly requireUppercase: boolean,
    private readonly requireLowercase: boolean,
    private readonly requireNumbers: boolean,
    private readonly requireSpecialChars: boolean,
    private readonly minSpecialChars: number,
    private readonly allowCommonPasswords: boolean,
    private readonly allowPersonalInfo: boolean
  ) {
    super();
    this.validate();
  }

  private validate(): void {
    if (this.minLength < 8 || this.minLength > 128) {
      throw new InvalidPasswordPolicyException('Minimum length must be between 8 and 128');
    }
    if (this.maxLength < this.minLength || this.maxLength > 256) {
      throw new InvalidPasswordPolicyException('Maximum length must be greater than minimum and not exceed 256');
    }
  }

  public validateStrength(password: HashedPassword): boolean {
    const plaintext = password.getPlaintext(); // Note: This should be done carefully
    
    if (plaintext.length < this.minLength || plaintext.length > this.maxLength) {
      return false;
    }

    if (this.requireUppercase && !/[A-Z]/.test(plaintext)) {
      return false;
    }

    if (this.requireLowercase && !/[a-z]/.test(plaintext)) {
      return false;
    }

    if (this.requireNumbers && !/\d/.test(plaintext)) {
      return false;
    }

    if (this.requireSpecialChars) {
      const specialCharCount = (plaintext.match(/[!@#$%^&*(),.?":{}|<>]/g) || []).length;
      if (specialCharCount < this.minSpecialChars) {
        return false;
      }
    }

    if (!this.allowCommonPasswords && this.isCommonPassword(plaintext)) {
      return false;
    }

    return true;
  }

  public validateComplexity(password: HashedPassword): boolean {
    const plaintext = password.getPlaintext();
    
    // Check for patterns like "password123", "qwerty", etc.
    const patterns = [
      /(.)\1{3,}/, // Repeated characters
      /(012|123|234|345|456|567|678|789|890)/, // Sequential numbers
      /(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i, // Sequential letters
      /(qwer|asdf|zxcv|uiop|hjkl|bnm)/i // Keyboard patterns
    ];

    return !patterns.some(pattern => pattern.test(plaintext));
  }

  public calculateStrength(password: HashedPassword): PasswordStrength {
    const plaintext = password.getPlaintext();
    let score = 0;
    
    // Length scoring
    if (plaintext.length >= 8) score += 1;
    if (plaintext.length >= 12) score += 1;
    if (plaintext.length >= 16) score += 1;
    
    // Character variety scoring
    if (/[a-z]/.test(plaintext)) score += 1;
    if (/[A-Z]/.test(plaintext)) score += 1;
    if (/\d/.test(plaintext)) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(plaintext)) score += 1;
    
    // Complexity bonus
    if (this.validateComplexity(password)) score += 2;
    
    if (score <= 3) return PasswordStrength.weak();
    if (score <= 6) return PasswordStrength.medium();
    return PasswordStrength.strong();
  }

  public getRequirements(): PasswordRequirements {
    return new PasswordRequirements(
      this.minLength,
      this.maxLength,
      this.requireUppercase,
      this.requireLowercase,
      this.requireNumbers,
      this.requireSpecialChars,
      this.minSpecialChars
    );
  }

  public getComplexityRequirements(): string[] {
    const requirements = [];
    requirements.push('No repeated characters');
    requirements.push('No sequential patterns');
    requirements.push('No keyboard patterns');
    if (!this.allowCommonPasswords) {
      requirements.push('No common passwords');
    }
    return requirements;
  }

  private isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ];
    
    return commonPasswords.some(common => 
      password.toLowerCase().includes(common.toLowerCase())
    );
  }

  protected getEqualityComponents(): any[] {
    return [
      this.minLength,
      this.maxLength,
      this.requireUppercase,
      this.requireLowercase,
      this.requireNumbers,
      this.requireSpecialChars,
      this.minSpecialChars,
      this.allowCommonPasswords,
      this.allowPersonalInfo
    ];
  }

  public static getDefault(): PasswordPolicy {
    return new PasswordPolicy(
      8,    // minLength
      128,  // maxLength
      true, // requireUppercase
      true, // requireLowercase
      true, // requireNumbers
      true, // requireSpecialChars
      1,    // minSpecialChars
      false, // allowCommonPasswords
      false  // allowPersonalInfo
    );
  }
}
```

##### AccountLockoutStatus Value Object
```typescript
class AccountLockoutStatus extends ValueObject {
  constructor(
    private readonly isLocked: boolean,
    private readonly lockedAt?: Date,
    private readonly unlockTime?: Date,
    private readonly reason?: string
  ) {
    super();
  }

  public static locked(durationMinutes: number, reason: string = 'failed_attempts'): AccountLockoutStatus {
    const now = new Date();
    const unlockTime = new Date(now.getTime() + (durationMinutes * 60 * 1000));
    
    return new AccountLockoutStatus(true, now, unlockTime, reason);
  }

  public static unlocked(): AccountLockoutStatus {
    return new AccountLockoutStatus(false);
  }

  public isLocked(): boolean {
    if (!this.isLocked) return false;
    
    // Auto-unlock if time has passed
    if (this.unlockTime && new Date() > this.unlockTime) {
      return false;
    }
    
    return true;
  }

  public getUnlockTime(): Date | undefined {
    return this.unlockTime;
  }

  public getLockedAt(): Date | undefined {
    return this.lockedAt;
  }

  public getReason(): string | undefined {
    return this.reason;
  }

  public getRemainingLockoutMinutes(): number {
    if (!this.isLocked() || !this.unlockTime) return 0;
    
    const now = new Date();
    const remainingMs = this.unlockTime.getTime() - now.getTime();
    return Math.max(0, Math.ceil(remainingMs / (60 * 1000)));
  }

  protected getEqualityComponents(): any[] {
    return [this.isLocked, this.lockedAt, this.unlockTime, this.reason];
  }
}
```

### Domain Events
```typescript
class PasswordChangedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly changedBy: string,
    public readonly ipAddress: string,
    public readonly userAgent: string,
    public readonly changeReason: 'manual_change' | 'reset' | 'expired' | 'policy_update',
    public readonly occurredOn: Date = new Date()
  ) {
    super('PasswordChanged');
  }
}

class PasswordResetRequestedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly requestId: string,
    public readonly ipAddress: string,
    public readonly userAgent: string,
    public readonly occurredOn: Date = new Date()
  ) {
    super('PasswordResetRequested');
  }
}

class PasswordResetCompletedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly requestId: string,
    public readonly ipAddress: string,
    public readonly userAgent: string,
    public readonly occurredOn: Date = new Date()
  ) {
    super('PasswordResetCompleted');
  }
}

class AccountLockedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly failedAttempts: number,
    public readonly unlockTime: Date,
    public readonly ipAddress: string,
    public readonly userAgent: string,
    public readonly occurredOn: Date = new Date()
  ) {
    super('AccountLocked');
  }
}

class AccountUnlockedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly unlockedBy: string,
    public readonly unlockReason: 'manual_unlock' | 'time_expired' | 'successful_login',
    public readonly occurredOn: Date = new Date()
  ) {
    super('AccountUnlocked');
  }
}

class PasswordExpiredEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly expiredAt: Date,
    public readonly occurredOn: Date = new Date()
  ) {
    super('PasswordExpired');
  }
}

class PasswordExpirationWarningEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly expiresAt: Date,
    public readonly daysUntilExpiration: number,
    public readonly occurredOn: Date = new Date()
  ) {
    super('PasswordExpirationWarning');
  }
}

class SuspiciousPasswordActivityEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly activityType: 'multiple_failed_attempts' | 'reset_abuse' | 'unusual_location',
    public readonly ipAddress: string,
    public readonly userAgent: string,
    public readonly details: Record<string, any>,
    public readonly occurredOn: Date = new Date()
  ) {
    super('SuspiciousPasswordActivity');
  }
}
```

### Repository Interfaces
```typescript
interface IPasswordManagementRepository {
  findByUserId(userId: UserId): Promise<PasswordManagement | null>;
  save(passwordManagement: PasswordManagement): Promise<void>;
  delete(userId: UserId): Promise<void>;
}

interface IPasswordResetRequestRepository {
  findById(id: PasswordResetRequestId): Promise<PasswordResetRequest | null>;
  findByToken(token: ResetToken): Promise<PasswordResetRequest | null>;
  findPendingByUserId(userId: UserId): Promise<PasswordResetRequest[]>;
  save(request: PasswordResetRequest): Promise<void>;
  delete(id: PasswordResetRequestId): Promise<void>;
  deleteExpiredRequests(): Promise<void>;
}

interface IPasswordAuditRepository {
  save(audit: PasswordAudit): Promise<void>;
  findByUserId(userId: UserId, limit?: number): Promise<PasswordAudit[]>;
  findByIpAddress(ipAddress: string, timeWindow: number): Promise<PasswordAudit[]>;
  deleteOldAudits(retentionDays: number): Promise<void>;
}

interface IPasswordSecurityRepository {
  getSecuritySettings(userId: UserId): Promise<PasswordSecuritySettings>;
  saveSecuritySettings(userId: UserId, settings: PasswordSecuritySettings): Promise<void>;
  getGlobalSecurityPolicy(): Promise<PasswordPolicy>;
}
```

## User Stories

### Epic User Stories

#### US-001: Change Password (Authenticated)
**As an** authenticated user
**I want to** change my password securely
**So that** I can maintain account security and update my credentials

**Acceptance Criteria:**
- User must provide current password for verification
- New password must meet security policy requirements
- Password cannot be reused from history
- Change is immediately effective
- User receives security notification
- All sessions remain valid after password change
- Complete audit trail is maintained

**API Contract:**
```http
PUT /api/v1/password/change
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "currentPassword": "CurrentPass123!",
  "newPassword": "NewSecurePass456@",
  "confirmPassword": "NewSecurePass456@"
}

Response 200:
{
  "success": true,
  "data": {
    "message": "Password changed successfully",
    "passwordStrength": "strong",
    "expiresAt": "2024-04-15T10:30:00Z",
    "changedAt": "2024-01-15T10:30:00Z"
  }
}

Response 400:
{
  "success": false,
  "error": {
    "code": "WEAK_PASSWORD",
    "message": "Password does not meet security requirements",
    "details": {
      "requirements": [
        "Must be at least 8 characters long",
        "Must contain uppercase and lowercase letters",
        "Must contain at least one number",
        "Must contain at least one special character"
      ]
    }
  }
}
```

#### US-002: Forgot Password Request
**As a** user who forgot their password
**I want to** request a password reset
**So that** I can regain access to my account

**Acceptance Criteria:**
- User provides email address only
- Reset email is sent to registered email
- Reset link expires within 1 hour
- Rate limiting prevents abuse (3 requests per hour)
- No indication if email exists (prevent enumeration)
- Reset request invalidates previous requests
- Security notification sent to account owner

**API Contract:**
```http
POST /api/v1/password/forgot
Content-Type: application/json

{
  "email": "user@example.com"
}

Response 200:
{
  "success": true,
  "data": {
    "message": "If an account with this email exists, password reset instructions have been sent.",
    "requestId": "uuid-here",
    "expiresIn": 3600
  }
}

Response 429:
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many password reset requests. Please try again later.",
    "retryAfter": 3600
  }
}
```

#### US-003: Reset Password with Token
**As a** user with a password reset token
**I want to** reset my password
**So that** I can regain access to my account

**Acceptance Criteria:**
- User provides valid reset token and verification code
- New password must meet security policy requirements
- Password cannot be reused from history
- All existing sessions are invalidated
- Account lockout is cleared if present
- User receives confirmation notification
- Reset token is invalidated after use

**API Contract:**
```http
POST /api/v1/password/reset
Content-Type: application/json

{
  "resetToken": "secure-reset-token-here",
  "verificationCode": "123456",
  "newPassword": "NewSecurePass789#",
  "confirmPassword": "NewSecurePass789#"
}

Response 200:
{
  "success": true,
  "data": {
    "message": "Password reset successfully",
    "passwordStrength": "strong",
    "sessionsInvalidated": 3,
    "resetAt": "2024-01-15T10:45:00Z"
  }
}

Response 400:
{
  "success": false,
  "error": {
    "code": "INVALID_RESET_TOKEN",
    "message": "Reset token is invalid or has expired"
  }
}
```

#### US-004: Password Strength Validation
**As a** user creating or changing a password
**I want** real-time password strength feedback
**So that** I can create a secure password that meets requirements

**Acceptance Criteria:**
- Real-time validation during password entry
- Clear strength indicator (weak/medium/strong)
- Specific requirement feedback
- Password policy details available
- Suggestions for improvement
- Prevention of common passwords
- History check for reuse

**API Contract:**
```http
POST /api/v1/password/validate
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "password": "TestPass123!"
}

Response 200:
{
  "success": true,
  "data": {
    "strength": "medium",
    "score": 6,
    "isValid": true,
    "meetsRequirements": true,
    "feedback": {
      "requirements": [
        {
          "rule": "minLength",
          "satisfied": true,
          "message": "At least 8 characters"
        },
        {
          "rule": "hasUppercase",
          "satisfied": true,
          "message": "Contains uppercase letter"
        },
        {
          "rule": "hasNumbers",
          "satisfied": true,
          "message": "Contains number"
        },
        {
          "rule": "hasSpecialChars",
          "satisfied": true,
          "message": "Contains special character"
        }
      ],
      "suggestions": [
        "Consider adding more special characters for stronger security",
        "Longer passwords provide better security"
      ]
    },
    "isReused": false,
    "isCommon": false
  }
}
```

#### US-005: Account Lockout Management
**As a** system administrator
**I want** automatic account lockout after failed attempts
**So that** brute force attacks are prevented

**Acceptance Criteria:**
- Account locks after 5 failed password attempts
- Lockout duration increases with repeated lockouts
- Clear lockout messages to users
- Admin can manually unlock accounts
- Lockout history is tracked
- Suspicious activity notifications
- Rate limiting on login attempts

**API Contract:**
```http
GET /api/v1/password/lockout-status
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Response 200:
{
  "success": true,
  "data": {
    "isLocked": false,
    "failedAttempts": 2,
    "maxAttempts": 5,
    "lockoutDuration": 30,
    "lastFailedAttempt": "2024-01-15T10:15:00Z"
  }
}

POST /api/v1/admin/users/:userId/unlock
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Response 200:
{
  "success": true,
  "data": {
    "message": "Account unlocked successfully",
    "unlockedAt": "2024-01-15T10:30:00Z",
    "unlockedBy": "admin-user-id"
  }
}
```

#### US-006: Password Expiration Management
**As a** system
**I want** to enforce password expiration policies
**So that** users maintain fresh, secure passwords

**Acceptance Criteria:**
- Passwords expire after 90 days by default
- Users receive warnings 14, 7, and 1 day before expiration
- Expired passwords require immediate change
- Grace period allows limited access for password change
- Expiration policy is configurable
- Audit trail for all expiration events

**API Contract:**
```http
GET /api/v1/password/expiration-status
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Response 200:
{
  "success": true,
  "data": {
    "passwordAge": 75,
    "expiresAt": "2024-04-15T10:30:00Z",
    "daysUntilExpiration": 15,
    "isExpired": false,
    "requiresChange": false,
    "lastChanged": "2024-01-15T10:30:00Z",
    "warnings": [
      {
        "type": "approaching_expiration",
        "sentAt": "2024-04-01T10:30:00Z",
        "daysNotice": 14
      }
    ]
  }
}
```

#### US-007: Security Audit Trail
**As a** security administrator
**I want** complete audit trails for password operations
**So that** I can monitor security and investigate incidents

**Acceptance Criteria:**
- All password operations are logged
- Audit includes IP address, user agent, timestamp
- Failed attempts are tracked with details
- Audit data is searchable and filterable
- Retention policy automatically purges old data
- Export capabilities for compliance
- Real-time security alerts

**API Contract:**
```http
GET /api/v1/password/audit?limit=50&offset=0&from=2024-01-01&to=2024-01-31
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Response 200:
{
  "success": true,
  "data": {
    "audits": [
      {
        "id": "audit-uuid-1",
        "userId": "user-uuid",
        "action": "password_changed",
        "result": "success",
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0...",
        "timestamp": "2024-01-15T10:30:00Z",
        "details": {
          "changeReason": "manual_change",
          "strengthScore": 8
        }
      },
      {
        "id": "audit-uuid-2",
        "userId": "user-uuid",
        "action": "login_attempt",
        "result": "failed",
        "ipAddress": "192.168.1.200",
        "userAgent": "curl/7.68.0",
        "timestamp": "2024-01-15T09:45:00Z",
        "details": {
          "failureReason": "invalid_password",
          "attemptNumber": 3
        }
      }
    ],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 156,
      "hasMore": true
    }
  }
}
```

## Layer-by-Layer Implementation Plan

### 1. Domain Layer Implementation

#### Tasks:
- **TASK-001**: Create PasswordManagement aggregate with business rules
- **TASK-002**: Implement PasswordResetRequest entity
- **TASK-003**: Create password value objects (PasswordHistory, PasswordPolicy, etc.)
- **TASK-004**: Implement password security settings and lockout status
- **TASK-005**: Create password strength calculation and validation
- **TASK-006**: Define password management domain events
- **TASK-007**: Create password repository interfaces
- **TASK-008**: Implement password domain services
- **TASK-009**: Create password-specific exceptions
- **TASK-010**: Add comprehensive password validation rules

**Files to Create:**
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/entities/password/password-management.entity.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/entities/password/password-reset-request.entity.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/entities/password/password-history.value-objects.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/entities/password/password-security-settings.value-objects.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/entities/password/password-policy.value-objects.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/entities/password/account-lockout-status.value-objects.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/entities/password/password.value-objects.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/events/password.events.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/repositories/password-management.repository.interface.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/repositories/password-reset-request.repository.interface.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/repositories/password-audit.repository.interface.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/services/password-strength.service.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/services/password-security.service.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/exceptions/password.exception.ts`

### 2. Application Layer Implementation

#### Tasks:
- **TASK-011**: Create ChangePassword use case
- **TASK-012**: Implement ForgotPassword use case
- **TASK-013**: Create ResetPassword use case
- **TASK-014**: Implement ValidatePassword use case
- **TASK-015**: Create CheckPasswordExpiration use case
- **TASK-016**: Implement UnlockAccount use case
- **TASK-017**: Create GetPasswordAudit use case
- **TASK-018**: Add password DTOs and mappers
- **TASK-019**: Implement password validation schemas
- **TASK-020**: Create password notification service ports

**Files to Create:**
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/use-cases/password/change-password/change-password.use-case.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/use-cases/password/change-password/change-password.dto.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/use-cases/password/forgot-password/forgot-password.use-case.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/use-cases/password/forgot-password/forgot-password.dto.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/use-cases/password/reset-password/reset-password.use-case.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/use-cases/password/reset-password/reset-password.dto.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/use-cases/password/validate-password/validate-password.use-case.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/use-cases/password/validate-password/validate-password.dto.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/use-cases/password/check-expiration/check-password-expiration.use-case.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/use-cases/password/unlock-account/unlock-account.use-case.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/use-cases/password/get-audit/get-password-audit.use-case.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/dto/mappers/password.mapper.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/validators/password.validator.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/ports/output/password-notification.port.ts`

### 3. Infrastructure Layer Implementation

#### Tasks:
- **TASK-021**: Create PasswordManagement ORM entity
- **TASK-022**: Implement PasswordManagementRepository with TypeORM
- **TASK-023**: Create PasswordResetRequest ORM entity
- **TASK-024**: Implement PasswordResetRequestRepository
- **TASK-025**: Create PasswordAudit ORM entity
- **TASK-026**: Implement PasswordAuditRepository
- **TASK-027**: Create database migrations for password tables
- **TASK-028**: Implement password notification service
- **TASK-029**: Add password cleanup background jobs
- **TASK-030**: Configure password security environment variables

**Files to Create:**
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/infrastructure/database/typeorm/entities/password-management.orm-entity.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/infrastructure/database/typeorm/entities/password-reset-request.orm-entity.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/infrastructure/database/typeorm/entities/password-audit.orm-entity.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/infrastructure/database/typeorm/repositories/password-management.repository.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/infrastructure/database/typeorm/repositories/password-reset-request.repository.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/infrastructure/database/typeorm/repositories/password-audit.repository.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/infrastructure/database/typeorm/migrations/004-create-password-tables.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/infrastructure/notifications/password/password-notification.service.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/infrastructure/jobs/password-cleanup.job.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/infrastructure/jobs/password-expiration-checker.job.ts`

### 4. Presentation Layer Implementation

#### Tasks:
- **TASK-031**: Create PasswordController with all endpoints
- **TASK-032**: Add password validation middleware
- **TASK-033**: Implement password routes configuration
- **TASK-034**: Add password-specific error handling
- **TASK-035**: Create password rate limiting middleware
- **TASK-036**: Update Swagger documentation for password endpoints
- **TASK-037**: Add password request/response transformations
- **TASK-038**: Implement password security headers

**Files to Create:**
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/presentation/http/rest/controllers/password.controller.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/presentation/http/rest/routes/password.routes.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/presentation/http/rest/middlewares/password-validation.middleware.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/presentation/http/rest/middlewares/password-rate-limit.middleware.ts`

## Agent Task Distribution

### Password Entity Agent Tasks
- Implement PasswordManagement aggregate with comprehensive business rules
- Create PasswordResetRequest entity with verification logic
- Define password value objects (history, policy, security settings)
- Create password factory for entity creation and reconstruction

### Password Security Agent Tasks
- Implement password strength calculation and validation
- Create password policy enforcement with customizable rules
- Handle account lockout logic and automatic unlocking
- Implement password history tracking and reuse prevention

### Password Reset Agent Tasks
- Implement forgot password workflow with rate limiting
- Create password reset token generation and validation
- Handle password reset email verification process
- Manage password reset request lifecycle and cleanup

### Password Use Case Agent Tasks
- Implement all password management use cases
- Handle business rule validation and orchestration
- Manage password change auditing and tracking
- Coordinate password security notifications

### Password Repository Agent Tasks
- Implement password repositories with TypeORM
- Handle password data persistence and retrieval
- Manage password reset request storage
- Implement password audit trail storage and querying

### Password Controller Agent Tasks
- Create password REST endpoints with proper authentication
- Implement request/response handling and validation
- Add password-specific error handling and rate limiting
- Configure password routing and security middleware

### Password Database Agent Tasks
- Design password management, reset, and audit table schemas
- Create database migrations with proper constraints and indexes
- Setup foreign key relationships and cascade rules
- Configure password data retention and cleanup policies

### Password Security Agent Tasks
- Implement password reset security measures
- Add password change authorization checks
- Configure rate limiting for password operations
- Handle password security notifications and alerts

### Password Test Agent Tasks
- Create comprehensive unit tests for password entities
- Implement integration tests for password use cases
- Add API endpoint tests for all password operations
- Create security and penetration tests for password features

### Password Notification Agent Tasks
- Implement password reset email sending
- Create password security notification templates
- Handle notification delivery and tracking
- Add password expiration warning notifications

## Technical Implementation Tasks

### Priority 1 (Critical - Week 1)
1. **Password Domain Foundation**
   - Create PasswordManagement aggregate with core business rules
   - Implement password value objects (history, policy, security settings)
   - Define password repository interfaces
   - Create password domain events

2. **Password Reset Security System**
   - Implement PasswordResetRequest entity with token validation
   - Create reset token generation and verification
   - Add rate limiting for reset requests
   - Setup password reset email workflow

3. **Database Schema Setup**
   - Create password_management table migration
   - Add password_reset_requests table
   - Create password_audit table
   - Setup proper indexes and constraints

### Priority 2 (High - Week 2)
4. **Password Use Cases Implementation**
   - Create ChangePassword use case with validation
   - Implement ForgotPassword and ResetPassword use cases
   - Add ValidatePassword use case
   - Create CheckPasswordExpiration use case

5. **Repository Implementation**
   - Implement PasswordManagementRepository with TypeORM
   - Create PasswordResetRequestRepository
   - Add PasswordAuditRepository with search capabilities
   - Handle data mapping and persistence

6. **Account Lockout System**
   - Implement lockout logic after failed attempts
   - Create automatic unlocking after timeout
   - Add manual account unlock capabilities
   - Handle lockout notifications and tracking

### Priority 3 (Medium - Week 3)
7. **Password API Endpoints**
   - Create PasswordController with all endpoints
   - Implement authentication and authorization
   - Add comprehensive input validation and error handling
   - Configure password routes and security middleware

8. **Password Notification System**
   - Implement password reset email sending
   - Create password change notification emails
   - Add password expiration warning notifications
   - Handle notification delivery tracking and retries

9. **Password Security Policies**
   - Implement configurable password policies
   - Create password strength calculation
   - Add password history enforcement
   - Handle password expiration and rotation

### Priority 4 (Low - Week 4)
10. **Performance Optimization**
    - Add caching for password policies and settings
    - Optimize database queries for audit trails
    - Implement password validation caching
    - Add performance monitoring for password operations

11. **Advanced Security Features**
    - Add suspicious activity detection
    - Implement IP-based rate limiting
    - Create password breach checking integration
    - Add advanced audit analytics

12. **Monitoring and Observability**
    - Add password operation metrics
    - Implement security alert systems
    - Create password security dashboards
    - Add compliance reporting

## Comprehensive Testing Strategy

### Unit Tests (Domain Layer)
```typescript
// tests/unit/domain/entities/password/password-management.entity.spec.ts
describe('PasswordManagement Entity', () => {
  describe('password change', () => {
    it('should change password with valid current password', () => {
      // Test successful password change
    });

    it('should reject invalid current password', () => {
      // Test invalid password rejection
    });

    it('should prevent password reuse', () => {
      // Test password history enforcement
    });

    it('should enforce password policies', () => {
      // Test password policy validation
    });
  });

  describe('account lockout', () => {
    it('should lock account after failed attempts', () => {
      // Test lockout mechanism
    });

    it('should unlock account after timeout', () => {
      // Test automatic unlocking
    });

    it('should reset failed attempts after successful change', () => {
      // Test failed attempt reset
    });
  });

  describe('password expiration', () => {
    it('should calculate expiration correctly', () => {
      // Test expiration calculation
    });

    it('should detect expired passwords', () => {
      // Test expiration detection
    });
  });
});
```

### Integration Tests (Application Layer)
```typescript
// tests/integration/application/use-cases/change-password.use-case.spec.ts
describe('ChangePassword Use Case', () => {
  beforeEach(async () => {
    // Setup test database and dependencies
  });

  it('should change password successfully', async () => {
    // Test complete password change flow
  });

  it('should validate password strength', async () => {
    // Test password policy enforcement
  });

  it('should prevent password reuse', async () => {
    // Test password history validation
  });

  it('should handle concurrent password changes', async () => {
    // Test concurrent modification handling
  });
});
```

### API Tests (End-to-End)
```typescript
// tests/e2e/api/password.e2e.spec.ts
describe('Password Management API', () => {
  describe('PUT /api/v1/password/change', () => {
    it('should change password with valid credentials', async () => {
      const response = await request(app)
        .put('/api/v1/password/change')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'OldPass123!',
          newPassword: 'NewPass456@',
          confirmPassword: 'NewPass456@'
        })
        .expect(200);

      expect(response.body.data.passwordStrength).toBeDefined();
      expect(response.body.data.expiresAt).toBeDefined();
    });

    it('should reject weak passwords', async () => {
      await request(app)
        .put('/api/v1/password/change')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'OldPass123!',
          newPassword: 'weak',
          confirmPassword: 'weak'
        })
        .expect(400);
    });
  });

  describe('Password Reset Workflow', () => {
    it('should request password reset', async () => {
      const response = await request(app)
        .post('/api/v1/password/forgot')
        .send({
          email: 'user@example.com'
        })
        .expect(200);

      expect(response.body.data.requestId).toBeDefined();
    });

    it('should reset password with valid token', async () => {
      // First request reset
      const resetResponse = await request(app)
        .post('/api/v1/password/forgot')
        .send({
          email: 'user@example.com'
        });

      // Then reset with token
      await request(app)
        .post('/api/v1/password/reset')
        .send({
          resetToken: 'valid-token',
          verificationCode: '123456',
          newPassword: 'NewPass789#',
          confirmPassword: 'NewPass789#'
        })
        .expect(200);
    });
  });

  describe('Account Lockout', () => {
    it('should lock account after failed attempts', async () => {
      // Simulate multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'user@example.com',
            password: 'wrongpassword'
          })
          .expect(401);
      }

      // Check lockout status
      const response = await request(app)
        .get('/api/v1/password/lockout-status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.isLocked).toBe(true);
    });
  });
});
```

### Security Tests
```typescript
// tests/security/password.security.spec.ts
describe('Password Security', () => {
  it('should prevent brute force attacks', async () => {
    // Test rate limiting and lockout
  });

  it('should validate password reset tokens', async () => {
    // Test token validation and expiration
  });

  it('should prevent password enumeration', async () => {
    // Test consistent response times
  });

  it('should enforce password policies', async () => {
    // Test policy enforcement
  });
});
```

## Documentation Structure

### API Documentation (OpenAPI/Swagger)
```yaml
# swagger/password.yaml
paths:
  /api/v1/password/change:
    put:
      summary: Change user password
      tags: [Password Management]
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ChangePasswordRequest'
      responses:
        '200':
          description: Password changed successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ChangePasswordResponse'
        '400':
          description: Validation error
        '401':
          description: Unauthorized
        '423':
          description: Account locked

  /api/v1/password/forgot:
    post:
      summary: Request password reset
      tags: [Password Management]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ForgotPasswordRequest'
      responses:
        '200':
          description: Reset request processed
        '429':
          description: Rate limit exceeded

components:
  schemas:
    ChangePasswordRequest:
      type: object
      required: [currentPassword, newPassword, confirmPassword]
      properties:
        currentPassword:
          type: string
          minLength: 1
        newPassword:
          type: string
          minLength: 8
        confirmPassword:
          type: string
          minLength: 8
    
    ChangePasswordResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            message:
              type: string
            passwordStrength:
              type: string
              enum: [weak, medium, strong]
            expiresAt:
              type: string
              format: date-time
            changedAt:
              type: string
              format: date-time
```

### Technical Documentation
- **PASSWORD-MANAGEMENT.md**: Complete password management guide
- **PASSWORD-SECURITY.md**: Security policies and best practices
- **PASSWORD-RESET-WORKFLOW.md**: Reset process documentation
- **PASSWORD-POLICIES.md**: Policy configuration and enforcement
- **ACCOUNT-LOCKOUT.md**: Lockout mechanism and management

## Risk Assessment and Mitigation

### Security Risks
1. **Password Reset Token Security Risk**
   - **Mitigation**: Strong token generation, short expiration, single-use tokens, IP validation

2. **Brute Force Attack Risk**
   - **Mitigation**: Account lockout, rate limiting, progressive delays, CAPTCHA integration

3. **Password Policy Bypass Risk**
   - **Mitigation**: Server-side validation, multiple validation layers, policy enforcement

4. **Password History Storage Risk**
   - **Mitigation**: Secure hashing, limited history size, encrypted storage

### Technical Risks
1. **Database Performance Risk**
   - **Mitigation**: Proper indexing, query optimization, audit data partitioning

2. **Email Delivery Risk**
   - **Mitigation**: Queue-based delivery, retry mechanisms, multiple providers

3. **Concurrent Operation Risk**
   - **Mitigation**: Database transactions, optimistic locking, race condition handling

## Dependencies and Prerequisites

### Prerequisites
- Epic 018 (Account Management System) must be completed
- Epic 019 (Authentication System) must be completed
- Epic 020 (Profile Management System) must be completed
- User entity and authentication middleware functional
- Email service infrastructure available

### Technical Dependencies
- TypeORM for password data persistence
- Email service for reset notifications
- Redis for rate limiting and caching
- Job queue for background processing
- Strong cryptography libraries

### External Dependencies
```json
{
  "dependencies": {
    "argon2": "^0.30.3",
    "crypto": "^1.0.1",
    "node-cron": "^3.0.2",
    "zxcvbn": "^4.4.2",
    "express-slow-down": "^1.6.0"
  },
  "devDependencies": {
    "@types/node-cron": "^3.0.8"
  }
}
```

## Success Metrics and KPIs

### Technical Metrics
- **Code Coverage**: 100% for password domain logic, 95% overall
- **API Response Time**: P95 < 300ms for password operations
- **Password Change Success Rate**: > 99%
- **Reset Email Delivery Rate**: > 98%

### Security Metrics
- **Brute Force Prevention**: 100% lockout effectiveness
- **Password Policy Compliance**: 100% enforcement
- **Reset Token Security**: Zero successful token compromises
- **Audit Trail Completeness**: 100% operation tracking

### Business Metrics
- **Password Reset Completion Rate**: > 95%
- **User Satisfaction**: High ease of use scores
- **Security Incident Rate**: Zero password-related breaches
- **Support Ticket Reduction**: Fewer password-related requests

## Future Enhancements

### Phase 2 Enhancements
- Multi-factor authentication integration
- Biometric password alternatives
- Password-less authentication options
- Advanced breach detection

### Phase 3 Enhancements
- Machine learning for suspicious activity detection
- Behavioral authentication patterns
- Advanced password analytics
- Integration with enterprise identity providers

### Security Evolution
- Quantum-resistant password storage
- Zero-knowledge password protocols
- Advanced threat intelligence integration
- Continuous security monitoring

## Conclusion

Epic 021 provides a comprehensive password management system that builds upon the foundation of user registration, authentication, and profile management. The implementation prioritizes security, user experience, and compliance while following Clean Architecture principles.

The system includes secure password operations, robust reset workflows, comprehensive security policies, and complete audit trails. The modular design enables easy extension for advanced features like multi-factor authentication and behavioral security.

**Next Steps:**
1. Review and approve epic scope and dependencies
2. Ensure Epic 018, 019, and 020 are completed and functional
3. Assign agents to password management tasks
4. Setup security configuration and policies
5. Begin Phase 1 domain layer implementation
6. Establish security testing protocols
7. Monitor password security metrics and user feedback

**Dependencies:**
- Epic 018: Account Management System (completed)
- Epic 019: Authentication System (completed) 
- Epic 020: Profile Management System (completed)
- User entity and authentication middleware
- Email service infrastructure
- Security configuration and monitoring systems