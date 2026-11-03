import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import api, { getAdminToken, setAdminToken, clearAdminToken } from '../api/client';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(() => getAdminToken());
  const [username, setUsername] = useState('admin');
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (user, pass) => {
    setIsLoading(true);
    try {
      const res = await api.adminLogin({ username: user, password: pass });
      if (res && res.token) {
        setToken(res.token);
        setUsername(user);
        setAdminToken(res.token);
        return { success: true };
      }
      return { success: false, error: 'No token received from server' };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Invalid username or password'
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    clearAdminToken();
  }, []);

  // Listen for global 401 unauthorized events to clear session
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('rp_auth_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('rp_auth_unauthorized', handleUnauthorized);
  }, [logout]);

  const value = {
    token,
    username,
    isAuthenticated: Boolean(token),
    isLoading,
    login,
    logout
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}

export function ProtectedAdminRoute({ children }) {
  const { isAuthenticated } = useAdminAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
}

export default AdminAuthContext;
