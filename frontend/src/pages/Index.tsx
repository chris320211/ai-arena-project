import { useState, useCallback } from 'react';
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

  // Mock API call for AI move (replace with your backend)
  const requestAIMove = useCallback(async (position: ChessPiece[], model: AIModel) => {
    setIsAIThinking(true);
    setThinkingSteps([]);
    
    // Simulate thinking steps
    const steps: ThinkingStep[] = [
      {
        id: '1',
        type: 'evaluation',
        content: 'Analyzing current position structure and piece activity',
        timestamp: Date.now()
      },
      {
        id: '2',
        type: 'candidate_move',
        content: 'Considering e2-e4 for central control',
        move: 'e2-e4',
        confidence: 85,
        timestamp: Date.now() + 500
      },
      {
        id: '3',
        type: 'analysis',
        content: 'Evaluating tactical opportunities and threats',
        timestamp: Date.now() + 1000
      },
      {
        id: '4',
        type: 'decision',
        content: 'Selected best move based on positional advantages',
        move: 'e2-e4',
        confidence: 92,
        timestamp: Date.now() + 1500
      }
    ];

    // Simulate streaming thinking steps
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setThinkingSteps(prev => [...prev, steps[i]]);
    }

    // Mock AI response
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockResponse: AIResponse = {
      modelId: model.id,
      bestMove: 'e2-e4',
      confidence: 92,
      thinkingTime: 2300,
      evaluation: 15,
      principalVariation: ['e2-e4', 'e7-e5', 'Ng1-f3', 'Nb8-c6'],
      reasoning: 'Controlling the center with the king\'s pawn provides excellent piece development opportunities.',
      thinkingSteps: steps
    };

    setAIResponse(mockResponse);
    setIsAIThinking(false);
    
    // Make the move
    handleMove({ from: 'e2', to: 'e4', piece: position.find(p => p.position === 'e2')! });
  }, []);

  const handleSquareClick = useCallback((square: string) => {
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
        // In a real app, calculate valid moves here
        setValidMoves(['e4', 'e3']); // Mock valid moves
      }
    } else {
      // Making a move
      if (validMoves.includes(square)) {
        const movingPiece = position.find(p => p.position === selectedSquare);
        if (movingPiece) {
          handleMove({ from: selectedSquare, to: square, piece: movingPiece, captured: piece });
        }
      }
      setSelectedSquare(null);
      setValidMoves([]);
    }
  }, [selectedSquare, position, currentTurn, validMoves, gameInProgress, isAIThinking]);

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

  // Check if AI should move
  useState(() => {
    if (gameInProgress && isAITurn() && !isAIThinking) {
      const currentPlayer = getCurrentPlayer();
      if (currentPlayer !== 'human' && typeof currentPlayer === 'object') {
        requestAIMove(position, currentPlayer);
      }
    }
  });

  const startNewGame = () => {
    setPosition(INITIAL_POSITION);
    setCurrentTurn('white');
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
  };

  const resetGame = () => {
    setPosition(INITIAL_POSITION);
    setCurrentTurn('white');
    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(null);
    setGameInProgress(false);
    setAIResponse(null);
    setThinkingSteps([]);
  };

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
