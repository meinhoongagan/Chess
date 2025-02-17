import { Square, PieceSymbol, Color } from "chess.js";
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
import { useGlobalState } from "../GlobalState/Store";

interface ChessBoardProps {
    board: ({ square: Square; type: PieceSymbol; color: Color } | null)[][];
    onSquareClick?: (square: string, piece: { square: Square; type: PieceSymbol; color: Color } | null) => void;
    times?: { [key: string]: number };
    activePlayer: string;
    totalTime?: number;
    showTimers?: boolean;
    reverse?: boolean;
}

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

export const ChessBoard = ({ 
    board, 
    onSquareClick, 
    times = {}, 
    activePlayer, 
    showTimers = false,
    reverse = false
}: ChessBoardProps) => {
   
    const { time } = useGlobalState((state) => state);
  
    const formatTime = (timeInSeconds: number | undefined) => {
        if (timeInSeconds === undefined || isNaN(timeInSeconds)) return `${time ?? 0/60}:00`;
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };
  
    const username = sessionStorage.getItem("username");
    const opponent = sessionStorage.getItem("opponent");
    const playerColor = sessionStorage.getItem("playerColor") as Color | null;
  
    const shouldReverseBoard = reverse || playerColor === "b";
    const displayBoard = shouldReverseBoard ? board.slice().reverse() : board;
  
    const TimerDisplay = ({ 
        player, 
        username, 
        playerColor, 
        isActive 
    }: { 
        player: string | null; 
        username: string; 
        playerColor: String | null; 
        isActive?: boolean; 
    }) => {
        if (!player || !showTimers) return null;
    
        const timeValue = times[player] || time;
        const timerBgColor = playerColor === "w" ? "bg-white text-black" : "bg-black text-white";
    
        return (
            <div className={`flex items-center justify-center gap-4 w-full px-6 py-3 rounded-xl ${timerBgColor} shadow-lg border ${
                isActive ? "border-yellow-400" : "border-gray-500"
            }`}>
                <span className="text-lg font-semibold">
                    {playerColor === "w" ? '♜' : '♖'} {username} Time:
                </span>
                <span className={`text-xl font-bold ${timeValue ?? 0 < 60 ? "text-red-400" : "text-green-400"}`}>
                    {formatTime(timeValue ?? 0)}
                </span>
            </div>
        );
    };
    
    // Fixed timer configurations to maintain correct positions
    const topTimer = {
        player: opponent,
        playerColor: shouldReverseBoard ? "b" : "w",
        username: opponent as string,
        isActive: activePlayer === opponent
    };

    const bottomTimer = {
        player: username,
        playerColor: shouldReverseBoard ? "w" : "b",
        username: "Your",
        isActive: activePlayer === username
    };

    return (
        <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-[#1e3a8a] to-[#581c87] text-white p-6 rounded-3xl shadow-2xl">
            <TimerDisplay {...topTimer} />

            <div className="grid grid-cols-8 border-4 border-gray-700 w-fit">
                {displayBoard.map((row, i) =>
                    (shouldReverseBoard ? row.slice().reverse() : row).map((square, j) => {
                        const file = shouldReverseBoard 
                            ? String.fromCharCode(97 + (7 - j))
                            : String.fromCharCode(97 + j);
                        const rank = shouldReverseBoard ? i + 1 : 8 - i;
                        const squareName = `${file}${rank}`;
                        const isDark = (i + j) % 2 === 1;
                        const pieceKey = square ? `${square.color[0]}_${square.type}` : null;

                        return (
                            <div
                                id={squareName}
                                key={`${i}-${j}`}
                                className={`flex items-center justify-center w-16 h-16 ${isDark ? "bg-green-800" : "bg-green-300"}`}
                                onClick={() => onSquareClick?.(squareName, square)}
                            >
                                {pieceKey && pieceImages[pieceKey] && (
                                    <img
                                        src={pieceImages[pieceKey]}
                                        alt={`${square?.color} ${square?.type}`}
                                        className="w-12 h-12"
                                    />
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            <TimerDisplay {...bottomTimer} />
        </div>
    );
};