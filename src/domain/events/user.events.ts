import { DomainEvent } from '../entities/events/domain-event.base';
import { UserRoleType, UserStatusType } from '../entities/user/user.value-objects';

export class UserCreatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string,
    public readonly role: UserRoleType,
    public readonly occurredOn: Date = new Date()
  ) {
    super('UserCreated');
  }

  public getEventData(): Record<string, any> {
    return {
      userId: this.userId,
      email: this.email,
      name: this.name,
      role: this.role,
      occurredOn: this.occurredOn
    };
  }
}

export class UserRoleChangedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly previousRole: UserRoleType,
    public readonly newRole: UserRoleType,
    public readonly changedBy: string,
    public readonly occurredOn: Date = new Date()
  ) {
    super('UserRoleChanged');
  }

  public getEventData(): Record<string, any> {
    return {
      userId: this.userId,
      previousRole: this.previousRole,
      newRole: this.newRole,
      changedBy: this.changedBy,
      occurredOn: this.occurredOn
    };
  }
}

export class UserStatusChangedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly previousStatus: UserStatusType,
    public readonly newStatus: UserStatusType,
    public readonly occurredOn: Date = new Date()
  ) {
    super('UserStatusChanged');
  }

  public getEventData(): Record<string, any> {
    return {
      userId: this.userId,
      previousStatus: this.previousStatus,
      newStatus: this.newStatus,
      occurredOn: this.occurredOn
    };
  }
}

export class UserPasswordChangedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly changedBy: string,
    public readonly occurredOn: Date = new Date()
  ) {
    super('UserPasswordChanged');
  }

  public getEventData(): Record<string, any> {
    return {
      userId: this.userId,
      changedBy: this.changedBy,
      occurredOn: this.occurredOn
    };
  }
}

export class UserLoginAttemptEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly success: boolean,
    public readonly ipAddress: string,
    public readonly userAgent: string,
    public readonly occurredOn: Date = new Date()
  ) {
    super('UserLoginAttempt');
  }

  public getEventData(): Record<string, any> {
    return {
      userId: this.userId,
      email: this.email,
      success: this.success,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      occurredOn: this.occurredOn
    };
  }
}