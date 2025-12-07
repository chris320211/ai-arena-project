import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Settings, ChevronLeft, ChevronRight, BarChart3, Gamepad2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { API_URL } from '@/config/api';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

import GoBoard, { GoStone, GoMove } from '@/components/GoBoard';
import ModelSelector, { AIModel, PlayerConfig, AI_MODELS } from '@/components/ModelSelector';
import ThinkingProcess, { AIResponse, ThinkingStep } from '@/components/ThinkingProcess';
import GameStats, { GameResult, ModelStats, EloHistoryEntry } from '@/components/GameStats';

// Initial Go position (empty board)
const INITIAL_POSITION: GoStone[] = [];

// Games configuration
const GAMES = [
  { id: "chess", name: "Chess" },
  { id: "go", name: "Go" },
  { id: "stocks", name: "Stocks" },
];

const GoGame = () => {
  const [stones, setStones] = useState<GoStone[]>(INITIAL_POSITION);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [currentTurn, setCurrentTurn] = useState<'white' | 'black'>('black');
  const [gameInProgress, setGameInProgress] = useState(false);
  const [lastMove, setLastMove] = useState<GoMove | null>(null);
  const [gameKey, setGameKey] = useState(0); // Force re-init on new game
  const [moveHistory, setMoveHistory] = useState<{stones: GoStone[], turn: 'white' | 'black', move: GoMove | null}[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [selectedGame, setSelectedGame] = useState<string>('go');
  const [isGameMenuOpen, setIsGameMenuOpen] = useState(false);

  // AI-related state
  const [playerConfig, setPlayerConfig] = useState<PlayerConfig>({
    white: 'human',
    black: AI_MODELS[0]
  });
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [aiResponse, setAIResponse] = useState<AIResponse | null>(null);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Game statistics
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [modelStats, setModelStats] = useState<ModelStats[]>([]);
  const [eloHistory, setEloHistory] = useState<EloHistoryEntry[]>([]);

  // Reset move history when game key changes
  useEffect(() => {
    setMoveHistory([]);
    setCurrentMoveIndex(-1);
  }, [gameKey]);

  // Reset board to initial position when game is not in progress
  useEffect(() => {
    if (!gameInProgress) {
      setStones(INITIAL_POSITION);
      setCurrentTurn('black');
      setLastMove(null);
      setValidMoves([]);
    }
  }, [gameInProgress]);

  const getCurrentPlayer = () => {
    return playerConfig[currentTurn];
  };

  const isAITurn = () => {
    return getCurrentPlayer() !== 'human';
  };

  // Convert backend board format (2D array) to frontend stones
  const convertBackendToFrontend = (backendBoard: string[][]): GoStone[] => {
    const stones: GoStone[] = [];
    const size = backendBoard.length;

    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const cell = backendBoard[x][y];
        if (cell === 'B' || cell === 'W') {
          const col = String.fromCharCode(65 + y); // 0 -> A, 1 -> B, etc.
          const row = x + 1; // 0 -> 1, 1 -> 2, etc.
          stones.push({
            color: cell === 'B' ? 'black' : 'white',
            position: `${col}${row}`
          });
        }
      }
    }
    return stones;
  };

  // Fetch game state from backend
  const fetchGameState = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/go/state`);
      if (!response.ok) {
        throw new Error('Failed to fetch game state');
      }
      const data = await response.json();
      const frontendStones = convertBackendToFrontend(data.board);
      setStones(frontendStones);
      setCurrentTurn(data.turn);
    } catch (error) {
      console.error('Error fetching game state:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to backend. Using offline mode.",
        variant: "destructive"
      });
    }
  }, []);

  // Trigger AI move using backend
  const triggerAIMove = useCallback(async () => {
    if (!gameInProgress || !isAITurn() || isAIThinking) {
      return;
    }

    setIsAIThinking(true);
    setThinkingSteps([]);

    // Add thinking step
    setThinkingSteps([{
      id: '1',
      type: 'evaluation',
      content: 'AI is analyzing the position...',
      timestamp: Date.now()
    }]);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const response = await fetch(`${API_URL}/go/ai-step`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('AI move failed');
      }

      const data = await response.json();

      // Update board state
      const frontendStones = convertBackendToFrontend(data.board);
      const moveObj = data.last_move ? {
        position: `${String.fromCharCode(65 + data.last_move.y)}${data.last_move.x + 1}`,
        color: data.last_move.color
      } : null;

      setStones(frontendStones);
      setCurrentTurn(data.turn);
      setLastMove(moveObj);

      // Save to history
      saveToHistory(frontendStones, data.turn, moveObj);

      // Update thinking steps with result
      setThinkingSteps(prev => [...prev, {
        id: '2',
        type: 'decision',
        content: `AI placed stone at ${moveObj?.position}`,
        confidence: 85,
        timestamp: Date.now()
      }]);

      if (data.captured && data.captured[data.last_move.color] > 0) {
        toast({
          title: "Stones Captured!",
          description: `${data.last_move.color} captured ${data.captured[data.last_move.color]} stones`,
          variant: "default"
        });
      }

    } catch (error) {
      console.error('Error triggering AI move:', error);
      if (error instanceof Error && error.name !== 'AbortError') {
        toast({
          title: "AI Error",
          description: "Failed to get AI move",
          variant: "destructive"
        });
      }
    } finally {
      setIsAIThinking(false);
    }
  }, [gameInProgress, currentTurn, playerConfig]);

  // Auto-trigger AI moves
  useEffect(() => {
    if (gameInProgress && isAITurn() && !isAIThinking) {
      triggerAIMove();
    }
  }, [gameInProgress, currentTurn, isAIThinking, triggerAIMove]);

  const handleIntersectionClick = useCallback(async (position: string) => {
    if (isAIThinking || !gameInProgress) return;

    if (isAITurn()) {
      toast({
        title: "AI Turn",
        description: "Wait for the AI to make its move",
        variant: "default"
      });
      return;
    }

    // Convert position string (like "A1") to coordinates
    const col = position.charCodeAt(0) - 65; // A -> 0, B -> 1, etc.
    const row = parseInt(position.slice(1)) - 1; // 1 -> 0, 2 -> 1, etc.

    try {
      const response = await fetch(`${API_URL}/go/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ x: row, y: col })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Move failed');
      }

      const data = await response.json();

      // Convert backend board to frontend stones
      const newStones = convertBackendToFrontend(data.board);
      setStones(newStones);
      setCurrentTurn(data.turn);

      const move: GoMove = {
        position: position,
        color: currentTurn
      };
      setLastMove(move);

      // Save to history
      saveToHistory(newStones, data.turn, move);

      const colorCapitalized = currentTurn.charAt(0).toUpperCase() + currentTurn.slice(1);
      toast({
        title: "Move Made",
        description: `${colorCapitalized} placed a stone at ${position}`,
        variant: "default"
      });

      if (data.captured && data.captured[currentTurn] > 0) {
        toast({
          title: "Stones Captured!",
          description: `Captured ${data.captured[currentTurn]} stones`,
          variant: "default"
        });
      }

    } catch (error) {
      console.error('Error making move:', error);
      toast({
        title: "Move Error",
        description: error instanceof Error ? error.message : "Failed to make move",
        variant: "destructive"
      });
    }
  }, [currentTurn, gameInProgress, isAIThinking]);

  const handleMove = useCallback((move: GoMove) => {
    const newStone: GoStone = {
      color: move.color,
      position: move.position
    };

    setStones(prev => [...prev, newStone]);
    setLastMove(move);
    setCurrentTurn(currentTurn === 'white' ? 'black' : 'white');
  }, [currentTurn]);

  const startNewGame = async () => {
    // Force complete reset by changing game key
    const newGameKey = gameKey + 1;
    setGameKey(newGameKey);

    // Clear other state
    setValidMoves([]);
    setLastMove(null);
    setAIResponse(null);
    setThinkingSteps([]);

    try {
      const response = await fetch(`${API_URL}/go/new`, { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to start new game');
      }

      // Configure bots based on player config
      const whiteBot = playerConfig.white === 'human' ? 'human' : playerConfig.white.id;
      const blackBot = playerConfig.black === 'human' ? 'human' : playerConfig.black.id;

      const botResponse = await fetch(`${API_URL}/set-bots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          white: whiteBot,
          black: blackBot
        })
      });

      if (!botResponse.ok) {
        throw new Error('Failed to configure bots');
      }

      await fetchGameState();
      setGameInProgress(true);
      setShowAnalysis(true);

      // Scroll to center the board on the screen
      setTimeout(() => {
        const boardElement = document.querySelector('.max-w-3xl');
        if (boardElement) {
          boardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);

      toast({
        title: "New Game Started",
        description: "Good luck!",
        variant: "default"
      });

    } catch (error) {
      console.error('Error starting new game:', error);
      toast({
        title: "Error",
        description: "Failed to start new game",
        variant: "destructive"
      });
    }
  };

  const resetGame = async () => {
    try {
      const response = await fetch(`${API_URL}/go/reset`, { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to reset game');
      }

      // Increment game key to force component remount and clear history
      const newGameKey = gameKey + 1;
      setGameKey(newGameKey);

      // Clear all frontend state
      setValidMoves([]);
      setLastMove(null);
      setGameInProgress(false);
      setAIResponse(null);
      setThinkingSteps([]);
      setShowAnalysis(false);
      setMoveHistory([]);
      setCurrentMoveIndex(-1);
      setStones(INITIAL_POSITION);
      setCurrentTurn('black');

      await fetchGameState();

      toast({
        title: "Game Reset",
        description: "Board has been reset to starting position",
        variant: "default"
      });
    } catch (error) {
      console.error('Error resetting game:', error);
      toast({
        title: "Error",
        description: "Failed to reset game",
        variant: "destructive"
      });
    }
  };

  const getCurrentAIModel = (): AIModel | null => {
    const currentPlayer = getCurrentPlayer();
    return currentPlayer !== 'human' && typeof currentPlayer === 'object' ? currentPlayer : null;
  };

  // Move navigation functions
  const goBackMove = () => {
    if (currentMoveIndex > 0) {
      const previousMove = moveHistory[currentMoveIndex - 1];
      setStones(previousMove.stones);
      setCurrentTurn(previousMove.turn);
      setLastMove(previousMove.move);
      setCurrentMoveIndex(currentMoveIndex - 1);
    } else if (currentMoveIndex === 0) {
      // Go to initial position
      setStones(INITIAL_POSITION);
      setCurrentTurn('black');
      setLastMove(null);
      setCurrentMoveIndex(-1);
    }
  };

  const goForwardMove = () => {
    if (currentMoveIndex < moveHistory.length - 1) {
      const nextMove = moveHistory[currentMoveIndex + 1];
      setStones(nextMove.stones);
      setCurrentTurn(nextMove.turn);
      setLastMove(nextMove.move);
      setCurrentMoveIndex(currentMoveIndex + 1);
    }
  };

  const saveToHistory = useCallback((newStones: GoStone[], newTurn: 'white' | 'black', move: GoMove | null) => {
    setMoveHistory(prevHistory => {
      const newEntry = { stones: newStones, turn: newTurn, move };
      const newHistory = [...prevHistory, newEntry];
      setCurrentMoveIndex(newHistory.length - 1);
      return newHistory;
    });
  }, []);

  // Initialize game state on component mount
  useEffect(() => {
    fetchGameState();
  }, [fetchGameState]);

  const currentGame = GAMES.find(g => g.id === selectedGame);
  const handleGameChange = (gameId: string) => {
    setSelectedGame(gameId);
    setIsGameMenuOpen(false);
    if (gameId === 'chess') {
      window.location.href = '/';
    } else if (gameId !== 'go') {
      const upcomingGame = GAMES.find(game => game.id === gameId);
      toast({
        title: "Coming Soon",
        description: `${upcomingGame?.name ?? "This game"} is not yet available`,
        variant: "default"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                AI Arena
              </h1>

              {/* Games Dropdown */}
              <DropdownMenu open={isGameMenuOpen} onOpenChange={setIsGameMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={isGameMenuOpen}
                    className="flex items-center gap-2.5 px-4 py-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 text-foreground hover:border-primary/40 hover:from-primary/15 hover:to-primary/10 transition-all duration-300 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <Gamepad2 className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">{currentGame?.name}</span>
                    <svg
                      className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-300 ${isGameMenuOpen ? "text-foreground translate-y-0.5" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="start"
                  sideOffset={12}
                  className="z-[200] w-48 rounded-xl border border-border/60 bg-background/95 text-foreground shadow-xl backdrop-blur supports-[backdrop-filter]:bg-background/80 p-0"
                >
                  <div className="p-1.5">
                    {GAMES.map((game, index) => (
                      <DropdownMenuItem
                        key={game.id}
                        onSelect={(event) => {
                          event.preventDefault();
                          handleGameChange(game.id);
                        }}
                        style={{
                          animationDelay: `${index * 50}ms`,
                        }}
                        className={`flex cursor-pointer items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 focus:bg-accent/60 focus:text-foreground ${
                          selectedGame === game.id
                            ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary shadow-sm focus:text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                        }`}
                      >
                        <span>{game.name}</span>
                        {selectedGame === game.id && (
                          <svg
                            className="w-4 h-4 text-primary animate-in zoom-in duration-200"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </div>
                  <div className="border-t border-border/50 px-3 py-2 bg-muted/30">
                    <p className="text-xs text-muted-foreground">More games coming soon</p>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <Badge variant="outline" className="text-xs">
                AI vs AI Battles
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/stats">
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  Stats
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
          {/* Left Column - Game Board */}
          <div className="xl:col-span-2 flex items-start justify-start xl:pl-12">
            {/* Go Board */}
            <div className="max-w-3xl w-full">
              <GoBoard
                stones={stones}
                onMove={handleMove}
                validMoves={validMoves}
                onIntersectionClick={handleIntersectionClick}
                isThinking={isAIThinking}
                lastMove={lastMove}
                gameInProgress={gameInProgress}
                boardSize={19}
              />
            </div>
          </div>

          {/* Right Column - Controls and Analysis */}
          <div className="space-y-6">
            <div className="relative overflow-hidden">
              <div
                className={`transition-all duration-700 ease-in-out transform ${
                  showAnalysis
                    ? '-translate-x-full opacity-0 absolute inset-0'
                    : 'translate-x-0 opacity-100'
                }`}
              >
                <ModelSelector
                  playerConfig={playerConfig}
                  onConfigChange={setPlayerConfig}
                  gameInProgress={gameInProgress}
                  onStartGame={startNewGame}
                />
              </div>

              <div
                className={`transition-all duration-700 ease-in-out transform ${
                  showAnalysis
                    ? 'translate-x-0 opacity-100'
                    : 'translate-x-full opacity-0 absolute inset-0'
                }`}
              >
                <ThinkingProcess
                  key={`thinking-${gameKey}`}
                  aiResponse={aiResponse}
                  isThinking={isAIThinking}
                  currentModel={getCurrentAIModel()}
                  thinkingSteps={thinkingSteps}
                  moveHistory={moveHistory}
                  onResetGame={resetGame}
                  whitePlayer={playerConfig.white}
                  blackPlayer={playerConfig.black}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoGame;
