import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

// types/auth.ts
interface User {
  username: string;
  password: string;
  email: string;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  user: string;
}

interface AuthError {
  detail: string;
}

interface DecodedToken {
  sub: string;  // username from token
  exp: number;  // expiration time
}

interface Notification {
  message: string;
  type: 'success' | 'error';
}

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [formData, setFormData] = useState<User>({
    username: '',
    password: '',
    email: ''
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const navigate = useNavigate();

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const decodeAndStoreToken = (token: string): void => {
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      
      if (decoded) {
        // Keep using sessionStorage as in the original code
        sessionStorage.setItem('token', token);
        
        // Store decoded information
        sessionStorage.setItem('username', decoded.sub);
        sessionStorage.setItem('tokenExpiration', decoded.exp.toString());
        
        console.log('Token successfully decoded and stored');
      }
    } catch (error) {
      console.error('Error decoding token:', error);
      setNotification({
        message: 'Error processing authentication token',
        type: 'error'
      });
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setNotification(null);
    setLoading(true);

    const endpoint = isLogin ? '/login' : '/register';
    
    try {
      // For login, we only need email and password, but the backend requires a username field
      // For registration, we need all fields filled out
      const payload = isLogin 
        ? { 
            email: formData.email, 
            password: formData.password 
          } 
        : formData;

      console.log('Payload:', payload);
      
      
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data: AuthResponse | AuthError = await response.json();

      if (!response.ok) {
        throw new Error((data as AuthError).detail || 'Something went wrong');
      }

      if (isLogin) {
        const authData = data as AuthResponse;
        
        // Decode and store token information
        if (authData.access_token) {
          decodeAndStoreToken(authData.access_token);
          setNotification({
            message: 'Login successful! Redirecting...',
            type: 'success'
          });
          setTimeout(() => {
            navigate('/');
          }, 1500);
        } else {
          throw new Error('No token received from server');
        }
      } else {
        setNotification({
          message: 'Registration successful! You can now login.',
          type: 'success'
        });
        setIsLogin(true);
      }
    } catch (err) {
      setNotification({
        message: err instanceof Error ? err.message : 'An error occurred',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="relative bg-white bg-opacity-10 backdrop-blur-lg p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-200 border-opacity-20">
        {/* Chess-themed decorative elements */}
        <div className="absolute -top-6 -left-6 w-12 h-12 bg-black rounded-lg shadow-lg rotate-12"></div>
        <div className="absolute -top-6 -right-6 w-12 h-12 bg-white rounded-lg shadow-lg -rotate-12"></div>
        <div className="absolute -bottom-6 -left-6 w-12 h-12 bg-white rounded-lg shadow-lg -rotate-12"></div>
        <div className="absolute -bottom-6 -right-6 w-12 h-12 bg-black rounded-lg shadow-lg rotate-12"></div>
        
        {/* Notification banner */}
        {notification && (
          <div 
            className={`absolute top-0 left-0 right-0 p-4 text-center transform -translate-y-full rounded-t-lg shadow-lg transition-all duration-300 ${
              notification.type === 'success' 
                ? 'bg-green-600 text-white' 
                : 'bg-red-600 text-white'
            }`}
          >
            <div className="flex items-center justify-center">
              {notification.type === 'success' ? (
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              )}
              {notification.message}
            </div>
          </div>
        )}
        
        <h2 className="text-3xl font-bold mb-6 text-center text-white">
          {isLogin ? 'Welcome Back' : 'Join the Game'}
        </h2>
        
        <p className="text-gray-300 text-center mb-8">
          {isLogin ? 'Sign in to continue your chess journey' : 'Create an account to start playing'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="block w-full px-4 py-3 bg-gray-800 bg-opacity-50 border border-gray-700 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                required={!isLogin}
                placeholder="Choose a username"
                disabled={loading}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="block w-full px-4 py-3 bg-gray-800 bg-opacity-50 border border-gray-700 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
              required
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="block w-full px-4 py-3 bg-gray-800 bg-opacity-50 border border-gray-700 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
              required
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 rounded-lg shadow-lg text-white bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:scale-105 transition-all duration-300 font-medium text-lg"
          >
            {loading ? (
              <span className="inline-flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Authenticating...
              </span>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-300 hover:text-blue-100 transition-colors duration-300"
            disabled={loading}
          >
            {isLogin
              ? "Don't have an account? Sign up now"
              : 'Already have an account? Sign in'}
          </button>
        </div>
        
        {loading && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white bg-opacity-10 backdrop-blur-md p-6 rounded-xl flex flex-col items-center">
              <div className="chess-loader">
                <div className="chess-piece"></div>
              </div>
              <p className="mt-4 text-white font-medium">Processing request...</p>
            </div>
          </div>
        )}
        
        <div className="mt-8 flex justify-center">
          <div className="inline-flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            <div className="w-3 h-3 rounded-full bg-gray-600"></div>
            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            <div className="w-3 h-3 rounded-full bg-gray-600"></div>
            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
          </div>
        </div>

        {/* CSS for the chess-themed loader */}
        <style>{`
          .chess-loader {
            position: relative;
            width: 64px;
            height: 64px;
            background: 
              linear-gradient(45deg, #333 25%, transparent 25%),
              linear-gradient(-45deg, #333 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #333 75%),
              linear-gradient(-45deg, transparent 75%, #333 75%);
            background-size: 32px 32px;
            background-position: 0 0, 0 16px, 16px -16px, -16px 0px;
            border-radius: 8px;
            animation: rotate 2s infinite linear;
          }

          .chess-piece {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 24px;
            height: 24px;
            background-color: #fff;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            box-shadow: 0 0 10px 2px rgba(255, 255, 255, 0.7);
          }

          @keyframes rotate {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default Auth;