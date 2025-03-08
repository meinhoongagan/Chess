import { create  } from "zustand";

interface GlobalState {
    socket: WebSocket | null;
    time: number | null;
    activePlayer: string | null;
    suggestion: boolean;
    game_id: string | null;
    init_game: (message: any) => void;
    make_move: (message: any) => void;
    setGameID: (game_id: string) => void;
    setTime: (time: number) => void;
    setSuggestion: (suggestion: boolean) => void;
    set_activePlayer: (activePlayer: string) => void;
    send_offer: (target: string , offer: any) => void;
    send_answer: (target: string , answer: any) => void;
    send_ice_candidate: (target: string , candidate: any) => void;
}

export const useGlobalState = create<GlobalState>((set,get) => ({
    socket: null,
    time: null,
    activePlayer:null,
    suggestion:false,
    game_id: null,
    init_game: async (message: any) => { 
        let socket = get().socket;
    
        if (!socket || socket.readyState === WebSocket.CLOSED) {
            socket = new WebSocket("ws://localhost:8000/ws");
    
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
                        move: message,
                        game_id: get().game_id
                    }
                })
            );
            console.log("📡 MOVE sent successfully!");
        } catch (e) {
            console.error("🚨 Error sending message:", e);
        }
    },
    setGameID : (game_id: string) => {
        set({ game_id: game_id });
    },
    setTime : (time: number) => {
        if (time === 0) {
            set({ time: null });
        } else {
            set({ time: time });
        }
    },
    setSuggestion : (suggestion: boolean) => {
        set({ suggestion: suggestion });
    },
    set_activePlayer : (activePlayer: string) => {
        set({ activePlayer: activePlayer });
    },
    send_offer: async (target: string, offer:any) => {
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
        
        if (socket.readyState === WebSocket.OPEN) {
            try{
                socket.send(
                    JSON.stringify({
                        event: "OFFER",
                        data: {
                            target: target,
                            offer: offer
                        }
                    })
                )
                console.log("📩 Send Offer");
            }catch(e){
                console.error("🚨 Error sending message:", e);
            }
        }
        if (socket.readyState !== WebSocket.OPEN) {
            console.error("❌ WebSocket is not open. Unable to send MOVE.");
            return;
        }
    },
    send_answer: async (target: string, answer:any) => {
        let socket = get().socket;
        if (!socket) {
            console.error("❌ WebSocket instance is missing.");
            return;
        }
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(
                JSON.stringify({
                    event: "ANSWER",
                    data: {
                        target: target,
                        answer: answer
                    }
                })
            )
        }
    
        if (socket.readyState !== WebSocket.OPEN) {
            console.error("❌ WebSocket is not open. Unable to send MOVE.");
            return;
        }
    },
    send_ice_candidate: async (target: string, candidate:any) => {
        let socket = get().socket;
        if (!socket) {
            console.error("❌ WebSocket instance is missing.");
            return;
        }
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(
                JSON.stringify({
                    event: "ICE_CANDIDATE",
                    data: {
                        target: target,
                        candidate: candidate
                    }
                })
            )
        }
    
        if (socket.readyState !== WebSocket.OPEN) {
            console.error("❌ WebSocket is not open. Unable to send MOVE.");
            return;
        }
    },
    
}));