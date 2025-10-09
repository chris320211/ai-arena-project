import { Card, CardContent } from "@/components/ui/card";
import { Activity, Users, Zap, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { API_URL } from "@/config/api";

interface StatCard {
  title: string;
  value: string;
  change: string;
  icon: React.ComponentType<any>;
  trend: "up" | "down" | "stable";
}

const getModelDisplayName = (modelId: string): string => {
  const names: Record<string, string> = {
    'anthropic_claude_haiku': 'Claude 3 Haiku',
    'anthropic_claude_sonnet': 'Claude 3.5 Sonnet',
    'openai_gpt4o_mini': 'GPT-4o Mini',
    'openai_gpt4o': 'GPT-4o',
    'gemini_pro': 'Gemini Pro',
  };
  return names[modelId] || modelId;
};

export const StatsCards = () => {
  const [stats, setStats] = useState<StatCard[]>([]);

  useEffect(() => {
    const updateStats = async () => {
      try {
        const [gamesResponse, modelsResponse] = await Promise.all([
          fetch(`${API_URL}/api/stats/games?limit=100`),
          fetch(`${API_URL}/api/stats/models`)
        ]);

        const gamesData = await gamesResponse.json();
        const modelsData = await modelsResponse.json();

        const games = gamesData.games || [];
        const ratings = modelsData.model_stats || [];

        const totalGames = games.length;

        // Calculate average moves per game
        const totalMoves = games.reduce((sum: number, game: any) => {
          return sum + (game.moves || 0);
        }, 0);
        const avgMoves = games.length > 0 ? Math.round(totalMoves / games.length) : 0;

        // Calculate longest win streak
        let currentStreak = { modelId: '', count: 0, modelName: '' };
        let longestStreak = { modelId: '', count: 0, modelName: '' };
        let tempStreak = { modelId: '', count: 0 };

        games.slice().reverse().forEach((game: any) => {
          const winner = game.winner === 'white' ? game.white_model :
                        game.winner === 'black' ? game.black_model : null;

          if (winner) {
            if (tempStreak.modelId === winner) {
              tempStreak.count++;
            } else {
              tempStreak = { modelId: winner, count: 1 };
            }

            if (tempStreak.count > longestStreak.count) {
              longestStreak = {
                modelId: tempStreak.modelId,
                count: tempStreak.count,
                modelName: getModelDisplayName(tempStreak.modelId)
              };
            }
          } else {
            tempStreak = { modelId: '', count: 0 };
          }
        });

        // Current streak is the most recent
        if (games.length > 0) {
          const recentGame = games[0];
          const recentWinner = recentGame.winner === 'white' ? recentGame.white_model :
                              recentGame.winner === 'black' ? recentGame.black_model : null;

          if (recentWinner) {
            let streakCount = 0;
            for (const game of games) {
              const gameWinner = game.winner === 'white' ? game.white_model :
                                game.winner === 'black' ? game.black_model : null;
              if (gameWinner === recentWinner) {
                streakCount++;
              } else {
                break;
              }
            }
            currentStreak = {
              modelId: recentWinner,
              count: streakCount,
              modelName: getModelDisplayName(recentWinner)
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
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
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