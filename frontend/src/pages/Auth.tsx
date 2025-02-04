import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import  { jwtDecode }  from 'jwt-decode';


const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const endpoint = isLogin ? '/login' : '/register';
      const response = await axios.post(`https://chess-u6el.onrender.com${endpoint}`, {
        username,
        password
      });

      if (response.data.access_token) {
        const decodedToken: { sub: string } = jwtDecode(response.data.access_token);
        const username = decodedToken.sub;
    
        localStorage.setItem('token', response.data.access_token);
        sessionStorage.setItem('username', username);
        navigate('/');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An error occurred');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] to-[#6A0572] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#16213E] rounded-xl shadow-2xl p-8">
        <h2 className="text-3xl font-bold text-center text-[#E94560] mb-6">
          {isLogin ? 'Login' : 'Register'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-600/20 text-red-400 p-3 rounded-lg text-center">
              {error}
            </div>
          )}
          
          <div>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-[#0F3460] text-[#E94560] 
                         border border-[#6A0572] rounded-lg 
                         focus:outline-none focus:ring-2 
                         focus:ring-[#E94560] transition duration-300"
              required
            />
          </div>
          
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#0F3460] text-[#E94560] 
                         border border-[#6A0572] rounded-lg 
                         focus:outline-none focus:ring-2 
                         focus:ring-[#E94560] transition duration-300"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full py-3 bg-[#E94560] text-white 
                       rounded-lg hover:bg-[#6A0572] 
                       transition duration-300 transform 
                       hover:scale-105 focus:outline-none 
                       focus:ring-2 focus:ring-[#E94560]"
          >
            {isLogin ? 'Login' : 'Register'}
          </button>
        </form>
        
        <div className="text-center mt-4">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-[#E94560] hover:underline"
          >
            {isLogin 
              ? 'Need an account? Register' 
              : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;