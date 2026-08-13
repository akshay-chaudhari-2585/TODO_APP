import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for saved user session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('todo_user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      // Ensure backward compatibility if they have old state vs new state
      setUser(parsed.user ? parsed.user : parsed);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/users/login', { email, password });
      if (response.data.success) {
        // Backend returns { user: {...}, tokens: {...} }
        const { user: userData, tokens } = response.data.data;
        
        // Store the combined object in localStorage for interceptors
        localStorage.setItem('todo_user', JSON.stringify({ user: userData, tokens }));
        
        // Set just the user data in state for components to use easily
        setUser(userData);
        return { success: true };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed',
        code: error.response?.data?.error?.code
      };
    }
  };

  const register = async (firstName, lastName, email, password) => {
    try {
      const response = await api.post('/users/register', { firstName, lastName, email, password });
      if (response.data.success) {
        // Log them in immediately after successful registration
        return await login(email, password);
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed',
        code: error.response?.data?.error?.code
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('todo_user');
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
