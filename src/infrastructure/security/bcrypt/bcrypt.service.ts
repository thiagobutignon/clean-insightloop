import * as bcrypt from 'bcrypt';
import { HashingPort } from '../../../application/ports/output/hashing.port';

export class BcryptHashingService implements HashingPort {
  private readonly defaultSaltRounds: number;

  constructor(saltRounds?: number) {
    this.defaultSaltRounds = saltRounds || this.getRecommendedSaltRounds();
  }

  async hash(plainText: string, saltRounds?: number): Promise<string> {
    const rounds = saltRounds || this.defaultSaltRounds;
    
    if (!plainText) {
      throw new Error('Plain text cannot be empty');
    }

    if (rounds < 10 || rounds > 15) {
      throw new Error('Salt rounds must be between 10 and 15');
    }

    try {
      return await bcrypt.hash(plainText, rounds);
    } catch (error) {
      throw new Error(`Failed to hash text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async verify(plainText: string, hash: string): Promise<boolean> {
    if (!plainText || !hash) {
      return false;
    }

    try {
      return await bcrypt.compare(plainText, hash);
    } catch (error) {
      // Log error but don't expose details
      console.error('Hash verification failed:', error);
      return false;
    }
  }

  async generateSalt(rounds?: number): Promise<string> {
    const saltRounds = rounds || this.defaultSaltRounds;
    
    if (saltRounds < 10 || saltRounds > 15) {
      throw new Error('Salt rounds must be between 10 and 15');
    }

    try {
      return await bcrypt.genSalt(saltRounds);
    } catch (error) {
      throw new Error(`Failed to generate salt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getRecommendedSaltRounds(): number {
    // Environment-based salt rounds
    const environment = process.env.NODE_ENV || 'development';
    
    switch (environment) {
      case 'production':
        return 12; // Higher security for production
      case 'staging':
        return 11; // Balanced for staging
      case 'development':
      case 'test':
        return 10; // Faster for development/testing
      default:
        return 12; // Default to high security
    }
  }

  // Additional utility methods for password security

  /**
   * Check if a hash is using bcrypt algorithm
   */
  isValidBcryptHash(hash: string): boolean {
    // Bcrypt hashes start with $2a$, $2b$, or $2y$
    const bcryptPattern = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
    return bcryptPattern.test(hash);
  }

  /**
   * Extract salt rounds from a bcrypt hash
   */
  getSaltRoundsFromHash(hash: string): number | null {
    if (!this.isValidBcryptHash(hash)) {
      return null;
    }

    try {
      const parts = hash.split('$');
      return parseInt(parts[2], 10);
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a hash needs to be upgraded (lower salt rounds)
   */
  needsUpgrade(hash: string): boolean {
    const currentRounds = this.getSaltRoundsFromHash(hash);
    return currentRounds !== null && currentRounds < this.defaultSaltRounds;
  }

  /**
   * Upgrade a hash to use current salt rounds
   */
  async upgradeHash(plainText: string, oldHash: string): Promise<string | null> {
    // First verify the old hash is correct
    const isValid = await this.verify(plainText, oldHash);
    if (!isValid) {
      return null;
    }

    // Generate new hash with current salt rounds
    return this.hash(plainText);
  }

  /**
   * Time the hashing operation for performance monitoring
   */
  async timeHash(plainText: string, saltRounds?: number): Promise<{
    hash: string;
    duration: number;
  }> {
    const startTime = Date.now();
    const hash = await this.hash(plainText, saltRounds);
    const duration = Date.now() - startTime;

    return { hash, duration };
  }

  /**
   * Benchmark different salt rounds to find optimal performance
   */
  async benchmarkSaltRounds(testPassword: string = 'benchmark123'): Promise<{
    rounds: number;
    duration: number;
  }[]> {
    const results: { rounds: number; duration: number }[] = [];

    for (let rounds = 10; rounds <= 15; rounds++) {
      const { duration } = await this.timeHash(testPassword, rounds);
      results.push({ rounds, duration });
    }

    return results;
  }

  /**
   * Generate a secure random password
   */
  generateSecurePassword(
    length: number = 16,
    includeSpecial: boolean = true
  ): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let charset = lowercase + uppercase + numbers;
    if (includeSpecial) {
      charset += special;
    }

    let password = '';
    
    // Ensure at least one character from each required set
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    
    if (includeSpecial) {
      password += special[Math.floor(Math.random() * special.length)];
    }

    // Fill the rest randomly
    const remainingLength = length - password.length;
    for (let i = 0; i < remainingLength; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): {
    isStrong: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 8) score += 1;
    else feedback.push('Password should be at least 8 characters long');

    if (password.length >= 12) score += 1;

    // Character variety checks
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Password should contain lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Password should contain uppercase letters');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Password should contain numbers');

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
    else feedback.push('Password should contain special characters');

    // Common pattern checks
    if (!/(.)\1{2,}/.test(password)) score += 1;
    else feedback.push('Password should not contain repeated characters');

    if (!/123|abc|qwe|password|admin/i.test(password)) score += 1;
    else feedback.push('Password should not contain common patterns');

    const isStrong = score >= 6;

    return {
      isStrong,
      score,
      feedback
    };
  }
}