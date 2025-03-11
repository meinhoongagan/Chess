import { Routes, Route, useNavigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { useGlobalState } from './GlobalState/Store';
import { useEffect } from 'react';
import { Matching } from './components/Matching';
import { Waiting } from './components/Waiting';
import { Game } from './pages/Game';
import Auth from './pages/Auth';
import { setupWebSocketHandler, useWebSocketEvent } from './utils/WebSocketHandler';

const App = () => {
  const navigate = useNavigate();
  const { socket, set_activePlayer, setGameID } = useGlobalState(state => state);

  useEffect(() => {
    if (!socket) return;
    
    console.log(socket);
    console.log("ready State", socket.readyState);
    
    if (socket.readyState !== WebSocket.OPEN) {
      console.log("WebSocket connection is not open");
    }
    
    if (socket.readyState !== WebSocket.CLOSED) {
      console.log("WebSocket connection is not closed");
    }
    
    // Set up the centralized WebSocket handler
    const cleanup = setupWebSocketHandler(socket);
    
    return () => {
      if (cleanup) cleanup();
      socket?.close();
    };
  }, [socket]);

  // Use the event subscription system for app-level events
  useWebSocketEvent('GAME_STARTED', (data) => {
    console.log("🎮 Game started event received in App:", data);
    sessionStorage.setItem("turn", data.turn);
    sessionStorage.setItem("white", data.turn);
    sessionStorage.setItem("opponent", data.data.opponent);
    set_activePlayer(data.turn);
    setGameID(data.data.game_id);
    navigate(`/game/${data.data.game_id}`);
  });

  useWebSocketEvent('MOVE', (data) => {
    console.log("♟️ Move event received in App, turn:", data.data.turn);
    sessionStorage.setItem("turn", data.data.turn);
  });

  return (
    <Routes>
      <Route path="/" element={<Home/>}/>
      <Route path="/matching" element={<Matching/>}/>
      <Route path="/game/:gameId" element={<Game totalTime={0} increment={0}/>}/>
      <Route path="/auth" element={<Auth/>}/>
      <Route path="/waiting" element={<Waiting />} />
    </Routes>
  );
};

export default App;