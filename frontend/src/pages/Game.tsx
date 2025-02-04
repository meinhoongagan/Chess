import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';

const INITIAL_BOARD = [
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
  [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

const PIECE_IMAGES: { [key: string]: string } = {
  'P': '/white-pawn.png', 'R': '/white-rook.png', 
  'N': '/white-knight.png', 'B': '/white-bishop.png', 
  'Q': '/white-queen.png', 'K': '/white-king.png',
  'p': '/black-pawn.png', 'r': '/black-rook.png', 
  'n': '/black-knight.png', 'b': '/black-bishop.png', 
  'q': '/black-queen.png', 'k': '/black-king.png'
};

const GamePage: React.FC = () => {
  const [board, setBoard] = useState(INITIAL_BOARD);
  const [selectedPiece, setSelectedPiece] = useState<{row: number, col: number} | null>(null);
  const { gameState, makeMove } = useGame();

  const handlePieceClick = (row: number, col: number) => {
    const piece = board[row][col];
    
    if (selectedPiece) {
      // Logic for moving piece
      const move = `${String.fromCharCode(97 + selectedPiece.col)}${8 - selectedPiece.row}${String.fromCharCode(97 + col)}${8 - row}`;
      makeMove(move);
      
      setSelectedPiece(null);
    } else if (piece !== ' ') {
      setSelectedPiece({ row, col });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] to-[#6A0572] flex items-center justify-center p-4">
      <div className="bg-[#16213E] rounded-xl shadow-2xl p-8 grid grid-cols-[1fr_300px]">
        <div className="grid grid-cols-8 gap-0 w-[600px] h-[600px] border-4 border-[#6A0572]">
          {board.map((row, rowIndex) => 
            row.map((piece, colIndex) => (
              <div 
                key={`${rowIndex}-${colIndex}`}
                className={`
                  w-[75px] h-[75px] flex items-center justify-center 
                  ${(rowIndex + colIndex) % 2 === 0 ? 'bg-[#0F3460]' : 'bg-[#E94560]'}
                  ${selectedPiece?.row === rowIndex && selectedPiece?.col === colIndex ? 'ring-4 ring-green-500' : ''}
                `}
                onClick={() => handlePieceClick(rowIndex, colIndex)}
              >
                {piece !== ' ' && (
                  <img 
                    src={PIECE_IMAGES[piece]} 
                    alt={piece} 
                    className="w-[60px] h-[60px] cursor-pointer"
                  />
                )}
              </div>
            ))
          )}
        </div>
        
        <div className="ml-8 text-white">
          <h2 className="text-2xl font-bold mb-4">Game Info</h2>
          <p>Opponent: {gameState.opponent || 'Waiting...'}</p>
          <p>Current Turn: {gameState.turn}</p>
          <p>Game Status: {gameState.status || 'In Progress'}</p>
        </div>
      </div>
    </div>
  );
};

export default GamePage;