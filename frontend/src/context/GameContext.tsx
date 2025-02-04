import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface GameContextType {
  socket: WebSocket | null;
  gameState: {
    player: string | null;
    opponent: string | null;
    turn: string | null;
    status: string | null;
  };
  sendMessage: (event: string, data: any) => void;
  initGame: (totalTime: number, increment: number) => void;
  makeMove: (move: string) => void;
}

const GameContext = createContext<GameContextType>({
  socket: null,
  gameState: {
    player: null,
    opponent: null,
    turn: null,
    status: null
  },
  sendMessage: () => {},
  initGame: () => {},
  makeMove: () => {}
});

export const GameProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [gameState, setGameState] = useState({
    player: null,
    opponent: null,
    turn: null,
    status: null
  });
  const location = useLocation();
  const navigate = useNavigate();
  const playerNameRef = useRef<string | null>(null);

  useEffect(() => {
    const username = sessionStorage.getItem('username');
    if (!username) {
      navigate('/auth');
      return;
    }
    playerNameRef.current = username;

    const newSocket = new WebSocket('ws://localhost:8000/ws');
    
    newSocket.onopen = () => {
      console.log('WebSocket Connected');
      setSocket(newSocket);
    };

    newSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch(data.event) {
        case 'WAITING':
          console.log(data.data.message);
          break;
        
        case 'GAME_STARTED':
          setGameState(prev => ({
            ...prev,
            opponent: data.data.opponent,
            turn: data.turn
          }));
          break;
        
        case 'MOVE':
          // Update game state with move details
          setGameState(prev => ({
            ...prev,
            turn: data.data.turn
          }));
          break;
        
        case 'GAME_OVER':
          setGameState(prev => ({
            ...prev,
            status: data.data.status
          }));
          navigate('/game-result');
          break;
      }
    };

    newSocket.onclose = () => {
      console.log('WebSocket Disconnected');
      setSocket(null);
    };

    return () => {
      newSocket.close();
    };
  }, [navigate]);

  const sendMessage = (event: string, data: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        event,
        data: {
          ...data,
          player_name: playerNameRef.current
        }
      }));
    }
  };

  const initGame = ( totalTime: number, increment: number) => {
    sendMessage('INIT_GAME', {
      player_name: sessionStorage.getItem('username'),
      total_time: totalTime,
      increment: increment
    });
  };

  const makeMove = (move: string) => {
    sendMessage('MOVE', { move });
  };

  return (
    <GameContext.Provider value={{
      socket,
      gameState,
      sendMessage,
      initGame,
      makeMove
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => useContext(GameContext);