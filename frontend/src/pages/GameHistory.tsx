import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface GameData {
  game_id: string;
  status: string;
  winner: string;
  player1: string;
  player2: string;
}

export const GameHistory = () => {
  const [games, setGames] = useState<GameData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [showAnimation, setShowAnimation] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUsername = sessionStorage.getItem("username");
    if (!storedUsername) {
      setError("User not logged in");
      setLoading(false);
      return;
    }

    setUsername(storedUsername);
    fetchGameHistory(storedUsername);
    
    // Start the animation after a small delay
    setTimeout(() => setShowAnimation(true), 100);
  }, []);

  const fetchGameHistory = async (username: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/user/${username}/games`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch game history: ${response.statusText}`);
      }
      
      const data = await response.json();
      setGames(data);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      setLoading(false);
    }
  };

  const getResultClass = (game: GameData, currentUsername: string) => {
    if (game.status === "Disconnect") {
      return game.winner === currentUsername 
        ? "text-green-400" 
        : "text-red-400";
    }
    
    if (game.winner === currentUsername) return "text-green-400";
    if (game.winner === "Draw") return "text-yellow-400";
    return "text-red-400";
  };

  const getResultText = (game: GameData, currentUsername: string) => {
    if (game.status === "Disconnect") {
      return game.winner === currentUsername ? "Won (Disconnect)" : "Lost (Disconnect)";
    }
    
    if (game.winner === currentUsername) return "Victory";
    if (game.winner === "Draw") return "Draw";
    return "Defeat";
  };

  const getOpponent = (game: GameData, currentUsername: string) => {
    return game.player1 === currentUsername ? game.player2 : game.player1;
  };

  const handleGoHome = () => {
    navigate("/");
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#581c87] min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-4 h-4 bg-purple-500 rounded-full animate-pulse delay-100"></div>
            <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse delay-200"></div>
            <span className="ml-3">Loading game history...</span>
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
          {!username && (
            <button
              className="mt-6 w-full text-white font-bold p-3 bg-gradient-to-r from-blue-700 to-blue-500 rounded-lg shadow-lg hover:shadow-blue-500/30 transition-all duration-300"
              onClick={() => navigate("/auth")}
            >
              Log In
            </button>
          )}
          <button
            className="mt-4 w-full text-white font-bold p-3 bg-gradient-to-r from-gray-700 to-gray-600 rounded-lg shadow-lg hover:shadow-gray-500/30 transition-all duration-300"
            onClick={handleGoHome}
          >
            Return Home
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

      {/* Header */}
      <div className={`text-center transform transition-all duration-1000 mt-8 ${showAnimation ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0'}`}>
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 mb-2">
          GAME HISTORY
        </h1>
        <p className="text-blue-200 text-lg">Your chess match records</p>
      </div>

      {/* Back Button */}
      <div className={`absolute top-6 left-6 transform transition-all duration-1000 ${showAnimation ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0'}`}>
        <button 
          onClick={handleGoHome}
          className="flex items-center justify-center w-10 h-10 bg-[#0f172a]/80 backdrop-blur-sm rounded-full border border-gray-600/50 text-white hover:bg-[#1e293b] transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
      </div>

      {/* Game History List */}
      <div className={`w-full max-w-4xl mt-8 bg-[#0f172a]/80 backdrop-blur-sm p-6 rounded-2xl shadow-2xl border border-gray-600/50 transform transition-all duration-1000 ${showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="h-10 w-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
              {username.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-white text-2xl font-bold">
              {username}'s Games
            </h2>
          </div>
          <div className="text-blue-300">
            Total: {games.length} games
          </div>
        </div>

        {games.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-gray-400 text-lg mb-2">No games found</div>
            <p className="text-gray-500">Play some games to see your history here!</p>
            <button
              className="mt-6 px-6 py-2 bg-gradient-to-r from-blue-700 to-blue-500 rounded-lg text-white font-semibold hover:shadow-blue-500/30 transition-all"
              onClick={handleGoHome}
            >
              Start Playing
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="pb-3 text-left text-gray-400 font-semibold">Game ID</th>
                  <th className="pb-3 text-left text-gray-400 font-semibold">Opponent</th>
                  <th className="pb-3 text-left text-gray-400 font-semibold">Status</th>
                  <th className="pb-3 text-right text-gray-400 font-semibold">Result</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => (
                  <tr 
                    key={game.game_id} 
                    className="border-b border-gray-800 hover:bg-[#1e293b]/50 transition-colors"
                    onClick={() => navigate(`/replay/${game.game_id}`)}
                  >
                    <td className="py-4">
                      <div className="text-gray-300 font-mono text-sm">
                        {game.game_id.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-gray-700 rounded-full flex items-center justify-center text-white font-medium mr-2">
                          {getOpponent(game, username).charAt(0).toUpperCase()}
                        </div>
                        <span className="text-white">
                          {getOpponent(game, username)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        game.status === "Completed" ? "bg-green-900/50 text-green-400" : 
                        game.status === "Disconnect" ? "bg-red-900/50 text-red-400" : 
                        "bg-yellow-900/50 text-yellow-400"
                      }`}>
                        {game.status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <span className={`font-bold ${getResultClass(game, username)}`}>
                        {getResultText(game, username)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameHistory;