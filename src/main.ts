import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { DatabaseConnection, validateDatabaseConfig } from './infrastructure/database/typeorm/typeorm.config';
import { WinstonLoggerService } from './infrastructure/logging/winston/winston.service';
import { BcryptHashingService } from './infrastructure/security/bcrypt/bcrypt.service';
import { InMemoryDomainEventPublisher } from './infrastructure/events/in-memory-event-publisher.service';
import { TypeORMUserRepository } from './infrastructure/database/typeorm/repositories/user.repository';
import { UserFactory } from './domain/entities/user/user.factory';
import { CreateUserUseCase } from './application/use-cases/user/create-user/create-user.use-case';
import { UserController } from './presentation/http/rest/controllers/user.controller';
import { createUserRoutes } from './presentation/http/rest/routes/user.routes';
import { errorMiddleware, notFoundMiddleware } from './presentation/http/rest/middlewares/error.middleware';
import { requestIdMiddleware, responseTimeMiddleware, requestContextMiddleware } from './presentation/http/rest/middlewares/request-id.middleware';
import { rateLimiters } from './presentation/http/rest/middlewares/rate-limit.middleware';

// Load environment variables
config();

export class Application {
  private app: express.Application;
  private logger: WinstonLoggerService;
  private databaseConnection: DatabaseConnection;

  constructor() {
    this.app = express();
    this.logger = new WinstonLoggerService();
    this.databaseConnection = DatabaseConnection.getInstance();
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing application...');

      // Validate configuration
      this.validateConfiguration();

      // Connect to database
      await this.connectToDatabase();

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      await this.setupRoutes();

      // Setup error handling
      this.setupErrorHandling();

      this.logger.info('Application initialized successfully');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      this.logger.error('Failed to initialize application', {
        error: errorMessage,
        stack: errorStack
      });
      throw error;
    }
  }

  private validateConfiguration(): void {
    try {
      validateDatabaseConfig();
      
      const requiredEnvVars = ['NODE_ENV', 'PORT'];
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

      if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
      }

      this.logger.info('Configuration validated successfully');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Configuration validation failed', { error: errorMessage });
      throw error;
    }
  }

  private async connectToDatabase(): Promise<void> {
    try {
      await this.databaseConnection.connect();
      
      // Run migrations in production
      if (process.env.NODE_ENV === 'production') {
        this.logger.info('Running database migrations...');
        await this.databaseConnection.runMigrations();
      }

      // Verify database health
      const isHealthy = await this.databaseConnection.healthCheck();
      if (!isHealthy) {
        throw new Error('Database health check failed');
      }

      this.logger.info('Database connection established and healthy');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to connect to database', { error: errorMessage });
      throw error;
    }
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      credentials: process.env.CORS_CREDENTIALS === 'true',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-correlation-id']
    }));

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request tracking
    this.app.use(requestIdMiddleware());
    this.app.use(requestContextMiddleware);
    this.app.use(responseTimeMiddleware);

    // General rate limiting
    this.app.use('/api', rateLimiters.api);

    this.logger.info('Middleware setup completed');
  }

  private async setupRoutes(): Promise<void> {
    // Health check (before rate limiting)
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // Database health check
    this.app.get('/health/db', async (req, res) => {
      try {
        const isHealthy = await this.databaseConnection.healthCheck();
        res.json({
          status: isHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Setup dependency injection
    const dependencies = await this.setupDependencies();

    // API routes
    this.app.use('/api/v1/users', createUserRoutes(dependencies.userController));

    // API documentation (if enabled)
    if (process.env.SWAGGER_ENABLED === 'true') {
      await this.setupSwagger();
    }

    this.logger.info('Routes setup completed');
  }

  private async setupDependencies() {
    const logger = this.logger;
    const dataSource = this.databaseConnection.getDataSource();

    // Infrastructure services
    const hashingService = new BcryptHashingService();
    const eventPublisher = new InMemoryDomainEventPublisher(logger);

    // Repository
    const userRepository = new TypeORMUserRepository(dataSource);

    // Domain services
    const userFactory = new UserFactory(userRepository);

    // Use cases
    const createUserUseCase = new CreateUserUseCase({
      userRepository,
      userFactory,
      domainEventPublisher: eventPublisher,
      logger
    });

    // Controllers
    const userController = new UserController({
      createUserUseCase,
      logger
    });

    return {
      logger,
      hashingService,
      eventPublisher,
      userRepository,
      userFactory,
      createUserUseCase,
      userController
    };
  }

  private async setupSwagger(): Promise<void> {
    try {
      const swaggerJsdoc = await import('swagger-jsdoc');
      const swaggerUi = await import('swagger-ui-express');

      const swaggerOptions = {
        definition: {
          openapi: '3.0.0',
          info: {
            title: 'InsightLoop MCP Server API',
            version: process.env.APP_VERSION || '1.0.0',
            description: 'User Account Management System API',
            contact: {
              name: 'InsightLoop Team',
              email: 'support@insightloop.com'
            }
          },
          servers: [
            {
              url: process.env.API_BASE_URL || 'http://localhost:3000',
              description: 'Development server'
            }
          ],
          components: {
            securitySchemes: {
              bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
              }
            },
            schemas: {
              CreateUserResponse: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      name: { type: 'string' },
                      email: { type: 'string', format: 'email' },
                      role: { type: 'string', enum: ['free', 'paid', 'admin', 'enterprise'] },
                      status: { type: 'string', enum: ['active', 'inactive', 'suspended', 'pending_verification'] },
                      createdAt: { type: 'string', format: 'date-time' },
                      updatedAt: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              },
              ErrorResponse: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      message: { type: 'string' },
                      code: { type: 'string' },
                      details: { type: 'array', items: { type: 'object' } }
                    }
                  },
                  requestId: { type: 'string' }
                }
              }
            }
          }
        },
        apis: ['./src/presentation/http/rest/routes/*.ts']
      };

      const specs = swaggerJsdoc.default(swaggerOptions);
      const swaggerPath = process.env.SWAGGER_PATH || '/api/docs';

      this.app.use(swaggerPath, swaggerUi.default.serve, swaggerUi.default.setup(specs, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'InsightLoop API Documentation'
      }));

      this.logger.info(`Swagger documentation available at ${swaggerPath}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn('Failed to setup Swagger documentation', { error: errorMessage });
    }
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundMiddleware);

    // Global error handler
    this.app.use(errorMiddleware({
      logger: this.logger,
      includeStackTrace: process.env.NODE_ENV === 'development',
      enableDetailedErrors: process.env.NODE_ENV === 'development'
    }));

    this.logger.info('Error handling setup completed');
  }

  public getApp(): express.Application {
    return this.app;
  }

  public async start(): Promise<void> {
    const port = process.env.PORT || 3000;

    return new Promise((resolve, reject) => {
      const server = this.app.listen(port, () => {
        this.logger.info(`Server started successfully`, {
          port,
          environment: process.env.NODE_ENV,
          version: process.env.APP_VERSION || '1.0.0'
        });
        resolve();
      });

      server.on('error', (error) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error('Server failed to start', { error: errorMessage });
        reject(error);
      });

      // Graceful shutdown
      process.on('SIGTERM', this.gracefulShutdown.bind(this, server));
      process.on('SIGINT', this.gracefulShutdown.bind(this, server));
    });
  }

  private async gracefulShutdown(server: any): Promise<void> {
    this.logger.info('Received shutdown signal, starting graceful shutdown...');

    server.close(async () => {
      try {
        await this.databaseConnection.disconnect();
        this.logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error('Error during graceful shutdown', { error: errorMessage });
        process.exit(1);
      }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      this.logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  }
}

// Bootstrap the application
async function bootstrap(): Promise<void> {
  try {
    const app = new Application();
    await app.initialize();
    await app.start();
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Only run if this is the main module
if (require.main === module) {
  bootstrap();
}

export default Application;