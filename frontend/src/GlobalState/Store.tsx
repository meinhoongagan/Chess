import { create  } from "zustand";

interface GlobalState {
    socket: WebSocket | null;
    time: number | null;
    activePlayer: string | null;
    init_game: (message: any) => void;
    make_move: (message: any) => void;
    setTime: (time: number) => void;
}


export const useGlobalState = create<GlobalState>((set,get) => ({
    socket: null,
    time: null,
    activePlayer:null,
    init_game: async (message: any) => { 
        let socket = get().socket;
    
        if (!socket || socket.readyState === WebSocket.CLOSED) {
            socket = new WebSocket("wss://chess-u6el.onrender.com/ws");
    
            // Wrap the WebSocket connection in a Promise to await onopen
            await new Promise<void>((resolve, reject) => {

                if(!socket) return;
                socket.onopen = () => {
                    console.log("✅ WebSocket connection established");
                    resolve();
                };
    
                socket.onerror = (error) => {
                    console.error("❌ WebSocket error:", error);
                    reject(error);
                };
            });
    
            try {
                socket.send(
                    JSON.stringify({
                        event: "INIT_GAME",
                        data: {
                            player_name: sessionStorage.getItem("username") || "Guest",
                            total_time: message.totalTime,
                            increment: message.increment
                        }
                    })
                );
                console.log("📡 Sending INIT_GAME...");
            } catch (e) {
                console.error("🚨 Error sending message:", e);
            }
    
            socket.onmessage = (event) => {
                console.log("📩 Received message:", event.data);
            };
    
            socket.onclose = () => {
                console.log("🔌 WebSocket closed");
            };
    
            set({ socket });
        }
    },
    

    make_move: async (message: any) => {
        let socket = get().socket;
    
        if (!socket) {
            console.error("❌ WebSocket instance is missing.");
            return;
        }
    
        if (socket.readyState === WebSocket.CONNECTING) {
            console.log("⏳ WebSocket is still connecting, waiting...");
            await new Promise<void>((resolve) => {
                const checkInterval = setInterval(() => {
                    if (socket.readyState === WebSocket.OPEN) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100); // Check every 100ms
            });
        }
    
        if (socket.readyState !== WebSocket.OPEN) {
            console.error("❌ WebSocket is not open. Unable to send MOVE.");
            return;
        }
    
        try {

            
            socket.send(
                JSON.stringify({
                    event: "MOVE",
                    data: {
                        move: message
                    }
                })
            );
            console.log("📡 MOVE sent successfully!");
        } catch (e) {
            console.error("🚨 Error sending message:", e);
        }
    },
    setTime : (time: number) => {
        if (time === 0) {
            set({ time: null });
        } else {
            set({ time: time });
        }
    }

    
}));