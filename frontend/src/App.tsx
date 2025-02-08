import { Routes, Route  , useNavigate } from 'react-router-dom'
import  GamesocketProvider  from './context/GameContextProvider'
import { Home } from './pages/Home'
import { useGlobalState } from './GlobalState/Store'
import { useEffect } from 'react'
import { Matching } from './components/Matching'
import { Game } from './pages/Game'


const App = () => {

  const navigate = useNavigate();

  const { socket } = useGlobalState(state => state)
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: any) => {
      const data = JSON.parse(event.data);
      console.log("📩 Received message:", event.data);
      if (data.event ==="GAME_STARTED"){
          navigate("/game");
      }
    };

    socket.onmessage = handleMessage;

    return () => {
      socket.onmessage = null; // Cleanup to avoid duplicate listeners
      socket?.close();
    };
  }, [socket]);

  return (
      <GamesocketProvider>
        <Routes>
          <Route path="/" element={<Home/>}/>
          <Route path="/matching" element={<Matching/>}/>
          <Route path="/game" element={<Game/>}/>
        </Routes>
      </GamesocketProvider>
  )
}

export default App
