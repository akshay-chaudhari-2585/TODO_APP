import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import Card from '../components/Card';
import Button from '../components/Button';
import TodoItem from '../components/TodoItem';

const Home = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [todos, setTodos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTodos();
  }, [user]);

  const fetchTodos = async () => {
    if (!user || !user.id) return;

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

  const handleEditTodo = (todo) => {
    navigate(`/task/${todo.id}`, { state: { todo } });
  };

  const completedCount = todos.filter(t => t.isCompleted).length;
  const totalCount = todos.length;
  const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return (
    <div style={{ padding: '2rem 1rem', maxWidth: '900px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '0.25rem', fontWeight: '700' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Welcome back, <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{user?.firstName}</span>!</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {user?.role === 'ADMIN' && (
            <Button variant="secondary" onClick={() => navigate('/admin')}>Admin Panel</Button>
          )}
          <Button variant="ghost" onClick={() => navigate('/chess')} style={{ color: '#60a5fa', borderColor: '#60a5fa' }}>♟️ Play Chess</Button>
          <Button variant="ghost" onClick={() => navigate('/game')} style={{ color: '#fbbf24', borderColor: '#fbbf24' }}>🎮 Mini-Game</Button>
          <Button variant="primary" onClick={() => navigate('/task/new')}>+ Create Task</Button>
          <Button variant="ghost" onClick={logout}>Logout</Button>
        </div>
      </header>

      {/* Stats Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <Card padding="md" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '4px solid var(--primary-blue)' }}>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Tasks</p>
            <h2 style={{ fontSize: '2rem', margin: 0 }}>{totalCount}</h2>
          </div>
        </Card>
        
        <Card padding="md" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '4px solid var(--success)' }}>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completed</p>
            <h2 style={{ fontSize: '2rem', margin: 0 }}>{completedCount}</h2>
          </div>
        </Card>

        <Card padding="md" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '4px solid var(--accent-yellow)' }}>
          <div style={{ width: '100%' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Progress</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ flex: 1, height: '8px', backgroundColor: 'var(--surface-color-light)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--accent-yellow)', transition: 'width 0.5s ease' }}></div>
              </div>
              <span style={{ fontWeight: '600', fontSize: '1.125rem' }}>{progress}%</span>
            </div>
          </div>
        </Card>
      </div>

      {error && <div style={{ color: 'var(--error)', marginBottom: '1rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{error}</div>}

      <Card padding="md">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>Your Tasks</h2>
        </div>
        
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--text-muted)' }}>Loading tasks...</p>
          </div>
        ) : todos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)', border: '2px dashed var(--border)', borderRadius: '8px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
            <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)', fontWeight: '500' }}>You have no tasks yet.</p>
            <p style={{ fontSize: '0.95rem', marginBottom: '1.5rem' }}>Get started by creating your first task to stay organized.</p>
            <Button variant="primary" onClick={() => navigate('/task/new')}>Create Your First Task</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {todos.map(todo => (
              <TodoItem 
                key={todo.id} 
                todo={todo} 
                onToggle={handleToggleComplete}
                onDelete={handleDeleteTodo}
                onEdit={handleEditTodo}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Home;

