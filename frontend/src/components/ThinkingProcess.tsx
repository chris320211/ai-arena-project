import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Clock, Target, TrendingUp, Lightbulb } from 'lucide-react';
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

interface ThinkingProcessProps {
  aiResponse: AIResponse | null;
  isThinking: boolean;
  currentModel: AIModel | null;
  thinkingSteps: ThinkingStep[];
}

const ThinkingProcess = ({ 
  aiResponse, 
  isThinking, 
  currentModel,
  thinkingSteps 
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

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            AI Thinking Process
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
  );
};

export default ThinkingProcess;