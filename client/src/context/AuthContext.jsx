import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '@/services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('sprintflow_token');
    const savedUser = localStorage.getItem('sprintflow_user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('sprintflow_token');
        localStorage.removeItem('sprintflow_user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    localStorage.setItem('sprintflow_token', res.token);
    localStorage.setItem('sprintflow_user', JSON.stringify(res.data));
    setUser(res.data);
    return res;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await authAPI.register({ name, email, password });
    localStorage.setItem('sprintflow_token', res.token);
    localStorage.setItem('sprintflow_user', JSON.stringify(res.data));
    setUser(res.data);
    return res;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('sprintflow_token');
    localStorage.removeItem('sprintflow_user');
    setUser(null);
  }, []);

  const updateUser = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('sprintflow_user', JSON.stringify(userData));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
