import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

// types/auth.ts
interface User {
  username: string;
  password: string;
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

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [formData, setFormData] = useState<User>({
    username: '',
    password: ''
  });
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();

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
        // Store the token
        sessionStorage.setItem('token', token);
        
        // Store decoded information
        sessionStorage.setItem('username', decoded.sub);
        sessionStorage.setItem('tokenExpiration', decoded.exp.toString());
        
        // You can store additional information from the token if needed
        console.log('Token successfully decoded and stored');
      }
    } catch (error) {
      console.error('Error decoding token:', error);
      setError('Error processing authentication token');
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');

    const endpoint = isLogin ? '/login' : '/register';
    
    try {
      const response = await fetch(`https://chess-u6el.onrender.com${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
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
          navigate('/');
        } else {
          throw new Error('No token received from server');
        }
      } else {
        setError('Registration successful! Please login.');
        setIsLogin(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isLogin ? 'Login' : 'Sign Up'}
        </h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;