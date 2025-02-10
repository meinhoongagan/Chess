import { Square, PieceSymbol, Color } from "chess.js";

// Import chess piece images
import b_bishop from "../assets/b_bishop.svg";
import w_bishop from "../assets/w_bishop.svg";
import b_king from "../assets/b_king.svg";
import w_king from "../assets/w_king.svg";
import b_knight from "../assets/b_knight.svg";
import w_knight from "../assets/w_knight.svg";
import b_pawn from "../assets/b_pawn.svg";
import w_pawn from "../assets/w_pawn.svg";
import b_queen from "../assets/b_queen.svg";
import w_queen from "../assets/w_queen.svg";
import b_rook from "../assets/b_rook.svg";
import w_rook from "../assets/w_rook.svg";

interface ChessBoardProps {
  board: ({ square: Square; type: PieceSymbol; color: Color } | null)[][];
  onSquareClick?: (square: string, piece: { square: Square; type: PieceSymbol; color: Color } | null) => void;
}

// Object to map piece types and colors to the correct images
const pieceImages: Record<string, string> = {
  "b_b": b_bishop,
  "w_b": w_bishop,
  "b_k": b_king,
  "w_k": w_king,
  "b_n": b_knight,
  "w_n": w_knight,
  "b_p": b_pawn,
  "w_p": w_pawn,
  "b_q": b_queen,
  "w_q": w_queen,
  "b_r": b_rook,
  "w_r": w_rook
};

export const ChessBoard = ({ board, onSquareClick }: ChessBoardProps) => {
  return (
    <div className="grid grid-cols-8 border-4 border-gray-700 w-fit">
      {board.map((row, i) =>
        row.map((square, j) => {
          const squareName = `${String.fromCharCode(97 + j)}${8 - i}`; // Convert to chess notation
          const isDark = (i + j) % 2 === 1;
          const pieceKey = square ? `${square.color[0]}_${square.type}` : null; // Example: "b_pawn"

          return (
            <div
              id={squareName}
              key={`${i}-${j}`}
              className={`flex items-center justify-center w-16 h-16 ${
                isDark ? "bg-green-800" : "bg-green-300"
              }`}
              onClick={() => {
                if (onSquareClick) onSquareClick(squareName, square);
              }}
            >
              {pieceKey && pieceImages[pieceKey] ? (
                <img
                  src={pieceImages[pieceKey]}
                  alt={`${square?.color} ${square?.type}`}
                  className="w-12 h-12"
                />
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
};
