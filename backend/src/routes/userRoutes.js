import express from 'express';
import { registerUser, loginUser, getUsers, refreshTokens, logoutUser, getUserDashboard } from '../controllers/userController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../validators/schemas.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and authentication
 */

/**
 * @swagger
 * /api/users/register:
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
 *               - firstName
 *               - email
 *               - password
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or user already exists
 */
router.post('/register', validate(registerSchema), registerUser);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Login a user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: User logged in successfully
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', validate(loginSchema), loginUser);

/**
 * @swagger
 * /api/users/:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users
 */
router.post('/refresh', refreshTokens);
router.post('/logout', logoutUser);

/**
 * @swagger
 * /api/users/dashboard:
 *   get:
 *     summary: Get dynamic dashboard statistics for the logged-in user
 *     description: Demonstrates OpenAPI polymorphism based on query parameters.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: detail
 *         schema:
 *           type: string
 *           enum: [summary, comprehensive]
 *           default: summary
 *         description: Defines the level of detail in the response.
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - title: Summary Response
 *                   type: object
 *                   properties:
 *                     status: 
 *                       type: string
 *                       example: success
 *                     message:
 *                       type: string
 *                       example: Dashboard summary fetched successfully
 *                     data:
 *                       type: object
 *                       properties:
 *                         totalPending:
 *                           type: integer
 *                           example: 5
 *                         totalCompleted:
 *                           type: integer
 *                           example: 12
 *                 - title: Comprehensive Response
 *                   type: object
 *                   properties:
 *                     status: 
 *                       type: string
 *                       example: success
 *                     message:
 *                       type: string
 *                       example: Dashboard comprehensive data fetched successfully
 *                     data:
 *                       type: object
 *                       properties:
 *                         totalPending:
 *                           type: integer
 *                           example: 5
 *                         totalCompleted:
 *                           type: integer
 *                           example: 12
 *                         recentPending:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id: { type: string, example: "1" }
 *                               title: { type: string, example: "Buy groceries" }
 *                               isCompleted: { type: boolean, example: false }
 *                               dueAt: { type: string, format: "date-time" }
 *                         recentCompleted:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id: { type: string, example: "2" }
 *                               title: { type: string, example: "Walk the dog" }
 *                               isCompleted: { type: boolean, example: true }
 *                               updatedAt: { type: string, format: "date-time" }
 *       400:
 *         description: Bad Request (Invalid Parameters)
 *       401:
 *         description: Unauthorized (Invalid or missing token)
 */
router.get('/dashboard', protect, getUserDashboard);

/**
 * @swagger
 * /api/users/:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/', protect, restrictTo('ADMIN'), getUsers);

export default router;

