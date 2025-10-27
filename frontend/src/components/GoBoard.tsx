import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

export type GoStone = {
  color: 'white' | 'black';
  position: string;
};

export type GoMove = {
  position: string;
  color: 'white' | 'black';
};

interface GoBoardProps {
  stones: GoStone[];
  onMove: (move: GoMove) => void;
  validMoves: string[];
  onIntersectionClick: (position: string) => void;
  isThinking?: boolean;
  lastMove?: GoMove;
  gameInProgress?: boolean;
  boardSize?: number;
}

const GoBoard = ({
  stones,
  onMove,
  validMoves,
  onIntersectionClick,
  isThinking,
  lastMove,
  gameInProgress = true,
  boardSize = 19
}: GoBoardProps) => {
  const getStoneAt = (position: string) => {
    return stones.find(stone => stone.position === position);
  };

  const isValidMove = (position: string) => {
    return validMoves.includes(position);
  };

  const handleIntersectionClick = (position: string) => {
    if (isThinking || !gameInProgress) return;
    onIntersectionClick(position);
  };

  // Generate grid coordinates
  const coordinates = Array.from({ length: boardSize }, (_, i) => i);

  // Helper to check if this is a star point (19x19 board)
  const isStarPoint = (row: number, col: number) => {
    if (boardSize !== 19) return false;
    const starPoints = [3, 9, 15];
    return starPoints.includes(row) && starPoints.includes(col);
  };

  return (
    <div className="relative">
      <div className={cn(
        "inline-block border-4 border-primary rounded-lg overflow-hidden shadow-2xl",
        "bg-gradient-to-br from-[#dcb35c] to-[#c9a747] p-8 transition-all duration-500",
        !gameInProgress && "blur-sm opacity-60 pointer-events-none"
      )}>
        <div
          className="relative bg-[#dcb35c]"
          style={{
            width: `${(boardSize - 1) * 40}px`,
            height: `${(boardSize - 1) * 40}px`
          }}
        >
          {/* Grid lines */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{
              width: `${(boardSize - 1) * 40}px`,
              height: `${(boardSize - 1) * 40}px`
            }}
          >
            {/* Horizontal lines */}
            {coordinates.map((row) => (
              <line
                key={`h-${row}`}
                x1={0}
                y1={row * 40}
                x2={(boardSize - 1) * 40}
                y2={row * 40}
                stroke="#000000"
                strokeWidth="1"
              />
            ))}
            {/* Vertical lines */}
            {coordinates.map((col) => (
              <line
                key={`v-${col}`}
                x1={col * 40}
                y1={0}
                x2={col * 40}
                y2={(boardSize - 1) * 40}
                stroke="#000000"
                strokeWidth="1"
              />
            ))}
            {/* Star points */}
            {coordinates.map((row) =>
              coordinates.map((col) => {
                if (isStarPoint(row, col)) {
                  return (
                    <circle
                      key={`star-${row}-${col}`}
                      cx={col * 40}
                      cy={row * 40}
                      r="4"
                      fill="#000000"
                    />
                  );
                }
                return null;
              })
            )}
          </svg>

          {/* Intersection points */}
          {coordinates.map((row) =>
            coordinates.map((col) => {
              const position = `${String.fromCharCode(65 + col)}${row + 1}`;
              const stone = getStoneAt(position);
              const validMove = isValidMove(position);
              const isLastMove = lastMove?.position === position;

              return (
                <div
                  key={position}
                  className={cn(
                    "absolute cursor-pointer transition-all duration-200",
                    "hover:opacity-80"
                  )}
                  style={{
                    left: `${col * 40 - 16}px`,
                    top: `${row * 40 - 16}px`,
                    width: '32px',
                    height: '32px'
                  }}
                  onClick={() => handleIntersectionClick(position)}
                >
                  {stone && (
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full shadow-lg transition-transform duration-150 relative",
                        stone.color === 'white' ? "bg-white border-2 border-gray-300" : "bg-gray-900 border-2 border-gray-900",
                        isLastMove && "ring-4 ring-red-500"
                      )}
                    >
                      {stone.color === 'white' && (
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white to-gray-200" />
                      )}
                      {stone.color === 'black' && (
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-700 to-black" />
                      )}
                    </div>
                  )}
                  {validMove && !stone && (
                    <div className="w-8 h-8 flex items-center justify-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full opacity-60" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Coordinate labels */}
      <div className="absolute -bottom-6 left-8 flex text-sm text-muted-foreground" style={{ width: `${(boardSize - 1) * 40}px` }}>
        {coordinates.map(col => (
          <span key={col} className="w-10 text-center">{String.fromCharCode(65 + col)}</span>
        ))}
      </div>
      <div className="absolute -left-6 top-8 flex flex-col text-sm text-muted-foreground" style={{ height: `${(boardSize - 1) * 40}px` }}>
        {coordinates.map(row => (
          <span key={row} className="h-10 flex items-center justify-center">{row + 1}</span>
        ))}
      </div>

      {!gameInProgress && (
        <div
          className="absolute rounded-lg flex items-center justify-center bg-black/20"
          style={{
            top: '-32px',
            left: '-32px',
            right: '-32px',
            bottom: '-32px'
          }}
        >
          <div className="bg-card/90 backdrop-blur-sm px-6 py-3 rounded-lg border border-primary text-center">
            <span className="text-primary font-medium text-lg block">Click "Start Game" to begin</span>
            <span className="text-muted-foreground text-sm">Configure your players and start playing!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoBoard;
