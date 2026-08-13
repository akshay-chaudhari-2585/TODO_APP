import express from 'express';
import { createTodo, getTodosByUser, updateTodo, deleteTodo } from '../controllers/todoController.js';

const router = express.Router();
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { createTodoSchema, updateTodoSchema } from '../validators/schemas.js';

router.use(protect);

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
 *             $ref: '#/components/schemas/CreateTodoRequest'
 *     responses:
 *       201:
 *         description: Todo created successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/', validate(createTodoSchema), createTodo);

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
 *             $ref: '#/components/schemas/UpdateTodoRequest'
 *     responses:
 *       200:
 *         description: Todo updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Todo not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/:id', validate(updateTodoSchema), updateTodo);

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
