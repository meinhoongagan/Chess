import { Square, PieceSymbol, Color } from "chess.js";

interface ChessBoardProps {
  board: ({ square: Square; type: PieceSymbol; color: Color } | null)[][];
  onSquareClick?: (square: string) => void;
}

export const ChessBoard = ({ board , onSquareClick }: ChessBoardProps) => {
  return (
    <div className="grid grid-cols-8 border-4 border-gray-700 w-fit">
      {board.map((row, i) =>
        row.map((square, j) => {
          const squareName = `${String.fromCharCode(97 + j)}${8 - i}`; // Convert to chess notation
          const isDark = (i + j) % 2 === 1;
          return (
            <div
              key={`${i}-${j}`}
              className={`flex items-center justify-center w-16 h-16 ${
                isDark ? "bg-green-800" : "bg-green-300"
              }`}
              onClick={() => {
                if(onSquareClick)
                    onSquareClick(squareName);
              }
            }
            >
              {square ? (
                <span className="text-2xl font-bold">
                  {square.type.toUpperCase()}
                </span>
              ) : (
                ""
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
