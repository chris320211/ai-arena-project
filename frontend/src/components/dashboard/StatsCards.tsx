import { Card, CardContent } from "@/components/ui/card";
import { Activity, Users, Zap, TrendingUp } from "lucide-react";
import { eloService } from "@/services/eloService";
import { useEffect, useState } from "react";

interface StatCard {
  title: string;
  value: string;
  change: string;
  icon: React.ComponentType<any>;
  trend: "up" | "down" | "stable";
}

export const StatsCards = () => {
  const [stats, setStats] = useState<StatCard[]>([]);

  useEffect(() => {
    const updateStats = () => {
      const ratings = eloService.getRatings();
      const games = eloService.getRecentGames(100);

      // Filter to only show GPT-4o and Claude Haiku
      const allowedModels = ['gpt-4o', 'claude-3-haiku-20240307'];
      const filteredRatings = ratings.filter(r => allowedModels.includes(r.modelId));
      const filteredGames = games.filter(game =>
        allowedModels.includes(game.whiteModelId) && allowedModels.includes(game.blackModelId)
      );

      const totalGames = filteredGames.length;
      const activeModels = filteredRatings.filter(r => r.gamesPlayed > 0).length;
      const avgRating = filteredRatings.filter(r => r.gamesPlayed > 0).reduce((sum, r) => sum + r.rating, 0) / Math.max(1, activeModels);
      const totalWins = filteredRatings.reduce((sum, r) => sum + r.wins, 0);
      const totalPlayed = filteredRatings.reduce((sum, r) => sum + r.gamesPlayed, 0);
      const winRate = totalPlayed > 0 ? (totalWins / totalPlayed) * 100 : 0;

      // Calculate average moves per game
      const totalMoves = filteredGames.reduce((sum, game) => {
        // Assuming we can get move count from game data, otherwise use a placeholder
        return sum + (game.moves || 0);
      }, 0);
      const avgMoves = filteredGames.length > 0 ? Math.round(totalMoves / filteredGames.length) : 0;

      // Calculate longest win streak
      let currentStreak = { modelId: '', count: 0, modelName: '' };
      let longestStreak = { modelId: '', count: 0, modelName: '' };
      let tempStreak = { modelId: '', count: 0 };

      filteredGames.slice().reverse().forEach(game => {
        const winner = game.winner === 'white' ? game.whiteModelId :
                      game.winner === 'black' ? game.blackModelId : null;

        if (winner && allowedModels.includes(winner)) {
          if (tempStreak.modelId === winner) {
            tempStreak.count++;
          } else {
            tempStreak = { modelId: winner, count: 1 };
          }

          if (tempStreak.count > longestStreak.count) {
            longestStreak = {
              modelId: tempStreak.modelId,
              count: tempStreak.count,
              modelName: eloService.getModelName(tempStreak.modelId)
            };
          }
        } else {
          tempStreak = { modelId: '', count: 0 };
        }
      });

      // Current streak is the most recent
      if (filteredGames.length > 0) {
        const recentGame = filteredGames[0];
        const recentWinner = recentGame.winner === 'white' ? recentGame.whiteModelId :
                            recentGame.winner === 'black' ? recentGame.blackModelId : null;

        if (recentWinner && allowedModels.includes(recentWinner)) {
          let streakCount = 0;
          for (const game of filteredGames) {
            const gameWinner = game.winner === 'white' ? game.whiteModelId :
                              game.winner === 'black' ? game.blackModelId : null;
            if (gameWinner === recentWinner) {
              streakCount++;
            } else {
              break;
            }
          }
          currentStreak = {
            modelId: recentWinner,
            count: streakCount,
            modelName: eloService.getModelName(recentWinner)
          };
        }
      }

      const newStats: StatCard[] = [
        {
          title: "Total Games",
          value: totalGames.toString(),
          change: totalGames > 0 ? `${totalGames} completed` : "No games yet",
          icon: Activity,
          trend: "up"
        },
        {
          title: "Avg Moves/Game",
          value: avgMoves > 0 ? avgMoves.toString() : "0",
          change: totalGames > 0 ? `${totalMoves} total moves` : "No games yet",
          icon: TrendingUp,
          trend: avgMoves > 30 ? "up" : "stable"
        },
        {
          title: "Longest Win Streak",
          value: longestStreak.count > 0 ? longestStreak.count.toString() : "0",
          change: longestStreak.count > 0 ? longestStreak.modelName : "No streaks yet",
          icon: Zap,
          trend: longestStreak.count > 0 ? "up" : "stable"
        },
        {
          title: "Current Streak",
          value: currentStreak.count > 0 ? currentStreak.count.toString() : "0",
          change: currentStreak.count > 0 ? currentStreak.modelName : "No active streak",
          icon: Users,
          trend: currentStreak.count > 2 ? "up" : "stable"
        }
      ];

      setStats(newStats);
    };

    updateStats();

    // Update stats every 5 seconds
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
                <p className={`text-xs ${
                  stat.trend === 'up' ? 'text-accent' : stat.trend === 'down' ? 'text-orange-600' : 'text-muted-foreground'
                }`}>
                  {stat.change}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <stat.icon className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};