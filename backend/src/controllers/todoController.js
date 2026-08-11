import db from '../config/db.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

// Create Todo
export const createTodo = async (req, res, next) => {
  const { userId, title, description, dueAt } = req.body;
  try {
    if (!userId || !title) {
      return res.status(400).json(errorResponse('userId and title are required', 'VALIDATION_ERROR'));
    }

    const [result] = await db.query(
      'INSERT INTO todos (user_id, title, description, due_at) VALUES (?, ?, ?, ?)',
      [userId, title, description || null, dueAt || null]
    );

    res.status(201).json(
      successResponse('Todo created successfully', {
        id: result.insertId,
        userId,
        title,
        description: description || null,
        dueAt: dueAt || null
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
    const [todos] = await db.query(
      'SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    
    const mappedTodos = todos.map(t => ({
      id: t.id,
      userId: t.user_id,
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
    // Dynamically build the update query
    const updates = [];
    const values = [];

    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (isCompleted !== undefined) { updates.push('is_completed = ?'); values.push(isCompleted); }
    if (dueAt !== undefined) { updates.push('due_at = ?'); values.push(dueAt); }

    if (updates.length === 0) {
      return res.status(400).json(errorResponse('No fields to update', 'VALIDATION_ERROR'));
    }

    values.push(id);
    const query = `UPDATE todos SET ${updates.join(', ')} WHERE id = ?`;
    
    const [result] = await db.query(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json(errorResponse('Todo not found', 'TODO_NOT_FOUND'));
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
    const [result] = await db.query('DELETE FROM todos WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json(errorResponse('Todo not found', 'TODO_NOT_FOUND'));
    }

    res.status(200).json(successResponse('Todo deleted successfully'));
  } catch (error) {
    next(error);
  }
};
