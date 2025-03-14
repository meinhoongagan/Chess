import { create  } from "zustand";

interface GlobalState {
    socket: WebSocket | null;
    time: number | null;
    activePlayer: string | null;
    suggestion: boolean;
    game_id: string | null;
    init_game: (message: any) => void;
    create_game : (message: any) => void;
    join_game : (message: any) => void;
    reconnect_game : (message: any) => void;
    make_move: (message: any) => void;
    setGameID: (game_id: string) => void;
    setTime: (time: number) => void;
    setSuggestion: (suggestion: boolean) => void;
    set_activePlayer: (activePlayer: string) => void;
    send_offer: (to: string, offer: RTCSessionDescriptionInit) => void;
    send_answer: (to: string, answer: RTCSessionDescriptionInit) => void;
    send_ice_candidate: (to: string, candidate: RTCIceCandidateInit) => void;
}

export const useGlobalState = create<GlobalState>((set, get) => ({
    socket: null,
    time: null,
    activePlayer: null,
    suggestion: false,
    game_id: null,
    
    init_game: async (message: any) => { 
        let socket = get().socket;
    
        if (!socket || socket.readyState === WebSocket.CLOSED) {
            socket = new WebSocket("ws://localhost:8000/ws");
    
            // Wrap the WebSocket connection in a Promise to await onopen
            await new Promise<void>((resolve, reject) => {
                if(!socket) return;

                // Add to the GlobalState store (Store.tsx)
                const HEARTBEAT_INTERVAL = 15000; // 15 seconds

                // Setup heartbeat interval
                const heartbeatInterval = setInterval(() => {
                    if (socket && socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({
                            event: "PING",
                            data: {}
                        }));
                        console.log("❤️ Sending heartbeat");
                    }
                }, HEARTBEAT_INTERVAL);
                
                // Clear interval when socket closes
                socket.onclose = () => {
                    console.log("🔌 WebSocket closed");
                    clearInterval(heartbeatInterval);
                    // Existing reconnection logic
                };

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

    // Other methods remain unchanged...
    create_game: async (message: any) => {
        let socket = get().socket;
    
        if (!socket || socket.readyState === WebSocket.CLOSED) {
            socket = new WebSocket("ws://localhost:8000/ws");
        }
        
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
        try{
            socket.send(
                JSON.stringify({
                    event: "CREATE_GAME",
                    data: {
                        player_name: sessionStorage.getItem("username"),
                        total_time: message.totalTime,
                        increment: message.increment
                    }
                })
            );
        }
        catch(e){
            console.error("🚨 Error sending message:", e);
        }
        socket.onmessage = (event) => {
            console.log("📩 Received message:", event.data);
        };

        socket.onclose = () => {
            console.log("🔌 WebSocket closed");
        };

        set({ socket });
    },
    
    join_game: async (message: any) => {
        let socket = get().socket;

        console.log("Joining game with ID:", message.gameId);
        
    
        // Ensure we only create a new WebSocket if the previous one is closed
        if (!socket || socket.readyState === WebSocket.CLOSED) {
            socket = new WebSocket("ws://localhost:8000/ws");
    
            socket.onopen = () => {
                console.log("✅ WebSocket connection established");
    
                // Send JOIN_GAME message only after the connection is open
                try {
                    console.log("📡 Sending JOIN_GAME...",message.gameId);
                    if (socket)socket.send(
                        JSON.stringify({
                            event: "JOIN_GAME",
                            data: {
                                player_name: sessionStorage.getItem("username"),
                                game_id: message.gameId
                            }
                        })
                    );
                } catch (e) {
                    console.error("🚨 Error sending message:", e);
                }
            };
    
            socket.onerror = (error) => {
                console.error("❌ WebSocket error:", error);
            };
    
            socket.onmessage = (event) => {
                console.log("📩 Received message:", event.data);
            };
    
            socket.onclose = (event) => {
                console.log("🔌 WebSocket closed:");
            
                if (event.wasClean) {
                    console.log(`✅ Connection closed cleanly, code=${event.code}, reason=${event.reason}`);
                } else {
                    console.warn(`⚠️ Connection died unexpectedly`);
                }
            
                console.log("Close Event Details:", event);
            };
            
    
            set({ socket });
        } else {
            console.log("⚡ Using existing WebSocket connection");
    
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(
                    JSON.stringify({
                        event: "JOIN_GAME",
                        data: {
                            player_name: sessionStorage.getItem("username"),
                            game_id: message.gameId
                        }
                    })
                );
            } else {
                console.warn("WebSocket is not open yet!");
            }
        }
    },
    
    reconnect_game: async (message: any) => {
        let socket = get().socket;
    
        if (!socket || socket.readyState === WebSocket.CLOSED) {
            socket = new WebSocket("ws://localhost:8000/ws");
        }
    
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
                    event: "RECONNECT",
                    data: {
                        player_name: sessionStorage.getItem("username"),
                        game_id: message.gameId || get().game_id // Use existing game_id if not provided
                    }
                })
            );
            console.log(JSON.stringify({
                event: "RECONNECT",
                data: {
                    player_name: sessionStorage.getItem("username"),
                    game_id: message.gameId || get().game_id // Use existing game_id if not provided
                }
            }));
            
            console.log("📡 Attempting to reconnect to game:", message.gameId || get().game_id);
        } catch (e) {
            console.error("🚨 Error sending reconnection message:", e);
        }
    
        // Set up automatic reconnection if the socket closes again
        socket.onclose = () => {
            console.log("🔌 WebSocket closed unexpectedly, attempting to reconnect...");
            
            // Only attempt to reconnect if we have a game_id
            if (get().game_id) {
                console.log("🔄 Attempting automatic reconnection for game:", get().game_id);
                setTimeout(() => {
                    get().reconnect_game({ gameId: get().game_id });
                }, 1000); // Wait 1 second before attempting to reconnect
            }
        };
        
        set({ socket });
        console.log("new socket is :",socket)
    },
    
    make_move: async (message: any) => {
        let socket = get().socket;
    
        if (!socket) {
            console.error("❌ WebSocket instance is missing.");
            return;
        }

        console.log("Making Move After Reconnection");
    
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
            console.log(get().game_id);
            console.log("📡 MOVE sent successfully!");
        } catch (e) {
            console.error("🚨 Error sending message:", e);
        }
    },
    
    setGameID: (game_id: string) => {
        set({ game_id: game_id });
    },
    
    setTime: (time: number) => {
        if (time === 0) {
            set({ time: null });
        } else {
            set({ time: time });
        }
    },
    
    setSuggestion: (suggestion: boolean) => {
        set({ suggestion: suggestion });
    },
    
    set_activePlayer: (activePlayer: string) => {
        set({ activePlayer: activePlayer });
    },
    
    // Improved WebRTC signaling methods
    send_offer: async (to: string, offer: RTCSessionDescriptionInit) => {
        const socket = get().socket;
        if (!socket) {
            console.error("❌ WebSocket instance is missing.");
            return;
        }

        // Wait for socket to be ready
        if (socket.readyState === WebSocket.CONNECTING) {
            console.log("⏳ WebSocket is still connecting, waiting...");
            await new Promise<void>((resolve) => {
                const checkInterval = setInterval(() => {
                    if (socket.readyState === WebSocket.OPEN) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            });
        }

        if (socket.readyState === WebSocket.OPEN) {
            try {
                socket.send(
                    JSON.stringify({
                        event: "OFFER",
                        data: {
                            game_id: get().game_id,
                            from: sessionStorage.getItem("username"),
                            target: to,
                            offer: offer  // Keep as 'offer' as the hook expects this property name
                        }
                    })
                );
                console.log("📤 Sent WebRTC offer to:", to);
            } catch (e) {
                console.error("🚨 Error sending offer:", e);
            }
        } else {
            console.error("❌ WebSocket is not open. Unable to send offer.");
        }
    },
    
    send_answer: async (to: string, answer: RTCSessionDescriptionInit) => {
        const socket = get().socket;
        if (!socket) {
            console.error("❌ WebSocket instance is missing.");
            return;
        }

        // Wait for socket to be ready
        if (socket.readyState === WebSocket.CONNECTING) {
            console.log("⏳ WebSocket is still connecting, waiting...");
            await new Promise<void>((resolve) => {
                const checkInterval = setInterval(() => {
                    if (socket.readyState === WebSocket.OPEN) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            });
        }

        if (socket.readyState === WebSocket.OPEN) {
            try {
                socket.send(
                    JSON.stringify({
                        event: "ANSWER",
                        data: {
                            game_id: get().game_id,
                            from: sessionStorage.getItem("username"),
                            target: to,
                            answer: answer  // Keep as 'answer' as the hook expects this property name
                        }
                    })
                );
                console.log("📤 Sent WebRTC answer to:", to);
            } catch (e) {
                console.error("🚨 Error sending answer:", e);
            }
        } else {
            console.error("❌ WebSocket is not open. Unable to send answer.");
        }
    },
    
    send_ice_candidate: async (to: string, candidate: RTCIceCandidateInit) => {
        const socket = get().socket;
        if (!socket) {
            console.error("❌ WebSocket instance is missing.");
            return;
        }

        // Wait for socket to be ready
        if (socket.readyState === WebSocket.CONNECTING) {
            console.log("⏳ WebSocket is still connecting, waiting...");
            await new Promise<void>((resolve) => {
                const checkInterval = setInterval(() => {
                    if (socket.readyState === WebSocket.OPEN) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            });
        }

        if (socket.readyState === WebSocket.OPEN) {
            try {
                socket.send(
                    JSON.stringify({
                        event: "ICE_CANDIDATE",
                        data: {
                            game_id: get().game_id,
                            from: sessionStorage.getItem("username"),
                            target: to,
                            candidate: candidate
                        }
                    })
                );
                console.log("❄️ Sent ICE candidate to:", to);
            } catch (e) {
                console.error("🚨 Error sending ICE candidate:", e);
        }
    }
}
}));