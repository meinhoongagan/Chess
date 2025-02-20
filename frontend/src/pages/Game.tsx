import { Chess, Color, PieceSymbol, Square } from "chess.js";
import { useEffect, useState, useRef } from "react";
import { ChessBoard } from "../components/ChessBoard";
import { useGlobalState } from "../GlobalState/Store";
import WinnerPopup from "../components/WinnerPopup";
interface GameProps {
    totalTime: number;
    increment: number;
}

interface TimeState {
    [key: string]: number;
}

export const Game = ({ totalTime, increment }: GameProps) => {
    const [chess] = useState(new Chess());
    const [board, setBoard] = useState(chess.board());
    const [moveFrom, setMoveFrom] = useState<string | null>(null);
    const { make_move, socket , time , send_offer , send_answer , send_ice_candidate } = useGlobalState((state) => state);
    const [winner, setWinner] = useState<string | null>(null);
    const [activePlayer, setActivePlayer] = useState<string>();
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const initialTimes: TimeState = {};
    const [times, setTimes] = useState<TimeState>(initialTimes);
    const [username, setUsername] = useState<string | null>(null);
    const [opponent, setOpponent] = useState<string | null>(null);
    const [white, setWhite] = useState<string | null>(null);
    const [peerConnection,setPeerConnection] = useState<RTCPeerConnection>();

    useEffect(() => {
        setUsername(sessionStorage.getItem("username"));
        setOpponent(sessionStorage.getItem("opponent"));
        setWhite(sessionStorage.getItem("white"));
    }, []);
    
    useEffect(() => {
        if (socket) {
            console.log("✅ WebSocket connection established:", socket);
            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log("📩 Received message:", data);
            };
        } else {
            console.log("❌ WebSocket connection not established.");
        }
    }, [socket, peerConnection]);

    useEffect(() => {
        // Setup RTCPeerConnection for both players
        const pc = new RTCPeerConnection();
        console.log("🔄 Created new RTCPeerConnection");
        
        pc.onconnectionstatechange = () => {
            console.log("📡 Connection State:", pc.connectionState);
        };

        pc.oniceconnectionstatechange = () => {
            console.log("❄️ ICE Connection State:", pc.iceConnectionState);
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("❄️ New ICE candidate:", event.candidate);
                send_ice_candidate(sessionStorage.getItem("opponent") ?? "", event.candidate);
            }
        };

        setPeerConnection(pc);

        // Create offer only if white player
        if (sessionStorage.getItem("white") === sessionStorage.getItem("username")) {
            const createOffer = async () => {
                try {
                    console.log("📝 Creating offer...");
                    const offer = await pc.createOffer();
                    console.log("📤 Offer created:", offer);
    
                    await pc.setLocalDescription(offer);
                    console.log("📍 Local description set");
    
                    send_offer(sessionStorage.getItem("opponent") ?? "", offer);
                    console.log("📨 Offer sent to opponent");
                } catch (error) {
                    console.error("❌ Error in offer creation:", error);
                }
            };
            createOffer();
        }

        return () => {
            pc.close();
            console.log("🔌 Peer connection closed");
        };
    }, []); 

    // Consolidated WebSocket message handler
    useEffect(() => {
        if (!socket || !peerConnection) {
            console.log("❌ WebSocket or PeerConnection not established");
            return;
        }

        navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream)=>{
            console.log("🎤 Audio stream obtained");
            stream.getTracks().forEach((track) => {
                peerConnection.addTrack(track, stream);
            });

            // 🔹 When a remote track is received, play the audio
            peerConnection.ontrack = (event) => {
                console.log("🔊 Remote audio track received");
                const audioElement = new Audio();
                audioElement.srcObject = event.streams[0];
                audioElement.autoplay = true;
                document.body.appendChild(audioElement); // Play the received audio
            };

        }).catch((error) => {
            console.error("❌ Error accessing microphone:", error);
        });

        console.log("✅ Setting up WebSocket message handler");
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("🧊 ICE Candidate:", event.candidate);
                socket.send(JSON.stringify({ event: "ICE_CANDIDATE", data: { candidate: event.candidate } }));
            } else {
                console.log("✅ ICE Candidate gathering complete");
            }
        };
        
        socket.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log("📩 Received WebSocket message:", data);

                switch (data.event) {
                    case "OFFER":
                        console.log("📡 Processing OFFER");
                        try {
                            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.data.offer));
                            const answer = await peerConnection.createAnswer();
                            await peerConnection.setLocalDescription(answer);
                            send_answer(sessionStorage.getItem("opponent") ?? "", answer);
                        } catch (error) {
                            console.error("❌ Error processing offer:", error);
                        }
                        break;
                    case "ANSWER":
                        console.log("📡 Processing ANSWER");
                        try {
                            if (peerConnection.signalingState === "stable") {
                                console.warn("⚠️ Skipping setRemoteDescription: Already in stable state");
                                return;
                            }
                            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.data.answer));
                        } catch (error) {
                            console.error("❌ Error processing answer:", error);
                        }
                        break;
                    
                    case "ICE_CANDIDATE":
                        console.log("📩 Received ICE Candidate", data.data.candidate);
                        if (data.data.candidate) {
                            try {
                                await peerConnection.addIceCandidate(new RTCIceCandidate(data.data.candidate));
                                console.log("✅ ICE Candidate added");
                            } catch (error) {
                                console.error("❌ Error adding ICE Candidate:", error);
                            }
                        }
                        break;
                    default:
                        console.log("⚠️ Unhandled message type:", data.event);
                }
                
            } catch (error) {
                console.error("❌ Error processing message:", error);
                console.log("Raw message:", event.data);
            }
        };

        return () => {
            socket.onmessage = null;
            console.log("🔄 Cleaned up WebSocket message handler");
        };
    }, [socket, peerConnection, chess, increment, white, username]);

    useEffect(() => {
        if (!socket) return;

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.event === "MOVE") {
                    const newTurn = data.data.turn;
                    sessionStorage.setItem("turn", newTurn);
                    setActivePlayer(newTurn);

                    // Add increment time after move if specified
                    if (increment > 0) {
                        setTimes(prevTimes => ({
                            ...prevTimes,
                            [data.data.player]: prevTimes[data.data.player] + increment
                        }));
                    }

                    chess.move(data.data.move);
                    setBoard(chess.board());
                }
                
                if (data.event === "GAME_OVER") {
                    setWinner(data.data.winner);
                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                    }
                }
            } catch (e) {
                console.error("Error processing message:", e);
            }
        };

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [socket, chess, increment]);

    // Initialize times and active player when component mounts
    useEffect(() => {
        if (!username || !opponent) return;

        const initialTurn = sessionStorage.getItem("turn");
        const initialTime = totalTime || time || 0;

        setTimes({
            [username]: initialTime,
            [opponent]: initialTime
        });

        const initialActivePlayer = initialTurn || sessionStorage.getItem("white") || username;
        setActivePlayer(initialActivePlayer);
    }, [username, opponent, totalTime, time]);
    

    // Timer effect
    useEffect(() => {
        if (!activePlayer || !times[activePlayer] || winner) return;

        // Clear existing timer
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        // Only start timer if it's the current player's turn
        const currentTurn = sessionStorage.getItem("turn");
        if (activePlayer !== currentTurn) return;

        timerRef.current = setInterval(() => {
            setTimes(prevTimes => {
                const newTime = Math.max(0, prevTimes[activePlayer] - 1);
                
                // Check for time out
                if (newTime === 0 && !winner) {
                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                    }
                    const timeoutWinner = activePlayer === username ? opponent : username;
                    setWinner(timeoutWinner || null);
                    socket?.send(JSON.stringify({
                        event: "GAME_OVER",
                        data: {
                            winner: timeoutWinner
                        }
                    }));
                }

                return {
                    ...prevTimes,
                    [activePlayer]: newTime
                };
            });
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [activePlayer, times, winner, username, opponent]);

    const handleSquareClick = (square: string, piece: { square: Square; type: PieceSymbol; color: Color } | null) => {
        try {
            if (moveFrom) {
                const squareElement = document.getElementById(moveFrom);
                const move = chess.move({ from: moveFrom, to: square, promotion: "q" });

                if (move) {
                    setBoard(chess.board());
                    setMoveFrom(null);
                    if (squareElement) {
                        squareElement.style.removeProperty("border");
                    }
                    make_move(move.san);
                }
                setMoveFrom(null);

            } else {
                const currentTurn = sessionStorage.getItem("turn");
                const username = sessionStorage.getItem("username");
                
                if (username !== currentTurn) {
                    alert("It's not your turn");
                    return;
                }

                if (!piece?.square) return;
                
                const currPiece = chess.get(piece.square);
                if (!currPiece) return;

                setMoveFrom(square);

                const squareElement = document.getElementById(square);
                if (squareElement) {
                    squareElement.style.removeProperty("border");
                    squareElement.style.border = "3px solid blue";
                }
            }
        } catch (e) {
            console.log(e);
            setMoveFrom(null);
            if (moveFrom) {
                const squareElement = document.getElementById(moveFrom);
                if (squareElement) {
                    squareElement.style.removeProperty("border");
                }
            }
        }
    };

    return (
        <div className="grid grid-cols-5 h-screen justify-center items-center bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#581c87]">
            {winner && <WinnerPopup winner={winner} onClose={() => setWinner(null)} />}
            <div className="grid col-span-3 justify-center items-center">
                <ChessBoard 
                    board={board} 
                    onSquareClick={handleSquareClick} 
                    times={times}
                    activePlayer={activePlayer ?? sessionStorage.getItem("white") ?? "white"}
                    totalTime={totalTime}
                    showTimers={true}
                    reverse={sessionStorage.getItem("username") !== sessionStorage.getItem("white")}
                />
            </div>
        </div>
    );
};