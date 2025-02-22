import { ChevronUp, ChevronDown } from 'lucide-react';

interface ChessMove {
    san: string;
    evaluation: number;
}

const GameAnalysis = ({ 
    evaluation = 0,
    winningChances = { white: 50, black: 50 },
    moveHistory = [] as ChessMove[],
    suggestions = "",
    showSuggestion = false
}) => {
    // Calculate evaluation bar height
    const getEvalBarHeight = () => {
        const clampedEval = Math.max(-5, Math.min(5, evaluation));
        const percentage = (50 + (clampedEval * 10));
        console.log(showSuggestion);
        
        return `${percentage}%`;
    };

    // Group moves into pairs (white and black)
    const groupedMoves = moveHistory.reduce((acc, move, index) => {
        const moveNumber = Math.floor(index / 2);
        if (!acc[moveNumber]) {
            acc[moveNumber] = { white: null, black: null };
        }
        if (index % 2 === 0) {
            acc[moveNumber].white = move;
        } else {
            acc[moveNumber].black = move;
        }
        return acc;
    }, [] as { white: ChessMove | null; black: ChessMove | null }[]);

    const MoveCell = ({ move }: { move: ChessMove | null }) => {
        if (!move) return <div className="h-8" />;
        return (
            <div className="flex items-center justify-between p-2 hover:bg-[#1e3a8a] rounded">
                <span className="flex-1">{move.san}</span>
                <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-400">
                        {move.evaluation > 0 ? '+' : ''}{move.evaluation.toFixed(2)}
                    </span>
                    {move.evaluation > 0 ? (
                        <ChevronUp className="w-4 h-4 text-green-500" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-red-500" />
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full w-full bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#581c87] text-white p-4 rounded-lg">
            {/* Evaluation Bar */}
            <div className="flex items-center gap-4 mb-6">
                <div className="relative h-64 w-16 bg-gray-700 rounded-lg overflow-hidden">
                    <div 
                        className="absolute bottom-0 w-full bg-white transition-all duration-300 ease-in-out"
                        style={{ 
                            height: getEvalBarHeight(),
                            backgroundColor: evaluation >= 0 ? 'white' : 'black'
                        }}
                    />
                    <div className="absolute inset-0 flex flex-col justify-between items-center py-2 text-sm font-semibold">
                        <span>{winningChances.white}%</span>
                        <span>{winningChances.black}%</span>
                    </div>
                </div>
                
                <div className="text-2xl font-mono">
                    {evaluation > 0 ? '+' : ''}{evaluation.toFixed(2)}
                </div>
            </div>

            {/* Suggestions */}
            {showSuggestion && (
                <div className="space-y-4 p-4 bg-[#1e293b] rounded-lg border border-gray-500 shadow-lg animate-fade-in">
                    <h3 className="text-lg font-semibold mb-2 text-purple-400">💡 Suggestions</h3>
                    <p className="text-white text-sm leading-relaxed">{suggestions}</p>
                </div>
            )}

            {/* Move History */}
            <div className="space-y-2">
                <h3 className="text-lg font-semibold mb-4">Move History</h3>
                <div className="grid grid-cols-2 gap-x-4">
                    {/* Headers */}
                    <div className="text-gray-400 mb-2 px-2">White</div>
                    <div className="text-gray-400 mb-2 px-2">Black</div>
                    
                    {/* Moves */}
                    <div className="space-y-1">
                        {groupedMoves.map((pair, index) => (
                            <div key={`white-${index}`} className="flex items-center">
                                <span className="text-gray-400 w-8">{index + 1}.</span>
                                <div className="flex-1">
                                    <MoveCell move={pair.white} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="space-y-1">
                        {groupedMoves.map((pair, index) => (
                            <div key={`black-${index}`}>
                                <MoveCell move={pair.black} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameAnalysis;