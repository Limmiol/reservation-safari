import React, { createContext, useState, useContext, useEffect } from 'react';
import { localClient } from '@/api/localClient';
import { getToken } from '@/api/localClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const appPublicSettings = null;

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setIsLoadingAuth(true);
    const token = getToken();
    if (!token) {
      setIsLoadingAuth(false);
      setAuthError({ type: 'auth_required', message: 'Please log in' });
      return;
    }
    try {
      const currentUser = await localClient.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (err) {
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_required', message: 'Session expired. Please log in again.' });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localClient.auth.logout();
  };

  const navigateToLogin = () => {
    localClient.auth.redirectToLogin();
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState: checkAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
