

// // NOTE : This is no longer used in the frontend ,this was the part of earlier version


// import { PropsWithChildren, useEffect, useState } from "react";
// import { GameContext } from "./GameContext";

// const GamesocketProvider = ({ children }: PropsWithChildren) => {
//   const [socket, setSocket] = useState<WebSocket | null>(null);

//   useEffect(() => {
//     const newSocket = new WebSocket("wss://chess-u6el.onrender.com/ws");
    
//     newSocket.onopen = () => {
//       console.log("WebSocket connection established");
//       setSocket(newSocket);
//     };

//     newSocket.onmessage = (event) => {
//       console.log("Received message:", event.data);
//     };

//     newSocket.onclose = () => {
//       console.log("WebSocket connection closed");
//       setSocket(null);
//     };

//     return () => newSocket.close();
//   }, []);

//   const init_game = (message: any) => {
//     console.log("connecting...");
    
//     if (socket) {
//       socket.send(JSON.stringify({ event: "INIT_GAME", data: {
//         player_name: sessionStorage.getItem("username"),
//         total_time: message.total_time,
//         increment: message.increment
//       } }));
//     }
//   }

//   if (!socket) return null;

//   return (
//     <GameContext.Provider value={{ socket, init_game }}>
//       {children}
//     </GameContext.Provider>
//   );
// };

// export default GamesocketProvider;