import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL === '' 
  ? '/api' 
  : (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8010') + '/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
    if (token) {
        try {
          setLoading(true);
      const response = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000
      });
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
          setLoading(false);
        }
      } else {
      setLoading(false);
    }
  };
    initAuth();
  }, [token]);


  const login = async (email, password) => {
    try {
      console.log(`Attempting login to: ${API_URL}/auth/login`);
      console.log(`Email: ${email}`);
      
      // First check if backend is reachable
      try {
        const healthCheck = await axios.get(`${API_URL.replace('/api', '')}/health`, { timeout: 3000 });
        console.log('Backend health check:', healthCheck.data);
      } catch (healthError) {
        console.error('Backend health check failed:', healthError);
        return { 
          success: false, 
          error: `Cannot connect to backend server. Please ensure the backend is running on ${API_URL.replace('/api', '')}. Error: ${healthError.message}` 
        };
      }
      
      const response = await axios.post(`${API_URL}/auth/login`, { email, password }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Login response received:', response.status);
      
      const { token: newToken, user: userData } = response.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      return { success: true };
    } catch (error) {
      console.error('Login error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code
      });
      
      // Handle network errors
      if (!error.response) {
        if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
          return { 
            success: false, 
            error: `Cannot connect to backend server at ${API_URL.replace('/api', '')}. Please ensure the backend is running.` 
          };
        }
        return { 
          success: false, 
          error: `Network error: ${error.message}. Please check your connection and ensure the backend is running.` 
        };
      }
      
      // Handle different HTTP status codes
      const status = error.response?.status;
      const detail = error.response?.data?.detail || error.response?.data?.message;
      
      if (status === 401) {
        return { success: false, error: 'Invalid email or password. Please check your credentials.' };
      } else if (status === 500) {
        return { success: false, error: 'Server error. Please check backend logs and try again.' };
      } else if (status === 404) {
        return { success: false, error: 'Login endpoint not found. Please check backend configuration.' };
      }
      
      return { success: false, error: detail || `Login failed (Status: ${status || 'unknown'})` };
    }
  };

  const register = async (userData) => {
    try {
      // Map frontend data to backend format
      const registerData = {
        full_name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        region: userData.region
      };

      await axios.post(`${API_URL}/auth/register`, registerData);

      // Auto-login after successful registration
      const loginResponse = await axios.post(`${API_URL}/auth/login`, {
        email: userData.email,
        password: userData.password
      });

      const { token: newToken, user: userData_response } = loginResponse.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData_response);

      return { success: true };
    } catch (error) {
      const detail = error.response?.data?.detail;
      // If the email already exists, try logging in automatically
      if (error.response?.status === 400 && typeof detail === 'string' && detail.toLowerCase().includes('already')) {
        try {
          const loginResponse = await axios.post(`${API_URL}/auth/login`, {
            email: userData.email,
            password: userData.password
          });
          const { token: newToken, user: userData_response } = loginResponse.data;
          localStorage.setItem('token', newToken);
          setToken(newToken);
          setUser(userData_response);
          return { success: true };
        } catch (e) {
          return { success: false, error: 'Account exists. Please sign in.' };
        }
      }
      return { success: false, error: detail || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
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
