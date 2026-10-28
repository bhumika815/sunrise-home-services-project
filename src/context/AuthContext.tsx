import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  unreadNotifications: number;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { full_name: string; email: string; phone: string; password: string; address?: string; locality?: string }) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  loginDemo: (role: 'customer' | 'admin') => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('shs_token'));
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async (currentToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setUnreadNotifications(data.unreadNotifications || 0);
      } else {
        // Token expired or invalid
        localStorage.removeItem('shs_token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed.');
    }

    localStorage.setItem('shs_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (formData: { full_name: string; email: string; phone: string; password: string; address?: string; locality?: string }): Promise<User> => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed.');
    }

    localStorage.setItem('shs_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('shs_token');
    setToken(null);
    setUser(null);
    setUnreadNotifications(0);
  };

  const refreshUser = async () => {
    const currentToken = localStorage.getItem('shs_token');
    if (currentToken) {
      await fetchCurrentUser(currentToken);
    }
  };

  const loginDemo = async (role: 'customer' | 'admin'): Promise<User> => {
    if (role === 'admin') {
      return login('admin@sunrisehomeservices.com', 'AdminSecure@2026');
    } else {
      return login('customer@demo.com', 'CustomerDemo@2026');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        unreadNotifications,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        loginDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
