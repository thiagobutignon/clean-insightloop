// Base Domain Exception
export abstract class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// User-related Exceptions
export class UserNotFoundException extends DomainException {
  constructor(identifier: string) {
    super(`User not found: ${identifier}`);
  }
}

export class UserAlreadyExistsException extends DomainException {
  constructor(email: string) {
    super(`User already exists with email: ${email}`);
  }
}

export class UserAlreadyActiveException extends DomainException {
  constructor() {
    super('User is already active');
  }
}

export class InsufficientPermissionsException extends DomainException {
  constructor(action?: string) {
    super(`Insufficient permissions${action ? ` to ${action}` : ''}`);
  }
}

// Value Object Exceptions
export class InvalidEmailException extends DomainException {
  constructor(message: string) {
    super(`Invalid email: ${message}`);
  }
}

export class InvalidPasswordException extends DomainException {
  constructor(message: string) {
    super(`Invalid password: ${message}`);
  }
}

export class InvalidNameException extends DomainException {
  constructor(message: string) {
    super(`Invalid name: ${message}`);
  }
}

export class InvalidUserRoleException extends DomainException {
  constructor(role: string) {
    super(`Invalid user role: ${role}`);
  }
}

export class InvalidUserStatusException extends DomainException {
  constructor(status: string) {
    super(`Invalid user status: ${status}`);
  }
}

// Business Rule Exceptions
export class RoleChangeNotAllowedException extends DomainException {
  constructor(fromRole: string, toRole: string, byRole: string) {
    super(`Role change not allowed: ${fromRole} to ${toRole} by ${byRole}`);
  }
}

export class UserNotActiveException extends DomainException {
  constructor() {
    super('User is not active');
  }
}

export class UserSuspendedException extends DomainException {
  constructor() {
    super('User account is suspended');
  }
}