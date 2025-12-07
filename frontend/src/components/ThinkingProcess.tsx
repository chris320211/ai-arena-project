import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Clock, Target, TrendingUp, Lightbulb, RotateCcw, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIModel } from './ModelSelector';

export type ThinkingStep = {
  id: string;
  type: 'evaluation' | 'candidate_move' | 'analysis' | 'decision';
  content: string;
  confidence?: number;
  move?: string;
  timestamp: number;
};

export type AIResponse = {
  modelId: string;
  bestMove: string;
  confidence: number;
  thinkingTime: number;
  evaluation: number;
  principalVariation: string[];
  reasoning: string;
  thinkingSteps: ThinkingStep[];
};

export type MoveHistoryEntry = {
  position: any[];
  turn: 'white' | 'black';
  move: {
    from: string;
    to: string;
    piece: any;
  } | null;
};

interface ThinkingProcessProps {
  aiResponse: AIResponse | null;
  isThinking: boolean;
  currentModel: AIModel | null;
  thinkingSteps: ThinkingStep[];
  moveHistory?: MoveHistoryEntry[];
  onResetGame?: () => void;
  whitePlayer?: AIModel | 'human';
  blackPlayer?: AIModel | 'human';
}

const ThinkingProcess = ({
  aiResponse,
  isThinking,
  currentModel,
  thinkingSteps,
  moveHistory = [],
  onResetGame,
  whitePlayer = 'human',
  blackPlayer = 'human'
}: ThinkingProcessProps) => {
  const [displayedSteps, setDisplayedSteps] = useState<ThinkingStep[]>([]);


  useEffect(() => {
    if (isThinking) {
      setDisplayedSteps(thinkingSteps);
    } else if (aiResponse) {
      setDisplayedSteps(aiResponse.thinkingSteps);
    }
  }, [thinkingSteps, aiResponse, isThinking]);

  const getStepIcon = (type: ThinkingStep['type']) => {
    switch (type) {
      case 'evaluation':
        return <TrendingUp className="w-4 h-4" />;
      case 'candidate_move':
        return <Target className="w-4 h-4" />;
      case 'analysis':
        return <Brain className="w-4 h-4" />;
      case 'decision':
        return <Lightbulb className="w-4 h-4" />;
      default:
        return <Brain className="w-4 h-4" />;
    }
  };

  const getStepColor = (type: ThinkingStep['type']) => {
    switch (type) {
      case 'evaluation':
        return 'from-blue-500 to-cyan-600';
      case 'candidate_move':
        return 'from-green-500 to-emerald-600';
      case 'analysis':
        return 'from-purple-500 to-violet-600';
      case 'decision':
        return 'from-orange-500 to-red-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const formatEvaluation = (evaluation: number) => {
    if (evaluation > 0) return `+${(evaluation / 100).toFixed(2)}`;
    return (evaluation / 100).toFixed(2);
  };

  const formatMove = (move: MoveHistoryEntry['move']) => {
    if (!move) return '';

    // Handle Go moves (just position like "K10")
    if ('position' in move && typeof move.position === 'string') {
      return move.position;
    }

    // Handle chess moves
    if ('piece' in move && move.piece && 'type' in move.piece) {
      let notation = '';
      // Add piece symbol (except for pawns)
      if (move.piece.type !== 'pawn') {
        notation += getPieceNotation(move.piece.type);
      }
      // Add destination square
      notation += move.to;
      return notation;
    }

    return '';
  };

  const getPieceNotation = (pieceType: string) => {
    const symbols: { [key: string]: string } = {
      king: 'K',
      queen: 'Q',
      rook: 'R',
      bishop: 'B',
      knight: 'N',
      pawn: ''
    };
    return symbols[pieceType] || '';
  };

  const getPlayerName = (player: AIModel | 'human') => {
    if (player === 'human') return 'Human';
    return player.name;
  };

  const getAllMoves = () => {
    // Group moves by pairs (white + black)
    const movePairs: Array<{
      moveNumber: number;
      white: { move: ChessMove | null; index: number } | null;
      black: { move: ChessMove | null; index: number } | null;
    }> = [];

    // Map through moveHistory with original indices
    const validMovesWithIndices = moveHistory
      .map((entry, originalIndex) => ({ entry, originalIndex }))
      .filter(item => item.entry.move !== null);

    for (let i = 0; i < validMovesWithIndices.length; i++) {
      const { entry, originalIndex } = validMovesWithIndices[i];
      const moveNumber = Math.floor(i / 2) + 1;

      // In Go, Black moves first (i=0 is Black)
      // In Chess, White moves first (i=0 is White)
      // Check if the move has a 'color' property to determine if it's a Go move
      const isGoMove = entry.move && 'color' in entry.move;
      const isWhite = isGoMove ? i % 2 === 1 : i % 2 === 0;

      if (isWhite) {
        movePairs.push({
          moveNumber,
          white: { move: entry.move, index: originalIndex },
          black: null
        });
      } else {
        // Add black's move to the last pair
        if (movePairs.length > 0) {
          movePairs[movePairs.length - 1].black = { move: entry.move, index: originalIndex };
        } else {
          // First move is black (Go game)
          movePairs.push({
            moveNumber,
            white: null,
            black: { move: entry.move, index: originalIndex }
          });
        }
      }
    }

    return movePairs;
  };

  return (
    <div className="space-y-4">
      {/* Move History */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-br from-muted/30 to-muted/10">
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <History className="w-5 h-5 text-primary" />
              </div>
              Move History
            </CardTitle>

            {/* Move counter */}
            <Badge variant="secondary" className="px-3 py-1">
              {moveHistory.length > 0 ? `${moveHistory.length} move${moveHistory.length !== 1 ? 's' : ''}` : 'No moves'}
            </Badge>
          </div>

          {/* Player Info Cards */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            {/* White Player */}
            <div className="bg-white dark:bg-white/10 backdrop-blur-sm rounded-lg p-2 border-2 border-gray-300 dark:border-white/20">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white border-2 border-gray-800 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">White</div>
                  <div className="text-xs font-bold truncate text-gray-900 dark:text-white">{getPlayerName(whitePlayer)}</div>
                </div>
              </div>
            </div>

            {/* Black Player */}
            <div className="bg-gray-900 dark:bg-gray-900/60 backdrop-blur-sm rounded-lg p-2 border-2 border-gray-700 dark:border-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-900 dark:bg-gray-800 border-2 border-gray-300 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">Black</div>
                  <div className="text-xs font-bold truncate text-white dark:text-gray-100">{getPlayerName(blackPlayer)}</div>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Column Headers */}
          <div className="flex items-center text-xs font-semibold bg-muted/50 border-y px-4 py-2">
            <div className="w-12 text-muted-foreground">#</div>
            <div className="flex-1 px-2">White</div>
            <div className="flex-1 px-2">Black</div>
          </div>

          {/* Moves List */}
          <ScrollArea className="h-64">
            <div className="px-2 py-1">
              {getAllMoves().length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <History className="w-12 h-12 opacity-20 mb-2" />
                  <p className="text-sm">No moves yet</p>
                </div>
              ) : (
                getAllMoves().map((movePair, index) => (
                  <div
                    key={`move-pair-${movePair.moveNumber}`}
                    className={cn(
                      "flex items-center text-sm transition-colors rounded-lg px-2 py-1.5",
                      "hover:bg-muted/50",
                      index % 2 === 0 ? "bg-muted/20" : ""
                    )}
                  >
                    {/* Move number */}
                    <div className="w-12 text-muted-foreground text-xs font-bold">
                      {movePair.moveNumber}.
                    </div>

                    {/* White's move */}
                    <div className="flex-1 px-2">
                      {movePair.white ? (
                        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-white/60 dark:bg-white/5 border border-gray-200 dark:border-gray-700">
                          <span className="font-mono text-sm font-semibold">
                            {formatMove(movePair.white.move)}
                          </span>
                        </div>
                      ) : (
                        <div className="px-3 py-1 text-muted-foreground text-xs">—</div>
                      )}
                    </div>

                    {/* Black's move */}
                    <div className="flex-1 px-2">
                      {movePair.black ? (
                        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-gray-900/60 dark:bg-gray-900/20 border border-gray-700 dark:border-gray-600">
                          <span className="font-mono text-sm font-semibold text-white dark:text-gray-200">
                            {formatMove(movePair.black.move)}
                          </span>
                        </div>
                      ) : (
                        <div className="px-3 py-1 text-muted-foreground text-xs">—</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* AI Analysis */}
      <Card className="w-full flex flex-col">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-primary" />
              AI Analysis
            </div>
            {currentModel && (
              <Badge variant="outline" className="flex items-center gap-1">
                {currentModel.icon}
                {currentModel.name}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
      
      <CardContent className="overflow-hidden h-48 flex items-center justify-center">
        {!isThinking && !aiResponse ? (
          <div className="flex items-center justify-center w-full h-full text-muted-foreground">
            <Brain className="w-12 h-12 opacity-50" />
          </div>
        ) : (
          <ScrollArea className="h-full w-full">
            {isThinking ? (
              <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Clock className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">Analyzing position...</span>
              </div>

              <div className="space-y-3">
                {displayedSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className={cn(
                      "p-3 rounded-lg border transition-all duration-300",
                      "animate-fade-in",
                      index === displayedSteps.length - 1 && isThinking && "ring-2 ring-primary/30"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-1.5 rounded-full bg-gradient-to-r flex-shrink-0",
                        getStepColor(step.type)
                      )}>
                        {getStepIcon(step.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground">
                          {step.content}
                        </div>
                        {step.move && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {step.move}
                          </Badge>
                        )}
                        {step.confidence && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-1.5">
                              <div
                                className="bg-primary h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${step.confidence}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {step.confidence}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              </div>
            ) : (
              <div className="space-y-4">
              {/* Final Decision */}
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-primary">Best Move</h3>
                  <Badge className="bg-primary text-primary-foreground">
                    {aiResponse.bestMove}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {aiResponse.reasoning}
                </p>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Confidence:</span>
                    <div className="font-medium">{aiResponse.confidence}%</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Evaluation:</span>
                    <div className={cn(
                      "font-medium",
                      aiResponse.evaluation > 0 ? "text-green-500" :
                      aiResponse.evaluation < 0 ? "text-red-500" : "text-muted-foreground"
                    )}>
                      {formatEvaluation(aiResponse.evaluation)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Time:</span>
                    <div className="font-medium">{aiResponse.thinkingTime}ms</div>
                  </div>
                </div>
              </div>

              {/* Principal Variation */}
              {aiResponse.principalVariation.length > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Principal Variation:</h4>
                  <div className="flex flex-wrap gap-1">
                    {aiResponse.principalVariation.map((move, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {index + 1}. {move}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Thinking Steps */}
              <div className="space-y-3">
                {displayedSteps.map((step) => (
                  <div key={step.id} className="p-3 rounded-lg border">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-1.5 rounded-full bg-gradient-to-r flex-shrink-0",
                        getStepColor(step.type)
                      )}>
                        {getStepIcon(step.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground">
                          {step.content}
                        </div>
                        {step.move && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {step.move}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
      </Card>

      {/* Reset Button */}
      {onResetGame && (
        <Button
          onClick={onResetGame}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white"
          size="lg"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Game
        </Button>
      )}
    </div>
  );
};

export default ThinkingProcess;