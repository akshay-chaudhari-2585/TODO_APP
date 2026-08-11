import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';

const TaskForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();

  const isEditing = Boolean(id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEditing);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEditing) {
      if (location.state && location.state.todo) {
        // Use passed state if available
        setTitle(location.state.todo.title || '');
        setDescription(location.state.todo.description || '');
        setIsFetching(false);
      } else {
        // Otherwise, fetch all user todos and find this one
        fetchTodo();
      }
    }
  }, [id, location.state]);

  const fetchTodo = async () => {
    try {
      setIsFetching(true);
      const response = await api.get(`/todos/user/${user.id}`);
      if (response.data.success) {
        const found = response.data.data.find(t => String(t.id) === id);
        if (found) {
          setTitle(found.title || '');
          setDescription(found.description || '');
        } else {
          setError('Task not found.');
        }
      }
    } catch (err) {
      setError('Failed to fetch task details.');
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setError(null);
    setIsLoading(true);

    try {
      if (isEditing) {
        const response = await api.put(`/todos/${id}`, { title, description });
        if (response.data.success) {
          navigate('/');
        }
      } else {
        const response = await api.post('/todos', { title, description, userId: user.id });
        if (response.data.success) {
          navigate('/');
        }
      }
    } catch (err) {
      setError(`Failed to ${isEditing ? 'update' : 'create'} task.`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem 1rem', maxWidth: '700px', margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
        <Link to="/" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}>
          <span>← Back to Dashboard</span>
        </Link>
      </header>

      <Card padding="lg">
        <h2 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', fontWeight: '700' }}>
          {isEditing ? 'Edit Task' : 'Create New Task'}
        </h2>

        {error && (
          <div style={{ padding: '1rem', marginBottom: '1.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', borderRadius: '8px', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {isFetching ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading task details...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <Input 
                label="Task Title"
                placeholder="What needs to be done?" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-muted)' }}>
                Description (optional)
              </label>
              <textarea 
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text-main)',
                  fontFamily: 'inherit',
                  fontSize: '1rem',
                  minHeight: '120px',
                  resize: 'vertical',
                  outline: 'none',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--primary-blue)';
                  e.target.style.boxShadow = '0 0 0 2px var(--primary-blue-glow)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border)';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="Add more details about this task..." 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" variant="primary" size="lg" isLoading={isLoading}>
                {isEditing ? 'Save Changes' : 'Create Task'}
              </Button>
              <Button type="button" variant="ghost" size="lg" onClick={() => navigate('/')}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};

export default TaskForm;
