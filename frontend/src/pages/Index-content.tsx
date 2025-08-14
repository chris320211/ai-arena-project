import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Settings } from 'lucide-react';
import ChessBoard, { ChessMove } from '@/components/ChessBoard';
import ModelSelector, { PlayerConfig } from '@/components/ModelSelector';
import ThinkingProcess, { AIResponse, ThinkingStep } from '@/components/ThinkingProcess';
import GameStats, { GameResult, ModelStats } from '@/components/GameStats';

interface IndexContentProps {
  // Chess game state
  position: any[];
  selectedSquare: string | null;
  validMoves: string[];
  currentTurn: 'white' | 'black';
  gameInProgress: boolean;
  lastMove: ChessMove | null;
  playerConfig: PlayerConfig;
  isAIThinking: boolean;
  aiResponse: AIResponse | null;
  thinkingSteps: ThinkingStep[];
  gameResults: GameResult[];
  modelStats: ModelStats[];
  
  // Event handlers
  onSquareClick: (square: string) => void;
  onConfigChange: (config: PlayerConfig) => void;
  onStartGame: () => void;
  onResetGame: () => void;
  getCurrentAIModel: () => any;
}

const IndexContent = ({
  position,
  selectedSquare,
  validMoves,
  currentTurn,
  gameInProgress,
  lastMove,
  playerConfig,
  isAIThinking,
  aiResponse,
  thinkingSteps,
  gameResults,
  modelStats,
  onSquareClick,
  onConfigChange,
  onStartGame,
  onResetGame,
  getCurrentAIModel
}: IndexContentProps) => {
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
                    Move #{Math.floor((position.length - 32) / 2) + 1}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chess Board */}
            <div className="flex justify-center">
              <div className="max-w-2xl w-full">
                <ChessBoard
                  position={position}
                  onMove={() => {}} // Handled by onSquareClick
                  validMoves={validMoves}
                  selectedSquare={selectedSquare}
                  onSquareClick={onSquareClick}
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
                  onConfigChange={onConfigChange}
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
                    aiModels={[]} // Pass AI_MODELS from parent
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

export default IndexContent;