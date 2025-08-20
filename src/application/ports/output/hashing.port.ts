export interface HashingPort {
  /**
   * Hash a plain text password
   */
  hash(plainText: string, saltRounds?: number): Promise<string>;

  /**
   * Verify a plain text password against a hash
   */
  verify(plainText: string, hash: string): Promise<boolean>;

  /**
   * Generate a secure random salt
   */
  generateSalt(rounds?: number): Promise<string>;

  /**
   * Get the recommended salt rounds for the current environment
   */
  getRecommendedSaltRounds(): number;
}