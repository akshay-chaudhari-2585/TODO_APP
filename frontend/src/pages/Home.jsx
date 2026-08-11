import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import Card from '../components/Card';
import Button from '../components/Button';
import TodoItem from '../components/TodoItem';
import TodoForm from '../components/TodoForm';

const Home = () => {
  const { user, logout } = useAuth();
  const [todos, setTodos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingTodo, setEditingTodo] = useState(null);

  useEffect(() => {
    fetchTodos();
  }, [user]);

  const fetchTodos = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/todos/user/${user.id}`);
      if (response.data.success) {
        setTodos(response.data.data);
      }
    } catch (err) {
      setError('Failed to fetch todos.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTodo = async (todoData) => {
    try {
      const response = await api.post('/todos', { ...todoData, userId: user.id });
      if (response.data.success) {
        // Optimistically add to state, or just fetch again. Fetching is safer for correct IDs/dates.
        await fetchTodos();
      }
    } catch (err) {
      console.error('Failed to create todo', err);
    }
  };

  const handleUpdateTodo = async (todoData) => {
    try {
      const response = await api.put(`/todos/${editingTodo.id}`, todoData);
      if (response.data.success) {
        setEditingTodo(null);
        await fetchTodos();
      }
    } catch (err) {
      console.error('Failed to update todo', err);
    }
  };

  const handleToggleComplete = async (todo) => {
    try {
      // Optimistic UI update
      setTodos(todos.map(t => t.id === todo.id ? { ...t, isCompleted: !t.isCompleted } : t));
      
      await api.put(`/todos/${todo.id}`, { 
        isCompleted: !todo.isCompleted 
      });
    } catch (err) {
      console.error('Failed to toggle completion', err);
      // Revert on failure
      fetchTodos();
    }
  };

  const handleDeleteTodo = async (id) => {
    try {
      // Optimistic UI update
      setTodos(todos.filter(t => t.id !== id));
      await api.delete(`/todos/${id}`);
    } catch (err) {
      console.error('Failed to delete todo', err);
      fetchTodos();
    }
  };

  return (
    <div style={{ padding: '2rem 1rem', maxWidth: '900px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Welcome back, {user?.firstName}!</p>
        </div>
        <div>
          <Button variant="ghost" onClick={logout}>Logout</Button>
        </div>
      </header>

      {editingTodo ? (
        <TodoForm 
          initialData={editingTodo} 
          onSubmit={handleUpdateTodo} 
          onCancel={() => setEditingTodo(null)} 
        />
      ) : (
        <TodoForm onSubmit={handleCreateTodo} />
      )}

      {error && <div style={{ color: 'var(--error)', marginBottom: '1rem' }}>{error}</div>}

      <Card padding="md">
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Your Tasks</h2>
        
        {isLoading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading tasks...</p>
        ) : todos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>You have no tasks yet.</p>
            <p style={{ fontSize: '0.9rem' }}>Add a new task above to get started!</p>
          </div>
        ) : (
          <div>
            {todos.map(todo => (
              <TodoItem 
                key={todo.id} 
                todo={todo} 
                onToggle={handleToggleComplete}
                onDelete={handleDeleteTodo}
                onEdit={setEditingTodo}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Home;

