import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { validationMiddleware } from '../middlewares/validation.middleware';
import { rateLimitMiddleware } from '../middlewares/rate-limit.middleware';
import { requestIdMiddleware } from '../middlewares/request-id.middleware';
import { createUserSchema } from '../../../../application/validators/user.validator';

export function createUserRoutes(userController: UserController): Router {
  const router = Router();

  // Apply common middleware
  router.use(requestIdMiddleware());

  /**
   * @swagger
   * /api/v1/users/register:
   *   post:
   *     summary: Register a new user
   *     tags: [Users]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - email
   *               - password
   *               - passwordConfirmation
   *             properties:
   *               name:
   *                 type: string
   *                 minLength: 2
   *                 maxLength: 100
   *                 example: "John Doe"
   *               email:
   *                 type: string
   *                 format: email
   *                 maxLength: 320
   *                 example: "john@example.com"
   *               password:
   *                 type: string
   *                 minLength: 8
   *                 maxLength: 128
   *                 example: "SecurePass123!"
   *               passwordConfirmation:
   *                 type: string
   *                 example: "SecurePass123!"
   *               role:
   *                 type: string
   *                 enum: [free, paid, admin, enterprise]
   *                 example: "free"
   *     responses:
   *       201:
   *         description: User created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/CreateUserResponse'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       409:
   *         description: User already exists
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       429:
   *         description: Too many requests
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.post(
    '/register',
    rateLimitMiddleware({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
      message: 'Too many registration attempts, please try again later'
    }),
    validationMiddleware(createUserSchema),
    userController.register.bind(userController)
  );

  /**
   * @swagger
   * /api/v1/users/profile:
   *   get:
   *     summary: Get user profile
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User profile retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/UserProfile'
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: User not found
   */
  router.get(
    '/profile',
    // authMiddleware, // To be implemented
    userController.getProfile.bind(userController)
  );

  /**
   * @swagger
   * /api/v1/users/profile:
   *   put:
   *     summary: Update user profile
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 minLength: 2
   *                 maxLength: 100
   *               email:
   *                 type: string
   *                 format: email
   *     responses:
   *       200:
   *         description: Profile updated successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: User not found
   */
  router.put(
    '/profile',
    // authMiddleware, // To be implemented
    // validationMiddleware(updateUserSchema), // To be implemented
    userController.updateProfile.bind(userController)
  );

  /**
   * @swagger
   * /api/v1/users/change-password:
   *   post:
   *     summary: Change user password
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - currentPassword
   *               - newPassword
   *               - confirmPassword
   *             properties:
   *               currentPassword:
   *                 type: string
   *               newPassword:
   *                 type: string
   *                 minLength: 8
   *                 maxLength: 128
   *               confirmPassword:
   *                 type: string
   *     responses:
   *       200:
   *         description: Password changed successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized or invalid current password
   *       404:
   *         description: User not found
   */
  router.post(
    '/change-password',
    // authMiddleware, // To be implemented
    rateLimitMiddleware({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 3, // 3 attempts per window
      message: 'Too many password change attempts'
    }),
    // validationMiddleware(changePasswordSchema), // To be implemented
    userController.changePassword.bind(userController)
  );

  /**
   * @swagger
   * /api/v1/users/health:
   *   get:
   *     summary: Health check endpoint
   *     tags: [System]
   *     responses:
   *       200:
   *         description: Service is healthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     status:
   *                       type: string
   *                       example: "healthy"
   *                     timestamp:
   *                       type: string
   *                       format: date-time
   *                     version:
   *                       type: string
   *                       example: "1.0.0"
   *       500:
   *         description: Service is unhealthy
   */
  router.get('/health', userController.healthCheck.bind(userController));

  return router;
}

// Route configuration options
export interface UserRouteConfig {
  enableRateLimit?: boolean;
  enableAuth?: boolean;
  enableValidation?: boolean;
  customMiddlewares?: any[];
}

// Alternative route factory with configuration
export function createConfigurableUserRoutes(
  userController: UserController,
  config: UserRouteConfig = {}
): Router {
  const router = Router();
  const {
    enableRateLimit = true,
    enableAuth = true,
    enableValidation = true,
    customMiddlewares = []
  } = config;

  // Apply custom middlewares first
  customMiddlewares.forEach(middleware => router.use(middleware));

  // Always apply request ID middleware
  router.use(requestIdMiddleware());

  // Registration route with conditional middleware
  const registrationMiddlewares = [];
  
  if (enableRateLimit) {
    registrationMiddlewares.push(
      rateLimitMiddleware({
        windowMs: 15 * 60 * 1000,
        max: 5,
        message: 'Too many registration attempts'
      })
    );
  }

  if (enableValidation) {
    registrationMiddlewares.push(validationMiddleware(createUserSchema));
  }

  router.post(
    '/register',
    ...registrationMiddlewares,
    userController.register.bind(userController)
  );

  // Profile routes with conditional auth
  const profileMiddlewares: any[] = [];
  
  if (enableAuth) {
    // profileMiddlewares.push(authMiddleware); // To be implemented
  }

  router.get(
    '/profile',
    ...profileMiddlewares,
    userController.getProfile.bind(userController)
  );

  router.put(
    '/profile',
    ...profileMiddlewares,
    userController.updateProfile.bind(userController)
  );

  // Password change with conditional middleware
  const passwordChangeMiddlewares: any[] = [];
  
  if (enableAuth) {
    // passwordChangeMiddlewares.push(authMiddleware); // To be implemented
  }

  if (enableRateLimit) {
    passwordChangeMiddlewares.push(
      rateLimitMiddleware({
        windowMs: 15 * 60 * 1000,
        max: 3,
        message: 'Too many password change attempts'
      })
    );
  }

  router.post(
    '/change-password',
    ...passwordChangeMiddlewares,
    userController.changePassword.bind(userController)
  );

  // Health check (no middleware needed)
  router.get('/health', userController.healthCheck.bind(userController));

  return router;
}