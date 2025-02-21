import { Chess, Color, PieceSymbol, Square } from "chess.js";
import { useEffect, useState, useRef } from "react";
import { ChessBoard } from "../components/ChessBoard";
import { useGlobalState } from "../GlobalState/Store";
import WinnerPopup from "../components/WinnerPopup";
import { useNavigate } from "react-router-dom";
interface GameProps {
    totalTime: number;
    increment: number;
}

interface TimeState {
    [key: string]: number;
}

export const Game = ({ totalTime, increment }: GameProps) => {
    const navigate = useNavigate();
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
    const [localStream, setLocalStream] = useState<MediaStream>();
    const localAudioRef = useRef<HTMLAudioElement>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        setUsername(sessionStorage.getItem("username"));
        setOpponent(sessionStorage.getItem("opponent"));
        setWhite(sessionStorage.getItem("white"));
    }, []);

    useEffect(() => {
        const setupWebRTC = async () => {
            try {
                // 1. Create RTCPeerConnection with STUN servers
                const pc = new RTCPeerConnection({
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ],
                    iceCandidatePoolSize: 10
                });
                
                console.log("🔄 Created new RTCPeerConnection");
                
                // 2. Set up connection state monitoring
                pc.onconnectionstatechange = () => {
                    console.log("📡 Connection State:", pc.connectionState);
                };
    
                pc.oniceconnectionstatechange = () => {
                    console.log("❄️ ICE Connection State:", pc.iceConnectionState);
                };
    
                // 3. Handle ICE candidates
                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        console.log("❄️ New ICE candidate:", {
                            sdpMid: event.candidate.sdpMid,
                            sdpMLineIndex: event.candidate.sdpMLineIndex,
                            candidate: event.candidate.candidate
                        });
                        
                        const opponent = sessionStorage.getItem("opponent");
                        if (!opponent) {
                            console.error("❌ No opponent found in sessionStorage");
                            return;
                        }
                        
                        try {
                            send_ice_candidate(opponent, event.candidate);
                            console.log("📤 Successfully sent ICE candidate to:", opponent);
                        } catch (error) {
                            console.error("❌ Error sending ICE candidate:", error);
                        }
                    } else {
                        console.log("✅ ICE Candidate gathering complete");
                    }
                };
    
                // 4. Get local audio stream
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
                
                console.log("🎤 Audio stream obtained");
                
                // 5. Set up local audio preview
                if (localAudioRef.current) {
                    localAudioRef.current.srcObject = stream;
                    localAudioRef.current.muted = true; // Mute local audio preview
                }
    
                // 6. Add tracks to peer connection
                stream.getTracks().forEach(track => {
                    pc.addTrack(track, stream);
                    console.log("🎵 Added local audio track to peer connection");
                });
    
                // 7. Handle remote audio stream
                pc.ontrack = (event) => {
                    console.log("🔊 Received remote audio track");
                    if (remoteAudioRef.current) {
                        remoteAudioRef.current.srcObject = event.streams[0];
                    }
                };
    
                // 8. Store peer connection and stream
                setPeerConnection(pc);
                setLocalStream(stream);
    
                // 9. Create offer if white player
                if (sessionStorage.getItem("white") === sessionStorage.getItem("username")) {
                    try {
                        console.log("📝 Starting offer creation...");
                        const offer = await pc.createOffer({
                            offerToReceiveAudio: true,
                            iceRestart: true
                        });
                        console.log("📄 Offer created:", offer);
    
                        await pc.setLocalDescription(offer);
                        console.log("📍 Local description set");
    
                        const opponent = sessionStorage.getItem("opponent");
                        if (!opponent) {
                            throw new Error("No opponent found in sessionStorage");
                        }
    
                        send_offer(opponent, offer);
                        console.log("📨 Offer sent to opponent:", opponent);
                    } catch (error) {
                        console.error("❌ Error in offer creation:", error);
                    }
                }
    
            } catch (error) {
                console.error("❌ Error in WebRTC setup:", error);
            }
        };
    
        setupWebRTC();
    
        // Cleanup function
        return () => {
            localStream?.getTracks().forEach(track => {
                track.stop();
                console.log("🛑 Stopped audio track");
            });
            peerConnection?.close();
            console.log("🔌 Peer connection closed");
        };
    }, []); // Empty dependency array - run once on moun 

    // Consolidated WebSocket message handler
    useEffect(() => {
        if (!socket) {
            console.log("❌ WebSocket not established");
            return;
        }

        console.log("✅ Setting up consolidated WebSocket message handler");
        
        socket.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log("📩 Received WebSocket message:", data);

                switch (data.event) {
                    case "MOVE":
                        console.log("♟️ Processing MOVE");
                        try {
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
                            console.log("👉 Move turn:", data.data.turn);
                            console.log("🎮 Updated board:", chess.board());
                            
                            setBoard(chess.board());
                        } catch (error) {
                            console.error("❌ Error processing move:", error);
                        }
                        break;

                    case "GAME_OVER":
                        console.log("🏁 Processing GAME_OVER");
                        setWinner(data.data.winner);
                        if (timerRef.current) {
                            clearInterval(timerRef.current);
                        }
                        break;

                    case "OFFER":
                        if (!peerConnection) {
                            console.error("❌ No peer connection available for offer");
                            break;
                        }
                        console.log("📡 Processing OFFER");
                        try {
                            await peerConnection.setRemoteDescription(
                                new RTCSessionDescription(data.data.offer)
                            );
                            const answer = await peerConnection.createAnswer();
                            await peerConnection.setLocalDescription(answer);
                            send_answer(sessionStorage.getItem("opponent") ?? "", answer);
                        } catch (error) {
                            console.error("❌ Error processing offer:", error);
                        }
                        break;

                    case "ANSWER":
                        if (!peerConnection) {
                            console.error("❌ No peer connection available for answer");
                            break;
                        }
                        console.log("📡 Processing ANSWER");
                        try {
                            if (peerConnection.signalingState === "stable") {
                                console.warn("⚠️ Skipping setRemoteDescription: Already in stable state");
                                break;
                            }
                            await peerConnection.setRemoteDescription(
                                new RTCSessionDescription(data.data.answer)
                            );
                        } catch (error) {
                            console.error("❌ Error processing answer:", error);
                        }
                        break;

                    case "ICE_CANDIDATE":
                        if (!peerConnection) {
                            console.error("❌ No peer connection available for ICE candidate");
                            break;
                        }
                        console.log("❄️ Processing ICE_CANDIDATE");
                        if (data.data.candidate) {
                            try {
                                await peerConnection.addIceCandidate(
                                    new RTCIceCandidate(data.data.candidate)
                                );
                            } catch (error) {
                                console.error("❌ Error adding ICE Candidate:", error);
                            }
                        }
                        break;

                    default:
                        console.log("⚠️ Unhandled event type:", data.event);
                }
            } catch (error) {
                console.error("❌ Error processing message:", error);
                console.log("📄 Raw message:", event.data);
            }
        };

        return () => {
            socket.onmessage = null;
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            console.log("🔄 Cleaned up WebSocket message handler");
        };
    }, [socket, peerConnection, chess, increment]);

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
    const toggleLocalAudio = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    return (
        <div className="grid grid-cols-5 h-screen justify-center items-center bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#581c87]">
        <audio ref={localAudioRef} autoPlay playsInline />
        <audio ref={remoteAudioRef} autoPlay playsInline />
        <button 
                onClick={toggleLocalAudio} 
                className="absolute top-4 left-4 bg-blue-500 text-white p-2 rounded"
            >
                {isMuted ? "Unmute" : "Mute"} Mic
        </button>
            {winner && <WinnerPopup winner={winner} onClose={() => {
                setWinner(null)
                navigate("/")
            }} />}
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