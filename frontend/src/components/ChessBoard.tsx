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

const ChessPieceSVG = ({ type, color, size = 40 }: { type: string; color: string; size?: number }) => {
  const fillColor = color === 'white' ? '#ffffff' : '#374151';
  const strokeColor = '#000000';
  
  const baseProps = {
    width: size,
    height: size,
    viewBox: "0 0 45 45",
    fill: fillColor,
    stroke: strokeColor,
    strokeWidth: "2",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };

  switch (type) {
    case 'king':
      return (
        <svg {...baseProps}>
          <g>
            <path d="M22.5 11.63V6M20 8h5M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" strokeLinejoin="miter"/>
            <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z"/>
            <path d="M11.5 30c5.5-3 15.5-3 21 0M11.5 33.5c5.5-3 15.5-3 21 0M11.5 37c5.5-3 15.5-3 21 0"/>
          </g>
        </svg>
      );
    
    case 'queen':
      return (
        <svg {...baseProps}>
          <g>
            <path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM24.5 7.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0z"/>
            <path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-13.5V25L7 14l2 12z" strokeLinecap="butt"/>
            <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" strokeLinecap="butt"/>
            <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0"/>
          </g>
        </svg>
      );
    
    case 'rook':
      return (
        <svg {...baseProps}>
          <g>
            <path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" strokeLinecap="butt"/>
            <path d="M34 14l-3 3H14l-3-3"/>
            <path d="M31 17v12.5H14V17" strokeLinecap="butt" strokeLinejoin="miter"/>
            <path d="M31 29.5l1.5 2.5h-20l1.5-2.5"/>
            <path d="M11 14h23"/>
          </g>
        </svg>
      );
    
    case 'bishop':
      return (
        <svg {...baseProps}>
          <g>
            <g fillRule="evenodd" strokeLinecap="butt">
              <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/>
              <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/>
              <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/>
            </g>
            <path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" strokeLinejoin="miter"/>
          </g>
        </svg>
      );
    
    case 'knight':
      return (
        <svg {...baseProps}>
          <g>
            <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" strokeLinecap="butt"/>
            <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"/>
            <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill="#000"/>
            <path d="M14.933 15.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" strokeWidth="1.49997" fill="#000"/>
          </g>
        </svg>
      );
    
    case 'pawn':
      return (
        <svg {...baseProps}>
          <g>
            <path d="M22 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38-1.95 1.12-3.28 3.21-3.28 5.62 0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"/>
          </g>
        </svg>
      );
    
    default:
      return null;
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
                  <div
                    className={cn(
                      "select-none transition-transform duration-150 flex items-center justify-center",
                      isSelected && "scale-110"
                    )}
                  >
                    <ChessPieceSVG type={piece.type} color={piece.color} size={48} />
                  </div>
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