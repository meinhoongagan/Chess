import { create  } from "zustand";

interface GlobalState {
    socket: WebSocket | null;
    init_game: (message: any) => void;
}

export const useGlobalState = create<GlobalState>((set,get) => ({
    socket: null,
    init_game: (message: any) => { 
        let socket = get().socket;

        if (!socket || socket.readyState === WebSocket.CLOSED) {
            socket = new WebSocket("wss://chess-u6el.onrender.com/ws");

            socket.onopen = () => {
                console.log("✅ WebSocket connection established");
                
                try {
                    socket?.send(
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
            };

            socket.onmessage = (event) => {
                console.log("📩 Received message:", event.data);
            };

            socket.onerror = (error) => {
                console.error("❌ WebSocket error:", error);
            };

            socket.onclose = () => {
                console.log("🔌 WebSocket closed");
            };

            set({ socket });
        }
    },
}));