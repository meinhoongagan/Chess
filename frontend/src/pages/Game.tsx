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

export const Game = ({ totalTime }: GameProps) => {
    const [chess] = useState(new Chess());
    const [board, setBoard] = useState(chess.board());
    const [moveFrom, setMoveFrom] = useState<string | null>(null);
    const { make_move, socket , time } = useGlobalState((state) => state);
    const [winner, setWinner] = useState<string | null>(null);
    const [activePlayer, setActivePlayer] = useState<string>();
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const initialTimes: TimeState = {};

    // const username = sessionStorage.getItem("username");
    // const opponent = sessionStorage.getItem("opponent");
    // if (username) initialTimes[username] = time?? 0;
    // if (opponent) initialTimes[opponent] = time?? 0;
    
    const [times, setTimes] = useState<TimeState>(initialTimes);

    // Initialize times and active player when component mounts
    useEffect(() => {
        const username = sessionStorage.getItem("username");
        const opponent = sessionStorage.getItem("opponent");
        const initialTurn = sessionStorage.getItem("turn");
        
        if (username && opponent) {
            if (totalTime!=0){
                setTimes({
                    [username]: totalTime ,
                    [opponent]: totalTime
                });
            }
            else {
                setTimes({
                    [username]: time?? 0 ,
                    [opponent]: time?? 0
                });
            }
            setActivePlayer(initialTurn?? sessionStorage.getItem("white") ?? username);
        }
    }, [totalTime]);

    // Timer effect
    useEffect(() => {
        console.log(time);
        
        console.log(activePlayer, times);
        
        if (!activePlayer || !times[activePlayer]) return;

        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        timerRef.current = setInterval(() => {
            setTimes(prevTimes => ({
                ...prevTimes,
                [activePlayer]: Math.max(0, prevTimes[activePlayer] - 1)
            }));
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [activePlayer, times]);

    useEffect(() => {
        if (!socket) return;
        socket.onmessage = (event) => {
            try {
                console.log("📩 Received message From Game Component", event.data);
                const data = JSON.parse(event.data);
                
                if (data.event === "MOVE") {
                    // Update turn                    
                    const newTurn = data.data.turn;
                    console.log(newTurn);
                    
                    sessionStorage.setItem("turn", newTurn);
                    setActivePlayer(newTurn);
                    // console.log(activePlayer);

                    // Update times if they exist in the message
                    if (data.time) {
                        setTimes(prevTimes => ({
                            ...prevTimes,
                            ...data.time
                        }));
                    }

                    // Make the move
                    chess.move(data.data.move);
                    setBoard(chess.board());
                }
                
                if (data.event === "GAME_OVER") {
                    console.log("Game over", data.data.winner);
                    setWinner(data.data.winner);
                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                    }
                }
            } catch (e) {
                console.log(e);
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [socket, chess]);

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