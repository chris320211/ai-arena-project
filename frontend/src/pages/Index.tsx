import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

import { AIModel, PlayerConfig, AI_MODELS } from '@/components/ModelSelector';
import { AIResponse, ThinkingStep } from '@/components/ThinkingProcess';
import { GameResult, ModelStats, EloHistoryEntry } from '@/components/GameStats';
import TicTacToe from '@/components/TicTacToe';
import IndexContent from './Index-content';

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
    model_id: 'gpt4',
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
    model_id: 'claude',
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
    model_id: 'gemini',
    gamesPlayed: 18,
    wins: 10,
    losses: 6,
    draws: 2,
    winRate: 55.6,
    avgMoveTime: 1800,
    rating: 2220,
    ratingChange: 8
  }
];

// Initial chess position
const getInitialPosition = () => {
  return [
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
  ];
};

const Index = () => {
  // Tab navigation state
  const [activeTab, setActiveTab] = useState('chess');

  // Chess-related state (keep existing state from Index-content)
  const [position, setPosition] = useState<any[]>(getInitialPosition());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [currentTurn, setCurrentTurn] = useState<'white' | 'black'>('white');
  const [gameInProgress, setGameInProgress] = useState(false);
  const [lastMove, setLastMove] = useState<any>(null);

  // AI-related state
  const [playerConfig, setPlayerConfig] = useState<PlayerConfig>({
    white: 'human',
    black: AI_MODELS[0]
  });
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [aiResponse, setAIResponse] = useState<AIResponse | null>(null);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);

  // Game statistics
  const [gameResults, setGameResults] = useState<GameResult[]>(MOCK_GAME_RESULTS);
  const [modelStats, setModelStats] = useState<ModelStats[]>(MOCK_MODEL_STATS);
  const [eloHistory, setEloHistory] = useState<EloHistoryEntry[]>([]);

  // Additional state for backend integration
  const [gameKey, setGameKey] = useState(0);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [moveHistory, setMoveHistory] = useState<any[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);

  const handleSquareClick = useCallback((square: string) => {
    // Placeholder for chess logic
  }, []);

  const onConfigChange = useCallback((config: PlayerConfig) => {
    setPlayerConfig(config);
  }, []);

  const onStartGame = useCallback(() => {
    setGameInProgress(true);
  }, []);

  const onResetGame = useCallback(() => {
    setGameInProgress(false);
    setPosition(getInitialPosition());
    setSelectedSquare(null);
    setValidMoves([]);
    setCurrentTurn('white');
    setLastMove(null);
  }, []);


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
      setMoveHistory([]);
      setCurrentMoveIndex(-1);

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
      // First, reset backend state
      const response = await fetch('http://localhost:8001/reset', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to reset game');
      }

      // Increment game key to force component remount and clear history
      const newGameKey = gameKey + 1;
      setGameKey(newGameKey);

      // Clear all frontend state
      setSelectedSquare(null);
      setValidMoves([]);
      setLastMove(null);
      setGameInProgress(false);
      setAIResponse(null);
      setThinkingSteps([]);
      setShowAnalysis(false);
      setMoveHistory([]);
      setCurrentMoveIndex(-1);

      // Fetch fresh game state from backend
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

  const getCurrentAIModel = () => {
    return playerConfig[currentTurn];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header with Navigation */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Game Arena
                </h1>
                <Badge variant="outline" className="text-xs">
                  Multi-Game Platform
                </Badge>
              </div>

              {/* Navigation Tabs */}
              <nav className="hidden md:flex">
                <div className="flex gap-1 p-1 bg-muted rounded-lg">
                  <Button
                    variant={activeTab === 'tictactoe' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('tictactoe')}
                    className="px-6"
                  >
                    Tic Tac Toe
                  </Button>
                  <Button
                    variant={activeTab === 'connect4' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('connect4')}
                    className="px-6"
                  >
                    Connect 4
                  </Button>
                  <Button
                    variant={activeTab === 'chess' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('chess')}
                    className="px-6"
                  >
                    Chess
                  </Button>
                </div>
              </nav>
            </div>

            {/* Game Controls - Show only for Chess */}
            {activeTab === 'chess' && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={onStartGame}
                  disabled={gameInProgress}
                  className="flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Start Game
                </Button>

                <Button
                  onClick={onResetGame}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-3">
        {/* Mobile Navigation - Show tabs on mobile only */}
        <div className="md:hidden mb-6">
          <div className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-lg">
            <Button
              variant={activeTab === 'tictactoe' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('tictactoe')}
              className="text-xs"
            >
              TTT
            </Button>
            <Button
              variant={activeTab === 'connect4' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('connect4')}
              className="text-xs"
            >
              C4
            </Button>
            <Button
              variant={activeTab === 'chess' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('chess')}
              className="text-xs"
            >
              Chess
            </Button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'tictactoe' && (
          <div className="flex justify-center">
            <TicTacToe className="max-w-md" />
          </div>
        )}

        {activeTab === 'connect4' && (
          <div className="flex justify-center">
            <div className="text-center p-8">
              <h2 className="text-2xl font-bold mb-4">Connect 4</h2>
              <p className="text-muted-foreground">Coming Soon...</p>
            </div>
          </div>
        )}

        {activeTab === 'chess' && (
          <IndexContent
            position={position}
            selectedSquare={selectedSquare}
            validMoves={validMoves}
            currentTurn={currentTurn}
            gameInProgress={gameInProgress}
            lastMove={lastMove}
            playerConfig={playerConfig}
            isAIThinking={isAIThinking}
            aiResponse={aiResponse}
            thinkingSteps={thinkingSteps}
            gameResults={gameResults}
            modelStats={modelStats}
            onSquareClick={handleSquareClick}
            onConfigChange={onConfigChange}
            onStartGame={onStartGame}
            onResetGame={onResetGame}
            getCurrentAIModel={getCurrentAIModel}
          />
        )}
      </div>
    </div>
  );
};

export default Index;