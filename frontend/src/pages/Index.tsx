import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Settings, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { eloService } from '@/services/eloService';

import ChessBoard, { ChessPiece, ChessMove } from '@/components/ChessBoard';
import ModelSelector, { AIModel, PlayerConfig, AI_MODELS } from '@/components/ModelSelector';
import ThinkingProcess, { AIResponse, ThinkingStep } from '@/components/ThinkingProcess';
import GameStats, { GameResult, ModelStats, EloHistoryEntry } from '@/components/GameStats';

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
  const [moveHistory, setMoveHistory] = useState<{position: ChessPiece[], turn: 'white' | 'black', move: ChessMove | null}[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  
  // AI-related state
  const [playerConfig, setPlayerConfig] = useState<PlayerConfig>({
    white: 'human',
    black: AI_MODELS[0]
  });
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [aiResponse, setAIResponse] = useState<AIResponse | null>(null);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Game statistics - now loaded from API
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [modelStats, setModelStats] = useState<ModelStats[]>([]);
  const [eloHistory, setEloHistory] = useState<EloHistoryEntry[]>([]);

  const getCurrentPlayer = () => {
    return playerConfig[currentTurn];
  };

  const isAITurn = () => {
    return getCurrentPlayer() !== 'human';
  };

  // Trigger AI move using backend
  const triggerAIMove = useCallback(async () => {
    console.log('triggerAIMove called with conditions:', { gameInProgress, isAITurn: isAITurn(), isAIThinking });
    
    if (!gameInProgress || !isAITurn() || isAIThinking) {
      console.log('triggerAIMove early return due to conditions:', {
        gameInProgress,
        isAITurn: isAITurn(),
        isAIThinking,
        failing: !gameInProgress ? 'gameInProgress' : !isAITurn() ? 'isAITurn' : 'isAIThinking'
      });
      return;
    }

    console.log('Setting AI thinking to true');
    setIsAIThinking(true);
    setThinkingSteps([]);
    
    // Add thinking step
    setThinkingSteps([{
      id: '1',
      type: 'evaluation',
      content: 'AI is analyzing the position...',
      timestamp: Date.now()
    }]);

    console.log('Making API call to /ai-step');
    try {
      // Add 45 second timeout to prevent hanging (accounting for 10s delay + API time)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);
      
      const response = await fetch('http://localhost:8001/ai-step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log('AI API response not ok:', response.status, response.statusText, response);
        throw new Error('AI move failed');
      }

      console.log('AI API call successful, processing response');
      const data = await response.json();
      console.log('AI response data:', data);
      
      // Update board state
      const frontendPosition = convertBackendToFrontend(data.board);
      const moveObj = data.last_move ? { 
        from: data.last_move.from, 
        to: data.last_move.to, 
        piece: frontendPosition.find(p => p.position === data.last_move.to)!
      } : null;
      
      setPosition(frontendPosition);
      setCurrentTurn(data.turn);
      setLastMove(moveObj);
      
      // Save to history
      saveToHistory(frontendPosition, data.turn, moveObj);

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
        const winner = data.turn === 'white' ? 'black' : 'white';
        toast({
          title: "Checkmate!",
          description: `${winner === 'white' ? 'White' : 'Black'} wins!`,
          variant: "default"
        });
        setGameInProgress(false);
        setShowAnalysis(false);
        recordGameResult(winner);
      } else if (data.status?.check) {
        toast({
          title: "Check!",
          description: `${data.turn.charAt(0).toUpperCase() + data.turn.slice(1)} is in check`,
          variant: "default"
        });
      } else if (data.status?.stalemate) {
        toast({
          title: "Stalemate!",
          description: "The game is a draw",
          variant: "default"
        });
        setGameInProgress(false);
        setShowAnalysis(false);
        recordGameResult('draw');
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
  }, [gameInProgress, currentTurn, playerConfig, position]);

  // Auto-trigger AI moves
  useEffect(() => {
    if (gameInProgress && isAITurn() && !isAIThinking) {
      console.log('Triggering AI move for:', currentTurn, 'isAI:', isAITurn(), 'gameInProgress:', gameInProgress, 'isAIThinking:', isAIThinking);
      triggerAIMove();
    }
  }, [gameInProgress, currentTurn, isAIThinking, triggerAIMove]); // Added triggerAIMove back

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
      setMoveHistory([]);
      setCurrentMoveIndex(-1);
      setShowAnalysis(true);

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
      setMoveHistory([]);
      setCurrentMoveIndex(-1);
      setShowAnalysis(false);
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
      
      // Save to history for human moves too
      const moveObj = { from, to, piece: frontendPosition.find(p => p.position === to)! };
      saveToHistory(frontendPosition, data.turn, moveObj);
      
      if (data.status?.checkmate) {
        const winner = data.turn === 'white' ? 'black' : 'white';
        toast({
          title: "Checkmate!",
          description: `${winner === 'white' ? 'White' : 'Black'} wins!`,
          variant: "default"
        });
        setGameInProgress(false);
        setShowAnalysis(false);
        recordGameResult(winner);
      } else if (data.status?.check) {
        toast({
          title: "Check!",
          description: `${data.turn.charAt(0).toUpperCase() + data.turn.slice(1)} is in check`,
          variant: "default"
        });
      } else if (data.status?.stalemate) {
        toast({
          title: "Stalemate!",
          description: "The game is a draw",
          variant: "default"
        });
        setGameInProgress(false);
        setShowAnalysis(false);
        recordGameResult('draw');
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

  // Fetch statistics from API
  const fetchStatistics = useCallback(async () => {
    try {
      // Fetch model stats
      const modelResponse = await fetch('http://localhost:8001/api/stats/models');
      if (modelResponse.ok) {
        const modelData = await modelResponse.json();
        setModelStats(modelData.model_stats || []);
      }

      // Fetch recent games
      const gamesResponse = await fetch('http://localhost:8001/api/stats/games?limit=20');
      if (gamesResponse.ok) {
        const gamesData = await gamesResponse.json();
        setGameResults(gamesData.games || []);
      }

      // Fetch ELO history
      const eloResponse = await fetch('http://localhost:8001/api/stats/elo-history?limit=100');
      if (eloResponse.ok) {
        const eloData = await eloResponse.json();
        setEloHistory(eloData.elo_history || []);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  }, []);

  // Initialize game state on component mount
  useEffect(() => {
    fetchGameState();
    fetchStatistics();
  }, [fetchGameState, fetchStatistics]);

  // Refresh statistics when games complete
  useEffect(() => {
    if (!gameInProgress) {
      // Delay to allow backend to save game results
      const timeoutId = setTimeout(() => {
        fetchStatistics();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [gameInProgress, fetchStatistics]);

  const getCurrentAIModel = (): AIModel | null => {
    const currentPlayer = getCurrentPlayer();
    return currentPlayer !== 'human' && typeof currentPlayer === 'object' ? currentPlayer : null;
  };

  // Record game result in ELO system
  const recordGameResult = (winner: 'white' | 'black' | 'draw') => {
    const whitePlayer = playerConfig.white;
    const blackPlayer = playerConfig.black;

    // Only record games between AI models (skip human games for now)
    if (whitePlayer !== 'human' && blackPlayer !== 'human') {
      try {
        const result = eloService.recordGameResult(
          whitePlayer.id,
          blackPlayer.id,
          winner
        );

        const whiteChange = result.whiteRatingAfter - result.whiteRatingBefore;
        const blackChange = result.blackRatingAfter - result.blackRatingBefore;

        toast({
          title: "ELO Updated",
          description: `${whitePlayer.name}: ${whiteChange > 0 ? '+' : ''}${whiteChange}, ${blackPlayer.name}: ${blackChange > 0 ? '+' : ''}${blackChange}`,
          variant: "default"
        });
      } catch (error) {
        console.error('Error recording ELO result:', error);
      }
    }
  };

  // Move navigation functions
  const goBackMove = () => {
    if (currentMoveIndex > 0) {
      const previousMove = moveHistory[currentMoveIndex - 1];
      setPosition(previousMove.position);
      setCurrentTurn(previousMove.turn);
      setLastMove(previousMove.move);
      setCurrentMoveIndex(currentMoveIndex - 1);
    } else if (currentMoveIndex === 0) {
      // Go to initial position
      setPosition(INITIAL_POSITION);
      setCurrentTurn('white');
      setLastMove(null);
      setCurrentMoveIndex(-1);
    }
  };

  const goForwardMove = () => {
    if (currentMoveIndex < moveHistory.length - 1) {
      const nextMove = moveHistory[currentMoveIndex + 1];
      setPosition(nextMove.position);
      setCurrentTurn(nextMove.turn);
      setLastMove(nextMove.move);
      setCurrentMoveIndex(currentMoveIndex + 1);
    }
  };

  const saveToHistory = (newPosition: ChessPiece[], newTurn: 'white' | 'black', move: ChessMove | null) => {
    // If we're not at the end of history, remove future moves
    const newHistory = moveHistory.slice(0, currentMoveIndex + 1);
    newHistory.push({ position: newPosition, turn: newTurn, move });
    setMoveHistory(newHistory);
    setCurrentMoveIndex(newHistory.length - 1);
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

      <div className="container mx-auto px-4 py-3">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
          {/* Left Column - Game Board */}
          <div className="xl:col-span-2 space-y-3">
            {/* Game Status */}
            <Card>
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50">
                        <span className="text-xs text-muted-foreground font-medium">Turn:</span>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-3 h-3 rounded-full shadow-sm ${
                            currentTurn === 'white' ? 'bg-white border-2 border-gray-700' : 'bg-gray-800 border border-gray-600'
                          }`} />
                          <span className="font-bold text-sm text-foreground">
                            {currentTurn.charAt(0).toUpperCase() + currentTurn.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant={gameInProgress ? (isAIThinking ? "default" : "secondary") : "outline"}
                      className={`text-xs font-medium ${isAIThinking ? 'animate-pulse' : ''}`}
                    >
                      {gameInProgress ? (isAIThinking ? "🤔 AI Thinking..." : "⚡ Game Active") : "⏸️ Game Inactive"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-xs text-muted-foreground font-medium px-2 py-1 rounded-md bg-muted/30">
                      Move {currentMoveIndex + 1} of {moveHistory.length}
                    </div>
                    <div className="flex items-center gap-0.5 border rounded-md p-0.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0 hover:bg-muted"
                        onClick={goBackMove}
                        disabled={currentMoveIndex < 0}
                        title="Previous move"
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0 hover:bg-muted"
                        onClick={goForwardMove}
                        disabled={currentMoveIndex >= moveHistory.length - 1}
                        title="Next move"
                      >
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chess Board */}
            <div className="flex justify-center">
              <div className="max-w-3xl w-full">
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
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="setup">Setup</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
              </TabsList>

              <TabsContent value="setup" className="mt-4">
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
                      aiResponse={aiResponse}
                      isThinking={isAIThinking}
                      currentModel={getCurrentAIModel()}
                      thinkingSteps={thinkingSteps}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="analysis" className="mt-4">
                <ThinkingProcess
                  aiResponse={aiResponse}
                  isThinking={isAIThinking}
                  currentModel={getCurrentAIModel()}
                  thinkingSteps={thinkingSteps}
                />
              </TabsContent>

            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
