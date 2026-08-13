import express from 'express';
import { getSystemStats, getAllUsers, toggleUserStatus } from '../controllers/adminController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// ALL admin routes are strictly protected
router.use(protect);
router.use(restrictTo('ADMIN'));

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administrative operations (Requires ADMIN role)
 */

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get high-level system statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System statistics retrieved
 *       403:
 *         description: Forbidden (Not an admin)
 */
router.get('/stats', getSystemStats);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get a detailed list of all users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users retrieved
 *       403:
 *         description: Forbidden (Not an admin)
 */
router.get('/users', getAllUsers);

/**
 * @swagger
 * /api/admin/users/{id}/status:
 *   put:
 *     summary: Toggle user block/unblock status
 *     description: Blocking a user will instantly revoke their active sessions.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 description: true to unblock, false to block
 *     responses:
 *       200:
 *         description: User status updated successfully
 *       400:
 *         description: Validation error or trying to block yourself
 *       404:
 *         description: User not found
 */
router.put('/users/:id/status', toggleUserStatus);

export default router;
