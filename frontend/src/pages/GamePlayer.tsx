import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Chess } from "chess.js"; // Chess logic library
import { ChessBoard } from "../components/ChessBoard";

interface GameData {
  game_id: string;
  player1: string;
  player2: string;
  status: string;
  winner: string;
  moves: string[];
}

export const GameReplay = () => {
  const { game_id } = useParams<{ game_id: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<GameData | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chess] = useState(new Chess()); // Chess.js instance
  const [showAnimation, setShowAnimation] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const [autoplayInterval, setAutoplayInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchGameData = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/game/${game_id}`);
        if (!response.ok) throw new Error("Failed to fetch game data");
        
        const data: GameData = await response.json();
        setGame(data);
        chess.reset(); // Reset board before applying moves
        
        // Start animation after data is loaded
        setTimeout(() => setShowAnimation(true), 100);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };
    
    fetchGameData();
    
    // Clean up autoplay on unmount
    return () => {
      if (autoplayInterval) {
        clearInterval(autoplayInterval);
      }
    };
  }, [game_id, chess]);

  // Update board position when move index changes
  useEffect(() => {
    if (game && currentMoveIndex >= -1) {
      chess.reset(); // Reset board
      for (let i = 0; i <= currentMoveIndex; i++) {
        if (game.moves[i]) {
          try {
            chess.move(game.moves[i]);
          } catch (e) {
            console.error(`Invalid move: ${game.moves[i]}`, e);
          }
        }
      }
    }
  }, [currentMoveIndex, game, chess]);

  // Handle autoplay
  useEffect(() => {
    if (autoplay && game) {
      const interval = setInterval(() => {
        setCurrentMoveIndex((prev) => {
          if (prev < game.moves.length - 1) {
            return prev + 1;
          } else {
            setAutoplay(false);
            return prev;
          }
        });
      }, 1000);
      
      setAutoplayInterval(interval);
      
      return () => clearInterval(interval);
    } else if (autoplayInterval) {
      clearInterval(autoplayInterval);
      setAutoplayInterval(null);
    }
  }, [autoplay, game, autoplayInterval]);

  const handleNextMove = () => {
    if (game && currentMoveIndex < game.moves.length - 1) {
      setCurrentMoveIndex((prev) => prev + 1);
    }
  };

  const handlePrevMove = () => {
    if (currentMoveIndex > -1) {
      setCurrentMoveIndex((prev) => prev - 1);
    }
  };

  const handleFirstMove = () => {
    setCurrentMoveIndex(-1);
  };

  const handleLastMove = () => {
    if (game) {
      setCurrentMoveIndex(game.moves.length - 1);
    }
  };

  const toggleAutoplay = () => {
    setAutoplay(!autoplay);
  };

  // Format the move number to show proper chess notation (e.g., 1. e4)
  const formatMoveNumber = (index: number) => {
    const moveNumber = Math.floor(index / 2) + 1;
    const isWhite = index % 2 === 0;
    return `${moveNumber}${isWhite ? '.' : '...'}`;
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#581c87] min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-4 h-4 bg-purple-500 rounded-full animate-pulse delay-100"></div>
            <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse delay-200"></div>
            <span className="ml-3">Loading game replay...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#581c87] min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-[#0f172a]/80 backdrop-blur-sm p-6 rounded-2xl shadow-2xl border border-red-600/50 max-w-md w-full">
          <h2 className="text-white text-2xl font-bold mb-4">Error</h2>
          <p className="text-red-400">{error}</p>
          <button
            className="mt-6 w-full text-white font-bold p-3 bg-gradient-to-r from-blue-700 to-blue-500 rounded-lg shadow-lg hover:shadow-blue-500/30 transition-all duration-300"
            onClick={() => navigate("/history")}
          >
            Back to History
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#581c87] min-h-screen flex flex-col items-center p-4 md:p-8 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-blue-500 filter blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 rounded-full bg-purple-700 filter blur-3xl"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 rounded-full bg-green-500 filter blur-3xl"></div>
      </div>

      {/* Back Button */}
      <div className={`absolute top-6 left-6 transform transition-all duration-1000 ${showAnimation ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0'}`}>
        <button 
          onClick={() => navigate("/history")}
          className="flex items-center justify-center w-10 h-10 bg-[#0f172a]/80 backdrop-blur-sm rounded-full border border-gray-600/50 text-white hover:bg-[#1e293b] transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
      </div>

      {/* Header */}
      <div className={`text-center transform transition-all duration-1000 mt-8 ${showAnimation ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0'}`}>
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">
          GAME REPLAY
        </h1>
        <p className="text-blue-200 text-lg mt-2">
          {game?.player1} vs {game?.player2}
        </p>
        <div className="mt-2">
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
            game?.status === "Completed" ? "bg-green-900/50 text-green-400" : 
            game?.status === "Disconnect" ? "bg-red-900/50 text-red-400" : 
            "bg-yellow-900/50 text-yellow-400"
          }`}>
            {game?.status}
          </span>
        </div>
        <p className="text-lg font-semibold mt-2">
          Winner: <span className="text-green-400">{game?.winner || "None"}</span>
        </p>
      </div>

      {/* Main Content */}
      <div className="flex flex-col md:flex-row w-full max-w-7xl gap-8 mt-8">
        {/* Chessboard */}
        <div className={`flex-1 transform transition-all duration-1000 ${showAnimation ? 'translate-x-0 opacity-100' : '-translate-x-24 opacity-0'}`}>
          <div className="bg-[#0f172a]/80 backdrop-blur-sm p-4 rounded-2xl shadow-2xl border border-gray-600/50">
            <ChessBoard
              board={chess.board()}
              activePlayer={currentMoveIndex % 2 === 0 ? "white" : "black"}
              showTimers={false}
            />
          </div>
        </div>

        {/* Moves Panel */}
        <div className={`md:w-1/3 transform transition-all duration-1000 ${showAnimation ? 'translate-x-0 opacity-100' : 'translate-x-24 opacity-0'}`}>
          <div className="bg-[#0f172a]/80 backdrop-blur-sm p-4 rounded-2xl shadow-2xl border border-gray-600/50 h-full">
            <h2 className="text-2xl font-bold text-white mb-4">Moves</h2>
            
            {/* Current Move Display */}
            <div className="mb-6 bg-[#1e293b] p-4 rounded-lg border border-gray-700">
              <p className="text-gray-400 text-sm">Current Move:</p>
              <p className="text-yellow-300 text-xl font-mono">
                {currentMoveIndex >= 0 ? 
                  `${formatMoveNumber(currentMoveIndex)} ${game?.moves[currentMoveIndex]}` : 
                  "Start of game"}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Move {currentMoveIndex + 1} of {game?.moves.length}
              </p>
            </div>

            {/* Navigation Controls */}
            <div className="grid grid-cols-5 gap-2 mb-6">
              <button
                onClick={handleFirstMove}
                disabled={currentMoveIndex === -1}
                className="p-2 bg-[#1e293b] rounded-lg border border-gray-700 text-white hover:bg-[#2d3748] disabled:opacity-50"
                title="First move"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5 mx-auto">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={handlePrevMove}
                disabled={currentMoveIndex === -1}
                className="p-2 bg-[#1e293b] rounded-lg border border-gray-700 text-white hover:bg-[#2d3748] disabled:opacity-50"
                title="Previous move"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5 mx-auto">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {/* <button
                onClick={toggleAutoplay}
                className={`p-2 rounded-lg border text-white hover:bg-[#2d3748] ${
                  autoplay ? "bg-green-800 border-green-700" : "bg-[#1e293b] border-gray-700"
                }`}
                title={autoplay ? "Pause" : "Play"}
              >
                {autoplay ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5 mx-auto">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5 mx-auto">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </button> */}
              <button
                onClick={handleNextMove}
                disabled={!game || currentMoveIndex === game.moves.length - 1}
                className="p-2 bg-[#1e293b] rounded-lg border border-gray-700 text-white hover:bg-[#2d3748] disabled:opacity-50"
                title="Next move"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5 mx-auto">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={handleLastMove}
                disabled={!game || currentMoveIndex === game.moves.length - 1}
                className="p-2 bg-[#1e293b] rounded-lg border border-gray-700 text-white hover:bg-[#2d3748] disabled:opacity-50"
                title="Last move"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5 mx-auto">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Moves List */}
            <div className="bg-[#1e293b] rounded-lg border border-gray-700 h-80 overflow-y-auto px-2">
              <div className="sticky top-0 bg-[#1e293b] py-2 px-1 border-b border-gray-700 flex justify-between text-gray-400">
                <span>Move</span>
                <span>Notation</span>
              </div>
              <div className="space-y-1 py-2">
                <div 
                  className={`flex justify-between items-center p-2 rounded cursor-pointer ${
                    currentMoveIndex === -1 ? "bg-blue-900/50 text-white" : "hover:bg-gray-700/50"
                  }`}
                  onClick={handleFirstMove}
                >
                  <span className="text-gray-400">Start</span>
                  <span>Initial Position</span>
                </div>
                
                {game?.moves.map((move, index) => (
                  <div 
                    key={index}
                    className={`flex justify-between items-center p-2 rounded cursor-pointer ${
                      currentMoveIndex === index ? "bg-blue-900/50 text-white" : "hover:bg-gray-700/50"
                    }`}
                    onClick={() => setCurrentMoveIndex(index)}
                  >
                    <span className="text-gray-400">{formatMoveNumber(index)}</span>
                    <span>{move}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};