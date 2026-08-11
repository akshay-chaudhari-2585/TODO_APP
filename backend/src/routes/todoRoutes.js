import express from 'express';
import { createTodo, getTodosByUser, updateTodo, deleteTodo } from '../controllers/todoController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Todos
 *   description: Task management
 */

/**
 * @swagger
 * /api/todos:
 *   post:
 *     summary: Create a new todo
 *     tags: [Todos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - title
 *             properties:
 *               userId:
 *                 type: integer
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               dueAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Todo created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', createTodo);

/**
 * @swagger
 * /api/todos/user/{userId}:
 *   get:
 *     summary: Get all todos for a specific user
 *     tags: [Todos]
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *         required: true
 *         description: The user ID
 *     responses:
 *       200:
 *         description: List of user's todos
 */
router.get('/user/:userId', getTodosByUser);

/**
 * @swagger
 * /api/todos/{id}:
 *   put:
 *     summary: Update an existing todo
 *     tags: [Todos]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The todo ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               isCompleted:
 *                 type: boolean
 *               dueAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Todo updated successfully
 *       404:
 *         description: Todo not found
 */
router.put('/:id', updateTodo);

/**
 * @swagger
 * /api/todos/{id}:
 *   delete:
 *     summary: Delete a todo
 *     tags: [Todos]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The todo ID
 *     responses:
 *       200:
 *         description: Todo deleted successfully
 *       404:
 *         description: Todo not found
 */
router.delete('/:id', deleteTodo);

export default router;
