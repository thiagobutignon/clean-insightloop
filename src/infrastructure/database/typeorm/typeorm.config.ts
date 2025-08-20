import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'insightloop',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'insightloop_dev',
  synchronize: process.env.DB_SYNCHRONIZE === 'true' || false,
  logging: process.env.DB_LOGGING === 'true' || false,
  entities: [join(__dirname, 'entities', '*.orm-entity{.ts,.js}')],
  migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
  subscribers: [join(__dirname, 'subscribers', '*{.ts,.js}')],
  
  // Connection pool settings
  extra: {
    connectionLimit: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },

  // SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,

  // Remove custom naming strategy for now to avoid TypeScript issues
});

// Database connection management
export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private dataSource: DataSource;

  private constructor() {
    this.dataSource = AppDataSource;
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<void> {
    try {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
        console.log('Database connection established successfully');
      }
    } catch (error) {
      console.error('Error establishing database connection:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.destroy();
        console.log('Database connection closed successfully');
      }
    } catch (error) {
      console.error('Error closing database connection:', error);
      throw error;
    }
  }

  public getDataSource(): DataSource {
    return this.dataSource;
  }

  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.dataSource.isInitialized) {
        return false;
      }
      
      await this.dataSource.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  public async runMigrations(): Promise<void> {
    try {
      await this.dataSource.runMigrations();
      console.log('Migrations executed successfully');
    } catch (error) {
      console.error('Error running migrations:', error);
      throw error;
    }
  }

  public async revertLastMigration(): Promise<void> {
    try {
      await this.dataSource.undoLastMigration();
      console.log('Last migration reverted successfully');
    } catch (error) {
      console.error('Error reverting migration:', error);
      throw error;
    }
  }
}

// Configuration validation
export function validateDatabaseConfig(): void {
  const requiredVars = ['DB_HOST', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD', 'DB_DATABASE'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required database environment variables: ${missingVars.join(', ')}`);
  }
}

// Export for CLI usage
export default AppDataSource;