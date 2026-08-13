import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import Card from '../components/Card';
import Button from '../components/Button';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users')
      ]);

      if (statsRes.data.success && usersRes.data.success) {
        setStats(statsRes.data.data);
        setUsers(usersRes.data.data);
      }
    } catch (err) {
      setError('Failed to fetch admin data.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      // Optimistic update
      setUsers(users.map(u => u.id === userId ? { ...u, isActive: !currentStatus } : u));
      await api.put(`/admin/users/${userId}/status`, { isActive: !currentStatus });
    } catch (err) {
      console.error('Failed to toggle user status', err);
      fetchAdminData(); // Revert on failure
    }
  };

  return (
    <div style={{ padding: '2rem 1rem', maxWidth: '1100px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.25rem', fontWeight: '800', background: 'linear-gradient(90deg, var(--primary-blue), #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Admin Console
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Monitor system metrics and manage user access.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button variant="secondary" onClick={() => navigate('/')}>User App</Button>
          <Button variant="ghost" onClick={logout}>Logout</Button>
        </div>
      </header>

      {error && <div style={{ color: 'var(--error)', marginBottom: '1rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{error}</div>}

      {/* Stats Section */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          <Card padding="md" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: 'white', border: '1px solid #334155' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Users</p>
            <h2 style={{ fontSize: '2.5rem', margin: 0 }}>{stats.users.total}</h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{stats.users.active} Active</p>
          </Card>
          
          <Card padding="md" style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)', color: 'white', border: '1px solid #0284c7' }}>
            <p style={{ color: '#bae6fd', fontSize: '0.875rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Tasks</p>
            <h2 style={{ fontSize: '2.5rem', margin: 0 }}>{stats.todos.total}</h2>
          </Card>

          <Card padding="md" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', border: '1px solid #16a34a' }}>
            <p style={{ color: '#bbf7d0', fontSize: '0.875rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completed Tasks</p>
            <h2 style={{ fontSize: '2.5rem', margin: 0 }}>{stats.todos.completed}</h2>
          </Card>
        </div>
      )}

      {/* Users Table */}
      <Card padding="md" style={{ overflowX: 'auto' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>User Management</h2>
        {isLoading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading system data...</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Name</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Email</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Role</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Tasks</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Status</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s', ':hover': { backgroundColor: 'var(--surface-color-light)' } }}>
                  <td style={{ padding: '1rem', fontWeight: '500' }}>{u.firstName} {u.lastName}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{u.email}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '999px', 
                      fontSize: '0.75rem', 
                      fontWeight: '600',
                      backgroundColor: u.role === 'ADMIN' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                      color: u.role === 'ADMIN' ? '#8b5cf6' : '#3b82f6'
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>{u.totalTodos}</td>
                  <td style={{ padding: '1rem' }}>
                    {u.isActive ? (
                      <span style={{ color: 'var(--success)', fontWeight: '600' }}>● Active</span>
                    ) : (
                      <span style={{ color: 'var(--error)', fontWeight: '600' }}>● Blocked</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {user.id !== u.id && (
                      <button 
                        onClick={() => toggleUserStatus(u.id, u.isActive)}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: '600',
                          backgroundColor: u.isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                          color: u.isActive ? 'var(--error)' : 'var(--success)',
                          transition: 'all 0.2s'
                        }}
                      >
                        {u.isActive ? 'Block User' : 'Unblock User'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
};

export default AdminDashboard;
