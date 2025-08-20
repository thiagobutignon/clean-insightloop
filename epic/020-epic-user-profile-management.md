# Epic 020: User Profile Management System

## Executive Summary

**Epic Title**: User Profile Management System with Comprehensive Operations
**Business Value**: Enable authenticated users to manage their profiles, preferences, and account information
**Scope**: Profile CRUD operations, change history, email verification, and user preferences management
**Priority**: High (Foundation Epic - depends on Epic 018 & 019)
**Estimated Effort**: 3-4 weeks
**Success Metrics**: 
- 100% test coverage for profile business logic
- API response time < 200ms for profile operations
- Zero data integrity violations
- Complete audit trail for all profile changes
- Seamless email change verification workflow

## Business Context

### Problem Statement
Building upon the user registration (Epic 018) and authentication systems (Epic 019), users need comprehensive profile management capabilities. This includes viewing and updating personal information, managing preferences, tracking changes for security and compliance, and handling sensitive operations like email changes with proper verification workflows.

### Business Requirements
- Authenticated users can view their complete profile information
- Users can update profile fields (name, email, preferences) with validation
- Email changes require verification workflow for security
- Complete audit trail for all profile modifications
- User preference management for application settings
- Profile completeness tracking for onboarding guidance
- Change history accessible to users for transparency
- Data validation and business rules enforcement

### Success Criteria
- Users can successfully view and update their profiles
- All profile changes are validated and audited
- Email changes follow secure verification process
- User preferences are properly stored and retrieved
- Profile completeness guides user onboarding
- Change history provides transparency and security
- API follows RESTful conventions with comprehensive error handling

## Domain Model

### Core Entities

#### UserProfile Aggregate
```typescript
// Domain Entity
class UserProfile extends Entity<UserId> {
  private constructor(
    id: UserId,
    private userId: UserId,
    private personalInfo: PersonalInfo,
    private contactInfo: ContactInfo,
    private preferences: UserPreferences,
    private profileCompleteness: ProfileCompleteness,
    private metadata: ProfileMetadata,
    private createdAt: Date,
    private updatedAt: Date
  ) {
    super(id);
  }

  // Business Rules
  public updatePersonalInfo(newInfo: PersonalInfo, updatedBy: UserId): void {
    const previousInfo = this.personalInfo;
    this.personalInfo = newInfo;
    this.updateMetadata(updatedBy);
    this.recalculateCompleteness();

    // Add domain event
    this.addDomainEvent(new ProfilePersonalInfoUpdatedEvent(
      this.userId.getValue(),
      previousInfo,
      newInfo,
      updatedBy.getValue(),
      new Date()
    ));
  }

  public requestEmailChange(newEmail: Email, updatedBy: UserId): EmailChangeRequest {
    if (this.contactInfo.getEmail().equals(newEmail)) {
      throw new EmailNotChangedException('New email is the same as current email');
    }

    const changeRequest = EmailChangeRequest.create(
      this.userId,
      this.contactInfo.getEmail(),
      newEmail,
      updatedBy
    );

    // Add domain event
    this.addDomainEvent(new EmailChangeRequestedEvent(
      this.userId.getValue(),
      this.contactInfo.getEmail().getValue(),
      newEmail.getValue(),
      changeRequest.getId().getValue(),
      new Date()
    ));

    return changeRequest;
  }

  public confirmEmailChange(changeRequest: EmailChangeRequest): void {
    if (!changeRequest.isValid()) {
      throw new InvalidEmailChangeRequestException();
    }

    if (changeRequest.isExpired()) {
      throw new EmailChangeRequestExpiredException();
    }

    const previousEmail = this.contactInfo.getEmail();
    this.contactInfo = this.contactInfo.withEmail(changeRequest.getNewEmail());
    this.updateMetadata(changeRequest.getRequestedBy());

    // Add domain event
    this.addDomainEvent(new EmailChangedEvent(
      this.userId.getValue(),
      previousEmail.getValue(),
      changeRequest.getNewEmail().getValue(),
      changeRequest.getId().getValue(),
      new Date()
    ));
  }

  public updatePreferences(preferences: UserPreferences, updatedBy: UserId): void {
    const previousPreferences = this.preferences;
    this.preferences = preferences;
    this.updateMetadata(updatedBy);

    // Add domain event
    this.addDomainEvent(new PreferencesUpdatedEvent(
      this.userId.getValue(),
      previousPreferences,
      preferences,
      updatedBy.getValue(),
      new Date()
    ));
  }

  private updateMetadata(updatedBy: UserId): void {
    this.metadata = this.metadata.withUpdate(updatedBy, new Date());
    this.updatedAt = new Date();
  }

  private recalculateCompleteness(): void {
    this.profileCompleteness = ProfileCompleteness.calculate(
      this.personalInfo,
      this.contactInfo,
      this.preferences
    );
  }

  public getCompleteness(): ProfileCompleteness {
    return this.profileCompleteness;
  }

  public requiresOnboarding(): boolean {
    return this.profileCompleteness.getPercentage() < 80;
  }

  public canUpdateEmail(): boolean {
    // Business rule: limit email changes frequency
    return this.metadata.canPerformEmailChange();
  }
}
```

#### Value Objects

##### PersonalInfo Value Object
```typescript
class PersonalInfo extends ValueObject {
  constructor(
    private readonly firstName: Name,
    private readonly lastName: Name,
    private readonly displayName?: Name,
    private readonly bio?: Bio,
    private readonly timezone?: Timezone
  ) {
    super();
  }

  getFullName(): string {
    return `${this.firstName.getValue()} ${this.lastName.getValue()}`;
  }

  getDisplayName(): string {
    return this.displayName?.getValue() || this.getFullName();
  }

  withFirstName(firstName: Name): PersonalInfo {
    return new PersonalInfo(firstName, this.lastName, this.displayName, this.bio, this.timezone);
  }

  withLastName(lastName: Name): PersonalInfo {
    return new PersonalInfo(this.firstName, lastName, this.displayName, this.bio, this.timezone);
  }

  withBio(bio: Bio): PersonalInfo {
    return new PersonalInfo(this.firstName, this.lastName, this.displayName, bio, this.timezone);
  }

  protected getEqualityComponents(): any[] {
    return [
      this.firstName,
      this.lastName,
      this.displayName,
      this.bio,
      this.timezone
    ];
  }
}
```

##### ContactInfo Value Object
```typescript
class ContactInfo extends ValueObject {
  constructor(
    private readonly email: Email,
    private readonly phone?: PhoneNumber,
    private readonly address?: Address
  ) {
    super();
  }

  getEmail(): Email {
    return this.email;
  }

  withEmail(email: Email): ContactInfo {
    return new ContactInfo(email, this.phone, this.address);
  }

  withPhone(phone: PhoneNumber): ContactInfo {
    return new ContactInfo(this.email, phone, this.address);
  }

  protected getEqualityComponents(): any[] {
    return [this.email, this.phone, this.address];
  }
}
```

##### UserPreferences Value Object
```typescript
class UserPreferences extends ValueObject {
  constructor(
    private readonly language: Language,
    private readonly theme: Theme,
    private readonly notifications: NotificationSettings,
    private readonly privacy: PrivacySettings,
    private readonly accessibility: AccessibilitySettings
  ) {
    super();
    this.validate();
  }

  private validate(): void {
    if (!this.language || !this.theme || !this.notifications) {
      throw new InvalidPreferencesException('Core preferences are required');
    }
  }

  withLanguage(language: Language): UserPreferences {
    return new UserPreferences(language, this.theme, this.notifications, this.privacy, this.accessibility);
  }

  withTheme(theme: Theme): UserPreferences {
    return new UserPreferences(this.language, theme, this.notifications, this.privacy, this.accessibility);
  }

  withNotifications(notifications: NotificationSettings): UserPreferences {
    return new UserPreferences(this.language, this.theme, notifications, this.privacy, this.accessibility);
  }

  protected getEqualityComponents(): any[] {
    return [this.language, this.theme, this.notifications, this.privacy, this.accessibility];
  }

  static getDefault(): UserPreferences {
    return new UserPreferences(
      Language.english(),
      Theme.light(),
      NotificationSettings.getDefault(),
      PrivacySettings.getDefault(),
      AccessibilitySettings.getDefault()
    );
  }
}
```

##### EmailChangeRequest Entity
```typescript
class EmailChangeRequest extends Entity<EmailChangeRequestId> {
  private constructor(
    id: EmailChangeRequestId,
    private userId: UserId,
    private currentEmail: Email,
    private newEmail: Email,
    private requestedBy: UserId,
    private status: EmailChangeStatus,
    private verificationCode: VerificationCode,
    private expiresAt: Date,
    private createdAt: Date
  ) {
    super(id);
  }

  public static create(
    userId: UserId,
    currentEmail: Email,
    newEmail: Email,
    requestedBy: UserId
  ): EmailChangeRequest {
    const id = EmailChangeRequestId.generate();
    const verificationCode = VerificationCode.generate();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    return new EmailChangeRequest(
      id,
      userId,
      currentEmail,
      newEmail,
      requestedBy,
      EmailChangeStatus.pending(),
      verificationCode,
      expiresAt,
      new Date()
    );
  }

  public verify(code: string): void {
    if (this.isExpired()) {
      throw new EmailChangeRequestExpiredException();
    }

    if (!this.verificationCode.verify(code)) {
      throw new InvalidVerificationCodeException();
    }

    this.status = EmailChangeStatus.verified();
  }

  public cancel(): void {
    this.status = EmailChangeStatus.cancelled();
  }

  public isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  public isValid(): boolean {
    return this.status.isVerified() && !this.isExpired();
  }

  public getVerificationCode(): VerificationCode {
    return this.verificationCode;
  }

  public getNewEmail(): Email {
    return this.newEmail;
  }

  public getRequestedBy(): UserId {
    return this.requestedBy;
  }
}
```

### Domain Events
```typescript
class ProfilePersonalInfoUpdatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly previousInfo: PersonalInfo,
    public readonly newInfo: PersonalInfo,
    public readonly updatedBy: string,
    public readonly occurredOn: Date = new Date()
  ) {
    super('ProfilePersonalInfoUpdated');
  }
}

class EmailChangeRequestedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly currentEmail: string,
    public readonly newEmail: string,
    public readonly requestId: string,
    public readonly occurredOn: Date = new Date()
  ) {
    super('EmailChangeRequested');
  }
}

class EmailChangedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly previousEmail: string,
    public readonly newEmail: string,
    public readonly requestId: string,
    public readonly occurredOn: Date = new Date()
  ) {
    super('EmailChanged');
  }
}

class PreferencesUpdatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly previousPreferences: UserPreferences,
    public readonly newPreferences: UserPreferences,
    public readonly updatedBy: string,
    public readonly occurredOn: Date = new Date()
  ) {
    super('PreferencesUpdated');
  }
}

class ProfileCompletenessChangedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly previousCompleteness: number,
    public readonly newCompleteness: number,
    public readonly occurredOn: Date = new Date()
  ) {
    super('ProfileCompletenessChanged');
  }
}
```

### Repository Interfaces
```typescript
interface IUserProfileRepository {
  findByUserId(userId: UserId): Promise<UserProfile | null>;
  save(profile: UserProfile): Promise<void>;
  delete(userId: UserId): Promise<void>;
}

interface IEmailChangeRequestRepository {
  findById(id: EmailChangeRequestId): Promise<EmailChangeRequest | null>;
  findPendingByUserId(userId: UserId): Promise<EmailChangeRequest[]>;
  save(request: EmailChangeRequest): Promise<void>;
  delete(id: EmailChangeRequestId): Promise<void>;
  deleteExpiredRequests(): Promise<void>;
}

interface IProfileChangeHistoryRepository {
  findByUserId(userId: UserId, limit?: number): Promise<ProfileChange[]>;
  save(change: ProfileChange): Promise<void>;
  deleteOldHistory(userId: UserId, keepDays: number): Promise<void>;
}
```

## User Stories

### Epic User Stories

#### US-001: Get User Profile
**As an** authenticated user
**I want to** view my complete profile information
**So that** I can see my current settings and personal details

**Acceptance Criteria:**
- User must be authenticated to access profile
- Profile includes personal info, contact info, and preferences
- Response includes profile completeness percentage
- Profile change history summary is included
- Sensitive information (like password) is never returned

**API Contract:**
```http
GET /api/v1/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Response 200:
{
  "success": true,
  "data": {
    "personalInfo": {
      "firstName": "John",
      "lastName": "Doe",
      "displayName": "John Doe",
      "bio": "Software developer passionate about clean code",
      "timezone": "America/New_York"
    },
    "contactInfo": {
      "email": "john@example.com",
      "phone": "+1234567890",
      "address": {
        "street": "123 Main St",
        "city": "New York",
        "country": "USA"
      }
    },
    "preferences": {
      "language": "en-US",
      "theme": "light",
      "notifications": {
        "email": true,
        "push": true,
        "sms": false
      },
      "privacy": {
        "profileVisibility": "private",
        "dataSharing": false
      }
    },
    "completeness": {
      "percentage": 85,
      "missingFields": ["phone", "address"]
    },
    "metadata": {
      "lastUpdated": "2024-01-15T10:30:00Z",
      "lastUpdatedBy": "self",
      "changeCount": 5
    }
  }
}
```

#### US-002: Update Personal Information
**As an** authenticated user
**I want to** update my personal information
**So that** my profile reflects accurate details

**Acceptance Criteria:**
- User can update name, display name, bio, and timezone
- All fields are properly validated
- Changes are audited and tracked
- Profile completeness is recalculated
- ProfilePersonalInfoUpdatedEvent is published

**API Contract:**
```http
PUT /api/v1/profile/personal
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "displayName": "Johnny",
  "bio": "Senior software developer with 10 years experience",
  "timezone": "America/Los_Angeles"
}

Response 200:
{
  "success": true,
  "data": {
    "personalInfo": {
      "firstName": "John",
      "lastName": "Smith",
      "displayName": "Johnny",
      "bio": "Senior software developer with 10 years experience",
      "timezone": "America/Los_Angeles"
    },
    "completeness": {
      "percentage": 90,
      "missingFields": ["phone"]
    },
    "updatedAt": "2024-01-15T10:35:00Z"
  }
}
```

#### US-003: Request Email Change
**As an** authenticated user
**I want to** change my email address securely
**So that** I can use a different email for my account

**Acceptance Criteria:**
- User must verify new email address
- Verification code is sent to new email
- Old email remains active until verification
- Request expires after 24 hours
- Only one pending email change per user

**API Contract:**
```http
POST /api/v1/profile/email/change-request
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "newEmail": "john.new@example.com"
}

Response 200:
{
  "success": true,
  "data": {
    "requestId": "uuid-here",
    "newEmail": "john.new@example.com",
    "expiresAt": "2024-01-16T10:30:00Z",
    "message": "Verification email sent to john.new@example.com"
  }
}
```

#### US-004: Verify Email Change
**As an** authenticated user
**I want to** confirm my new email address
**So that** the email change is completed

**Acceptance Criteria:**
- User provides verification code from email
- Code must be valid and not expired
- Email change is applied immediately upon verification
- Old email sessions remain valid
- EmailChangedEvent is published

**API Contract:**
```http
POST /api/v1/profile/email/verify
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "requestId": "uuid-here",
  "verificationCode": "123456"
}

Response 200:
{
  "success": true,
  "data": {
    "email": "john.new@example.com",
    "message": "Email successfully updated",
    "updatedAt": "2024-01-15T10:45:00Z"
  }
}
```

#### US-005: Update User Preferences
**As an** authenticated user
**I want to** customize my application preferences
**So that** the platform works according to my needs

**Acceptance Criteria:**
- User can update language, theme, notifications, privacy settings
- Preferences are validated for valid values
- Changes take effect immediately
- PreferencesUpdatedEvent is published

**API Contract:**
```http
PUT /api/v1/profile/preferences
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "language": "es-ES",
  "theme": "dark",
  "notifications": {
    "email": false,
    "push": true,
    "sms": false
  },
  "privacy": {
    "profileVisibility": "public",
    "dataSharing": true
  },
  "accessibility": {
    "fontSize": "large",
    "highContrast": false,
    "screenReader": false
  }
}

Response 200:
{
  "success": true,
  "data": {
    "preferences": {
      "language": "es-ES",
      "theme": "dark",
      "notifications": {
        "email": false,
        "push": true,
        "sms": false
      },
      "privacy": {
        "profileVisibility": "public",
        "dataSharing": true
      },
      "accessibility": {
        "fontSize": "large",
        "highContrast": false,
        "screenReader": false
      }
    },
    "updatedAt": "2024-01-15T10:50:00Z"
  }
}
```

#### US-006: View Profile Change History
**As an** authenticated user
**I want to** see my profile change history
**So that** I can track modifications and ensure security

**Acceptance Criteria:**
- User can view chronological list of profile changes
- Each change shows what was modified, when, and by whom
- Sensitive information is not exposed in history
- History can be filtered by date range and change type
- Pagination support for large histories

**API Contract:**
```http
GET /api/v1/profile/history?limit=10&offset=0&type=personal
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Response 200:
{
  "success": true,
  "data": {
    "changes": [
      {
        "id": "change-uuid-1",
        "type": "personal_info",
        "field": "lastName",
        "previousValue": "Doe",
        "newValue": "Smith",
        "changedBy": "self",
        "changedAt": "2024-01-15T10:35:00Z",
        "source": "web_app"
      },
      {
        "id": "change-uuid-2",
        "type": "preferences",
        "field": "theme",
        "previousValue": "light",
        "newValue": "dark",
        "changedBy": "self",
        "changedAt": "2024-01-15T10:50:00Z",
        "source": "web_app"
      }
    ],
    "pagination": {
      "limit": 10,
      "offset": 0,
      "total": 15,
      "hasMore": true
    }
  }
}
```

## Layer-by-Layer Implementation Plan

### 1. Domain Layer Implementation

#### Tasks:
- **TASK-001**: Create UserProfile aggregate with business rules
- **TASK-002**: Implement PersonalInfo, ContactInfo value objects
- **TASK-003**: Create UserPreferences value object with defaults
- **TASK-004**: Implement EmailChangeRequest entity
- **TASK-005**: Create ProfileCompleteness value object
- **TASK-006**: Define profile management domain events
- **TASK-007**: Create profile repository interfaces
- **TASK-008**: Implement profile domain services
- **TASK-009**: Create profile-specific exceptions
- **TASK-010**: Add validation rules for all value objects

**Files to Create:**
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/entities/profile/user-profile.entity.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/entities/profile/personal-info.value-objects.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/entities/profile/contact-info.value-objects.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/entities/profile/user-preferences.value-objects.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/entities/profile/email-change-request.entity.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/entities/profile/profile-completeness.value-objects.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/entities/profile/profile.value-objects.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/events/profile.events.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/repositories/user-profile.repository.interface.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/repositories/email-change-request.repository.interface.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/repositories/profile-change-history.repository.interface.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/services/profile-completeness.service.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/exceptions/profile.exception.ts`

### 2. Application Layer Implementation

#### Tasks:
- **TASK-011**: Create GetUserProfile use case
- **TASK-012**: Implement UpdatePersonalInfo use case
- **TASK-013**: Create RequestEmailChange use case
- **TASK-014**: Implement VerifyEmailChange use case
- **TASK-015**: Create UpdateUserPreferences use case
- **TASK-016**: Implement GetProfileHistory use case
- **TASK-017**: Create profile DTOs and mappers
- **TASK-018**: Add profile validation schemas
- **TASK-019**: Implement email notification service port
- **TASK-020**: Create profile change tracking service

**Files to Create:**
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/use-cases/profile/get-user-profile/get-user-profile.use-case.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/use-cases/profile/get-user-profile/get-user-profile.dto.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/use-cases/profile/update-personal-info/update-personal-info.use-case.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/use-cases/profile/update-personal-info/update-personal-info.dto.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/use-cases/profile/request-email-change/request-email-change.use-case.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/use-cases/profile/request-email-change/request-email-change.dto.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/use-cases/profile/verify-email-change/verify-email-change.use-case.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/use-cases/profile/verify-email-change/verify-email-change.dto.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/use-cases/profile/update-preferences/update-preferences.use-case.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/use-cases/profile/update-preferences/update-preferences.dto.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/use-cases/profile/get-profile-history/get-profile-history.use-case.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/use-cases/profile/get-profile-history/get-profile-history.dto.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/dto/mappers/profile.mapper.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/validators/profile.validator.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/ports/output/email-notification.port.ts`

### 3. Infrastructure Layer Implementation

#### Tasks:
- **TASK-021**: Create UserProfile ORM entity and mapping
- **TASK-022**: Implement UserProfileRepository with TypeORM
- **TASK-023**: Create EmailChangeRequest ORM entity
- **TASK-024**: Implement EmailChangeRequestRepository
- **TASK-025**: Create ProfileChangeHistory ORM entity
- **TASK-026**: Implement ProfileChangeHistoryRepository
- **TASK-027**: Create database migrations for profile tables
- **TASK-028**: Implement email notification service
- **TASK-029**: Add profile cleanup background jobs
- **TASK-030**: Configure profile-related environment variables

**Files to Create:**
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/infrastructure/database/typeorm/entities/user-profile.orm-entity.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/infrastructure/database/typeorm/entities/email-change-request.orm-entity.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/infrastructure/database/typeorm/entities/profile-change-history.orm-entity.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/infrastructure/database/typeorm/repositories/user-profile.repository.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/infrastructure/database/typeorm/repositories/email-change-request.repository.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/infrastructure/database/typeorm/repositories/profile-change-history.repository.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/infrastructure/database/typeorm/migrations/003-create-profile-tables.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/infrastructure/notifications/email/email-notification.service.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/infrastructure/jobs/profile-cleanup.job.ts`

### 4. Presentation Layer Implementation

#### Tasks:
- **TASK-031**: Create ProfileController with all endpoints
- **TASK-032**: Add profile validation middleware
- **TASK-033**: Implement profile routes configuration
- **TASK-034**: Add profile-specific error handling
- **TASK-035**: Create profile rate limiting
- **TASK-036**: Update Swagger documentation for profile endpoints
- **TASK-037**: Add profile request/response transformations
- **TASK-038**: Implement profile change notifications

**Files to Create:**
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/presentation/http/rest/controllers/profile.controller.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/presentation/http/rest/routes/profile.routes.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/presentation/http/rest/middlewares/profile-validation.middleware.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/presentation/http/rest/middlewares/profile-rate-limit.middleware.ts`

## Agent Task Distribution

### Profile Entity Agent Tasks
- Implement UserProfile aggregate with all business rules
- Create PersonalInfo, ContactInfo, and UserPreferences value objects
- Define EmailChangeRequest entity with verification logic
- Create profile factory for entity creation and reconstruction

### Profile Completeness Agent Tasks
- Implement ProfileCompleteness calculation logic
- Create business rules for completeness scoring
- Handle onboarding guidance based on completeness
- Track and update completeness on profile changes

### Email Change Agent Tasks
- Implement EmailChangeRequest workflow
- Create verification code generation and validation
- Handle email change security rules and timing restrictions
- Manage email change request lifecycle

### Profile Use Case Agent Tasks
- Implement all profile CRUD use cases
- Handle business rule validation and orchestration
- Manage profile change auditing and tracking
- Coordinate email change verification workflow

### Profile Repository Agent Tasks
- Implement profile repositories with TypeORM
- Handle profile data persistence and retrieval
- Manage email change request storage
- Implement profile change history tracking

### Profile Controller Agent Tasks
- Create profile REST endpoints with proper authentication
- Implement request/response handling and validation
- Add profile-specific error handling and rate limiting
- Configure profile routing and middleware

### Profile Database Agent Tasks
- Design profile, email change, and history table schemas
- Create database migrations with proper constraints
- Setup indexes for performance optimization
- Configure relationships and foreign keys

### Profile Security Agent Tasks
- Implement email change verification security
- Add profile update authorization checks
- Configure rate limiting for sensitive operations
- Handle profile data privacy and protection

### Profile Test Agent Tasks
- Create comprehensive unit tests for profile entities
- Implement integration tests for profile use cases
- Add API endpoint tests for all profile operations
- Create security and validation tests

### Profile Notification Agent Tasks
- Implement email verification sending
- Create profile change notification templates
- Handle notification delivery and tracking
- Add notification preferences integration

## Technical Implementation Tasks

### Priority 1 (Critical - Week 1)
1. **Profile Domain Foundation**
   - Create UserProfile aggregate with core business rules
   - Implement PersonalInfo and ContactInfo value objects
   - Define UserPreferences with default values
   - Create profile repository interfaces

2. **Email Change Security System**
   - Implement EmailChangeRequest entity
   - Create verification code generation and validation
   - Add email change business rules and constraints
   - Setup email change request repository

3. **Database Schema Setup**
   - Create user_profiles table migration
   - Add email_change_requests table
   - Create profile_change_history table
   - Setup proper indexes and constraints

### Priority 2 (High - Week 2)
4. **Profile Use Cases Implementation**
   - Create GetUserProfile use case
   - Implement UpdatePersonalInfo use case
   - Add RequestEmailChange and VerifyEmailChange use cases
   - Create UpdateUserPreferences use case

5. **Repository Implementation**
   - Implement UserProfileRepository with TypeORM
   - Create EmailChangeRequestRepository
   - Add ProfileChangeHistoryRepository
   - Handle data mapping and persistence

6. **Profile Completeness System**
   - Implement ProfileCompleteness calculation
   - Create completeness scoring business rules
   - Add completeness tracking and updates
   - Handle onboarding guidance logic

### Priority 3 (Medium - Week 3)
7. **Profile API Endpoints**
   - Create ProfileController with all endpoints
   - Implement authentication and authorization
   - Add input validation and error handling
   - Configure profile routes and middleware

8. **Email Notification System**
   - Implement email verification sending
   - Create email templates for change requests
   - Add notification delivery tracking
   - Handle notification failures and retries

9. **Profile Change Auditing**
   - Implement change history tracking
   - Create audit trail for all profile modifications
   - Add change history retrieval and filtering
   - Handle sensitive data masking in history

### Priority 4 (Low - Week 4)
10. **Performance Optimization**
    - Add caching for profile data
    - Optimize database queries
    - Implement profile data compression
    - Add performance monitoring

11. **Advanced Features**
    - Add profile import/export functionality
    - Implement profile data validation rules
    - Create profile backup and recovery
    - Add profile analytics and insights

12. **Monitoring and Observability**
    - Add profile operation metrics
    - Implement profile change alerts
    - Create profile security monitoring
    - Add performance dashboards

## Comprehensive Testing Strategy

### Unit Tests (Domain Layer)
```typescript
// tests/unit/domain/entities/profile/user-profile.entity.spec.ts
describe('UserProfile Entity', () => {
  describe('creation', () => {
    it('should create profile with valid data', () => {
      // Test profile creation with all components
    });

    it('should calculate initial completeness', () => {
      // Test completeness calculation
    });
  });

  describe('personal info update', () => {
    it('should update personal info successfully', () => {
      // Test personal info update
    });

    it('should recalculate completeness after update', () => {
      // Test completeness recalculation
    });

    it('should emit ProfilePersonalInfoUpdatedEvent', () => {
      // Test domain event emission
    });
  });

  describe('email change workflow', () => {
    it('should create email change request', () => {
      // Test email change request creation
    });

    it('should prevent duplicate email changes', () => {
      // Test business rule enforcement
    });

    it('should verify and apply email change', () => {
      // Test email change completion
    });
  });
});
```

### Integration Tests (Application Layer)
```typescript
// tests/integration/application/use-cases/update-personal-info.use-case.spec.ts
describe('UpdatePersonalInfo Use Case', () => {
  beforeEach(async () => {
    // Setup test database and dependencies
  });

  it('should update personal info successfully', async () => {
    // Test complete personal info update flow
  });

  it('should validate input data', async () => {
    // Test validation rules
  });

  it('should track changes in history', async () => {
    // Test change auditing
  });

  it('should handle concurrent updates', async () => {
    // Test concurrent modification handling
  });
});
```

### API Tests (End-to-End)
```typescript
// tests/e2e/api/profile.e2e.spec.ts
describe('Profile Management API', () => {
  describe('GET /api/v1/profile', () => {
    it('should return complete user profile', async () => {
      const response = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.personalInfo).toBeDefined();
      expect(response.body.data.contactInfo).toBeDefined();
      expect(response.body.data.preferences).toBeDefined();
      expect(response.body.data.completeness).toBeDefined();
    });

    it('should reject unauthenticated requests', async () => {
      await request(app)
        .get('/api/v1/profile')
        .expect(401);
    });
  });

  describe('PUT /api/v1/profile/personal', () => {
    it('should update personal information', async () => {
      const updateData = {
        firstName: 'John',
        lastName: 'Smith',
        displayName: 'Johnny',
        bio: 'Software developer',
        timezone: 'America/New_York'
      };

      const response = await request(app)
        .put('/api/v1/profile/personal')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.personalInfo.firstName).toBe('John');
      expect(response.body.data.personalInfo.lastName).toBe('Smith');
    });

    it('should validate input data', async () => {
      await request(app)
        .put('/api/v1/profile/personal')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: '',
          lastName: 'S'
        })
        .expect(400);
    });
  });

  describe('Email Change Workflow', () => {
    it('should request email change', async () => {
      const response = await request(app)
        .post('/api/v1/profile/email/change-request')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          newEmail: 'newemail@example.com'
        })
        .expect(200);

      expect(response.body.data.requestId).toBeDefined();
      expect(response.body.data.newEmail).toBe('newemail@example.com');
    });

    it('should verify email change', async () => {
      // First request email change
      const changeResponse = await request(app)
        .post('/api/v1/profile/email/change-request')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          newEmail: 'newemail@example.com'
        });

      // Then verify with code
      await request(app)
        .post('/api/v1/profile/email/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          requestId: changeResponse.body.data.requestId,
          verificationCode: '123456'
        })
        .expect(200);
    });
  });
});
```

### Security Tests
```typescript
// tests/security/profile.security.spec.ts
describe('Profile Security', () => {
  it('should prevent unauthorized profile access', async () => {
    // Test profile access without authentication
  });

  it('should validate email change verification codes', async () => {
    // Test verification code validation
  });

  it('should rate limit profile updates', async () => {
    // Test rate limiting on profile endpoints
  });

  it('should prevent email enumeration', async () => {
    // Test email enumeration protection
  });
});
```

## Documentation Structure

### API Documentation (OpenAPI/Swagger)
```yaml
# swagger/profile.yaml
paths:
  /api/v1/profile:
    get:
      summary: Get user profile
      tags: [Profile]
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Profile retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProfileResponse'
        '401':
          description: Unauthorized

  /api/v1/profile/personal:
    put:
      summary: Update personal information
      tags: [Profile]
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdatePersonalInfoRequest'
      responses:
        '200':
          description: Personal information updated
        '400':
          description: Validation error
        '401':
          description: Unauthorized

components:
  schemas:
    ProfileResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            personalInfo:
              $ref: '#/components/schemas/PersonalInfo'
            contactInfo:
              $ref: '#/components/schemas/ContactInfo'
            preferences:
              $ref: '#/components/schemas/UserPreferences'
            completeness:
              $ref: '#/components/schemas/ProfileCompleteness'
            metadata:
              $ref: '#/components/schemas/ProfileMetadata'
```

### Technical Documentation
- **PROFILE-MANAGEMENT.md**: Complete profile management guide
- **EMAIL-CHANGE-WORKFLOW.md**: Email change process documentation
- **PROFILE-COMPLETENESS.md**: Completeness calculation and onboarding
- **PROFILE-SECURITY.md**: Profile security and privacy considerations

## Risk Assessment and Mitigation

### Security Risks
1. **Email Change Security Risk**
   - **Mitigation**: Multi-step verification, rate limiting, verification code expiration

2. **Profile Data Privacy Risk**
   - **Mitigation**: Data masking in history, strict access controls, encryption at rest

3. **Profile Enumeration Risk**
   - **Mitigation**: Consistent response times, no sensitive information exposure

### Technical Risks
1. **Data Consistency Risk**
   - **Mitigation**: Database transactions, validation at all layers, audit trails

2. **Performance Risk with History**
   - **Mitigation**: Pagination, indexes, background cleanup jobs

3. **Email Delivery Risk**
   - **Mitigation**: Queue-based delivery, retry mechanisms, fallback notifications

## Dependencies and Prerequisites

### Prerequisites
- Epic 018 (Account Management System) must be completed
- Epic 019 (Authentication System) must be completed
- User entity and authentication middleware functional
- Email service infrastructure available

### Technical Dependencies
- TypeORM for profile data persistence
- Email service for verification notifications
- Redis for caching profile data
- Job queue for background processing

### External Dependencies
```json
{
  "dependencies": {
    "joi": "^17.9.2",
    "nodemailer": "^6.9.4",
    "bull": "^4.11.3",
    "moment-timezone": "^0.5.43"
  },
  "devDependencies": {
    "@types/nodemailer": "^6.4.9"
  }
}
```

## Success Metrics and KPIs

### Technical Metrics
- **Code Coverage**: 100% for profile domain logic, 95% overall
- **API Response Time**: P95 < 200ms for profile operations
- **Profile Update Success Rate**: > 99%
- **Email Change Completion Rate**: > 95%

### Security Metrics
- **Profile Access Authorization**: 100% authenticated access
- **Email Verification Success**: > 95% verification rate
- **Profile Change Audit**: 100% change tracking
- **Security Vulnerability Score**: Zero critical/high vulnerabilities

### Business Metrics
- **Profile Completeness**: Track average user profile completeness
- **Feature Adoption**: Monitor usage of profile features
- **User Satisfaction**: Profile management ease of use
- **Support Ticket Reduction**: Fewer profile-related support requests

## Future Enhancements

### Phase 2 Enhancements
- Profile photo upload and management
- Social profile integration
- Advanced privacy controls
- Profile sharing and visibility settings

### Phase 3 Enhancements
- Profile backup and restore
- Profile templates and presets
- Bulk profile operations
- Advanced profile analytics

### Integration Opportunities
- Integration with user analytics platform
- Profile data export for GDPR compliance
- Profile synchronization across services
- Advanced user segmentation

## Conclusion

Epic 020 provides a comprehensive user profile management system that builds upon the foundation of user registration and authentication. The implementation prioritizes data integrity, security, and user experience while maintaining clean architecture principles.

The system includes complete CRUD operations, secure email change workflows, preferences management, and comprehensive audit trails. The modular design enables easy extension for advanced features like social integration and enhanced privacy controls.

**Next Steps:**
1. Review and approve epic scope and dependencies
2. Ensure Epic 018 and 019 are completed and functional
3. Assign agents to profile management tasks
4. Setup email service configuration
5. Begin Phase 1 domain layer implementation
6. Establish profile testing protocols
7. Monitor profile usage metrics and user feedback

**Dependencies:**
- Epic 018: Account Management System (completed)
- Epic 019: Authentication System (completed)
- User entity and authentication middleware
- Email service infrastructure
- Database migration system