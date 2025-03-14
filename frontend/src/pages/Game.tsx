import { useNavigate } from "react-router-dom";
import { Square, PieceSymbol, Color } from "chess.js";
import { ChessBoard } from "../components/ChessBoard";
import { useGlobalState } from "../GlobalState/Store";
import WinnerPopup from "../components/WinnerPopup";
import GameAnalysis from "../components/GameAnalysis";
import { useGameState } from "../components/useGameState";
import { useEffect, useState, useCallback, useRef } from "react";
import { useWebSocketEvent } from "../utils/WebSocketHandler";
import { useWebRTC } from "../utils/useWebRTC";

interface GameProps {
    totalTime: number;
    increment: number;
}

export const Game = ({ totalTime, increment }: GameProps) => {
    const navigate = useNavigate();
    const { make_move, socket, suggestion, send_offer, send_answer, send_ice_candidate, reconnect_game, game_id, setGameID } = useGlobalState(state => state);
    const [username, setUsername] = useState<string | null>(null);
    const [opponent, setOpponent] = useState<string | null>(null);
    const [white, setWhite] = useState<string | null>(null);
    const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
    const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
    const [connectionStatus, setConnectionStatus] = useState<'connected'|'disconnected'|'reconnecting'>('connected');
    const [socketReady, setSocketReady] = useState<boolean>(false);
    const [rtcConnectionActive, setRtcConnectionActive] = useState<boolean>(false);
    const MAX_RECONNECT_ATTEMPTS = 5;

    const {
        chess,
        board,
        setBoard,
        moveFrom,
        setMoveFrom,
        winner,
        setWinner,
        moveEvaluations,
        setMoveEvaluations,
        gameState,
        setGameState
    } = useGameState({ totalTime, increment, socket, suggestion, username, opponent });

    // Always initialize WebRTC hook - don't conditionally use hooks
    const { 
        peerConnection, 
        localAudioRef, 
        remoteAudioRef, 
        isMuted, 
        toggleLocalAudio,
        isInitialized: rtcInitialized
    } = useWebRTC({ 
        username, 
        opponent, 
        white, 
        send_offer, 
        send_answer, 
        send_ice_candidate 
    });

    // Track socket readiness
    useEffect(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            console.log("🔄 WebSocket ready - setting socketReady to true");
            setSocketReady(true);
        } else {
            console.log("🔄 WebSocket not ready - setting socketReady to false");
            setSocketReady(false);
        }
    }, [socket]);

    // Monitor WebRTC initialization status
    useEffect(() => {
        console.log("WebRTC initialization status:", { rtcInitialized });
        if (rtcInitialized) {
            setRtcConnectionActive(true);
        }
    }, [rtcInitialized]);

    const handleMove = useCallback((data: any) => {
        try {
            console.log("♟️ Move event handled in Game component", data);
            const newTurn = data.data.turn;
            sessionStorage.setItem("turn", newTurn);
        
            // Update game state with the data properly formatted from backend
            setGameState(prevState => ({
                ...prevState,
                activePlayer: newTurn,
                times: data.time, // Make sure this correctly matches the backend structure
                moveHistory: [...prevState.moveHistory, {
                    san: data.data.move,
                    evaluation: data.evaluation || 0
                }],
                currentEvaluation: data.evaluation || 0,
                winningChances: {
                    white: data.winning_chance?.white || 50,
                    black: data.winning_chance?.black || 50
                },
                suggestion: data.suggest || "",
                showSuggestion: suggestion
            }));
        
            setMoveEvaluations((prev: number[]) => [...prev, data.evaluation || 0]);
            
            try {
                chess.move(data.data.move);
                setBoard(chess.board());
            } catch (e) {
                console.error("Error applying move to chess.js board:", e);
                console.log("Attempting to refresh game state due to move error");
                if (socket && game_id) {
                    socket.send(JSON.stringify({
                        event: "GET_GAME_STATE",
                        data: { game_id }
                    }));
                }
            }
        } catch (error) {
            console.error("Error processing move event:", error);
        }
    }, [chess, setBoard, setGameState, setMoveEvaluations, suggestion, socket, game_id]);

    const handleGameOver = useCallback((data: any) => {
        console.log("🏁 Game over event handled in Game component", data);
        setWinner(data.data.winner);
    }, [setWinner]);

    const handleGameState = useCallback((data: any) => {
        console.log("🔄 Game state event handled in Game component", data);
        
        // Reset chess and replay moves
        chess.reset();
        if (data.data.moves && Array.isArray(data.data.moves)) {
            data.data.moves.forEach((move: string) => {
                try {
                    chess.move(move);
                } catch (e) {
                    console.error("Error replaying move:", move, e);
                }
            });
        }
        
        // Update board state
        setBoard(chess.board());
        
        // Update turn information
        const currentTurn = data.data.turn;
        sessionStorage.setItem("turn", currentTurn);
        setGameID(data.data.game_id);
        
        // Update timers if available
        const timers = data.data.times || {};
        
        // Update game state
        setGameState(prevState => ({
            ...prevState,
            activePlayer: currentTurn,
            times: timers,
            // Preserve other state that might not be in the reconnect data
            moveHistory: prevState.moveHistory,
            currentEvaluation: prevState.currentEvaluation,
            winningChances: prevState.winningChances,
            suggestion: prevState.suggestion,
            showSuggestion: suggestion
        }));
        
        console.log("🔄 Game state restored successfully");
    }, [chess, setBoard, setGameState, suggestion, setGameID]);

    const handleReconnection = useCallback((data: any) => {
        console.log("🔄 Reconnection successful in Game component!", data);
        
        // If we have gameState embedded in the reconnection event
        if (data.data && data.data.gameState) {
            handleGameState(data.data.gameState);
        }
        // Reset reconnect attempts
        setReconnectAttempts(0);
        setIsReconnecting(false);
        setConnectionStatus('connected');
    }, [handleGameState]);

    // Register WebSocket event handlers using the centralized system
    useWebSocketEvent('MOVE', handleMove);
    useWebSocketEvent('GAME_OVER', handleGameOver);
    useWebSocketEvent('TIMEOUT', handleGameOver);
    useWebSocketEvent('GAME_STATE', handleGameState);
    useWebSocketEvent('RECONNECTED', handleReconnection);

    // Register WebRTC-related WebSocket event handlers
    useWebSocketEvent('OFFER', (data: any) => {
        console.log("📞 Received offer:", data);
        if (!data.data || !data.data.offer || !data.data.from) {
            console.error("💥 Malformed offer data:", data);
            return;
        }

        if (peerConnection) {
            console.log("📞 Processing offer from", data.data.from);
            
            // Set remote description from the offer
            peerConnection.setRemoteDescription(new RTCSessionDescription(data.data.offer))
                .then(() => {
                    console.log("✅ Remote description set successfully from offer");
                    // Create answer
                    return peerConnection.createAnswer();
                })
                .then((answer: RTCSessionDescriptionInit) => {
                    console.log("✅ Answer created successfully");
                    // Set local description
                    return peerConnection.setLocalDescription(answer)
                        .then(() => answer);
                })
                .then((answer: RTCSessionDescriptionInit) => {
                    console.log("✅ Local description set successfully");
                    // Send answer to peer
                    if (data.data.from) {
                        console.log("📤 Sending answer to:", data.data.from);
                        send_answer(data.data.from, answer);
                    }
                })
                .catch((err: Error) => {
                    console.error("❌ Error handling offer:", err);
                });
        } else {
            console.warn("⚠️ Received offer but peerConnection is not initialized");
        }
    });

    useWebSocketEvent('ANSWER', (data: any) => {
        console.log("📞 Received answer:", data);
        if (!data.data || !data.data.answer || !data.data.from) {
            console.error("💥 Malformed answer data:", data);
            return;
        }

        if (peerConnection) {
            console.log("📞 Processing answer from", data.data.from);
            
            // Check if we need to handle ICE gathering state
            const currentState = peerConnection.iceGatheringState;
            console.log("Current ICE gathering state:", currentState);
            
            // Set remote description from the answer
            peerConnection.setRemoteDescription(new RTCSessionDescription(data.data.answer))
                .then(() => {
                    console.log("✅ Remote description set successfully from answer");
                    setRtcConnectionActive(true);
                })
                .catch((err: Error) => {
                    console.error("❌ Error handling answer:", err);
                });
        } else {
            console.warn("⚠️ Received answer but peerConnection is not initialized");
        }
    });

    useWebSocketEvent('ICE_CANDIDATE', (data: any) => {
        console.log("❄️ Received ICE candidate:", data);
        if (!data.data || !data.data.candidate || !data.data.from) {
            console.error("💥 Malformed ICE candidate data:", data);
            return;
        }

        if (peerConnection) {
            console.log("❄️ Processing ICE candidate from", data.data.from);
            
            // Add ICE candidate
            peerConnection.addIceCandidate(new RTCIceCandidate(data.data.candidate))
                .then(() => {
                    console.log("✅ ICE candidate added successfully");
                })
                .catch((err: Error) => {
                    console.error("❌ Error adding ICE candidate:", err);
                });
        } else {
            console.warn("⚠️ Received ICE candidate but peerConnection is not initialized");
        }
    });

    // Initialize game data and handle reconnection
    useEffect(() => {
        const storedUsername = sessionStorage.getItem("username");
        const storedOpponent = sessionStorage.getItem("opponent");
        const storedWhite = sessionStorage.getItem("white");
        const savedGameId = sessionStorage.getItem("game_id");
        
        setUsername(storedUsername);
        setOpponent(storedOpponent);
        setWhite(storedWhite);
        
        console.log("Game initialization:", { 
            username: storedUsername, 
            opponent: storedOpponent, 
            white: storedWhite, 
            savedGameId, 
            currentGameId: game_id 
        });
        
        if (savedGameId && !game_id) {
            // If we have a game_id in sessionStorage but not in state, attempt to reconnect
            console.log("💾 Found saved game_id in session, attempting reconnection:", savedGameId);
            reconnect_game({ gameId: savedGameId });
        }
        
        // Set up window beforeunload to save game state
        window.addEventListener('beforeunload', saveGameState);
        
        return () => {
            window.removeEventListener('beforeunload', saveGameState);
        };
    }, [game_id, reconnect_game]);

    const saveGameState = () => {
        if (game_id) {
            sessionStorage.setItem("game_id", game_id);
        }
    };

    // Handle socket disconnection and reconnection
    useEffect(() => {
        if (!socket && game_id && connectionStatus !== 'reconnecting' && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            console.log("🔍 Socket connection lost, attempting to reconnect...", game_id);
            setConnectionStatus('reconnecting');
            
            const reconnectTimer = setTimeout(() => {
                console.log("🔄 Attempting reconnection...", reconnectAttempts + 1, "of", MAX_RECONNECT_ATTEMPTS);
                reconnect_game({ gameId: game_id });
                setReconnectAttempts(prev => prev + 1);
                
                // If we reach max attempts, stop trying
                if (reconnectAttempts + 1 >= MAX_RECONNECT_ATTEMPTS) {
                    console.log("❌ Max reconnection attempts reached");
                    setConnectionStatus('disconnected');
                }
            }, Math.min(2000 * (reconnectAttempts + 1), 10000)); // Exponential backoff with a cap
            
            return () => clearTimeout(reconnectTimer);
        }
    }, [socket, game_id, connectionStatus, reconnectAttempts, reconnect_game]);

    // Reset reconnection state when socket is restored
    useEffect(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            console.log("✅ Connection established/restored");
            setReconnectAttempts(0);
            setConnectionStatus('connected');
        }
    }, [socket]);

    // Handle square click for chess moves
    const handleSquareClick = (square: string, piece: { square: Square; type: PieceSymbol; color: Color } | null) => {
        try {
            if (moveFrom) {
                handleMoveFromSquare(square, piece);
            } else {
                handleInitialSquareSelection(square, piece);
            }
        } catch (e) {
            console.log(e);
            handleMoveError();
        }
    };

    const handleMoveFromSquare = (square: string, piece: { square: Square; type: PieceSymbol; color: Color } | null) => {
        const currentPiece = chess.get(moveFrom as Square);
        if (piece && currentPiece && piece.color === currentPiece.color) {
            updateSelectedSquare(square);
            return;
        }

        makeMove(square);
    };

    const handleInitialSquareSelection = (square: string, piece: { square: Square; type: PieceSymbol; color: Color } | null) => {
        const currentTurn = sessionStorage.getItem("turn");
        const currentUsername = sessionStorage.getItem("username");
        
        if (currentUsername !== currentTurn) {
            alert("It's not your turn");
            return;
        }

        if (!piece?.square) return;
        
        const currPiece = chess.get(piece.square);
        if (!currPiece) return;

        updateSelectedSquare(square);
    };

    const updateSelectedSquare = (square: string) => {
        if (moveFrom) {
            const prevSquareElement = document.getElementById(moveFrom);
            if (prevSquareElement) {
                prevSquareElement.style.removeProperty("border");
            }
        }

        setMoveFrom(square);
        const squareElement = document.getElementById(square);
        if (squareElement) {
            squareElement.style.border = "3px solid blue";
        }
    };

    const makeMove = (square: string) => {
        try {
            const squareElement = document.getElementById(moveFrom!);
            
            // Try the move first without executing it
            const moveObj = chess.move({ 
                from: moveFrom!, 
                to: square, 
                promotion: "q" 
            }, {strict: false});
            
            if (moveObj) {
                // If move is valid, update UI and send to server
                setBoard(chess.board());
                if (squareElement) {
                    squareElement.style.removeProperty("border");
                }
                console.log(`Making valid move: ${moveObj.san}`);
                make_move(moveObj.san);
            } else {
                console.log(`Invalid move attempt: ${moveFrom} to ${square}`);
                // Show feedback to user
                alert("Invalid move");
            }
        } catch (e) {
            console.error("Move error:", e);
            handleMoveError();
        }
        
        setMoveFrom(null);
    };

    const handleMoveError = () => {
        setMoveFrom(null);
        if (moveFrom) {
            const squareElement = document.getElementById(moveFrom);
            if (squareElement) {
                squareElement.style.removeProperty("border");
            }
        }
    };

    return (
        <div className="grid grid-cols-5 h-screen justify-center items-center bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#581c87]">
            {/* Add hidden audio elements for WebRTC */}
            <>
                <audio ref={localAudioRef} autoPlay muted className="hidden" />
                <audio ref={remoteAudioRef} autoPlay className="hidden" />
            </>
            
            {/* Voice chat toggle button */}
            {rtcInitialized && (
                <button 
                    onClick={toggleLocalAudio}
                    className={`absolute top-4 right-4 p-2 rounded-full ${isMuted ? 'bg-red-500' : 'bg-green-500'} text-white z-10`}
                    title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                >
                    {isMuted ? "🔇" : "🎙️"}
                </button>
            )}
            
            {/* Manual WebRTC initialization button */}
            {!rtcInitialized && username && opponent && (
                <button 
                    onClick={() => {
                        console.log("Manual WebRTC initialization triggered by user");
                    }}
                    className="absolute top-16 right-4 p-2 rounded-full bg-blue-500 text-white z-10"
                    title="Force WebRTC Connect"
                >
                    Connect Audio
                </button>
            )}
            
            {connectionStatus === 'reconnecting' && (
                <div className="absolute top-0 left-0 right-0 bg-yellow-500 text-white p-2 text-center">
                    Reconnecting to game... Attempt {reconnectAttempts + 1}/{MAX_RECONNECT_ATTEMPTS}
                </div>
            )}
            
            {connectionStatus === 'disconnected' && (
                <div className="absolute top-0 left-0 right-0 bg-red-500 text-white p-2 text-center">
                    Connection lost. Please refresh the page to try again.
                </div>
            )}

            {winner && 
                <WinnerPopup 
                    winner={winner} 
                    onClose={() => {
                        setWinner(null);
                        navigate("/");
                    }} 
                />
            }

            <div className="grid col-span-3 justify-center items-center">
                <ChessBoard 
                    board={board} 
                    onSquareClick={handleSquareClick} 
                    times={gameState.times}
                    activePlayer={gameState.activePlayer ?? white ?? ""}
                    totalTime={totalTime}
                    showTimers={true}
                    reverse={sessionStorage.getItem("username") !== sessionStorage.getItem("white")}
                />
            </div>

            <div className="col-span-2 h-full">
                <GameAnalysis
                    evaluation={gameState.currentEvaluation}
                    winningChances={gameState.winningChances}
                    moveHistory={chess.history().map((move: string, index: number) => ({
                        san: move,
                        evaluation: moveEvaluations[index] || 0
                    }))}
                    suggestions={gameState.suggestion}
                    showSuggestion={gameState.showSuggestion}
                />
            </div>
        </div>
    );
};

export default Game;