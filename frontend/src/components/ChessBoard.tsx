import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

export type ChessPiece = {
  type: 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
  color: 'white' | 'black';
  position: string;
  hasMoved?: boolean;
};

export type ChessMove = {
  from: string;
  to: string;
  piece: ChessPiece;
  captured?: ChessPiece;
  promotion?: 'queen' | 'rook' | 'bishop' | 'knight';
  isCheck?: boolean;
  isCheckmate?: boolean;
  isStalemate?: boolean;
};

interface ChessBoardProps {
  position: ChessPiece[];
  onMove: (move: ChessMove) => void;
  validMoves: string[];
  selectedSquare: string | null;
  onSquareClick: (square: string) => void;
  isThinking?: boolean;
  lastMove?: ChessMove;
  gameInProgress?: boolean;
}

const PIECE_SYMBOLS = {
  white: {
    king: '♚',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♙'
  },
  black: {
    king: '♚',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♟'
  }
};

const ChessBoard = ({
  position,
  onMove,
  validMoves,
  selectedSquare,
  onSquareClick,
  isThinking,
  lastMove,
  gameInProgress = true
}: ChessBoardProps) => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const getPieceAt = (square: string) => {
    return position.find(piece => piece.position === square);
  };

  const isLightSquare = (file: string, rank: string) => {
    return (files.indexOf(file) + parseInt(rank)) % 2 === 1;
  };

  const isHighlighted = (square: string) => {
    return lastMove?.from === square || lastMove?.to === square;
  };

  const isValidMove = (square: string) => {
    return validMoves.includes(square);
  };

  const handleSquareClick = (square: string) => {
    if (isThinking || !gameInProgress) return;
    onSquareClick(square);
  };

  return (
    <div className="relative">
      <div className={cn(
        "grid grid-cols-8 gap-0 border-4 border-primary rounded-lg overflow-hidden shadow-2xl",
        "bg-gradient-to-br from-card to-muted transition-all duration-500",
        !gameInProgress && "blur-sm opacity-60 pointer-events-none"
      )}>
        {ranks.map(rank =>
          files.map(file => {
            const square = file + rank;
            const piece = getPieceAt(square);
            const isLight = isLightSquare(file, rank);
            const isSelected = selectedSquare === square;
            const highlighted = isHighlighted(square);
            const validMove = isValidMove(square);

            return (
              <div
                key={square}
                className={cn(
                  "aspect-square flex items-center justify-center text-4xl lg:text-5xl cursor-pointer transition-all duration-200 relative",
                  "hover:brightness-110",
                  isLight ? "bg-chess-light" : "bg-chess-dark",
                  isSelected && "ring-4 ring-chess-highlight ring-inset",
                  highlighted && "bg-chess-highlight/30",
                  validMove && "ring-2 ring-chess-valid-move ring-inset",
                  piece && validMove && "ring-chess-capture"
                )}
                onClick={() => handleSquareClick(square)}
              >
                {piece && (
                  <span
                    className={cn(
                      "select-none transition-transform duration-150",
                      isSelected && "scale-110",
                      piece.color === 'white' ? "text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" : "text-gray-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.3)]"
                    )}
                  >
                    {PIECE_SYMBOLS[piece.color][piece.type]}
                  </span>
                )}
                {validMove && !piece && (
                  <div className="w-6 h-6 bg-chess-valid-move rounded-full opacity-60" />
                )}
                {validMove && piece && (
                  <div className="absolute inset-0 border-4 border-chess-capture rounded-sm opacity-60" />
                )}
              </div>
            );
          })
        )}
      </div>
      
      {/* Coordinate labels */}
      <div className="absolute -bottom-6 left-0 right-0 flex justify-around text-sm text-muted-foreground">
        {files.map(file => (
          <span key={file} className="w-8 text-center">{file}</span>
        ))}
      </div>
      <div className="absolute -left-6 top-0 bottom-0 flex flex-col justify-around text-sm text-muted-foreground">
        {ranks.map(rank => (
          <span key={rank} className="h-8 flex items-center">{rank}</span>
        ))}
      </div>
      
      
      {!gameInProgress && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
          <div className="bg-card/90 backdrop-blur-sm px-6 py-3 rounded-lg border border-primary text-center">
            <span className="text-primary font-medium text-lg block">Click "Start Game" to begin</span>
            <span className="text-muted-foreground text-sm">Configure your players and start playing!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChessBoard;