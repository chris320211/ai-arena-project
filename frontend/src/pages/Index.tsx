import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Settings } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

import ChessBoard, { ChessPiece, ChessMove } from '@/components/ChessBoard';
import ModelSelector, { AIModel, PlayerConfig, AI_MODELS } from '@/components/ModelSelector';
import ThinkingProcess, { AIResponse, ThinkingStep } from '@/components/ThinkingProcess';
import GameStats, { GameResult, ModelStats } from '@/components/GameStats';

// Initial chess position
const INITIAL_POSITION: ChessPiece[] = [
  // White pieces
  { type: 'rook', color: 'white', position: 'a1' },
  { type: 'knight', color: 'white', position: 'b1' },
  { type: 'bishop', color: 'white', position: 'c1' },
  { type: 'queen', color: 'white', position: 'd1' },
  { type: 'king', color: 'white', position: 'e1' },
  { type: 'bishop', color: 'white', position: 'f1' },
  { type: 'knight', color: 'white', position: 'g1' },
  { type: 'rook', color: 'white', position: 'h1' },
  { type: 'pawn', color: 'white', position: 'a2' },
  { type: 'pawn', color: 'white', position: 'b2' },
  { type: 'pawn', color: 'white', position: 'c2' },
  { type: 'pawn', color: 'white', position: 'd2' },
  { type: 'pawn', color: 'white', position: 'e2' },
  { type: 'pawn', color: 'white', position: 'f2' },
  { type: 'pawn', color: 'white', position: 'g2' },
  { type: 'pawn', color: 'white', position: 'h2' },
  // Black pieces
  { type: 'rook', color: 'black', position: 'a8' },
  { type: 'knight', color: 'black', position: 'b8' },
  { type: 'bishop', color: 'black', position: 'c8' },
  { type: 'queen', color: 'black', position: 'd8' },
  { type: 'king', color: 'black', position: 'e8' },
  { type: 'bishop', color: 'black', position: 'f8' },
  { type: 'knight', color: 'black', position: 'g8' },
  { type: 'rook', color: 'black', position: 'h8' },
  { type: 'pawn', color: 'black', position: 'a7' },
  { type: 'pawn', color: 'black', position: 'b7' },
  { type: 'pawn', color: 'black', position: 'c7' },
  { type: 'pawn', color: 'black', position: 'd7' },
  { type: 'pawn', color: 'black', position: 'e7' },
  { type: 'pawn', color: 'black', position: 'f7' },
  { type: 'pawn', color: 'black', position: 'g7' },
  { type: 'pawn', color: 'black', position: 'h7' },
];

// Mock data for demonstration
const MOCK_GAME_RESULTS: GameResult[] = [
  {
    id: '1',
    white: 'gpt4',
    black: 'claude',
    winner: 'white',
    moves: 47,
    duration: 1840,
    endReason: 'checkmate',
    timestamp: Date.now() - 3600000
  },
  {
    id: '2',
    white: 'human',
    black: 'gemini',
    winner: 'black',
    moves: 32,
    duration: 920,
    endReason: 'resignation',
    timestamp: Date.now() - 7200000
  }
];

const MOCK_MODEL_STATS: ModelStats[] = [
  {
    modelId: 'gpt4',
    gamesPlayed: 25,
    wins: 18,
    losses: 5,
    draws: 2,
    winRate: 72,
    avgMoveTime: 1200,
    rating: 2450,
    ratingChange: 25
  },
  {
    modelId: 'claude',
    gamesPlayed: 22,
    wins: 14,
    losses: 6,
    draws: 2,
    winRate: 63.6,
    avgMoveTime: 950,
    rating: 2380,
    ratingChange: -15
  },
  {
    modelId: 'gemini',
    gamesPlayed: 18,
    wins: 10,
    losses: 6,
    draws: 2,
    winRate: 55.6,
    avgMoveTime: 1400,
    rating: 2320,
    ratingChange: 10
  }
];

const Index = () => {
  const [position, setPosition] = useState<ChessPiece[]>(INITIAL_POSITION);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [currentTurn, setCurrentTurn] = useState<'white' | 'black'>('white');
  const [gameInProgress, setGameInProgress] = useState(false);
  const [lastMove, setLastMove] = useState<ChessMove | null>(null);
  
  // AI-related state
  const [playerConfig, setPlayerConfig] = useState<PlayerConfig>({
    white: 'human',
    black: AI_MODELS[0]
  });
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [aiResponse, setAIResponse] = useState<AIResponse | null>(null);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);

  // Game statistics
  const [gameResults] = useState<GameResult[]>(MOCK_GAME_RESULTS);
  const [modelStats] = useState<ModelStats[]>(MOCK_MODEL_STATS);

  const getCurrentPlayer = () => {
    return playerConfig[currentTurn];
  };

  const isAITurn = () => {
    return getCurrentPlayer() !== 'human';
  };

  // Trigger AI move using backend
  const triggerAIMove = useCallback(async () => {
    if (!gameInProgress || !isAITurn() || isAIThinking) return;

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
      const response = await fetch('http://localhost:8001/ai-step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('AI move failed');
      }

      const data = await response.json();
      
      // Update board state
      const frontendPosition = convertBackendToFrontend(data.board);
      setPosition(frontendPosition);
      setCurrentTurn(data.turn);
      
      if (data.last_move) {
        setLastMove({ 
          from: data.last_move.from, 
          to: data.last_move.to, 
          piece: frontendPosition.find(p => p.position === data.last_move.to)!
        });
      }

      // Update thinking steps with result
      setThinkingSteps(prev => [...prev, {
        id: '2',
        type: 'decision',
        content: `AI played ${data.last_move?.from} to ${data.last_move?.to}`,
        move: `${data.last_move?.from}-${data.last_move?.to}`,
        confidence: 85,
        timestamp: Date.now()
      }]);

      // Check game status
      if (data.status?.checkmate) {
        toast({
          title: "Checkmate!",
          description: `${data.turn === 'white' ? 'Black' : 'White'} wins!`,
          variant: "default"
        });
        setGameInProgress(false);
      } else if (data.status?.check) {
        toast({
          title: "Check!",
          description: `${data.turn} is in check`,
          variant: "default"
        });
      } else if (data.status?.stalemate) {
        toast({
          title: "Stalemate!",
          description: "The game is a draw",
          variant: "default"
        });
        setGameInProgress(false);
      }

    } catch (error) {
      console.error('Error triggering AI move:', error);
      toast({
        title: "AI Error",
        description: "Failed to get AI move",
        variant: "destructive"
      });
    } finally {
      setIsAIThinking(false);
    }
  }, [gameInProgress, isAIThinking, convertBackendToFrontend]);

  // Auto-trigger AI moves
  useEffect(() => {
    if (gameInProgress && isAITurn() && !isAIThinking) {
      const timer = setTimeout(() => {
        triggerAIMove();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameInProgress, currentTurn, isAIThinking, triggerAIMove]);

  const getValidMoves = useCallback(async (square: string) => {
    try {
      const file = square[0];
      const rank = square[1];
      const x = 8 - parseInt(rank);
      const y = file.charCodeAt(0) - 'a'.charCodeAt(0);
      
      const response = await fetch(`http://localhost:8001/moves?x=${x}&y=${y}`);
      if (!response.ok) {
        throw new Error('Failed to get moves');
      }
      
      const data = await response.json();
      const moves = data.moves.map(([moveX, moveY]: [number, number]) => {
        const moveFile = String.fromCharCode('a'.charCodeAt(0) + moveY);
        const moveRank = (8 - moveX).toString();
        return moveFile + moveRank;
      });
      
      return moves;
    } catch (error) {
      console.error('Error getting valid moves:', error);
      return [];
    }
  }, []);

  const handleSquareClick = useCallback(async (square: string) => {
    if (isAIThinking || !gameInProgress) return;
    
    if (isAITurn()) {
      toast({
        title: "AI Turn",
        description: "Wait for the AI to make its move",
        variant: "default"
      });
      return;
    }

    const piece = position.find(p => p.position === square);
    
    if (selectedSquare === null) {
      // Selecting a piece
      if (piece && piece.color === currentTurn) {
        setSelectedSquare(square);
        const moves = await getValidMoves(square);
        setValidMoves(moves);
      }
    } else {
      // Making a move
      if (validMoves.includes(square)) {
        const success = await makeBackendMove(selectedSquare, square);
        if (success) {
          const movingPiece = position.find(p => p.position === selectedSquare);
          if (movingPiece) {
            setLastMove({ from: selectedSquare, to: square, piece: movingPiece, captured: piece });
          }
        }
      }
      setSelectedSquare(null);
      setValidMoves([]);
    }
  }, [selectedSquare, position, currentTurn, validMoves, gameInProgress, isAIThinking, getValidMoves]);

  const handleMove = useCallback((move: ChessMove) => {
    // Update position
    const newPosition = position.map(p => {
      if (p.position === move.from) {
        return { ...p, position: move.to, hasMoved: true };
      }
      return p;
    }).filter(p => p.position !== move.to || p === position.find(piece => piece.position === move.from));

    // Add captured piece if any
    if (move.captured) {
      // Remove captured piece (already filtered above)
    }

    setPosition(newPosition);
    setLastMove(move);
    setCurrentTurn(currentTurn === 'white' ? 'black' : 'white');
    setSelectedSquare(null);
    setValidMoves([]);

    toast({
      title: "Move Made",
      description: `${move.piece.type} ${move.from} → ${move.to}`,
      variant: "default"
    });
  }, [position, currentTurn]);


  const startNewGame = async () => {
    try {
      const response = await fetch('http://localhost:8001/new', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to start new game');
      }

      // Configure bots based on player config
      const whiteBot = playerConfig.white === 'human' ? 'human' : playerConfig.white.id;
      const blackBot = playerConfig.black === 'human' ? 'human' : playerConfig.black.id;
      
      const botResponse = await fetch('http://localhost:8001/set-bots', {
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
      setSelectedSquare(null);
      setValidMoves([]);
      setLastMove(null);
      setGameInProgress(true);
      setAIResponse(null);
      setThinkingSteps([]);
      
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
      const response = await fetch('http://localhost:8001/reset', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to reset game');
      }
      
      await fetchGameState();
      setSelectedSquare(null);
      setValidMoves([]);
      setLastMove(null);
      setGameInProgress(false);
      setAIResponse(null);
      setThinkingSteps([]);
    } catch (error) {
      console.error('Error resetting game:', error);
      toast({
        title: "Error", 
        description: "Failed to reset game",
        variant: "destructive"
      });
    }
  };

  // Convert backend board format to frontend format
  const convertBackendToFrontend = (backendBoard: string[][]): ChessPiece[] => {
    const pieces: ChessPiece[] = [];
    const pieceMap: { [key: string]: 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king' } = {
      'p': 'pawn', 'P': 'pawn',
      'r': 'rook', 'R': 'rook',
      'n': 'knight', 'N': 'knight',
      'b': 'bishop', 'B': 'bishop',
      'q': 'queen', 'Q': 'queen',
      'k': 'king', 'K': 'king'
    };

    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        const piece = backendBoard[x][y];
        if (piece !== '.') {
          const file = String.fromCharCode('a'.charCodeAt(0) + y);
          const rank = (8 - x).toString();
          pieces.push({
            type: pieceMap[piece],
            color: piece === piece.toUpperCase() ? 'white' : 'black',
            position: file + rank,
            hasMoved: false
          });
        }
      }
    }
    return pieces;
  };

  // Fetch game state from backend
  const fetchGameState = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8001/state');
      if (!response.ok) {
        throw new Error('Failed to fetch game state');
      }
      const data = await response.json();
      const frontendPosition = convertBackendToFrontend(data.board);
      setPosition(frontendPosition);
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

  // Make move via backend API
  const makeBackendMove = useCallback(async (from: string, to: string) => {
    try {
      const fromFile = from[0];
      const fromRank = from[1];
      const fromX = 8 - parseInt(fromRank);
      const fromY = fromFile.charCodeAt(0) - 'a'.charCodeAt(0);
      
      const toFile = to[0];
      const toRank = to[1];
      const toX = 8 - parseInt(toRank);
      const toY = toFile.charCodeAt(0) - 'a'.charCodeAt(0);

      const response = await fetch('http://localhost:8001/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from_sq: { x: fromX, y: fromY },
          to_sq: { x: toX, y: toY }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Move failed');
      }

      const data = await response.json();
      const frontendPosition = convertBackendToFrontend(data.board);
      setPosition(frontendPosition);
      setCurrentTurn(data.turn);
      
      if (data.status?.checkmate) {
        toast({
          title: "Checkmate!",
          description: `${data.turn === 'white' ? 'Black' : 'White'} wins!`,
          variant: "default"
        });
        setGameInProgress(false);
      } else if (data.status?.check) {
        toast({
          title: "Check!",
          description: `${data.turn} is in check`,
          variant: "default"
        });
      } else if (data.status?.stalemate) {
        toast({
          title: "Stalemate!",
          description: "The game is a draw",
          variant: "default"
        });
        setGameInProgress(false);
      }
      
      return true;
    } catch (error) {
      console.error('Error making move:', error);
      toast({
        title: "Move Error",
        description: error instanceof Error ? error.message : "Failed to make move",
        variant: "destructive"
      });
      return false;
    }
  }, []);

  // Initialize game state on component mount
  useEffect(() => {
    fetchGameState();
  }, [fetchGameState]);

  const getCurrentAIModel = (): AIModel | null => {
    const currentPlayer = getCurrentPlayer();
    return currentPlayer !== 'human' && typeof currentPlayer === 'object' ? currentPlayer : null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Chess AI Arena
              </h1>
              <Badge variant="outline" className="text-xs">
                AI vs AI Battles
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={startNewGame}
                disabled={gameInProgress}
                className="flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Start Game
              </Button>
              
              <Button
                onClick={resetGame}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
          {/* Left Column - Game Board */}
          <div className="xl:col-span-2 space-y-6">
            {/* Game Status */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${
                        currentTurn === 'white' ? 'bg-white border-2 border-gray-800' : 'bg-gray-800'
                      }`} />
                      <span className="font-medium">
                        {currentTurn.charAt(0).toUpperCase() + currentTurn.slice(1)} to move
                      </span>
                    </div>
                    
                    {gameInProgress && (
                      <Badge variant={isAIThinking ? "default" : "secondary"}>
                        {isAIThinking ? "AI Thinking..." : "Game Active"}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    Move #{Math.floor((32 - position.filter(p => p.position).length) / 2) + 1}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chess Board */}
            <div className="flex justify-center">
              <div className="max-w-2xl w-full">
                <ChessBoard
                  position={position}
                  onMove={handleMove}
                  validMoves={validMoves}
                  selectedSquare={selectedSquare}
                  onSquareClick={handleSquareClick}
                  isThinking={isAIThinking}
                  lastMove={lastMove}
                  gameInProgress={gameInProgress}
                />
              </div>
            </div>
          </div>

          {/* Right Column - Controls and Analysis */}
          <div className="space-y-6">
            <Tabs defaultValue="setup" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="setup">Setup</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
                <TabsTrigger value="stats">Stats</TabsTrigger>
              </TabsList>
              
              <TabsContent value="setup" className="mt-4">
                <ModelSelector
                  playerConfig={playerConfig}
                  onConfigChange={setPlayerConfig}
                  gameInProgress={gameInProgress}
                />
              </TabsContent>
              
              <TabsContent value="analysis" className="mt-4">
                <ThinkingProcess
                  aiResponse={aiResponse}
                  isThinking={isAIThinking}
                  currentModel={getCurrentAIModel()}
                  thinkingSteps={thinkingSteps}
                />
              </TabsContent>
              
              <TabsContent value="stats" className="mt-4">
                <div className="max-h-[800px] overflow-y-auto">
                  <GameStats
                    modelStats={modelStats}
                    recentGames={gameResults}
                    aiModels={AI_MODELS}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
