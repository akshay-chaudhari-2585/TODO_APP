import express from 'express';
import { createTodo, getTodosByUser, updateTodo, deleteTodo } from '../controllers/todoController.js';

const router = express.Router();

router.post('/', createTodo);
router.get('/user/:userId', getTodosByUser);
router.put('/:id', updateTodo);
router.delete('/:id', deleteTodo);

export default router;
