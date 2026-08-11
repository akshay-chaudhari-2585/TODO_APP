import React, { useState, useEffect } from 'react';
import Card from './Card';
import Input from './Input';
import Button from './Button';

const TodoForm = ({ onSubmit, initialData = null, onCancel = null }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
    }
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    await onSubmit({ title, description });
    
    // Reset form if it's not an edit form
    if (!initialData) {
      setTitle('');
      setDescription('');
    }
    setIsLoading(false);
  };

  return (
    <Card padding="md" style={{ marginBottom: '2rem' }}>
      <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>
        {initialData ? 'Edit Task' : 'Create New Task'}
      </h3>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{ flex: 2 }}>
            <Input 
              placeholder="What needs to be done?" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div style={{ flex: 3 }}>
            <Input 
              placeholder="Description (optional)" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button type="submit" variant="accent" isLoading={isLoading}>
              {initialData ? 'Save' : 'Add'}
            </Button>
            {onCancel && (
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </form>
    </Card>
  );
};

export default TodoForm;
