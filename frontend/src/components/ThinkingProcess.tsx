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
  currentMoveIndex?: number;
  onMoveSelect?: (index: number) => void;
}

const ThinkingProcess = ({
  aiResponse,
  isThinking,
  currentModel,
  thinkingSteps,
  moveHistory = [],
  onResetGame,
  currentMoveIndex = -1,
  onMoveSelect
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
    let notation = '';

    // Add piece symbol (except for pawns)
    if (move.piece.type !== 'pawn') {
      notation += getPieceNotation(move.piece.type);
    }

    // Add destination square
    notation += move.to;

    return notation;
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

  const getAllMoves = () => {
    // Group moves by pairs (white + black)
    const movePairs: Array<{
      moveNumber: number;
      white: { move: ChessMove | null; index: number } | null;
      black: { move: ChessMove | null; index: number } | null;
    }> = [];

    const validMoves = moveHistory.filter(entry => entry.move !== null);

    for (let i = 0; i < validMoves.length; i++) {
      const moveNumber = Math.floor(i / 2) + 1;
      const isWhite = i % 2 === 0;

      if (isWhite) {
        movePairs.push({
          moveNumber,
          white: { move: validMoves[i].move, index: i },
          black: null
        });
      } else {
        // Add black's move to the last pair
        if (movePairs.length > 0) {
          movePairs[movePairs.length - 1].black = { move: validMoves[i].move, index: i };
        }
      }
    }

    return movePairs;
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Move History */}
      <Card className="flex-1">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <History className="w-6 h-6 text-primary" />
            Move History
          </CardTitle>

          {/* Spacer */}
          <div className="h-2"></div>

          {/* Column Headers */}
          <div className="flex items-center text-xs text-muted-foreground font-medium border-b pb-2">
            <div className="w-12">#</div>
            <div className="flex-1 px-2">White</div>
            <div className="flex-1 px-2">Black</div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 pt-4">
          <ScrollArea className="h-32">
            <div className="space-y-1">
              {getAllMoves().map((movePair) => (
                <div key={`move-pair-${movePair.moveNumber}`} className="flex items-center text-sm hover:bg-muted/30 rounded px-1 py-1">
                  {/* Move number */}
                  <div className="w-12 text-gray-500 text-xs font-medium">
                    {movePair.moveNumber}.
                  </div>

                  {/* White's move */}
                  <div className="flex-1 px-2">
                    {movePair.white ? (
                      <button
                        className={cn(
                          "text-left hover:bg-blue-100 rounded px-2 py-1 font-mono text-sm w-full",
                          currentMoveIndex === movePair.white.index && "bg-blue-200 font-bold"
                        )}
                        onClick={() => onMoveSelect?.(movePair.white!.index)}
                      >
                        {formatMove(movePair.white.move)}
                      </button>
                    ) : (
                      <div className="px-2 py-1 text-muted-foreground">-</div>
                    )}
                  </div>

                  {/* Black's move */}
                  <div className="flex-1 px-2">
                    {movePair.black ? (
                      <button
                        className={cn(
                          "text-left hover:bg-blue-100 rounded px-2 py-1 font-mono text-sm w-full",
                          currentMoveIndex === movePair.black.index && "bg-blue-200 font-bold"
                        )}
                        onClick={() => onMoveSelect?.(movePair.black!.index)}
                      >
                        {formatMove(movePair.black.move)}
                      </button>
                    ) : (
                      <div className="px-2 py-1 text-muted-foreground">-</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* AI Analysis */}
      <Card className="w-full h-full flex flex-col">
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
      
      <CardContent className="flex-1 overflow-hidden">
        {isThinking ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Clock className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Analyzing position...</span>
            </div>
            
            <ScrollArea className="h-64">
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
            </ScrollArea>
          </div>
        ) : aiResponse ? (
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
            <ScrollArea className="h-48">
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
            </ScrollArea>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select an AI model and make a move to see the thinking process</p>
            </div>
          </div>
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