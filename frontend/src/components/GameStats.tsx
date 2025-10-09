import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trophy, Target, Clock, TrendingUp, Medal, Crown, BarChart3, Zap, Users, Activity, ArrowLeftRight } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
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

export type EloHistoryEntry = {
  id: string;
  model_id: string;
  rating_before: number;
  rating_after: number;
  rating_change: number;
  opponent: string;
  game_result: 'win' | 'loss' | 'draw';
  timestamp: string;
  game_id: string;
};

interface GameStatsProps {
  modelStats: ModelStats[];
  recentGames: GameResult[];
  aiModels: AIModel[];
  eloHistory?: EloHistoryEntry[];
}

const GameStats = ({ modelStats, recentGames, aiModels, eloHistory = [] }: GameStatsProps) => {
  const [selectedModel1, setSelectedModel1] = useState<string>('');
  const [selectedModel2, setSelectedModel2] = useState<string>('');

  const getModelById = (id: string) => {
    return aiModels.find(model => model.id === id);
  };

  // Handle model selection with validation
  const handleModel1Change = (value: string) => {
    setSelectedModel1(value);
    // If the same model is selected for both, clear the second selection
    if (value === selectedModel2 && value !== '') {
      setSelectedModel2('');
    }
  };

  const handleModel2Change = (value: string) => {
    setSelectedModel2(value);
    // If the same model is selected for both, clear the first selection
    if (value === selectedModel1 && value !== '') {
      setSelectedModel1('');
    }
  };

  // Switch the sides of the selected models
  const handleSwitchModels = () => {
    const temp = selectedModel1;
    setSelectedModel1(selectedModel2);
    setSelectedModel2(temp);
  };

  // Filter data based on selected models
  const getFilteredData = () => {
    // If no models are selected, show no data
    if (!selectedModel1 && !selectedModel2) {
      return { filteredGames: [], filteredStats: [] };
    }

    let filteredGames = recentGames;
    let filteredStats = modelStats;

    // If both specific models are selected, show head-to-head comparison
    if (selectedModel1 && selectedModel2) {
      filteredGames = recentGames.filter(game =>
        (game.white_model === selectedModel1 && game.black_model === selectedModel2) ||
        (game.white_model === selectedModel2 && game.black_model === selectedModel1)
      );
      filteredStats = modelStats.filter(stat =>
        stat.model_id === selectedModel1 || stat.model_id === selectedModel2
      );
    } else if (selectedModel1) {
      // Show games involving the first selected model
      filteredGames = recentGames.filter(game =>
        game.white_model === selectedModel1 || game.black_model === selectedModel1
      );
      filteredStats = modelStats.filter(stat => stat.model_id === selectedModel1);
    } else if (selectedModel2) {
      // Show games involving the second selected model
      filteredGames = recentGames.filter(game =>
        game.white_model === selectedModel2 || game.black_model === selectedModel2
      );
      filteredStats = modelStats.filter(stat => stat.model_id === selectedModel2);
    }

    return { filteredGames, filteredStats };
  };

  const { filteredGames, filteredStats } = getFilteredData();

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 70) return 'text-green-500';
    if (winRate >= 50) return 'text-yellow-500';
    return 'text-red-500';
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
  const sortedStats = [...filteredStats].sort((a, b) => b.rating - a.rating);

  // Prepare chart data
  const performanceChartData = sortedStats.map((stats) => {
    const model = getModelById(stats.model_id);
    return {
      name: model?.name || stats.model_id,
      rating: stats.rating,
      winRate: stats.win_rate,
      games: stats.games_played,
      wins: stats.wins,
      losses: stats.losses,
      draws: stats.draws
    };
  });

  const gameResultsData = [
    { name: 'White Wins', value: filteredGames.filter(g => g.winner === 'white').length, color: '#ffffff' },
    { name: 'Black Wins', value: filteredGames.filter(g => g.winner === 'black').length, color: '#000000' },
    { name: 'Draws', value: filteredGames.filter(g => g.winner === null).length, color: '#888888' }
  ];

  const endReasonsData = [
    { name: 'Checkmate', value: filteredGames.filter(g => g.end_reason === 'checkmate').length, color: '#ef4444' },
    { name: 'Resignation', value: filteredGames.filter(g => g.end_reason === 'resignation').length, color: '#f97316' },
    { name: 'Stalemate', value: filteredGames.filter(g => g.end_reason === 'stalemate').length, color: '#eab308' },
    { name: 'Timeout', value: filteredGames.filter(g => g.end_reason === 'timeout').length, color: '#6366f1' }
  ].filter(item => item.value > 0);

  // Model matchup matrix
  const createMatchupMatrix = () => {
    const matrix: { [white: string]: { [black: string]: { wins: number, losses: number, draws: number } } } = {};

    filteredGames.forEach(game => {
      const whiteModel = getModelById(game.white_model)?.name || game.white_model;
      const blackModel = getModelById(game.black_model)?.name || game.black_model;
      
      if (!matrix[whiteModel]) matrix[whiteModel] = {};
      if (!matrix[whiteModel][blackModel]) matrix[whiteModel][blackModel] = { wins: 0, losses: 0, draws: 0 };
      
      if (game.winner === 'white') matrix[whiteModel][blackModel].wins++;
      else if (game.winner === 'black') matrix[whiteModel][blackModel].losses++;
      else matrix[whiteModel][blackModel].draws++;
    });
    
    return matrix;
  };

  const matchupMatrix = createMatchupMatrix();

  const chartConfig = {
    rating: {
      label: "ELO Rating",
      color: "hsl(var(--chart-1))",
    },
    winRate: {
      label: "Win Rate %",
      color: "hsl(var(--chart-2))",
    },
    games: {
      label: "Games Played",
      color: "hsl(var(--chart-3))",
    },
  };

  // Prepare ELO trend data
  const eloTrendData = eloHistory.length > 0 ? (() => {
    // Group by model and sort by timestamp
    const groupedHistory: { [modelId: string]: EloHistoryEntry[] } = {};
    eloHistory.forEach(entry => {
      if (!groupedHistory[entry.model_id]) {
        groupedHistory[entry.model_id] = [];
      }
      groupedHistory[entry.model_id].push(entry);
    });

    // Create trend data for chart
    const trendData: { [timestamp: string]: any } = {};
    Object.entries(groupedHistory).forEach(([modelId, entries]) => {
      entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      entries.forEach(entry => {
        const timeKey = new Date(entry.timestamp).toLocaleDateString();
        if (!trendData[timeKey]) {
          trendData[timeKey] = { date: timeKey };
        }
        trendData[timeKey][modelId] = entry.rating_after;
      });
    });

    return Object.values(trendData).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  })() : [];

  return (
    <div className="w-full space-y-4">
      {/* Model Comparison Selectors */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-accent" />
              <h3 className="font-semibold">Head-to-Head Analysis</h3>
            </div>
            <div className="flex flex-col md:flex-row items-end gap-4 w-full max-w-4xl mx-auto">
              <div className="bg-card border border-border/60 rounded-lg p-5 space-y-4 flex-1 min-w-0 w-full md:w-auto">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 bg-white border-2 border-gray-700 rounded-full flex-shrink-0" />
                  <label className="text-sm font-semibold">White Model</label>
                </div>
                <Select value={selectedModel1} onValueChange={handleModel1Change}>
                  <SelectTrigger className="h-11 px-4 w-full">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="human"
                      disabled={selectedModel2 === 'human'}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-gradient-to-r from-green-500 to-blue-500"></div>
                        Human Player
                      </div>
                    </SelectItem>
                    {aiModels.map(model => (
                      <SelectItem
                        key={model.id}
                        value={model.id}
                        disabled={selectedModel2 === model.id}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn("w-3 h-3 rounded bg-gradient-to-r", model.color)}></div>
                          {model.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-card border border-border/60 rounded-lg p-5 space-y-4 flex-1 min-w-0 w-full md:w-auto">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 bg-gray-800 rounded-full flex-shrink-0" />
                  <label className="text-sm font-semibold">Black Model</label>
                </div>
                <Select value={selectedModel2} onValueChange={handleModel2Change}>
                  <SelectTrigger className="h-11 px-4 w-full">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="human"
                      disabled={selectedModel1 === 'human'}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-gradient-to-r from-green-500 to-blue-500"></div>
                        Human Player
                      </div>
                    </SelectItem>
                    {aiModels.map(model => (
                      <SelectItem
                        key={model.id}
                        value={model.id}
                        disabled={selectedModel1 === model.id}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn("w-3 h-3 rounded bg-gradient-to-r", model.color)}></div>
                          {model.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSwitchModels}
                disabled={!selectedModel1 && !selectedModel2}
                className="h-8 px-3 gap-2"
                title="Switch models"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span className="text-xs">Switch</span>
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Select both models to view their head-to-head performance statistics and match history. Each model's performance will be shown for their respective color.
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-auto p-1">
          <TabsTrigger value="overview" className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-2 py-1.5 h-auto">Overview</TabsTrigger>
          <TabsTrigger value="performance" className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-2 py-1.5 h-auto">Perf</TabsTrigger>
          <TabsTrigger value="trends" className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-2 py-1.5 h-auto">ELO</TabsTrigger>
          <TabsTrigger value="matchups" className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-2 py-1.5 h-auto">Match</TabsTrigger>
          <TabsTrigger value="games" className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-2 py-1.5 h-auto">Games</TabsTrigger>
        </TabsList>
      
      <TabsContent value="overview" className="mt-4 space-y-4">
        {!selectedModel1 || !selectedModel2 ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Select Two Models to Compare</h3>
                <p className="text-sm">Choose both models from the dropdowns above to view their head-to-head statistics and match history.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
        <>
        {/* Head-to-Head Performance */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-center gap-3">
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 border-2 border-blue-300 rounded-lg shadow-md flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-foreground">Head-to-Head Performance</div>
                <div className="text-sm text-muted-foreground mt-1">Win/Loss breakdown by model and color</div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* White Model Performance */}
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="w-4 h-4 bg-white border-2 border-gray-700 rounded-full flex-shrink-0" />
                  <span className="text-sm font-semibold">White Model</span>
                </div>
                {(() => {
                  const model = getModelById(selectedModel1);
                  const modelName = selectedModel1 === 'human' ? 'Human' : model?.name?.split(' ')[0] || selectedModel1;
                  const asWhiteGames = filteredGames.filter(g => g.white_model === selectedModel1);
                  const whiteWins = asWhiteGames.filter(g => g.winner === 'white').length;
                  const whiteTotal = asWhiteGames.length;
                  const winRate = whiteTotal > 0 ? (whiteWins / whiteTotal) * 100 : 0;

                  return (
                    <div className="bg-card border border-border/60 rounded-lg p-4 h-24 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {selectedModel1 === 'human' ? (
                            <div className="p-1.5 rounded-md bg-gradient-to-r from-green-500 to-blue-500 shadow-sm flex-shrink-0">
                              <Users className="w-3 h-3 text-white" />
                            </div>
                          ) : model && (
                            <div className={cn("p-1.5 rounded-md bg-gradient-to-r shadow-sm flex-shrink-0", model.color)}>
                              <div className="w-3 h-3 flex items-center justify-center">
                                {model.icon}
                              </div>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm truncate">{modelName}</div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-lg font-bold">{whiteWins}<span className="text-muted-foreground text-sm">/{whiteTotal}</span></div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Win Rate</span>
                          <span className={cn("text-sm font-bold", getWinRateColor(winRate))}>
                            {winRate.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
                          <div
                            className={cn("h-full transition-all duration-500 rounded-full",
                              winRate >= 70 ? "bg-green-500" :
                              winRate >= 50 ? "bg-yellow-500" : "bg-red-500"
                            )}
                            style={{ width: `${Math.max(winRate, 5)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Black Model Performance */}
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="w-4 h-4 bg-gray-800 rounded-full flex-shrink-0" />
                  <span className="text-sm font-semibold">Black Model</span>
                </div>
                {(() => {
                  const model = getModelById(selectedModel2);
                  const modelName = selectedModel2 === 'human' ? 'Human' : model?.name?.split(' ')[0] || selectedModel2;
                  const asBlackGames = filteredGames.filter(g => g.black_model === selectedModel2);
                  const blackWins = asBlackGames.filter(g => g.winner === 'black').length;
                  const blackTotal = asBlackGames.length;
                  const winRate = blackTotal > 0 ? (blackWins / blackTotal) * 100 : 0;

                  return (
                    <div className="bg-card border border-border/60 rounded-lg p-4 h-24 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {selectedModel2 === 'human' ? (
                            <div className="p-1.5 rounded-md bg-gradient-to-r from-green-500 to-blue-500 shadow-sm flex-shrink-0">
                              <Users className="w-3 h-3 text-white" />
                            </div>
                          ) : model && (
                            <div className={cn("p-1.5 rounded-md bg-gradient-to-r shadow-sm flex-shrink-0", model.color)}>
                              <div className="w-3 h-3 flex items-center justify-center">
                                {model.icon}
                              </div>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm truncate">{modelName}</div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-lg font-bold">{blackWins}<span className="text-muted-foreground text-sm">/{blackTotal}</span></div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Win Rate</span>
                          <span className={cn("text-sm font-bold", getWinRateColor(winRate))}>
                            {winRate.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
                          <div
                            className={cn("h-full transition-all duration-500 rounded-full",
                              winRate >= 70 ? "bg-green-500" :
                              winRate >= 50 ? "bg-yellow-500" : "bg-red-500"
                            )}
                            style={{ width: `${Math.max(winRate, 5)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Match History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary" />
              Match History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {filteredGames.slice(0, 10).map((game, index) => {
                const whiteModel = getModelById(game.white_model);
                const blackModel = getModelById(game.black_model);
                const gameDate = new Date(game.timestamp).toLocaleDateString();
                const gameTime = new Date(game.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={game._id} className="group relative p-3 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all duration-200">
                    {/* Game number badge */}
                    <div className="absolute top-2 right-2 text-xs text-muted-foreground font-mono">
                      #{filteredGames.length - index}
                    </div>

                    {/* Main game info */}
                    <div className="flex items-center justify-between gap-4 mb-2">
                      {/* Players */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* White player */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-3 h-3 bg-white border-2 border-gray-700 rounded-full flex-shrink-0" />
                          <span className="text-sm font-semibold truncate max-w-[80px] md:max-w-none">
                            {whiteModel?.name || (game.white_model === 'human' ? 'Human' : game.white_model)}
                          </span>
                        </div>

                        {/* VS divider with result */}
                        <div className="flex flex-col items-center gap-1 px-2">
                          <div className="text-xs text-muted-foreground font-medium">VS</div>
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            game.winner === 'white' ? "bg-white border border-gray-700" :
                            game.winner === 'black' ? "bg-gray-800" :
                            "bg-yellow-500"
                          )} />
                        </div>

                        {/* Black player */}
                        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                          <span className="text-sm font-semibold truncate max-w-[80px] md:max-w-none text-right">
                            {blackModel?.name || (game.black_model === 'human' ? 'Human' : game.black_model)}
                          </span>
                          <div className="w-3 h-3 bg-gray-800 rounded-full flex-shrink-0" />
                        </div>
                      </div>
                    </div>

                    {/* Game details */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* Winner badge */}
                      <Badge
                        variant={
                          game.winner === 'white' ? 'default' :
                          game.winner === 'black' ? 'secondary' :
                          'outline'
                        }
                        className="text-xs font-medium"
                      >
                        {game.winner === null ? 'Draw' :
                         game.winner === 'white' ? 'White Wins' : 'Black Wins'}
                      </Badge>

                      {/* End reason */}
                      {getEndReasonBadge(game.end_reason)}

                      {/* Game stats */}
                      <div className="flex items-center gap-3 text-muted-foreground ml-auto">
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {game.moves} moves
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(game.duration)}
                        </span>
                        <span className="hidden md:inline">
                          {gameDate} {gameTime}
                        </span>
                        <span className="md:hidden">
                          {gameDate}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredGames.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No games found for the selected models. Play some games to see match history!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </>
        )}
      </TabsContent>

      <TabsContent value="performance" className="mt-4 space-y-4">
        {!selectedModel1 && !selectedModel2 ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Select Models to View Performance</h3>
                <p className="text-sm">Choose models to see their ELO ratings, win rates, and detailed performance metrics.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
        <>
        {/* ELO Ratings Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              ELO Ratings Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="w-full h-[300px]">
              <ChartContainer config={chartConfig} className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceChartData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                    />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="rating" fill="var(--color-rating)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* Win Rates and Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Win Rate vs Games Played
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="w-full h-[300px]">
              <ChartContainer config={chartConfig} className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceChartData} margin={{ top: 20, right: 30, bottom: 60, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                    />
                    <YAxis yAxisId="left" label={{ value: 'Win Rate %', angle: -90, position: 'insideLeft' }} />
                    <YAxis yAxisId="right" orientation="right" label={{ value: 'Games Played', angle: 90, position: 'insideRight' }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line yAxisId="left" type="monotone" dataKey="winRate" stroke="var(--color-winRate)" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="games" stroke="var(--color-games)" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedStats.map((stats) => {
            const model = getModelById(stats.model_id);
            if (!model) return null;
            
            return (
              <Card key={stats.model_id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1 rounded bg-gradient-to-r", model.color)}>
                      {model.icon}
                    </div>
                    <CardTitle className="text-base">{model.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">ELO Rating</span>
                    <Badge variant="outline">{stats.rating}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Win Rate</span>
                    <span className={cn("text-sm font-medium", getWinRateColor(stats.win_rate))}>
                      {stats.win_rate.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={stats.win_rate} className="h-2" />
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <div className="font-medium text-green-600">{stats.wins}</div>
                      <div className="text-muted-foreground">Wins</div>
                    </div>
                    <div>
                      <div className="font-medium text-yellow-600">{stats.draws}</div>
                      <div className="text-muted-foreground">Draws</div>
                    </div>
                    <div>
                      <div className="font-medium text-red-600">{stats.losses}</div>
                      <div className="text-muted-foreground">Losses</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        </>
        )}
      </TabsContent>

      <TabsContent value="trends" className="mt-4 space-y-4">
        {!selectedModel1 && !selectedModel2 ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Select Models to View Trends</h3>
                <p className="text-sm">Choose models to see their ELO rating trends and performance history over time.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
        <>
        {/* ELO Rating Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              ELO Rating Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {eloTrendData.length > 0 ? (
              <div className="w-full h-[400px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={eloTrendData} margin={{ top: 20, right: 30, bottom: 60, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                      />
                      <YAxis label={{ value: 'ELO Rating', angle: -90, position: 'insideLeft' }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      {filteredStats.map((stat, index) => {
                        const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];
                        return (
                          <Line 
                            key={stat.model_id}
                            type="monotone" 
                            dataKey={stat.model_id} 
                            stroke={colors[index % colors.length]} 
                            strokeWidth={2}
                            connectNulls={false}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No ELO history data available yet. Play some games to see rating trends!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent ELO Changes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Rating Changes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {eloHistory.slice(0, 20).map((entry) => {
                const model = getModelById(entry.model_id);
                const opponent = getModelById(entry.opponent);
                const changeColor = entry.rating_change > 0 ? 'text-green-600' : 
                                  entry.rating_change < 0 ? 'text-red-600' : 'text-gray-600';
                
                return (
                  <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-1 rounded", model?.color || "bg-muted")}>
                        {model?.icon || <Users className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{model?.name || entry.model_id}</div>
                        <div className="text-xs text-muted-foreground">
                          vs {opponent?.name || entry.opponent} • {entry.game_result}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn("font-medium", changeColor)}>
                        {entry.rating_change > 0 ? '+' : ''}{entry.rating_change}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {entry.rating_after} ELO
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {eloHistory.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No rating changes recorded yet. Play some AI vs AI games!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </>
        )}
      </TabsContent>

      <TabsContent value="matchups" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Model vs Model Performance Matrix
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(matchupMatrix).length > 0 ? (
              <div className="overflow-x-auto max-w-full">
                <div className="min-w-fit">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 sticky left-0 bg-card z-10 border-r">White vs Black</th>
                        {Object.keys(matchupMatrix[Object.keys(matchupMatrix)[0]] || {}).map(blackModel => (
                          <th key={blackModel} className="text-center p-3 font-medium min-w-[100px]">
                            <div className="truncate">{blackModel}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(matchupMatrix).map(([whiteModel, blackModels]) => (
                        <tr key={whiteModel} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-medium sticky left-0 bg-card z-10 border-r">
                            <div className="truncate">{whiteModel}</div>
                          </td>
                          {Object.entries(blackModels).map(([blackModel, results]) => {
                            const total = results.wins + results.losses + results.draws;
                            if (total === 0) return <td key={blackModel} className="text-center p-3 text-muted-foreground">-</td>;
                            
                            const winRate = (results.wins / total) * 100;
                            return (
                              <td key={blackModel} className="text-center p-3">
                                <div className="flex flex-col items-center gap-1">
                                  <div className={cn("text-sm font-medium", getWinRateColor(winRate))}>
                                    {winRate.toFixed(0)}%
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {results.wins}-{results.draws}-{results.losses}
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No model vs model games yet. Play some AI vs AI games to see matchup data!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="games" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary" />
              Recent Games History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredGames.slice(0, 20).map((game, index) => {
                const whiteModel = getModelById(game.white_model);
                const blackModel = getModelById(game.black_model);
                const gameDate = new Date(game.timestamp).toLocaleDateString();
                const gameTime = new Date(game.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <div key={game._id} className="group relative p-4 rounded-xl border border-border/50 hover:border-border hover:bg-muted/30 transition-all duration-200">
                    {/* Game number badge */}
                    <div className="absolute top-2 right-2 text-xs text-muted-foreground font-mono">
                      #{filteredGames.length - index}
                    </div>
                    
                    {/* Main game info */}
                    <div className="flex items-center justify-between gap-4 mb-3">
                      {/* Players */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* White player */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-4 h-4 bg-white border-2 border-gray-700 rounded-full flex-shrink-0" />
                          <span className="text-sm font-semibold truncate max-w-[100px] md:max-w-none">
                            {whiteModel?.name || (game.white_model === 'human' ? 'Human' : game.white_model)}
                          </span>
                        </div>
                        
                        {/* VS divider with result */}
                        <div className="flex flex-col items-center gap-1 px-2">
                          <div className="text-xs text-muted-foreground font-medium">VS</div>
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            game.winner === 'white' ? "bg-white border border-gray-700" :
                            game.winner === 'black' ? "bg-gray-800" :
                            "bg-yellow-500"
                          )} />
                        </div>
                        
                        {/* Black player */}
                        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                          <span className="text-sm font-semibold truncate max-w-[100px] md:max-w-none text-right">
                            {blackModel?.name || (game.black_model === 'human' ? 'Human' : game.black_model)}
                          </span>
                          <div className="w-4 h-4 bg-gray-800 rounded-full flex-shrink-0" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Game details */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* Winner badge */}
                      <Badge 
                        variant={
                          game.winner === 'white' ? 'default' : 
                          game.winner === 'black' ? 'secondary' : 
                          'outline'
                        }
                        className="text-xs font-medium"
                      >
                        {game.winner === null ? 'Draw' : 
                         game.winner === 'white' ? 'White Wins' : 'Black Wins'}
                      </Badge>
                      
                      {/* End reason */}
                      {getEndReasonBadge(game.end_reason)}
                      
                      {/* Game stats */}
                      <div className="flex items-center gap-3 text-muted-foreground ml-auto">
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {game.moves} moves
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(game.duration)}
                        </span>
                        <span className="hidden md:inline">
                          {gameDate} {gameTime}
                        </span>
                        <span className="md:hidden">
                          {gameDate}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {filteredGames.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No games played yet. Start a game to see statistics!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
    </div>
  );
};

export default GameStats;