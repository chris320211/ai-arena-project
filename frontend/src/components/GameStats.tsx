import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Target, Clock, TrendingUp, Medal, Crown, BarChart3, Zap, Users, Activity } from 'lucide-react';
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
    { name: 'White Wins', value: recentGames.filter(g => g.winner === 'white').length, color: '#ffffff' },
    { name: 'Black Wins', value: recentGames.filter(g => g.winner === 'black').length, color: '#000000' },
    { name: 'Draws', value: recentGames.filter(g => g.winner === null).length, color: '#888888' }
  ];

  const endReasonsData = [
    { name: 'Checkmate', value: recentGames.filter(g => g.end_reason === 'checkmate').length, color: '#ef4444' },
    { name: 'Resignation', value: recentGames.filter(g => g.end_reason === 'resignation').length, color: '#f97316' },
    { name: 'Stalemate', value: recentGames.filter(g => g.end_reason === 'stalemate').length, color: '#eab308' },
    { name: 'Timeout', value: recentGames.filter(g => g.end_reason === 'timeout').length, color: '#6366f1' }
  ].filter(item => item.value > 0);

  // Model matchup matrix
  const createMatchupMatrix = () => {
    const matrix: { [white: string]: { [black: string]: { wins: number, losses: number, draws: number } } } = {};
    
    recentGames.forEach(game => {
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

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="performance">Performance</TabsTrigger>
        <TabsTrigger value="matchups">Matchups</TabsTrigger>
        <TabsTrigger value="games">Games</TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview" className="mt-4 space-y-4">
        {/* Key Metrics Dashboard */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
          <Card>
            <CardContent className="p-2 md:p-3 h-16 md:h-20">
              <div className="flex flex-col justify-between h-full">
                <div className="flex items-start gap-1 h-6">
                  <Users className="w-3 h-3 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-[9px] md:text-[10px] text-muted-foreground leading-tight">Models</div>
                </div>
                <div className="text-lg md:text-xl font-bold text-center">{modelStats.length}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 md:p-3 h-16 md:h-20">
              <div className="flex flex-col justify-between h-full">
                <div className="flex items-start gap-1 h-6">
                  <Activity className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="text-[9px] md:text-[10px] text-muted-foreground leading-tight">Total Games</div>
                </div>
                <div className="text-lg md:text-xl font-bold text-center">{recentGames.length}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 md:p-3 h-16 md:h-20">
              <div className="flex flex-col justify-between h-full">
                <div className="flex items-start gap-1 h-6">
                  <Crown className="w-3 h-3 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="text-[9px] md:text-[10px] text-muted-foreground leading-tight">Checkmates</div>
                </div>
                <div className="text-lg md:text-xl font-bold text-center">{recentGames.filter(g => g.end_reason === 'checkmate').length}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 md:p-3 h-16 md:h-20">
              <div className="flex flex-col justify-between h-full">
                <div className="flex items-start gap-1 h-6">
                  <Clock className="w-3 h-3 text-purple-500 flex-shrink-0 mt-0.5" />
                  <div className="text-[9px] md:text-[10px] text-muted-foreground leading-tight">Avg Duration</div>
                </div>
                <div className="text-lg md:text-xl font-bold text-center">{Math.round(recentGames.reduce((acc, g) => acc + g.duration, 0) / recentGames.length / 60) || 0}m</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Game Results Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Game Results
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="w-full h-[200px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={gameResultsData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ value }) => value > 0 ? `${value}` : ''}
                        outerRadius="75%"
                        innerRadius="35%"
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {gameResultsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                End Reasons
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="w-full h-[200px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={endReasonsData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ value }) => value > 0 ? `${value}` : ''}
                        outerRadius="75%"
                        innerRadius="35%"
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {endReasonsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Model Rankings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-accent" />
              Model Rankings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {sortedStats.map((stats, index) => {
                const model = getModelById(stats.model_id);
                if (!model) return null;

                return (
                  <div key={stats.model_id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-shrink-0">
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
                          "p-2 rounded-lg bg-gradient-to-r flex-shrink-0",
                          model.color
                        )}>
                          {model.icon}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium truncate text-sm md:text-base max-w-[120px] md:max-w-none">{model.name}</span>
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {stats.rating} ELO
                          </Badge>
                        </div>
                        <div className="text-xs md:text-sm text-muted-foreground">
                          <span className="inline-block">{stats.games_played} games</span>
                          <span className="mx-1">•</span>
                          <span className={cn("inline-block", getWinRateColor(stats.win_rate))}>
                            {stats.win_rate.toFixed(1)}% win rate
                          </span>
                        </div>
                      </div>
                    </div>
                      
                    <div className="text-right sm:text-left flex-shrink-0 min-w-0">
                      <div className="text-xs md:text-sm font-medium">
                        {stats.wins}W {stats.draws}D {stats.losses}L
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        Avg: {Math.round(stats.avg_move_time)}s/move
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="performance" className="mt-4 space-y-4">
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
              {recentGames.slice(0, 20).map((game, index) => {
                const whiteModel = getModelById(game.white_model);
                const blackModel = getModelById(game.black_model);
                const gameDate = new Date(game.timestamp).toLocaleDateString();
                const gameTime = new Date(game.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <div key={game._id} className="group relative p-4 rounded-xl border border-border/50 hover:border-border hover:bg-muted/30 transition-all duration-200">
                    {/* Game number badge */}
                    <div className="absolute top-2 right-2 text-xs text-muted-foreground font-mono">
                      #{recentGames.length - index}
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
              
              {recentGames.length === 0 && (
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
  );
};

export default GameStats;