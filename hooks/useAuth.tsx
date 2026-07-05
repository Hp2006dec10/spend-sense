import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiFetch, storage } from '../utils/api';

export interface User {
  id: string;
  email: string;
  fullName: string;
  preferredCurrency?: string;
  isAiEnabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<any>;
  signup: (fullName: string, email: string, password: string, confirmPassword: string) => Promise<any>;


  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  gatewayBypass: (accessCode: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkAuth = async () => {
    setIsLoading(true);
    const token = await storage.getItem('accessToken');
    const refreshToken = await storage.getItem('refreshToken');

    if (!token && !refreshToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await apiFetch('/auth/profile');
      setUser(data.user);
    } catch (err) {
      if (refreshToken) {
        try {
          const refreshData = await apiFetch('/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
          });
          await storage.setItem('accessToken', refreshData.accessToken);
          await storage.setItem('refreshToken', refreshData.refreshToken);
          
          const retryData = await apiFetch('/auth/profile');
          setUser(retryData.user);
        } catch (refreshErr) {
          await storage.removeItem('accessToken');
          await storage.removeItem('refreshToken');
          setUser(null);
        }
      } else {
        await storage.removeItem('accessToken');
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await storage.setItem('accessToken', data.accessToken);
    await storage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    return data;
  };

  const signup = async (fullName: string, email: string, password: string, confirmPassword: string) => {
    const data = await apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ fullName, email, password, confirmPassword }),
    });
    await storage.setItem('accessToken', data.accessToken);
    await storage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    return data;
  };




  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (e) {
    } finally {
      await storage.removeItem('accessToken');
      await storage.removeItem('refreshToken');
      setUser(null);
    }
  };

  const gatewayBypass = async (accessCode: string) => {
    const data = await apiFetch('/auth/gateway-bypass', {
      method: 'POST',
      body: JSON.stringify({ accessCode }),
    });
    await storage.setItem('accessToken', data.accessToken);
    await storage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,


        logout,
        checkAuth,
        gatewayBypass,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
