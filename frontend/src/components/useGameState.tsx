import { useState, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';

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

export const useGameState = ({ totalTime, increment, socket, suggestion, username, opponent }: UseGameStateProps) => {
    const [chess] = useState(new Chess());
    const [board, setBoard] = useState(chess.board());
    const [moveFrom, setMoveFrom] = useState<string | null>(null);
    const [winner, setWinner] = useState<string | null>(null);
    const [moveEvaluations, setMoveEvaluations] = useState<number[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    
    // Initialize game state with initial times
    const [gameState, setGameState] = useState<GameState>(() => {
        const white = sessionStorage.getItem("white");
        return {
            moveHistory: [],
            currentEvaluation: 0,
            winningChances: { white: 50, black: 50 },
            suggestion: "e2e4",
            showSuggestion: false,
            times: username && opponent ? {
                [username]: totalTime,
                [opponent]: totalTime
            } : {},
            activePlayer: white || undefined
        };
    });

    // Initialize game state and times
    useEffect(() => {
        const white = sessionStorage.getItem("white");
        if (!white || !username || !opponent) return;

        setGameState(prev => ({
            ...prev,
            activePlayer: white,
            times: {
                [username]: totalTime,
                [opponent]: totalTime
            }
        }));
    }, [username, opponent, totalTime]);

    // Timer effect - separate from initialization
    useEffect(() => {
        const activePlayer = gameState.activePlayer;
        if (!activePlayer || !gameState.times[activePlayer] || winner) {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            return;
        }

        console.log("Starting timer for:", activePlayer); // Debug log

        timerRef.current = setInterval(() => {
            setGameState(prev => ({
                ...prev,
                times: {
                    ...prev.times,
                    [activePlayer]: Math.max(0, prev.times[activePlayer] - 1)
                }
            }));
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [gameState.activePlayer, gameState.times, winner]);

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