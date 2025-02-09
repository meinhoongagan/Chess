import { Chess, Color, PieceSymbol, Square } from "chess.js";
import { useEffect, useState } from "react";
import { ChessBoard } from "../components/ChessBoard";
import { useGlobalState } from "../GlobalState/Store";

export const Game = () => {
    const [chess] = useState(new Chess());
    const [board, setBoard] = useState(chess.board());
    const [moveFrom, setMoveFrom] = useState<string | null>(null);
    const { make_move , socket } = useGlobalState((state) => state);

    useEffect(() => {
        if(!socket) return;
        socket.onmessage = (event) => {
            console.log("📩 Received message From Game Component", event.data);
            const data = JSON.parse(event.data);
            if(data.event === "MOVE"){
                chess.move(data.data.move);
                setBoard(chess.board());
            }
    }
}, [socket]);

    // Handle square click (either select piece or move it)
    const handleSquareClick = (square: string, piece: { square: Square; type: PieceSymbol; color: Color } | null) => {
        try{
            if (moveFrom) {
                // Try to make the move
                const move = chess.move({ from: moveFrom, to: square, promotion: "q" });
    
                if (move) {

                    setBoard(chess.board()); // Update board state
                    setMoveFrom(null);
                    const squareElement = document.getElementById(moveFrom);
                    if (squareElement) {
                        squareElement.style.removeProperty("border");
                    }

                    make_move(move.san);
                    console.log(move.san);
                }

                
                setMoveFrom(null); // Reset move state

            } else {

                console.log("Selected piece:", piece);
                
                if (!piece?.square) {
                    return;
                }
                let currPeice = chess.get(piece.square);
                console.log(currPeice);
                
                if(!currPeice){
                    return;
                }

                setMoveFrom(square); // Select the piece

                //highlight the square
                const squareElement = document.getElementById(square);
                
                if (squareElement) {            
                    squareElement.style.removeProperty("border");

                    // Apply new border highlight
                    squareElement.style.border = "3px solid blue";  
                }


            }
        }
        catch(e){
            console.log(e);
            setMoveFrom(null);
            if(moveFrom){
                const squareElement = document.getElementById(moveFrom);
                    if (squareElement) {
                        squareElement.style.removeProperty("border");
                    }
            }
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