import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Target, Clock, TrendingUp, Medal, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIModel } from './ModelSelector';

export type GameResult = {
  _id: string;
  white_model: string;
  black_model: string;
  winner: 'white' | 'black' | null;
  moves: number;
  duration: number;
  end_reason: 'checkmate' | 'resignation' | 'stalemate' | 'draw' | 'timeout';
  timestamp: string;
};

export type ModelStats = {
  model_id: string;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
  avg_move_time: number;
  rating: number;
};

interface GameStatsProps {
  modelStats: ModelStats[];
  recentGames: GameResult[];
  aiModels: AIModel[];
}

const GameStats = ({ modelStats, recentGames, aiModels }: GameStatsProps) => {
  const getModelById = (id: string) => {
    return aiModels.find(model => model.id === id);
  };

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 70) return 'text-green-500';
    if (winRate >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getRatingChangeColor = (change: number) => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getEndReasonBadge = (reason: GameResult['end_reason']) => {
    const variants = {
      checkmate: { variant: 'destructive' as const, icon: <Crown className="w-3 h-3" /> },
      resignation: { variant: 'secondary' as const, icon: <Target className="w-3 h-3" /> },
      stalemate: { variant: 'outline' as const, icon: <Medal className="w-3 h-3" /> },
      draw: { variant: 'outline' as const, icon: <Medal className="w-3 h-3" /> },
      timeout: { variant: 'secondary' as const, icon: <Clock className="w-3 h-3" /> }
    };
    
    const config = variants[reason];
    return (
      <Badge variant={config.variant} className="text-xs flex items-center gap-1">
        {config.icon}
        {reason.charAt(0).toUpperCase() + reason.slice(1)}
      </Badge>
    );
  };

  // Sort models by rating
  const sortedStats = [...modelStats].sort((a, b) => b.rating - a.rating);

  return (
    <div className="space-y-6">
      {/* Model Rankings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-accent" />
            Model Rankings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedStats.map((stats, index) => {
              const model = getModelById(stats.model_id);
              if (!model) return null;

              return (
                <div key={stats.model_id} className="flex items-center gap-4 p-3 rounded-lg border">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        index === 0 ? "bg-yellow-500 text-yellow-900" :
                        index === 1 ? "bg-gray-400 text-gray-900" :
                        index === 2 ? "bg-orange-600 text-white" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {index + 1}
                      </span>
                      <div className={cn(
                        "p-2 rounded-lg bg-gradient-to-r",
                        model.color
                      )}>
                        {model.icon}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{model.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {stats.rating} ELO
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {stats.games_played} games • 
                        <span className={cn("ml-1", getWinRateColor(stats.win_rate))}>
                          {stats.win_rate.toFixed(1)}% win rate
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {stats.wins}W {stats.draws}D {stats.losses}L
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Avg: {Math.round(stats.avg_move_time)}s
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Overall Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Overall Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {recentGames.length}
              </div>
              <div className="text-sm text-muted-foreground">Total Games</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {recentGames.filter(g => g.end_reason === 'checkmate').length}
              </div>
              <div className="text-sm text-muted-foreground">Checkmates</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">
                {recentGames.filter(g => g.winner === null).length}
              </div>
              <div className="text-sm text-muted-foreground">Draws</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">
                {Math.round(recentGames.reduce((acc, g) => acc + g.duration, 0) / recentGames.length / 60) || 0}
              </div>
              <div className="text-sm text-muted-foreground">Avg Game (min)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Games */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            Recent Games
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentGames.slice(0, 10).map((game) => {
              const whiteModel = getModelById(game.white_model);
              const blackModel = getModelById(game.black_model);
              
              return (
                <div key={game._id} className="flex items-center gap-4 p-3 rounded-lg border">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-white border border-gray-800 rounded-full" />
                      <span className="text-sm font-medium">
                        {whiteModel?.name || (game.white_model === 'human' ? 'Human' : game.white_model)}
                      </span>
                    </div>
                    
                    <span className="text-muted-foreground">vs</span>
                    
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-gray-800 rounded-full" />
                      <span className="text-sm font-medium">
                        {blackModel?.name || (game.black_model === 'human' ? 'Human' : game.black_model)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={
                        game.winner === 'white' ? 'default' : 
                        game.winner === 'black' ? 'secondary' : 
                        'outline'
                      }
                      className="text-xs"
                    >
                      {game.winner === null ? 'Draw' : 
                       game.winner === 'white' ? 'White Wins' : 'Black Wins'}
                    </Badge>
                    
                    {getEndReasonBadge(game.end_reason)}
                    
                    <div className="text-xs text-muted-foreground">
                      {game.moves} moves • {formatDuration(game.duration)}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {recentGames.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No games played yet. Start a game to see statistics!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GameStats;