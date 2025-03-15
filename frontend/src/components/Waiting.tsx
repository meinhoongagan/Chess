import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useGlobalState } from "../GlobalState/Store";

export const Waiting = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = location;
  const { isCreating, gameId, totalTime, increment } = state || {};

  const { socket, setGameID } = useGlobalState(state => state);
  
  interface GameInfo {
    game_id: string;
  }
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(
    // Initialize with gameId from location state if available
    gameId ? { game_id: gameId } : null
  );
  const [copied, setCopied] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  
  useEffect(() => {
    // Listen for websocket messages
    const handleWebSocketMessage = (event: any) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.event === "GAME_CREATED") {
          setGameID(data.data.game_id);
          setGameInfo(data.data);
        }
        
        if (data.event === "GAME_STARTED") {
          // Store necessary info in session storage
          sessionStorage.setItem("opponent", data.data.opponent);
          sessionStorage.setItem("game_id", data.data.game_id);
          sessionStorage.setItem("turn", data.turn);
          
          // Navigate to the game
          navigate(`/game/${data.data.game_id}`, { 
            state: { totalTime, increment }
          });
        }
        
        if (data.event === "ERROR") {
          alert(data.data.message);
          navigate("/");
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    };
    
    if (socket) {
      socket.addEventListener("message", handleWebSocketMessage);
    }
    
    // Increment timer every second
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);
    
    return () => {
      if (socket) {
        socket.removeEventListener("message", handleWebSocketMessage);
      }
      clearInterval(timer);
    };
  }, [navigate, totalTime, increment, socket, setGameID]);
  
  const copyGameId = () => {
    const idToCopy = gameInfo?.game_id || gameId;
    if (idToCopy) {
      navigator.clipboard.writeText(idToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const cancelWaiting = () => {
    // You would need to implement a cancel event for your websocket
    navigate("/");
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Get the current game ID to display (either from gameInfo or from props)
  const currentGameId = gameInfo?.game_id || gameId;
  
  return (
    <div className="bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#581c87] min-h-screen flex flex-col items-center justify-center p-4">
      <div className="bg-[#0f172a]/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-gray-600/50 max-w-md w-full">
        <h1 className="text-3xl font-bold text-white text-center mb-6">
          {isCreating ? "Waiting for Opponent" : "Joining Game"}
        </h1>
        
        <div className="flex justify-center mb-6">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
            <span className="text-white text-lg">{formatTime(timeElapsed)}</span>
          </div>
        </div>
        
        {isCreating && currentGameId && (
          <div className="mb-6 bg-[#1e293b] rounded-lg p-4">
            <p className="text-gray-300 text-sm mb-2">Share this game ID with your friend:</p>
            <div className="flex">
              <input 
                type="text" 
                readOnly 
                value={currentGameId} 
                className="flex-1 bg-[#2d3748] text-white p-2 rounded-l-lg border border-gray-600 focus:outline-none"
              />
              <button 
                onClick={copyGameId}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 rounded-r-lg transition-colors"
              >
                {copied ? "✓" : "Copy"}
              </button>
            </div>
          </div>
        )}
        
        {!isCreating && currentGameId && (
          <p className="text-center text-gray-300 mb-6">
            Connecting to game <span className="font-mono text-blue-300">{currentGameId}</span>...
          </p>
        )}
        
        <p className="text-center text-gray-400 text-sm mb-6">
          {isCreating 
            ? "Waiting for someone to join your game..." 
            : "Waiting to connect to the game..."
          }
        </p>
        
        <button
          onClick={cancelWaiting}
          className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default Waiting;