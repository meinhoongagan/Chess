import { Routes, Route  , useNavigate } from 'react-router-dom'
import { Home } from './pages/Home'
import { useGlobalState } from './GlobalState/Store'
import { useEffect } from 'react'
import { Matching } from './components/Matching'
import { Game } from './pages/Game'
import  Auth   from './components/Auth'



const App = () => {

  const navigate = useNavigate();

  const { socket  } = useGlobalState(state => state)
  useEffect(() => {
    if (!socket) return;

    console.log(socket);
    
    console.log("ready State" ,socket.readyState);
    

    if (socket.readyState !== WebSocket.OPEN) {
      console.log("WebSocket connection is not open");
    }

    if (socket.readyState !== WebSocket.CLOSED) {
      console.log("WebSocket connection is not closed");
    }

    const handleMessage = (event: any) => {
      const data = JSON.parse(event.data);
      console.log("📩 Received message:", event.data);
      
      if (data.event ==="GAME_STARTED"){

          sessionStorage.setItem("turn",data.turn);
          sessionStorage.setItem("white",data.turn);
          sessionStorage.setItem("opponent",data.data.opponent);
          navigate("/game");
      }
      if(data.event === "MOVE"){
        console.log("Move turn",data.data.turn);
        sessionStorage.setItem("turn",data.data.turn);
      }
    };

    socket.onmessage = handleMessage;

    return () => {
      socket.onmessage = null; // Cleanup to avoid duplicate listeners
      socket?.close();
    };
  }, [socket]);

  return (
      // <GamesocketProvider>
        <Routes>
          <Route path="/" element={<Home/>}/>
          <Route path="/matching" element={<Matching/>}/>
          <Route path="/game" element={<Game totalTime={0} increment={0}/>}/>
          <Route path="/auth" element={<Auth/>}/>
        </Routes>
      // </GamesocketProvider>
  )
}

export default App
