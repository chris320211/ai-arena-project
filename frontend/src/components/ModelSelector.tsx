import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, User, Zap, Target, Cpu } from 'lucide-react';
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
    id: 'llama3:8b',
    name: 'Llama 3 (8B)',
    description: 'Balanced reasoning and efficient general knowledge',
    strength: 1150,
    style: 'Strategic & Versatile',
    icon: <Brain className="w-5 h-5" />,
    color: 'from-green-500 to-emerald-600'
  },
  {
    id: 'phi3.5',
    name: 'Phi 3.5',
    description: 'Lightweight but precise with strong math ability',
    strength: 1200,
    style: 'Compact & Tactical',
    icon: <Target className="w-5 h-5" />,
    color: 'from-blue-500 to-cyan-600'
  },
  {
    id: 'gemini',
    name: 'Gemini Pro',
    description: 'Creative and adaptive gameplay',
    strength: 2300,
    style: 'Dynamic',
    icon: <Zap className="w-5 h-5" />,
    color: 'from-purple-500 to-violet-600'
  },
  {
    id: 'custom',
    name: 'Custom AI',
    description: 'Your own trained model',
    strength: 2200,
    style: 'Experimental',
    icon: <Cpu className="w-5 h-5" />,
    color: 'from-orange-500 to-red-600'
  }
];

interface ModelSelectorProps {
  playerConfig: PlayerConfig;
  onConfigChange: (config: PlayerConfig) => void;
  gameInProgress: boolean;
}

const ModelSelector = ({ playerConfig, onConfigChange, gameInProgress }: ModelSelectorProps) => {
  const [selectedSide, setSelectedSide] = useState<'white' | 'black'>('white');

  const handlePlayerSelect = (player: 'human' | AIModel) => {
    onConfigChange({
      ...playerConfig,
      [selectedSide]: player
    });
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
            <div className="text-left">
              <div className="font-medium">Human Player</div>
              <div className="text-xs opacity-75">Play yourself</div>
            </div>
          </Button>

          {/* AI Model Options */}
          {AI_MODELS.map(model => (
            <Button
              key={model.id}
              variant={playerConfig[selectedSide] === model ? 'default' : 'outline'}
              onClick={() => handlePlayerSelect(model)}
              disabled={gameInProgress}
              className="w-full justify-start p-4 h-auto"
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ModelSelector;
export { AI_MODELS };