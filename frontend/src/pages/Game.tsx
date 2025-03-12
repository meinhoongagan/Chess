import { useNavigate } from "react-router-dom";
import { Square, PieceSymbol, Color } from "chess.js";
import { ChessBoard } from "../components/ChessBoard";
import { useGlobalState } from "../GlobalState/Store";
import WinnerPopup from "../components/WinnerPopup";
import GameAnalysis from "../components/GameAnalysis";
import { useGameState } from "../components/useGameState";
import { useEffect, useState, useCallback } from "react";
import { useWebSocketEvent } from "../utils/WebSocketHandler";

interface GameProps {
    totalTime: number;
    increment: number;
}

export const Game = ({ totalTime, increment }: GameProps) => {
    const navigate = useNavigate();
    const { make_move, socket, suggestion, send_offer, send_answer, send_ice_candidate, reconnect_game, game_id , setGameID } = useGlobalState(state => state);
    const [username, setUsername] = useState<string | null>(null);
    const [opponent, setOpponent] = useState<string | null>(null);
    const [white, setWhite] = useState<string | null>(null);
    const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
    const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
    const [connectionStatus, setConnectionStatus] = useState<'connected'|'disconnected'|'reconnecting'>('connected');

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

    const handleMove = useCallback((data: any) => {
        console.log("♟️ Move event handled in Game component", data);
        const newTurn = data.data.turn;
        sessionStorage.setItem("turn", newTurn);

        setGameState(prevState => ({
            ...prevState,
            activePlayer: newTurn,
            times: data.time,
            moveHistory: [...prevState.moveHistory, {
                san: data.data.move,
                evaluation: data.evaluation
            }],
            currentEvaluation: data.evaluation,
            winningChances: data.winning_chance,
            suggestion: data.suggest,
            showSuggestion: suggestion
        }));

        setMoveEvaluations((prev: number[]) => [...prev, data.evaluation]);
        chess.move(data.data.move);
        setBoard(chess.board());
    }, [chess, setBoard, setGameState, setMoveEvaluations, suggestion]);

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
    }, [chess, setBoard, setGameState, suggestion]);

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
        const username = sessionStorage.getItem("username");
        
        if (username !== currentTurn) {
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
        const squareElement = document.getElementById(moveFrom!);
        const move = chess.move({ from: moveFrom!, to: square, promotion: "q" });

        if (move) {
            setBoard(chess.board());
            if (squareElement) {
                squareElement.style.removeProperty("border");
            }
            make_move(move.san);
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

    useEffect(() => {
        setUsername(sessionStorage.getItem("username"));
        setOpponent(sessionStorage.getItem("opponent"));
        setWhite(sessionStorage.getItem("white"));
        const savedGameId = sessionStorage.getItem("game_id");
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

    useEffect(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            console.log("✅ Connection established/restored");
            setReconnectAttempts(0);
            setConnectionStatus('connected');
        }
    }, [socket]);

    return (
        <div className="grid grid-cols-5 h-screen justify-center items-center bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#581c87]">
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