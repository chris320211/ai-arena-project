import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, X, Circle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type Player = 'X' | 'O' | null;
type Board2D = (Player)[][];

interface TicTacToeState {
  board: Board2D;
  current_player: 'X' | 'O';
  game_over: boolean;
  winner: Player;
  is_draw: boolean;
}

interface TicTacToeProps {
  className?: string;
}

const TicTacToe = ({ className }: TicTacToeProps) => {
  const [gameState, setGameState] = useState<TicTacToeState | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch initial game state
  useEffect(() => {
    fetchGameState();
  }, []);

  const fetchGameState = async () => {
    try {
      const response = await fetch('http://localhost:8001/tictactoe/state');
      const state = await response.json();
      setGameState(state);
    } catch (error) {
      console.error('Failed to fetch game state:', error);
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive"
      });
    }
  };

  const handleCellClick = useCallback(async (row: number, col: number) => {
    if (!gameState || gameState.game_over || loading) return;

    // Check if cell is already occupied
    if (gameState.board[row][col] !== null) return;

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8001/tictactoe/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          row,
          col,
          player: gameState.current_player
        }),
      });

      if (!response.ok) {
        throw new Error('Invalid move');
      }

      const newState = await response.json();
      setGameState(newState);

      // Show game over messages
      if (newState.game_over) {
        if (newState.winner) {
          toast({
            title: "Game Over!",
            description: `Player ${newState.winner} wins!`,
            variant: "default"
          });
        } else if (newState.is_draw) {
          toast({
            title: "Game Over!",
            description: "It's a draw!",
            variant: "default"
          });
        }
      }
    } catch (error) {
      console.error('Failed to make move:', error);
      toast({
        title: "Error",
        description: "Failed to make move",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [gameState, loading]);

  const resetGame = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8001/tictactoe/reset', {
        method: 'POST',
      });
      const newState = await response.json();
      setGameState(newState);
    } catch (error) {
      console.error('Failed to reset game:', error);
      toast({
        title: "Error",
        description: "Failed to reset game",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const getStatusText = () => {
    if (!gameState) return "Loading...";
    if (gameState.game_over) {
      return gameState.winner ? `Player ${gameState.winner} wins!` : "It's a draw!";
    }
    return `Player ${gameState.current_player}'s turn`;
  };

  const renderCell = (row: number, col: number) => {
    if (!gameState) return null;

    const value = gameState.board[row][col];
    const index = row * 3 + col;

    return (
      <button
        key={index}
        className="w-full h-full aspect-square border-2 border-border bg-card hover:bg-muted transition-colors duration-200 flex items-center justify-center text-4xl font-bold disabled:cursor-not-allowed"
        onClick={() => handleCellClick(row, col)}
        disabled={loading || gameState.game_over || value !== null}
      >
        {loading && <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />}
        {!loading && value === 'X' && <X className="w-8 h-8 text-blue-500" />}
        {!loading && value === 'O' && <Circle className="w-8 h-8 text-red-500" />}
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
            <Badge variant={gameState?.game_over ? "destructive" : "default"} className="text-sm px-4 py-2">
              {getStatusText()}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto aspect-square">
            {gameState ? (
              Array.from({ length: 3 }, (_, row) =>
                Array.from({ length: 3 }, (_, col) => renderCell(row, col))
              ).flat()
            ) : (
              Array.from({ length: 9 }, (_, index) => (
                <div
                  key={index}
                  className="w-full h-full aspect-square border-2 border-border bg-muted animate-pulse flex items-center justify-center"
                >
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ))
            )}
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