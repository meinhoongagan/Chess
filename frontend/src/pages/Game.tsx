import { Chess } from "chess.js";
import { useState } from "react";
import { ChessBoard } from "../components/ChessBoard";

export const Game = () => {
    const [chess] = useState(new Chess());
    const [board, setBoard] = useState(chess.board());
    const [moveFrom, setMoveFrom] = useState<string | null>(null);

    // Handle square click (either select piece or move it)
    const handleSquareClick = (square: string) => {
        try{
            if (moveFrom) {
                // Try to make the move
                const move = chess.move({ from: moveFrom, to: square, promotion: "q" });
    
                if (move) {
                    setBoard(chess.board()); // Update board state
                }
                setMoveFrom(null); // Reset move state
            } else {
                setMoveFrom(square); // Select the piece
            }
        }
        catch(e){
            console.log(e);
            setMoveFrom(null);
        }
    };

    return (
        <div className="grid grid-cols-5 h-screen justify-center items-center bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#581c87]">
            <div className="grid col-span-3 justify-center items-center">
                <ChessBoard board={board} onSquareClick={handleSquareClick} />
            </div>
        </div>
    );
};
