import { useNavigate } from "react-router-dom";
import { Square, PieceSymbol, Color } from "chess.js";
import { ChessBoard } from "../components/ChessBoard";
import { useGlobalState } from "../GlobalState/Store";
import WinnerPopup from "../components/WinnerPopup";
import GameAnalysis from "../components/GameAnalysis";
import { useWebRTC } from "../components/useWebRTC";
import { useGameState } from "../components/useGameState";
import { useEffect, useState } from "react";

interface GameProps {
    totalTime: number;
    increment: number;
}

export const Game = ({ totalTime, increment }: GameProps) => {
    const navigate = useNavigate();
    const { make_move, socket, suggestion, send_offer, send_answer, send_ice_candidate } = useGlobalState(state => state);
    const [username, setUsername] = useState<string | null>(null);
    const [opponent, setOpponent] = useState<string | null>(null);
    const [white, setWhite] = useState<string | null>(null);

    useEffect(() => {
        setUsername(sessionStorage.getItem("username"));
        setOpponent(sessionStorage.getItem("opponent"));
        setWhite(sessionStorage.getItem("white"));
    }, []);

    const {
        chess,
        board,
        setBoard,
        moveFrom,
        setMoveFrom,
        winner,
        setWinner,
        activePlayer,
        times,
        moveEvaluations,
        setMoveEvaluations,
        gameState,
        setGameState
    } = useGameState({ totalTime, increment, socket, suggestion, username, opponent });

    const {
        localAudioRef,
        remoteAudioRef,
        isMuted,
        toggleLocalAudio,
        peerConnection
    } = useWebRTC({ username, opponent, white, send_offer, send_answer, send_ice_candidate });

    // WebSocket message handler
    useEffect(() => {
        if (!socket) return;

        socket.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);

                switch (data.event) {
                    case "MOVE":
                        console.log(data);
                        handleMove(data);
                        break;
                    case "GAME_OVER":
                        handleGameOver(data);
                        break;
                    case "OFFER":
                        handleOffer(data);
                        break;
                    case "ANSWER":
                        handleAnswer(data);
                        break;
                    case "ICE_CANDIDATE":
                        handleIceCandidate(data);
                        break;
                }
            } catch (error) {
                console.error("Error processing message:", error);
            }
        };
    }, [socket, peerConnection, chess]);

    const handleMove = (data: any) => {
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
    };

    const handleGameOver = (data: any) => {
        setWinner(data.data.winner);
    };

    const handleOffer = async (data: any) => {
        if (!peerConnection) return;
        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            send_answer(opponent ?? "", answer);
        } catch (error) {
            console.error("Error processing offer:", error);
        }
    };

    const handleAnswer = async (data: any) => {
        if (!peerConnection || peerConnection.signalingState === "stable") return;
        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.data.answer));
        } catch (error) {
            console.error("Error processing answer:", error);
        }
    };

    const handleIceCandidate = async (data: any) => {
        if (!peerConnection || !data.data.candidate) return;
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.data.candidate));
        } catch (error) {
            console.error("Error adding ICE Candidate:", error);
        }
    };

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

    return (
        <div className="grid grid-cols-5 h-screen justify-center items-center bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#581c87]">
            <audio ref={localAudioRef} autoPlay playsInline />
            <audio ref={remoteAudioRef} autoPlay playsInline />
            
            <button 
                onClick={toggleLocalAudio} 
                className="absolute top-4 left-4 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded transition-colors"
            >
                {isMuted ? "Unmute" : "Mute"} Mic
            </button>

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