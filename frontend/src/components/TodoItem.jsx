import React from 'react';
import Button from './Button';
import './TodoItem.css';

const TodoItem = ({ todo, onToggle, onDelete, onEdit }) => {
  return (
    <div className={`todo-item glass-panel ${todo.isCompleted ? 'todo-completed' : ''}`}>
      <div className="todo-content">
        <label className="todo-checkbox-container">
          <input 
            type="checkbox" 
            checked={todo.isCompleted} 
            onChange={() => onToggle(todo)}
            className="todo-checkbox"
          />
          <span className="checkmark"></span>
        </label>
        <div className="todo-text">
          <h3 className="todo-title">{todo.title}</h3>
          {todo.description && <p className="todo-description">{todo.description}</p>}
        </div>
      </div>
      <div className="todo-actions">
        <Button variant="ghost" size="sm" onClick={() => onEdit(todo)}>Edit</Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(todo.id)} className="btn-delete">Delete</Button>
      </div>
    </div>
  );
};

export default TodoItem;
