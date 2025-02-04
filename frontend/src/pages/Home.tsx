import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import chessBoard from "../assets/chess-board.webp";

const totalTimeOptions = [1, 3, 5, 10, 15];
const incrementOptions = [0, 5, 10, 15, 30];

const HomePage: React.FC = () => {
  const [totalTime, setTotalTime] = useState(5);
  const [increment, setIncrement] = useState(5);
  const navigate = useNavigate();

  const handleStartGame = () => {
    const totalTimeSeconds = totalTime * 60;
    navigate('/game', { 
      state: { 
        totalTime: totalTimeSeconds, 
        increment 
      } 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] to-[#6A0572] flex items-center justify-center p-8">
      <div className="w-full max-w-5xl grid grid-cols-2 gap-8 bg-[#16213E]/50 backdrop-blur-lg rounded-3xl overflow-hidden shadow-2xl border border-[#6A0572]/30">
        <div className="relative group overflow-hidden">
          <img 
            src={chessBoard} 
            alt="Chess Board" 
            className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all duration-500"></div>
        </div>
        
        <div className="flex flex-col justify-center space-y-6 p-8">
          <h2 className="text-4xl font-bold text-center bg-gradient-to-r from-[#E94560] to-purple-600 bg-clip-text text-transparent mb-6">
            New Game Setup
          </h2>
          
          <div className="space-y-2">
            <label className="block text-[#E94560] font-semibold">Total Time</label>
            <div className="relative">
              <select 
                value={totalTime}
                onChange={(e) => setTotalTime(Number(e.target.value))}
                className="w-full px-4 py-3 bg-[#0F3460] text-[#E94560] 
                           border-2 border-[#6A0572] rounded-xl 
                           focus:ring-2 focus:ring-[#E94560] 
                           appearance-none transition duration-300"
              >
                {totalTimeOptions.map(time => (
                  <option key={time} value={time}>{time} min</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#E94560]">
                <svg className="fill-current h-5 w-5" viewBox="0 0 20 20">
                  <path d="M10 12l-5-5 1.5-1.5L10 9l3.5-3.5L15 7l-5 5z"/>
                </svg>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="block text-[#E94560] font-semibold">Increment</label>
            <div className="relative">
              <select 
                value={increment}
                onChange={(e) => setIncrement(Number(e.target.value))}
                className="w-full px-4 py-3 bg-[#0F3460] text-[#E94560] 
                           border-2 border-[#6A0572] rounded-xl 
                           focus:ring-2 focus:ring-[#E94560] 
                           appearance-none transition duration-300"
              >
                {incrementOptions.map(inc => (
                  <option key={inc} value={inc}>{inc}s</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#E94560]">
                <svg className="fill-current h-5 w-5" viewBox="0 0 20 20">
                  <path d="M10 12l-5-5 1.5-1.5L10 9l3.5-3.5L15 7l-5 5z"/>
                </svg>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleStartGame}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-green-700 
                       text-white font-bold uppercase tracking-wider 
                       rounded-xl shadow-lg hover:shadow-xl 
                       transform hover:-translate-y-1 
                       transition duration-300 
                       focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Start New Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;