import { useState, useEffect } from "react";
import { useGlobalState } from "../GlobalState/Store";
import { ChessBoard } from "../components/ChessBoard";
import { Chess } from "chess.js";
import { useNavigate } from "react-router-dom";

export const Home = () => {
  const [board] = useState(new Chess().board());
  const navigate = useNavigate();
  const { init_game, setTime, setSuggestion } = useGlobalState((state) => state);
  const [totalTime, setTotalTime] = useState(300);
  const [increment, setIncrement] = useState(5);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!sessionStorage.getItem("token"));
    // Start the animation after a small delay
    setTimeout(() => setShowAnimation(true), 100);
  }, []);

  const handleGameStart = () => {
    if (!isLoggedIn) {
      navigate("/auth");
      return;
    }
    init_game({ totalTime, increment });
    setTime(totalTime);
    navigate("/matching", { state: { totalTime, increment } });
  };

  return (
    <div className="bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#581c87] min-h-screen flex flex-col md:flex-row items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-blue-500 filter blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 rounded-full bg-purple-700 filter blur-3xl"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 rounded-full bg-green-500 filter blur-3xl"></div>
      </div>

      {/* Header */}
      <div className={`absolute top-6 left-0 right-0 text-center transform transition-all duration-1000 ${showAnimation ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0'}`}>
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 mb-2">
          CHESS MASTER
        </h1>
        <p className="text-blue-200 text-lg">Test your skills against players worldwide</p>
      </div>

      {/* Chess Board */}
      <div className={`flex-1 flex justify-center items-center mt-24 mb-8 md:mb-0 transform transition-all duration-1000 ${showAnimation ? 'translate-x-0 opacity-100' : '-translate-x-24 opacity-0'}`}>
        <div className="p-3 md:p-6 bg-[#0f172a]/80 backdrop-blur-sm shadow-2xl rounded-2xl border border-gray-600/50 relative">
          <div className="absolute -top-3 -left-3 w-8 h-8 bg-white rounded-lg shadow-lg"></div>
          <div className="absolute -top-3 -right-3 w-8 h-8 bg-black rounded-lg shadow-lg"></div>
          <div className="absolute -bottom-3 -left-3 w-8 h-8 bg-black rounded-lg shadow-lg"></div>
          <div className="absolute -bottom-3 -right-3 w-8 h-8 bg-white rounded-lg shadow-lg"></div>
          <ChessBoard
            board={board}
            activePlayer="white"
            totalTime={totalTime}
          />
        </div>
      </div>

      {/* Control Panel */}
      <div className={`w-full md:w-1/3 bg-[#0f172a]/80 backdrop-blur-sm p-6 rounded-2xl shadow-2xl border border-gray-600/50 transform transition-all duration-1000 ${showAnimation ? 'translate-x-0 opacity-100' : 'translate-x-24 opacity-0'}`}>
        <div className="flex items-center justify-center mb-6">
          <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent to-purple-500"></div>
          <h2 className="text-white text-3xl font-bold text-center px-4">
            🎯 Game Settings
          </h2>
          <div className="h-0.5 flex-1 bg-gradient-to-r from-purple-500 to-transparent"></div>
        </div>

        {/* Total Time Dropdown */}
        <label className="text-white text-xl font-semibold" htmlFor="total_time">
          ⏳ Total Time
        </label>
        <select
          className="w-full text-white p-3 mt-1 mb-4 bg-[#1e293b] rounded-lg border border-gray-500 focus:ring-2 focus:ring-purple-400 transition-all cursor-pointer hover:border-purple-400"
          id="total_time"
          onChange={(e) => setTotalTime(parseInt(e.target.value))}
        >
          <option value="300">5 Minutes</option>
          <option value="600">10 Minutes</option>
          <option value="900">15 Minutes</option>
          <option value="1800">30 Minutes</option>
        </select>

        {/* Increment Dropdown */}
        <label className="text-white text-xl font-semibold block" htmlFor="increment">
          ⏩ Increment
        </label>
        <select
          className="w-full text-white p-3 mt-1 mb-4 bg-[#1e293b] rounded-lg border border-gray-500 focus:ring-2 focus:ring-purple-400 transition-all cursor-pointer hover:border-purple-400"
          id="increment"
          onChange={(e) => setIncrement(parseInt(e.target.value))}
        >
          <option value="1">1 Second</option>
          <option value="3">3 Seconds</option>
          <option value="5">5 Seconds</option>
          <option value="10">10 Seconds</option>
        </select>

        {/* Suggestion Checkbox */}
        <div className="mt-2 flex items-center">
          <div className="relative">
            <input
              type="checkbox"
              name="suggestion"
              id="suggestion"
              className="w-5 h-5 text-purple-500 bg-gray-700 border-gray-500 rounded focus:ring-2 focus:ring-purple-400 cursor-pointer"
              onChange={(e) => setSuggestion(e.target.checked)}
            />
            <div className="absolute -inset-1 bg-purple-500 rounded-full animate-pulse opacity-20 pointer-events-none"></div>
          </div>
          <label htmlFor="suggestion" className="text-white text-lg font-semibold ml-2 cursor-pointer">
            Enable Suggestions
          </label>
        </div>

        {/* Join Game Button */}
        <button
          className="w-full text-white font-bold text-lg p-4 mt-8 bg-gradient-to-r from-green-700 to-green-500 rounded-lg shadow-lg hover:shadow-green-500/30 hover:scale-105 transition-all duration-300 relative overflow-hidden group"
          onClick={handleGameStart}
        >
          <span className="absolute -inset-x-3 bottom-0 h-1 bg-green-300 opacity-30 group-hover:h-full group-hover:opacity-10 transition-all duration-500"></span>
          <span className="relative flex items-center justify-center">
            🚀 {isLoggedIn ? "Join Game" : "Login to Play"}
          </span>
        </button>

        {!isLoggedIn && (
          <p className="text-gray-400 text-center mt-3 text-sm">
            You need to log in to play a game
          </p>
        )}
      </div>
    </div>
  );
};

export default Home;