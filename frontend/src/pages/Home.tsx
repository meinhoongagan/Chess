import { useEffect, useState } from "react";
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

  return (
    <div className="bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#581c87] min-h-screen flex items-center justify-center p-8">
      {/* Chess Board */}
      <div className="flex-1 flex justify-center items-center">
        <div className="p-6 bg-[#0f172a] shadow-lg rounded-2xl border border-gray-600 animate-fade-in">
          <ChessBoard 
            board={board} 
            activePlayer="white"
            totalTime={totalTime}
          />
        </div>
      </div>

      {/* Control Panel */}
      <div className="w-1/3 bg-[#0f172a] p-6 rounded-2xl shadow-lg border border-gray-600 animate-slide-in">
        <h2 className="text-white text-3xl font-bold text-center mb-4">
          🎯 Game Settings
        </h2>

        {/* Total Time Dropdown */}
        <label className="text-white text-xl font-semibold" htmlFor="total_time">
          ⏳ Total Time
        </label>
        <select
          className="w-full text-white p-3 mt-1 bg-[#1e293b] rounded-lg border border-gray-500 focus:ring-2 focus:ring-purple-400 transition-all"
          id="total_time"
          onChange={(e) => setTotalTime(parseInt(e.target.value))}
        >
          <option value="300">5 Mins</option>
          <option value="600">10 Mins</option>
          <option value="900">15 Mins</option>
          <option value="1800">30 Mins</option>
        </select>

        {/* Increment Dropdown */}
        <label className="text-white text-xl font-semibold mt-4 block" htmlFor="increment">
          ⏩ Increment
        </label>
        <select
          className="w-full text-white p-3 mt-1 bg-[#1e293b] rounded-lg border border-gray-500 focus:ring-2 focus:ring-purple-400 transition-all"
          id="increment"
          onChange={(e) => setIncrement(parseInt(e.target.value))}
        >
          <option value="1">1 Sec</option>
          <option value="3">3 Sec</option>
          <option value="5">5 Sec</option>
          <option value="10">10 Sec</option>
        </select>

        {/* Suggestion Checkbox */}
        <div className="mt-4 flex items-center">
          <input 
            type="checkbox" 
            name="suggestion" 
            id="suggestion" 
            className="w-5 h-5 text-purple-500 bg-gray-700 border-gray-500 rounded focus:ring-2 focus:ring-purple-400 cursor-pointer"
            onChange={(e) => setSuggestion(e.target.checked)}
          />
          <label htmlFor="suggestion" className="text-white text-lg font-semibold ml-2 cursor-pointer">
            Enable Suggestions
          </label>
        </div>

        {/* Join Game Button */}
        <button
          className="w-full text-white font-bold text-lg p-3 mt-6 bg-gradient-to-r from-green-700 to-green-500 rounded-lg shadow-md hover:scale-105 transition-all duration-200"
          onClick={() => {
            if (!sessionStorage.getItem("token")) {
              navigate("/auth");
              return;
            }
            init_game({ totalTime, increment });
            setTime(totalTime);
            navigate("/matching", { state: { totalTime, increment } });
          }}
        >
          🚀 Join Game
        </button>
      </div>
    </div>
  );
};
