import db from '../config/db.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

// Create Todo
export const createTodo = async (req, res, next) => {
  const { userId, title, description, dueAt, actionId } = req.body;
  try {
    if (!userId || !title) {
      return res.status(400).json(errorResponse('userId and title are required', 'VALIDATION_ERROR'));
    }

    if (actionId) {
      // Check for idempotency
      const existing = await db.todos.findUnique({
        where: { action_id: actionId }
      });
      
      if (existing) {
        return res.status(200).json(successResponse('Todo created successfully (idempotent)', {
          id: existing.id.toString(),
          userId: existing.user_id.toString(),
          title: existing.title,
          description: existing.description,
          isCompleted: Boolean(existing.is_completed),
          dueAt: existing.due_at,
          createdAt: existing.created_at,
          updatedAt: existing.updated_at
        }));
      }
    }

    const todo = await db.todos.create({
      data: {
        user_id: BigInt(userId),
        title,
        description: description || null,
        due_at: dueAt || null,
        action_id: actionId || null
      }
    });

    res.status(201).json(
      successResponse('Todo created successfully', {
        id: todo.id.toString(),
        userId: todo.user_id.toString(),
        title: todo.title,
        description: todo.description,
        dueAt: todo.due_at
      })
    );
  } catch (error) {
    next(error);
  }
};

// Get Todos by User
export const getTodosByUser = async (req, res, next) => {
  const { userId } = req.params;
  try {
    const todos = await db.todos.findMany({
      where: { user_id: BigInt(userId) },
      orderBy: { created_at: 'desc' }
    });
    
    const mappedTodos = todos.map(t => ({
      id: t.id.toString(),
      userId: t.user_id.toString(),
      title: t.title,
      description: t.description,
      isCompleted: Boolean(t.is_completed),
      dueAt: t.due_at,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));

    res.status(200).json(successResponse('Todos fetched successfully', mappedTodos));
  } catch (error) {
    next(error);
  }
};

// Update Todo
export const updateTodo = async (req, res, next) => {
  const { id } = req.params;
  const { title, description, isCompleted, dueAt } = req.body;
  try {
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (isCompleted !== undefined) updateData.is_completed = isCompleted;
    if (dueAt !== undefined) updateData.due_at = dueAt;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json(errorResponse('No fields to update', 'VALIDATION_ERROR'));
    }

    try {
      await db.todos.update({
        where: { id: BigInt(id) },
        data: updateData
      });
    } catch (e) {
      if (e.code === 'P2025') { // Record to update not found
        return res.status(404).json(errorResponse('Todo not found', 'TODO_NOT_FOUND'));
      }
      throw e;
    }

    res.status(200).json(successResponse('Todo updated successfully'));
  } catch (error) {
    next(error);
  }
};

// Delete Todo
export const deleteTodo = async (req, res, next) => {
  const { id } = req.params;
  try {
    try {
      await db.todos.delete({
        where: { id: BigInt(id) }
      });
    } catch (e) {
      if (e.code === 'P2025') { // Record to delete not found
        return res.status(404).json(errorResponse('Todo not found', 'TODO_NOT_FOUND'));
      }
      throw e;
    }

    res.status(200).json(successResponse('Todo deleted successfully'));
  } catch (error) {
    next(error);
  }
};
