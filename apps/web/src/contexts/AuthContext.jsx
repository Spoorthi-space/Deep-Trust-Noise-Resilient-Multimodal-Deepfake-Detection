import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient.js';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (pb.authStore.isValid) {
      setCurrentUser(pb.authStore.model);
    }
    setInitialLoading(false);

    const unsubscribe = pb.authStore.onChange((token, model) => {
      setCurrentUser(model);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    const authData = await pb.collection('users').authWithPassword(email, password, { $autoCancel: false });
    setCurrentUser(authData.record);
    return authData.record;
  };

  const signup = async (email, password, passwordConfirm, name) => {
    const record = await pb.collection('users').create({
      email,
      password,
      passwordConfirm,
      name,
      role: 'user'
    }, { $autoCancel: false });
    
    await pb.collection('users').authWithPassword(email, password, { $autoCancel: false });
    setCurrentUser(pb.authStore.model);
    return record;
  };

  const logout = () => {
    pb.authStore.clear();
    setCurrentUser(null);
    navigate('/');
  };

  const requestPasswordReset = async (email) => {
    await pb.collection('users').requestPasswordReset(email, { $autoCancel: false });
  };

  const isAdmin = currentUser?.role === 'admin';

  const value = {
    currentUser,
    login,
    signup,
    logout,
    requestPasswordReset,
    isAuthenticated: !!currentUser,
    isAdmin,
    initialLoading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};