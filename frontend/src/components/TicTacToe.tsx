import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, X, Circle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type Player = 'X' | 'O' | null;
type Board = Player[];

interface TicTacToeProps {
  className?: string;
}

const TicTacToe = ({ className }: TicTacToeProps) => {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<'X' | 'O'>('X');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<Player>(null);

  const checkWinner = useCallback((board: Board): Player => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return null;
  }, []);

  const isBoardFull = useCallback((board: Board): boolean => {
    return board.every(cell => cell !== null);
  }, []);

  const handleCellClick = useCallback((index: number) => {
    if (board[index] || gameOver) return;

    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);

    const winner = checkWinner(newBoard);
    if (winner) {
      setWinner(winner);
      setGameOver(true);
      toast({
        title: "Game Over!",
        description: `Player ${winner} wins!`,
        variant: "default"
      });
    } else if (isBoardFull(newBoard)) {
      setGameOver(true);
      toast({
        title: "Game Over!",
        description: "It's a draw!",
        variant: "default"
      });
    } else {
      setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
    }
  }, [board, currentPlayer, gameOver, checkWinner, isBoardFull]);

  const resetGame = useCallback(() => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setGameOver(false);
    setWinner(null);
  }, []);

  const getStatusText = () => {
    if (gameOver) {
      return winner ? `Player ${winner} wins!` : "It's a draw!";
    }
    return `Player ${currentPlayer}'s turn`;
  };

  const renderCell = (index: number) => {
    const value = board[index];
    return (
      <button
        key={index}
        className="w-full h-full aspect-square border-2 border-border bg-card hover:bg-muted transition-colors duration-200 flex items-center justify-center text-4xl font-bold disabled:cursor-not-allowed"
        onClick={() => handleCellClick(index)}
        disabled={gameOver || value !== null}
      >
        {value === 'X' && <X className="w-8 h-8 text-blue-500" />}
        {value === 'O' && <Circle className="w-8 h-8 text-red-500" />}
      </button>
    );
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Tic Tac Toe</CardTitle>
            <Button onClick={resetGame} variant="outline" size="sm">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-center">
            <Badge variant={gameOver ? "destructive" : "default"} className="text-sm px-4 py-2">
              {getStatusText()}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto aspect-square">
            {Array.from({ length: 9 }, (_, index) => renderCell(index))}
          </div>

          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <X className="w-4 h-4 text-blue-500" />
              <span>Player X</span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="w-4 h-4 text-red-500" />
              <span>Player O</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TicTacToe;