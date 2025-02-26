import { useState, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { useGlobalState } from '../GlobalState/Store';

export interface GameState {
    moveHistory: { san: string; evaluation: number }[];
    currentEvaluation: number;
    winningChances: { white: number; black: number };
    suggestion: string;
    showSuggestion: boolean;
    activePlayer: string | null | undefined;
    times: Record<string, number>;
}

interface UseGameStateProps {
    totalTime: number;
    increment: number;
    socket: WebSocket | null;
    suggestion: boolean;
    username: string | null;
    opponent: string | null;
}

export const useGameState = ({ totalTime, username, opponent }: UseGameStateProps) => {
    const [chess] = useState(new Chess());
    const [board, setBoard] = useState(chess.board());
    const [moveFrom, setMoveFrom] = useState<string | null>(null);
    const [winner, setWinner] = useState<string | null>(null);
    const [moveEvaluations, setMoveEvaluations] = useState<number[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const white = sessionStorage.getItem("white");
    const { time } =  useGlobalState();
    
    // Initialize game state with initial times and active player
    const [gameState, setGameState] = useState<GameState>(() => ({
        moveHistory: [],
        currentEvaluation: 0,
        winningChances: { white: 50, black: 50 },
        suggestion: "e2e4",
        showSuggestion: false,
        times: {
          [sessionStorage.getItem("username") ?? ""]: time ?? totalTime,
          [sessionStorage.getItem("opponent") ?? ""]: time ?? totalTime
        },
        activePlayer: white || undefined
      }));

    // Initialize timer and game state on mount
    useEffect(() => {
        setGameState(prev => {
            const newState = {
                ...prev,
                activePlayer: white,
                times: {
                    [sessionStorage.getItem("username")??""]: time ?? totalTime,
                    [sessionStorage.getItem("opponent")??""]: time ?? totalTime
                }
            };
            console.log("After initial state setup:", newState);
            return newState;
        });
    }, [username, opponent, totalTime, white]);
    
    // Timer effect
    useEffect(() => {
        // Clear any existing timer
        if (timerRef.current) {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        
        // Only start timer if there's no winner
        if (!winner) {
            const currentPlayer = gameState.activePlayer || white || "";
            let timeValue = gameState.times[currentPlayer];

            console.log("Starting timer for", currentPlayer, timeValue);
            
            // Keep your existing initialization logic
            if(gameState.times[sessionStorage.getItem("username")??""] == 0 && gameState.times[sessionStorage.getItem("opponent")??""] == 0) {
                timeValue = time ?? totalTime;
            }

            console.log("timeValue",timeValue);
            
            
            // Start timer for current player if they have time left
            if (timeValue > 0) {
                console.log(`Starting timer for ${currentPlayer}`);
                
                timerRef.current = setInterval(() => {
                    setGameState(prev => {
                        let updatedTime = Math.max(0, prev.times[currentPlayer] - 1);
                        if(prev.times[sessionStorage.getItem("username")??""] == 0 && prev.times[sessionStorage.getItem("opponent")??""] == 0) {
                            updatedTime = time ?? totalTime;
                            gameState.times[sessionStorage.getItem("opponent")??""] = time ?? totalTime;
                        }
                        console.log(prev.times[currentPlayer], updatedTime);
                        console.log(`Updated time for ${currentPlayer}:`, updatedTime);

                        return {
                            ...prev,
                            times: {
                                ...prev.times,
                                [currentPlayer]: updatedTime
                            }
                        };
                    });
                }, 1000);
            }
        }
        
        // Cleanup on unmount or deps change
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [white, winner, gameState.times, time, totalTime, gameState.activePlayer]);

    return {
        chess,
        board,
        setBoard,
        moveFrom,
        setMoveFrom,
        winner,
        setWinner,
        activePlayer: gameState.activePlayer,
        times: gameState.times,
        moveEvaluations,
        setMoveEvaluations,
        gameState,
        setGameState
    };
};