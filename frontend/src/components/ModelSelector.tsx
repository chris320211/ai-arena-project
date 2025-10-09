import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, User, Target, Cpu, Sparkles, Zap, Globe, Play, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AIModel = {
  id: string;
  name: string;
  description: string;
  strength: number;
  style: string;
  icon: React.ReactNode;
  color: string;
};

export type PlayerConfig = {
  white: 'human' | AIModel;
  black: 'human' | AIModel;
};

const AI_MODELS: AIModel[] = [
  {
    id: 'openai_gpt4o_mini',
    name: 'GPT-4o Mini',
    description: 'Efficient and capable AI',
    strength: 2100,
    style: 'Analytical & Precise',
    icon: <Brain className="w-5 h-5" />,
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'anthropic_claude_haiku',
    name: 'Claude Haiku',
    description: 'Fast and intelligent reasoning',
    strength: 1900,
    style: 'Quick & Precise',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'from-violet-500 to-purple-600'
  },
  {
    id: 'ollama_phi35',
    name: 'Phi 3.5',
    description: 'Lightweight with strong math',
    strength: 1200,
    style: 'Compact & Tactical',
    icon: <Target className="w-5 h-5" />,
    color: 'from-blue-500 to-cyan-600'
  },
  {
    id: 'random',
    name: 'Random AI',
    description: 'Random moves for testing',
    strength: 800,
    style: 'Unpredictable',
    icon: <Cpu className="w-5 h-5" />,
    color: 'from-orange-500 to-red-600'
  },
  // New API-based models (these will only show if the backend has them available)
  {
    id: 'anthropic_claude_sonnet',
    name: 'Claude Sonnet',
    description: 'Most capable with excellent reasoning',
    strength: 2300,
    style: 'Deep & Thoughtful',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'from-purple-500 to-indigo-600'
  },
  {
    id: 'gemini_pro',
    name: 'Gemini 1.5 Pro',
    description: 'Multimodal with strong analytics',
    strength: 2200,
    style: 'Analytical & Creative',
    icon: <Brain className="w-5 h-5" />,
    color: 'from-blue-500 to-purple-600'
  },
  {
    id: 'openai_gpt4o',
    name: 'GPT-4o',
    description: 'Flagship with advanced reasoning',
    strength: 2400,
    style: 'Sophisticated & Strategic',
    icon: <Brain className="w-5 h-5" />,
    color: 'from-emerald-600 to-blue-600'
  },
  // Custom AI slots
  {
    id: 'custom_ai_1',
    name: 'Custom AI 1',
    description: 'Custom AI via API',
    strength: 1800,
    style: 'Custom Strategy',
    icon: <Zap className="w-5 h-5" />,
    color: 'from-yellow-500 to-orange-600'
  },
  {
    id: 'custom_ai_2',
    name: 'Custom AI 2',
    description: 'Custom AI via API',
    strength: 1800,
    style: 'Custom Strategy',
    icon: <Globe className="w-5 h-5" />,
    color: 'from-pink-500 to-rose-600'
  },
  {
    id: 'custom_ai_3',
    name: 'Custom AI 3',
    description: 'Custom AI via API',
    strength: 1800,
    style: 'Custom Strategy',
    icon: <Target className="w-5 h-5" />,
    color: 'from-violet-500 to-purple-600'
  }
];

interface ModelSelectorProps {
  playerConfig: PlayerConfig;
  onConfigChange: (config: PlayerConfig) => void;
  gameInProgress: boolean;
  onStartGame?: () => void;
  onResetGame?: () => void;
}

const ModelSelector = ({ playerConfig, onConfigChange, gameInProgress, onStartGame, onResetGame }: ModelSelectorProps) => {
  const [selectedSide, setSelectedSide] = useState<'white' | 'black'>('white');

  const handlePlayerSelect = (player: 'human' | AIModel) => {
    onConfigChange({
      ...playerConfig,
      [selectedSide]: player
    });
  };

  const isModelAlreadySelected = (model: AIModel): boolean => {
    const oppositeSide = selectedSide === 'white' ? 'black' : 'white';
    const oppositePlayer = playerConfig[oppositeSide];
    return oppositePlayer !== 'human' && oppositePlayer.id === model.id;
  };

  const getPlayerDisplay = (player: 'human' | AIModel) => {
    if (player === 'human') {
      return {
        name: 'Human Player',
        icon: <User className="w-5 h-5" />,
        color: 'from-gray-500 to-gray-600'
      };
    }
    return player;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-primary" />
          Player Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Side Selection */}
        <div className="flex gap-2">
          {(['white', 'black'] as const).map(side => (
            <Button
              key={side}
              variant={selectedSide === side ? 'default' : 'outline'}
              onClick={() => setSelectedSide(side)}
              disabled={gameInProgress}
              className="flex-1"
            >
              <div className={cn(
                "w-4 h-4 rounded-full mr-2",
                side === 'white' ? 'bg-white border-2 border-gray-800' : 'bg-gray-800'
              )} />
              {side.charAt(0).toUpperCase() + side.slice(1)}
            </Button>
          ))}
        </div>

        {/* Current Selection Display */}
        <div className="grid grid-cols-2 gap-4">
          {(['white', 'black'] as const).map(side => {
            const player = getPlayerDisplay(playerConfig[side]);
            return (
              <div
                key={side}
                className={cn(
                  "p-3 rounded-lg border-2 transition-all",
                  selectedSide === side ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    side === 'white' ? 'bg-white border border-gray-800' : 'bg-gray-800'
                  )} />
                  <span className="text-sm font-medium">{side.charAt(0).toUpperCase() + side.slice(1)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "p-1 rounded bg-gradient-to-r",
                    player.color
                  )}>
                    {player.icon}
                  </div>
                  <span className="text-sm">{player.name}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Start Game Button */}
        {onStartGame && (
          <Button
            onClick={onStartGame}
            disabled={gameInProgress}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
            size="lg"
          >
            <Play className="w-4 h-4" />
            Start New Game
          </Button>
        )}

        {/* Player Options */}
        <div className="space-y-3">
          {/* Human Player Option */}
          <Button
            variant={playerConfig[selectedSide] === 'human' ? 'default' : 'outline'}
            onClick={() => handlePlayerSelect('human')}
            disabled={gameInProgress}
            className="w-full justify-start"
          >
            <User className="w-5 h-5 mr-3" />
            <div className="font-medium">Human Player</div>
          </Button>

          {/* AI Model Options */}
          <div className="h-[25rem] overflow-y-auto overflow-x-hidden space-y-3 pr-3">
            {AI_MODELS.map(model => {
              const isSelected = playerConfig[selectedSide] === model;
              const isAlreadySelected = isModelAlreadySelected(model);
              const isDisabled = gameInProgress || isAlreadySelected;

              return (
              <Button
                key={model.id}
                variant={isSelected ? 'default' : 'outline'}
                onClick={() => handlePlayerSelect(model)}
                disabled={isDisabled}
                className={cn(
                  "w-full justify-start p-4 h-auto mr-2",
                  isAlreadySelected && !isSelected && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className={cn(
                  "p-2 rounded-lg bg-gradient-to-r mr-3",
                  model.color
                )}>
                  {model.icon}
                </div>
                <div className="text-left flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{model.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {model.strength} ELO
                    </Badge>
                  </div>
                  <div className="text-xs opacity-75 mb-1">{model.description}</div>
                  <div className="text-xs">
                    <span className="text-accent font-medium">{model.style}</span> Style
                  </div>
                </div>
              </Button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ModelSelector;
export { AI_MODELS };